-- Trusted XP and rewards. The browser never sends a score: it asks "I tried this food" or "I picked this quiz option",
-- and these functions check it, write the rows, and award XP exactly once (see xp_events_once).
--
-- Documented rules (they mirror src/utils/xp.js, rules.js and scoring.js, which the site uses for guests):
--   * food tried        +foods.xp (10)      once per food, ever
--   * quiz answered right +5               once per question, ever
--   * challenge completed +challenges.xp_reward (25), once per challenge, ever
--   * badges are granted when their rule is met and are never taken back
--   * "xp_total" rules count food + quiz XP only, never challenge XP, so a reward cannot depend on itself
--   * XP is append-only: un-marking a food removes the stamp but never removes XP already earned, and marking it again
--     pays nothing a second time. Together this means mark/unmark cannot farm XP.

-- quiz answers live in a table the API cannot read; only the functions below do
create table public.quiz_questions (
  id       text primary key,
  correct  integer not null check (correct between 0 and 3)
);
alter table public.quiz_questions enable row level security;
revoke all on public.quiz_questions from anon, authenticated;

-- ------------------------------------------------------------------ internal helpers (not callable from the API)

-- Current value of a challenge/badge rule for one user.
create function public.rule_current(p_user uuid, p_rule jsonb, p_base_xp integer, p_challenges_done integer, p_quiz integer)
returns integer
language plpgsql stable security definer set search_path = ''
as $$
declare
  n integer;
begin
  case p_rule ->> 'type'
    when 'count_category' then
      select count(*) into n from public.user_food_progress p join public.foods f on f.id = p.food_id
        where p.user_id = p_user and f.category = p_rule ->> 'category';
    when 'count_total', 'stamps_total' then
      select count(*) into n from public.user_food_progress p where p.user_id = p_user;
    when 'distinct_categories' then
      select count(distinct f.category) into n from public.user_food_progress p join public.foods f on f.id = p.food_id
        where p.user_id = p_user;
    when 'count_regional' then
      select count(*) into n from public.user_food_progress p join public.foods f on f.id = p.food_id
        where p.user_id = p_user and f.scope = 'regional';
    when 'complete_collection' then
      -- a collection is a category; it is complete when every food in it has been tried
      select count(*) into n from (
        select f.category from public.foods f
          left join public.user_food_progress p on p.food_id = f.id and p.user_id = p_user
        group by f.category having count(*) = count(p.food_id)
      ) c;
    when 'xp_total' then n := p_base_xp;
    when 'challenges_completed' then n := p_challenges_done;
    when 'quiz_correct' then n := p_quiz;
    else raise exception 'unknown rule type %', p_rule ->> 'type' using errcode = '22023';
  end case;
  return coalesce(n, 0);
end;
$$;

-- Complete any challenge and grant any badge the user now qualifies for. Returns what is new.
create function public.evaluate_rewards(p_user uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_base integer;
  v_quiz integer;
  v_done integer;
  v_cur integer;
  v_target integer;
  v_rows integer;
  v_xp integer := 0;
  v_new_challenges text[] := '{}';
  v_new_badges text[] := '{}';
  r record;
begin
  -- one evaluation per user at a time, so two quick requests cannot both think they were first
  perform pg_advisory_xact_lock(hashtext(p_user::text));

  select coalesce(sum(xp_awarded), 0), count(*) filter (where event_type = 'quiz_correct')
    into v_base, v_quiz
    from public.xp_events where user_id = p_user and event_type in ('food_tried', 'quiz_correct');

  for r in select id, rules, xp_reward from public.challenges where is_active order by id loop
    v_cur := public.rule_current(p_user, r.rules, v_base, 0, v_quiz);
    v_target := coalesce((r.rules ->> 'target')::integer, 1);
    insert into public.user_challenge_progress (user_id, challenge_id, progress) values (p_user, r.id, v_cur)
      on conflict (user_id, challenge_id) do update set progress = excluded.progress;
    if v_cur >= v_target then
      update public.user_challenge_progress set completed_at = coalesce(completed_at, now())
        where user_id = p_user and challenge_id = r.id;
      insert into public.xp_events (user_id, event_type, reference_id, xp_awarded)
        values (p_user, 'challenge_completed', r.id, r.xp_reward)
        on conflict on constraint xp_events_once do nothing;
      get diagnostics v_rows = row_count;
      if v_rows = 1 then
        v_new_challenges := v_new_challenges || r.id;
        v_xp := v_xp + r.xp_reward;
      end if;
    end if;
  end loop;

  select count(*) into v_done from public.user_challenge_progress where user_id = p_user and completed_at is not null;

  for r in select id, unlock_rule from public.badges order by id loop
    v_cur := public.rule_current(p_user, r.unlock_rule, v_base, v_done, v_quiz);
    v_target := coalesce((r.unlock_rule ->> 'target')::integer, 1);
    if v_cur >= v_target then
      insert into public.user_badges (user_id, badge_id) values (p_user, r.id) on conflict do nothing;
      get diagnostics v_rows = row_count;
      if v_rows = 1 then v_new_badges := v_new_badges || r.id; end if;
    end if;
  end loop;

  return jsonb_build_object('xp', v_xp, 'challenges', to_jsonb(v_new_challenges), 'badges', to_jsonb(v_new_badges));
end;
$$;

-- ------------------------------------------------------------------ the API the site calls

create function public.mark_food_tried(p_food_id text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_food_xp integer;
  v_stamp integer;
  v_paid integer;
  v_rewards jsonb;
begin
  if v_user is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select xp into v_food_xp from public.foods where id = p_food_id;
  if not found then raise exception 'unknown food: %', p_food_id using errcode = '22023'; end if;

  insert into public.user_food_progress (user_id, food_id) values (v_user, p_food_id) on conflict do nothing;
  get diagnostics v_stamp = row_count;

  insert into public.xp_events (user_id, event_type, reference_id, xp_awarded)
    values (v_user, 'food_tried', p_food_id, v_food_xp)
    on conflict on constraint xp_events_once do nothing;
  get diagnostics v_paid = row_count;

  v_rewards := public.evaluate_rewards(v_user);
  return jsonb_build_object(
    'new_stamp', v_stamp = 1,
    'xp_awarded', case when v_paid = 1 then v_food_xp else 0 end + (v_rewards ->> 'xp')::integer,
    'new_challenges', v_rewards -> 'challenges',
    'new_badges', v_rewards -> 'badges',
    'total_xp', public.my_xp_total()
  );
end;
$$;

-- Removes the stamp only. XP already earned stays (see the rules at the top).
create function public.unmark_food_tried(p_food_id text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_rows integer;
begin
  if v_user is null then raise exception 'not signed in' using errcode = '28000'; end if;
  delete from public.user_food_progress where user_id = v_user and food_id = p_food_id;
  get diagnostics v_rows = row_count;
  return jsonb_build_object('removed', v_rows = 1, 'total_xp', public.my_xp_total());
end;
$$;

-- The client says which option it picked (by its position in quiz.json); the server decides if that is right.
create function public.record_quiz_answer(p_question_id text, p_option integer) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_correct integer;
  v_paid integer := 0;
  v_rewards jsonb := jsonb_build_object('xp', 0, 'challenges', '[]'::jsonb, 'badges', '[]'::jsonb);
begin
  if v_user is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select correct into v_correct from public.quiz_questions where id = p_question_id;
  if not found then raise exception 'unknown question: %', p_question_id using errcode = '22023'; end if;

  if p_option = v_correct then
    insert into public.xp_events (user_id, event_type, reference_id, xp_awarded)
      values (v_user, 'quiz_correct', p_question_id, 5)
      on conflict on constraint xp_events_once do nothing;
    get diagnostics v_paid = row_count;
    v_rewards := public.evaluate_rewards(v_user);
  end if;
  return jsonb_build_object(
    'correct', p_option = v_correct,
    'xp_awarded', case when v_paid = 1 then 5 else 0 end + (v_rewards ->> 'xp')::integer,
    'new_challenges', v_rewards -> 'challenges',
    'new_badges', v_rewards -> 'badges',
    'total_xp', public.my_xp_total()
  );
end;
$$;

-- Your own total (row level security means the sum only ever sees your own events).
create function public.my_xp_total() returns integer
language sql stable security invoker set search_path = ''
as $$
  select coalesce(sum(xp_awarded), 0)::integer from public.xp_events where user_id = auth.uid()
$$;

-- ------------------------------------------------------------------ who may call what

revoke all on function public.rule_current(uuid, jsonb, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.evaluate_rewards(uuid) from public, anon, authenticated;
revoke all on function public.mark_food_tried(text) from public, anon, authenticated;
revoke all on function public.unmark_food_tried(text) from public, anon, authenticated;
revoke all on function public.record_quiz_answer(text, integer) from public, anon, authenticated;
revoke all on function public.my_xp_total() from public, anon, authenticated;

grant execute on function public.mark_food_tried(text) to authenticated;
grant execute on function public.unmark_food_tried(text) to authenticated;
grant execute on function public.record_quiz_answer(text, integer) to authenticated;
grant execute on function public.my_xp_total() to authenticated;
