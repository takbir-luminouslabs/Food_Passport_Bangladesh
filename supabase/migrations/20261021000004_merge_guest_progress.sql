-- Guest -> account merge (Plan C, step 4).
--
-- The browser hands over the stamps and right quiz answers it holds as two lists of ids. This is a UNION: it only ever
-- adds. It never deletes or lowers anything already in the account, and running it again with the same lists changes
-- nothing (stamps are keyed by (user, food); XP is keyed by xp_events_once). XP is paid by the same rules as
-- mark_food_tried / record_quiz_answer, so merging cannot pay more than doing the same things one by one.
--
-- Trust note: the lists are the guest's own claims. A food stamp has always been a self-reported tick, and a quiz id
-- is a claim that the question was answered correctly on this device. Both are bounded (known ids only, each pays once,
-- at most 64 foods + 20 questions) and a leaderboard can show only opted-in users.
create function public.merge_guest_progress(p_foods text[], p_quiz text[]) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_new_stamps integer;
  v_new_quiz integer;
  v_food_xp integer;
  v_quiz_xp integer;
  v_rewards jsonb;
begin
  if v_user is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if coalesce(array_length(p_foods, 1), 0) > 500 or coalesce(array_length(p_quiz, 1), 0) > 500 then
    raise exception 'too many ids' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  -- stamps: only foods that exist; ones the account already has are left exactly as they are
  insert into public.user_food_progress (user_id, food_id)
    select v_user, f.id from public.foods f where f.id = any (coalesce(p_foods, '{}'))
    on conflict do nothing;
  get diagnostics v_new_stamps = row_count;

  -- XP for those foods, once each (also covers a stamp that was re-added after an un-mark: it pays nothing again)
  with paid as (
    insert into public.xp_events (user_id, event_type, reference_id, xp_awarded)
      select v_user, 'food_tried', f.id, f.xp from public.foods f where f.id = any (coalesce(p_foods, '{}'))
      on conflict on constraint xp_events_once do nothing
      returning xp_awarded
  ) select coalesce(sum(xp_awarded), 0) into v_food_xp from paid;

  with paid as (
    insert into public.xp_events (user_id, event_type, reference_id, xp_awarded)
      select v_user, 'quiz_correct', q.id, 5 from public.quiz_questions q where q.id = any (coalesce(p_quiz, '{}'))
      on conflict on constraint xp_events_once do nothing
      returning xp_awarded
  ) select count(*), coalesce(sum(xp_awarded), 0) into v_new_quiz, v_quiz_xp from paid;

  v_rewards := public.evaluate_rewards(v_user);
  return jsonb_build_object(
    'new_stamps', v_new_stamps,
    'new_quiz', v_new_quiz,
    'xp_awarded', v_food_xp + v_quiz_xp + (v_rewards ->> 'xp')::integer,
    'new_challenges', v_rewards -> 'challenges',
    'new_badges', v_rewards -> 'badges',
    'total_xp', public.my_xp_total()
  );
end;
$$;

revoke all on function public.merge_guest_progress(text[], text[]) from public, anon, authenticated;
grant execute on function public.merge_guest_progress(text[], text[]) to authenticated;
