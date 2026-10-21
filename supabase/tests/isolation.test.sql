-- Three real-looking accounts doing real things, then every way one can reach another (or anyone can reach the
-- official numbers). Also pins the whole API surface to an allowlist, so a future migration that accidentally opens a
-- table or function to the browser fails here.
insert into auth.users (id, email) values
  ('a7a7a7a7-0000-0000-0000-0000000000a7', 'alice@example.com'),
  ('b7b7b7b7-0000-0000-0000-0000000000b7', 'bob@example.com'),
  ('c7c7c7c7-0000-0000-0000-0000000000c7', 'carol@example.com');

-- ---- each account plays: stamps, a quiz answer, a public leaderboard name
reset role; set role authenticated;
set request.jwt.claim.sub = 'a7a7a7a7-0000-0000-0000-0000000000a7';
select public.mark_food_tried('bakarkhani') is not null as _ \gset
select public.record_quiz_answer('national-fish', 0) is not null as _ \gset
select public.set_my_profile('Alice A', true) is not null as _ \gset
reset role; set role authenticated;
set request.jwt.claim.sub = 'b7b7b7b7-0000-0000-0000-0000000000b7';
select public.mark_food_tried('gazipur-kathal') is not null as _ \gset
select public.set_my_profile('Bob B', true) is not null as _ \gset
reset role; set role authenticated;
set request.jwt.claim.sub = 'c7c7c7c7-0000-0000-0000-0000000000c7';
select public.mark_food_tried('bakarkhani') is not null as _ \gset

-- ---- known-good numbers, read as the owner of the database
reset role;
create temp table before_totals as
  select user_id, sum(xp_awarded)::int as xp, (select count(*) from public.user_food_progress f where f.user_id = e.user_id) as stamps
    from public.xp_events e where user_id::text like '%7' || '%' group by user_id;
grant select on before_totals to authenticated, anon;

-- ---- every private table: a user sees only their own rows, and can change none of them, not even their own
reset role; set role authenticated;
set request.jwt.claim.sub = 'a7a7a7a7-0000-0000-0000-0000000000a7';
do $$
declare
  t text; n int; stmt text;
  others text := $q$'b7b7b7b7-0000-0000-0000-0000000000b7'$q$;
begin
  -- reads
  foreach t in array array['profiles', 'user_food_progress', 'user_challenge_progress', 'user_badges', 'quiz_attempts', 'xp_events'] loop
    execute format('select count(*) from public.%I where user_id <> auth.uid()', t) into n;
    if n <> 0 then raise exception 'A can read % rows of other people in %', n, t; end if;
    execute format('select count(*) from public.%I where user_id = %s', t, others) into n;
    if n <> 0 then raise exception 'A can read B rows in %', t; end if;
  end loop;
  if (select count(*) from public.xp_events) < 1 then raise exception 'A cannot read own XP'; end if;

  -- writes: every one of these must be refused outright
  foreach stmt in array array[
    $q$update public.xp_events set xp_awarded = 99999$q$,
    $q$update public.xp_events set xp_awarded = 99999 where user_id = 'b7b7b7b7-0000-0000-0000-0000000000b7'$q$,
    $q$insert into public.xp_events (user_id, event_type, reference_id, xp_awarded) values (auth.uid(), 'food_tried', 'made-up', 500)$q$,
    $q$delete from public.xp_events where user_id = 'b7b7b7b7-0000-0000-0000-0000000000b7'$q$,
    $q$delete from public.user_food_progress where user_id = 'b7b7b7b7-0000-0000-0000-0000000000b7'$q$,
    $q$insert into public.user_food_progress (user_id, food_id) values ('b7b7b7b7-0000-0000-0000-0000000000b7', 'bakarkhani')$q$,
    $q$insert into public.user_badges (user_id, badge_id) values (auth.uid(), 'first-bite')$q$,
    $q$update public.user_challenge_progress set completed_at = now()$q$,
    $q$update public.profiles set display_name = 'Pwned' where user_id = 'b7b7b7b7-0000-0000-0000-0000000000b7'$q$,
    $q$update public.profiles set display_name = 'Bypass' where user_id = auth.uid()$q$,
    $q$update public.profiles set leaderboard_opt_in = true where user_id = auth.uid()$q$,
    $q$update public.profiles set name_hidden = false where user_id = auth.uid()$q$,
    $q$update public.profiles set public_id = gen_random_uuid()$q$,
    $q$delete from public.profiles$q$,
    $q$insert into public.name_reports (reporter_id, reported_id) values (auth.uid(), auth.uid())$q$,
    $q$select * from public.name_reports$q$,
    $q$select * from public.blocked_terms$q$,
    $q$select * from public.quiz_questions$q$,
    $q$update public.foods set xp = 9999$q$,
    $q$insert into public.badges (id, name_bn, name_en, description_bn, description_en, unlock_rule) values ('x', 'x', 'x', 'x', 'x', '{}')$q$,
    $q$delete from auth.users$q$,
    $q$select * from auth.users$q$
  ] loop
    begin
      execute stmt;
      raise exception 'allowed: %', stmt;
    exception when insufficient_privilege then null;
    end;
  end loop;

  -- A's own legitimate calls cannot be pointed at another account: no function takes an account id
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')
       and (coalesce(p.proargnames, '{}'::text[]) && array['p_user', 'p_user_id', 'user_id', 'p_uid'])
  ) then raise exception 'an API function accepts an account id'; end if;
end $$;

-- A cannot delete B's account through the self-service function either; it only ever deletes the caller
do $$
begin
  perform public.delete_my_account();   -- Alice leaves; it must not touch anyone else
end $$;
reset role;
do $$
begin
  if exists (select 1 from auth.users where id = 'a7a7a7a7-0000-0000-0000-0000000000a7') then raise exception 'delete_my_account did not delete the caller'; end if;
  if (select count(*) from auth.users where id in ('b7b7b7b7-0000-0000-0000-0000000000b7', 'c7c7c7c7-0000-0000-0000-0000000000c7')) <> 2 then raise exception 'B or C was deleted'; end if;
  if (select sum(xp) from before_totals where user_id = 'b7b7b7b7-0000-0000-0000-0000000000b7') <>
     (select sum(xp_awarded) from public.xp_events where user_id = 'b7b7b7b7-0000-0000-0000-0000000000b7') then raise exception 'B XP changed'; end if;
  if (select sum(xp) from before_totals where user_id = 'c7c7c7c7-0000-0000-0000-0000000000c7') <>
     (select sum(xp_awarded) from public.xp_events where user_id = 'c7c7c7c7-0000-0000-0000-0000000000c7') then raise exception 'C XP changed'; end if;
  if (select count(*) from public.user_food_progress where user_id in ('b7b7b7b7-0000-0000-0000-0000000000b7', 'c7c7c7c7-0000-0000-0000-0000000000c7')) <> 2 then raise exception 'B/C stamps changed'; end if;
  if (select display_name from public.profiles where user_id = 'b7b7b7b7-0000-0000-0000-0000000000b7') <> 'Bob B' then raise exception 'B profile changed'; end if;
end $$;

-- ---- B and C see only themselves; the leaderboard shows Bob (opted in) and never Carol (not opted in)
reset role; set role authenticated;
set request.jwt.claim.sub = 'b7b7b7b7-0000-0000-0000-0000000000b7';
do $$
begin
  if (select count(*) from public.xp_events where user_id <> auth.uid()) <> 0 then raise exception 'B sees others'' XP'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'B sees other profiles'; end if;
  if not exists (select 1 from jsonb_array_elements(public.get_leaderboard() -> 'rows') x where x ->> 'display_name' = 'Bob B' and (x ->> 'is_me')::boolean) then raise exception 'Bob missing from board'; end if;
end $$;
reset role; set role authenticated;
set request.jwt.claim.sub = 'c7c7c7c7-0000-0000-0000-0000000000c7';
do $$
begin
  if exists (select 1 from jsonb_array_elements(public.get_leaderboard() -> 'rows') x where x ->> 'display_name' = 'Carol') then raise exception 'Carol is listed without opting in'; end if;
  if (select count(*) from public.user_food_progress where user_id <> auth.uid()) <> 0 then raise exception 'C sees others'' stamps'; end if;
end $$;

-- ---- anonymous visitors: read the public catalogue and the leaderboard, write nothing, read nothing private
reset role; set role anon;
do $$
declare t text; stmt text;
begin
  if (select count(*) from public.foods) <> 64 then raise exception 'anon should read the catalogue'; end if;
  foreach t in array array['profiles', 'user_food_progress', 'user_challenge_progress', 'user_badges', 'quiz_attempts', 'xp_events', 'name_reports', 'blocked_terms', 'quiz_questions'] loop
    begin
      execute format('select count(*) from public.%I', t);
      raise exception 'anon can read %', t;
    exception when insufficient_privilege then null;
    end;
  end loop;
  foreach stmt in array array[
    $q$insert into public.xp_events (user_id, event_type, reference_id, xp_awarded) values ('b7b7b7b7-0000-0000-0000-0000000000b7', 'food_tried', 'x', 1)$q$,
    $q$update public.xp_events set xp_awarded = 0$q$,
    $q$delete from public.user_food_progress$q$,
    $q$insert into public.profiles (user_id) values (gen_random_uuid())$q$,
    $q$update public.profiles set display_name = 'x'$q$,
    $q$insert into public.foods (id, name_bn, name_en, description_bn, description_en, category, scope, xp, verification_status) values ('z','z','z','z','z','z','national',1,'unverified')$q$,
    $q$update public.foods set xp = 1$q$,
    $q$delete from public.badges$q$,
    $q$select public.mark_food_tried('bakarkhani')$q$,
    $q$select public.merge_guest_progress('{bakarkhani}', '{}')$q$,
    $q$select public.set_my_profile('Anon', false)$q$,
    $q$select public.delete_my_account()$q$,
    $q$select public.my_leaderboard_rank()$q$
  ] loop
    begin
      execute stmt;
      raise exception 'anon allowed: %', stmt;
    exception when insufficient_privilege then null;
    end;
  end loop;
  if jsonb_array_length(public.get_leaderboard() -> 'rows') <> 1 then raise exception 'anon should see the public board (Bob only)'; end if;
end $$;

-- ---- the whole surface, pinned: anything new must be added here on purpose
reset role;
do $$
declare got text; want text;
begin
  -- tables: what each API role may do at all
  select string_agg(r || ':' || c.relname || ':' || p, ', ' order by r, c.relname, p) into got
    from pg_class c join pg_namespace n on n.oid = c.relnamespace,
         unnest(array['anon', 'authenticated']) r,
         unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) p
   where n.nspname = 'public' and c.relkind in ('r', 'v', 'p') and has_table_privilege(r, c.oid, p);
  want := 'anon:badges:SELECT, anon:challenges:SELECT, anon:foods:SELECT, '
       || 'authenticated:badges:SELECT, authenticated:challenges:SELECT, authenticated:foods:SELECT, '
       || 'authenticated:profiles:SELECT, authenticated:quiz_attempts:SELECT, authenticated:user_badges:SELECT, '
       || 'authenticated:user_challenge_progress:SELECT, authenticated:user_food_progress:SELECT, authenticated:xp_events:SELECT';
  if got is distinct from want then raise exception E'table privileges changed.\n got:  %\n want: %', got, want; end if;

  -- no column-level write grants hiding behind the table-level check
  if exists (select 1 from information_schema.column_privileges where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC') and privilege_type in ('INSERT', 'UPDATE')) then
    raise exception 'a column write privilege exists for the API roles';
  end if;

  -- functions: what each API role may execute
  select string_agg(r || ':' || p.proname, ', ' order by r, p.proname) into got
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace, unnest(array['anon', 'authenticated']) r
   where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege(r, p.oid, 'execute');
  want := 'anon:get_leaderboard, anon:get_site_stats, anon:record_download, anon:record_visit, '
       || 'authenticated:delete_my_account, authenticated:get_leaderboard, authenticated:get_site_stats, authenticated:mark_food_tried, authenticated:merge_guest_progress, '
       || 'authenticated:my_leaderboard_rank, authenticated:my_xp_total, authenticated:record_download, authenticated:record_quiz_answer, authenticated:record_visit, authenticated:report_display_name, '
       || 'authenticated:set_my_profile, authenticated:unmark_food_tried';
  if got is distinct from want then raise exception E'function privileges changed.\n got:  %\n want: %', got, want; end if;

  -- every table has row level security on
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity) then
    raise exception 'a public table has row level security off';
  end if;
end $$;

-- leave the shared test database as we found it (later test files count leaderboard rows)
reset role;
delete from auth.users where id in ('b7b7b7b7-0000-0000-0000-0000000000b7', 'c7c7c7c7-0000-0000-0000-0000000000c7');

select 'isolation tests passed' as result;
