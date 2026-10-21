-- Server-side XP and rewards. The scenario (supabase/tests/scenario.json) is also checked against the site's own
-- JavaScript scoring in scripts/parity.test.js, so the cloud and the guest app cannot drift apart.
select set_config('app.scenario', :'scenario', false) as _ \gset

insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-00000000000c', 'c@example.com'),
  ('dddddddd-0000-0000-0000-00000000000d', 'd@example.com');

-- ---- signed out: no function is callable
set role anon;
do $$
begin
  begin perform public.mark_food_tried('bakarkhani'); raise exception 'anon marked a food';
  exception when insufficient_privilege then null; end;
  begin perform public.record_quiz_answer('national-fish', 0); raise exception 'anon answered a quiz';
  exception when insufficient_privilege then null; end;
end $$;

-- ---- signed in as C
reset role;
set role authenticated;
set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-00000000000c';

-- internal helpers are not part of the API
do $$
begin
  begin perform public.evaluate_rewards(auth.uid()); raise exception 'evaluate_rewards is callable from the API';
  exception when insufficient_privilege then null; end;
  begin perform public.rule_current(auth.uid(), '{"type":"count_total"}', 0, 0, 0); raise exception 'rule_current is callable from the API';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.quiz_questions; raise exception 'quiz answers are readable from the API';
  exception when insufficient_privilege then null; end;
end $$;

-- first stamp: +10 XP and the First Bite badge; marking again pays nothing
do $$
declare r jsonb;
begin
  r := public.mark_food_tried('bakarkhani');
  if not (r ->> 'new_stamp')::boolean then raise exception 'first mark should be a new stamp: %', r; end if;
  if (r ->> 'xp_awarded')::int <> 10 or (r ->> 'total_xp')::int <> 10 then raise exception 'first mark should pay 10 XP: %', r; end if;
  if r -> 'new_badges' <> '["first-bite"]'::jsonb then raise exception 'expected the first-bite badge: %', r; end if;

  r := public.mark_food_tried('bakarkhani');
  if (r ->> 'new_stamp')::boolean or (r ->> 'xp_awarded')::int <> 0 or (r ->> 'total_xp')::int <> 10 then
    raise exception 'marking twice must not pay twice: %', r;
  end if;

  -- unmark keeps the XP, and marking again pays nothing (no mark/unmark farming)
  r := public.unmark_food_tried('bakarkhani');
  if not (r ->> 'removed')::boolean or (r ->> 'total_xp')::int <> 10 then raise exception 'unmark should remove the stamp but keep XP: %', r; end if;
  r := public.mark_food_tried('bakarkhani');
  if not (r ->> 'new_stamp')::boolean or (r ->> 'xp_awarded')::int <> 0 or (r ->> 'total_xp')::int <> 10 then
    raise exception 'unmark then mark must not pay again: %', r;
  end if;

  -- made-up ids are refused
  begin perform public.mark_food_tried('pizza'); raise exception 'unknown food accepted';
  exception when sqlstate '22023' then null; end;
  begin perform public.record_quiz_answer('nope', 0); raise exception 'unknown question accepted';
  exception when sqlstate '22023' then null; end;
end $$;

-- quiz: only the right option pays, once
do $$
declare r jsonb; v_ok int;
begin
  r := public.record_quiz_answer('national-fish', 1);
  if (r ->> 'correct')::boolean or (r ->> 'xp_awarded')::int <> 0 then raise exception 'wrong answer paid: %', r; end if;
  r := public.record_quiz_answer('national-fish', 0);
  if not (r ->> 'correct')::boolean or (r ->> 'xp_awarded')::int <> 5 or (r ->> 'total_xp')::int <> 15 then raise exception 'right answer should pay 5: %', r; end if;
  r := public.record_quiz_answer('national-fish', 0);
  if (r ->> 'xp_awarded')::int <> 0 or (r ->> 'total_xp')::int <> 15 then raise exception 'right answer paid twice: %', r; end if;
end $$;

-- ---- signed in as D: the whole scenario, run twice (the second run must change nothing)
reset role;
set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-00000000000d';

do $$
declare
  sc jsonb := current_setting('app.scenario')::jsonb;
  f text; q text; pass int; v_total int; v_ch text[]; v_b text[];
begin
  for pass in 1..2 loop
    for f in select jsonb_array_elements_text(sc -> 'foods') loop perform public.mark_food_tried(f); end loop;
    for q in select jsonb_array_elements_text(sc -> 'quizCorrect') loop
      -- the option's position in quiz.json (the site shuffles only what it shows)
      perform public.record_quiz_answer(q, (sc -> 'quizOptions' ->> q)::int);
    end loop;
  end loop;

  v_total := public.my_xp_total();
  if v_total <> (sc ->> 'totalXp')::int then raise exception 'expected % XP, got %', sc ->> 'totalXp', v_total; end if;

  select array_agg(challenge_id order by challenge_id) into v_ch from public.user_challenge_progress where completed_at is not null;
  if to_jsonb(v_ch) <> (select jsonb_agg(x order by x) from jsonb_array_elements_text(sc -> 'challenges') x) then
    raise exception 'wrong completed challenges: %', v_ch;
  end if;

  select array_agg(badge_id order by badge_id) into v_b from public.user_badges;
  if to_jsonb(v_b) <> (select jsonb_agg(x order by x) from jsonb_array_elements_text(sc -> 'badges') x) then
    raise exception 'wrong badges: %', v_b;
  end if;

  if (select count(*) from public.user_food_progress) <> jsonb_array_length(sc -> 'foods') then raise exception 'wrong stamp count'; end if;
  -- one event per food + one quiz + one per completed challenge, no more
  if (select count(*) from public.xp_events) <> jsonb_array_length(sc -> 'foods') + jsonb_array_length(sc -> 'quizCorrect') + jsonb_array_length(sc -> 'challenges') then
    raise exception 'unexpected number of xp events';
  end if;
end $$;

-- C and D never see each other's XP
reset role;
do $$
begin
  if (select sum(xp_awarded) from public.xp_events where user_id = 'cccccccc-0000-0000-0000-00000000000c') <> 15 then
    raise exception 'C total changed';
  end if;
end $$;

select 'xp tests passed' as result;
