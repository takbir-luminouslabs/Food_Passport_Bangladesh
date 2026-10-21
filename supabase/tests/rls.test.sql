-- Permission tests. Each block raises an exception on failure, which stops the run.

-- two accounts; the trigger creates their profile rows
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@example.com');

-- trusted-side rows (inserted by the postgres superuser, as the server functions will)
insert into public.user_food_progress (user_id, food_id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'bakarkhani'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'chandpur-ilish');
insert into public.xp_events (user_id, event_type, reference_id, xp_awarded) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'food_tried', 'bakarkhani', 10),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'food_tried', 'chandpur-ilish', 10);
insert into public.user_badges (user_id, badge_id)
  select 'bbbbbbbb-0000-0000-0000-00000000000b', id from public.badges limit 1;
insert into public.quiz_attempts (user_id, quiz_id, score) values ('bbbbbbbb-0000-0000-0000-00000000000b', 'q', 3);
insert into public.user_challenge_progress (user_id, challenge_id, progress)
  select 'bbbbbbbb-0000-0000-0000-00000000000b', id, 1 from public.challenges limit 1;

-- ---- every table the browser can reach has RLS switched on
do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity loop
    raise exception 'RLS is off on public.%', t;
  end loop;
end $$;

-- ---- the seed matches the site's catalogue
do $$
begin
  if (select count(*) from public.foods) <> 64 then raise exception 'expected 64 foods'; end if;
  if (select count(distinct district_en) from public.foods) <> 64 then raise exception 'expected one food per district'; end if;
end $$;

-- ---- signed in as A
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a';

do $$
declare n int;
begin
  -- sees only own rows
  select count(*) into n from public.profiles;                 if n <> 1 then raise exception 'A should see 1 profile, saw %', n; end if;
  select count(*) into n from public.user_food_progress;       if n <> 1 then raise exception 'A should see own progress only'; end if;
  select count(*) into n from public.xp_events;                if n <> 1 then raise exception 'A should see own xp only'; end if;
  select count(*) into n from public.user_badges;              if n <> 0 then raise exception 'A must not see B badges'; end if;
  select count(*) into n from public.quiz_attempts;            if n <> 0 then raise exception 'A must not see B quiz attempts'; end if;
  select count(*) into n from public.user_challenge_progress;  if n <> 0 then raise exception 'A must not see B challenge progress'; end if;
  select count(*) into n from public.foods;                    if n <> 64 then raise exception 'content should be readable'; end if;

  -- cannot touch B's profile
  update public.profiles set display_name = 'hacked' where user_id = 'bbbbbbbb-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;                                if n <> 0 then raise exception 'A edited B profile'; end if;

  -- may edit own name and opt in
  update public.profiles set display_name = 'Rafi', leaderboard_opt_in = true;
  get diagnostics n = row_count;                                if n <> 1 then raise exception 'A could not edit own profile'; end if;
end $$;

-- opting in without a name is refused by the table itself
do $$
begin
  begin
    update public.profiles set display_name = null;
    raise exception 'opt-in without a name was accepted';
  exception when check_violation then null;
  end;
end $$;

-- A cannot change official data: every one of these must be denied
do $$
declare stmt text;
begin
  foreach stmt in array array[
    $q$insert into public.xp_events (user_id, event_type, reference_id, xp_awarded) values (auth.uid(), 'food_tried', 'x', 999)$q$,
    $q$update public.xp_events set xp_awarded = 9999$q$,
    $q$delete from public.xp_events$q$,
    $q$insert into public.user_food_progress (user_id, food_id) values (auth.uid(), 'chandpur-ilish')$q$,
    $q$delete from public.user_food_progress$q$,
    $q$insert into public.user_badges (user_id, badge_id) select auth.uid(), id from public.badges limit 1$q$,
    $q$insert into public.quiz_attempts (user_id, quiz_id, score) values (auth.uid(), 'q', 100)$q$,
    $q$insert into public.user_challenge_progress (user_id, challenge_id) select auth.uid(), id from public.challenges limit 1$q$,
    $q$update public.foods set xp = 9999$q$,
    $q$delete from public.foods$q$,
    $q$update public.challenges set xp_reward = 9999$q$,
    $q$update public.profiles set user_id = 'bbbbbbbb-0000-0000-0000-00000000000b'$q$,
    $q$update public.profiles set created_at = now() - interval '10 years'$q$,
    $q$insert into public.profiles (user_id) values (auth.uid())$q$
  ] loop
    begin
      execute stmt;
      raise exception 'this should have been denied: %', stmt;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;

-- ---- signed in as B: sees only their own, and none of A's
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-00000000000b';
do $$
declare n int;
begin
  select count(*) into n from public.profiles where display_name = 'Rafi'; if n <> 0 then raise exception 'B saw A profile'; end if;
  select count(*) into n from public.xp_events;                            if n <> 1 then raise exception 'B should see own xp only'; end if;
  select count(*) into n from public.user_food_progress where food_id = 'bakarkhani'; if n <> 0 then raise exception 'B saw A progress'; end if;
  select count(*) into n from public.user_badges;                          if n <> 1 then raise exception 'B lost own badge'; end if;
end $$;

-- ---- signed out (anon): content only, nothing private
reset request.jwt.claim.sub;
set role anon;
do $$
declare n int; t text;
begin
  select count(*) into n from public.foods;       if n <> 64 then raise exception 'anon should read foods'; end if;
  select count(*) into n from public.badges;      if n = 0 then raise exception 'anon should read badges'; end if;
  foreach t in array array['profiles', 'xp_events', 'user_food_progress', 'user_badges', 'quiz_attempts', 'user_challenge_progress'] loop
    begin
      execute format('select count(*) from public.%I', t);
      raise exception 'anon could read %', t;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;

-- ---- back to the trusted side: the unique key stops a repeat reward, deleting an account removes everything
reset role;
do $$
begin
  begin
    insert into public.xp_events (user_id, event_type, reference_id, xp_awarded)
      values ('aaaaaaaa-0000-0000-0000-00000000000a', 'food_tried', 'bakarkhani', 10);
    raise exception 'the same event paid XP twice';
  exception when unique_violation then null;
  end;
  begin
    insert into public.user_food_progress (user_id, food_id) values ('aaaaaaaa-0000-0000-0000-00000000000a', 'bakarkhani');
    raise exception 'duplicate stamp accepted';
  exception when unique_violation then null;
  end;
end $$;

delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
do $$
begin
  if exists (select 1 from public.profiles where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a')
     or exists (select 1 from public.xp_events where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a')
     or exists (select 1 from public.user_food_progress where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a') then
    raise exception 'deleting the account left data behind';
  end if;
end $$;

select 'rls tests passed' as result;
