-- Guest -> account merge: union only, never loses anything, never pays twice, same totals as doing it one by one.
select set_config('app.scenario', :'scenario', false) as _ \gset

insert into auth.users (id, email) values
  ('e1e1e1e1-0000-0000-0000-0000000000e1', 'e@example.com'),
  ('f1f1f1f1-0000-0000-0000-0000000000f1', 'f@example.com'),
  ('91919191-0000-0000-0000-000000000091', 'g@example.com');

set role anon;
do $$
begin
  begin perform public.merge_guest_progress('{bakarkhani}', '{}'); raise exception 'anon merged';
  exception when insufficient_privilege then null; end;
end $$;

-- E: one-shot merge of the whole scenario equals the one-by-one totals (scenario.totalXp)
reset role; set role authenticated;
set request.jwt.claim.sub = 'e1e1e1e1-0000-0000-0000-0000000000e1';
do $$
declare
  sc jsonb := current_setting('app.scenario')::jsonb;
  foods text[]; quiz text[]; r jsonb; r2 jsonb;
begin
  select array_agg(x) into foods from jsonb_array_elements_text(sc -> 'foods') x;
  select array_agg(x) into quiz from jsonb_array_elements_text(sc -> 'quizCorrect') x;
  r := public.merge_guest_progress(foods, quiz);
  if (r ->> 'total_xp')::int <> (sc ->> 'totalXp')::int then raise exception 'merge total %, expected %', r ->> 'total_xp', sc ->> 'totalXp'; end if;
  if (r ->> 'new_stamps')::int <> cardinality(foods) or (r ->> 'new_quiz')::int <> cardinality(quiz) then raise exception 'wrong counts: %', r; end if;
  if (select count(*) from public.user_badges) <> jsonb_array_length(sc -> 'badges') then raise exception 'wrong badge count'; end if;

  -- running it again (and again) changes nothing and pays nothing
  r2 := public.merge_guest_progress(foods, quiz);
  r2 := public.merge_guest_progress(foods, quiz);
  if (r2 ->> 'new_stamps')::int <> 0 or (r2 ->> 'new_quiz')::int <> 0 or (r2 ->> 'xp_awarded')::int <> 0
     or (r2 ->> 'total_xp')::int <> (sc ->> 'totalXp')::int or r2 -> 'new_badges' <> '[]'::jsonb then
    raise exception 'second merge changed something: %', r2;
  end if;
  if (select count(*) from public.xp_events) <> cardinality(foods) + cardinality(quiz) + jsonb_array_length(sc -> 'challenges') then
    raise exception 'duplicate xp events after repeated merge';
  end if;
end $$;

-- F: an account that already has progress keeps all of it; only the new stamp is added, overlap pays nothing
reset role; set role authenticated;
set request.jwt.claim.sub = 'f1f1f1f1-0000-0000-0000-0000000000f1';
do $$
declare r jsonb; xp_before int;
begin
  perform public.mark_food_tried('bakarkhani');
  perform public.record_quiz_answer('national-fish', 0);
  xp_before := public.my_xp_total();   -- 10 + 5

  -- the other browser has bakarkhani again, one new food, the same quiz answer, plus junk ids
  r := public.merge_guest_progress('{bakarkhani,hilsa-fry-not-real,nope}'::text[] || (select array_agg(id) from (select id from public.foods where id <> 'bakarkhani' order by id limit 1) s), '{national-fish,not-a-question}');
  if (r ->> 'new_stamps')::int <> 1 then raise exception 'only the one new stamp should be added: %', r; end if;
  if (r ->> 'new_quiz')::int <> 0 then raise exception 'already-answered quiz must not pay again: %', r; end if;
  if public.my_xp_total() < xp_before + 10 then raise exception 'existing XP was lost or the new stamp unpaid'; end if;
  if not exists (select 1 from public.user_food_progress where food_id = 'bakarkhani') then raise exception 'existing stamp lost'; end if;
  if exists (select 1 from public.user_food_progress where food_id in ('nope', 'hilsa-fry-not-real')) then raise exception 'unknown food stored'; end if;

  -- empty and null lists are fine and change nothing
  r := public.merge_guest_progress('{}', '{}');
  if (r ->> 'new_stamps')::int <> 0 then raise exception 'empty merge changed something'; end if;
  r := public.merge_guest_progress(null, null);
  if (r ->> 'xp_awarded')::int <> 0 then raise exception 'null merge paid'; end if;

  -- an un-marked stamp that comes back through a merge pays nothing a second time
  perform public.unmark_food_tried('bakarkhani');
  xp_before := public.my_xp_total();
  r := public.merge_guest_progress('{bakarkhani}', '{}');
  if (r ->> 'new_stamps')::int <> 1 or public.my_xp_total() <> xp_before then raise exception 'unmark/merge farmed XP: %', r; end if;

  -- oversized input is refused
  begin perform public.merge_guest_progress((select array_agg(g::text) from generate_series(1, 501) g), '{}'); raise exception 'oversized list accepted';
  exception when sqlstate '22023' then null; end;
end $$;

-- F's merge touched nobody else: G (a third account) is still empty, and E's totals did not move
reset role; set role authenticated;
set request.jwt.claim.sub = '91919191-0000-0000-0000-000000000091';
do $$
begin
  if public.my_xp_total() <> 0 or (select count(*) from public.user_food_progress) <> 0 then raise exception 'G was affected'; end if;
end $$;
reset role;
do $$
begin
  if (select sum(xp_awarded) from public.xp_events where user_id = 'e1e1e1e1-0000-0000-0000-0000000000e1') <> (current_setting('app.scenario')::jsonb ->> 'totalXp')::int then
    raise exception 'E total changed';
  end if;
end $$;

select 'merge tests passed' as result;
