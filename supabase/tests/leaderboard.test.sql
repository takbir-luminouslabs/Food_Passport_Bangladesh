-- Leaderboard: opt-in only, no private data, tie-break by who reached the XP first, hidden names vanish.
insert into auth.users (id, email) select ('3000000' || n || '-0000-0000-0000-000000000000')::uuid, 'lb' || n || '@example.com'
  from generate_series(1, 6) n;

-- XP is set up directly (as the table owner) so the timestamps are exact:
--   1 Ayesha 30xp reached 10:00, 2 Bilal 30xp reached 09:00, 3 Chitra 50xp, 4 Dipu 20xp (opted out), 5 Eshita 10xp, 6 Farhan 30xp reached 09:00 (same instant as Bilal)
insert into public.xp_events (user_id, event_type, reference_id, xp_awarded, created_at) values
  ('30000001-0000-0000-0000-000000000000', 'food_tried', 'bakarkhani',  10, '2030-01-01 08:00+00'),
  ('30000001-0000-0000-0000-000000000000', 'food_tried', 'mishti-doi',  20, '2030-01-01 10:00+00'),
  ('30000002-0000-0000-0000-000000000000', 'food_tried', 'bakarkhani',  30, '2030-01-01 09:00+00'),
  ('30000003-0000-0000-0000-000000000000', 'food_tried', 'bakarkhani',  50, '2030-01-01 12:00+00'),
  ('30000004-0000-0000-0000-000000000000', 'food_tried', 'bakarkhani',  20, '2030-01-01 07:00+00'),
  ('30000005-0000-0000-0000-000000000000', 'food_tried', 'bakarkhani',  10, '2030-01-01 07:00+00'),
  ('30000006-0000-0000-0000-000000000000', 'food_tried', 'bakarkhani',  30, '2030-01-01 09:00+00');
update public.profiles set display_name = 'Ayesha', leaderboard_opt_in = true where user_id = '30000001-0000-0000-0000-000000000000';
update public.profiles set display_name = 'Bilal',  leaderboard_opt_in = true where user_id = '30000002-0000-0000-0000-000000000000';
update public.profiles set display_name = 'Chitra', leaderboard_opt_in = true where user_id = '30000003-0000-0000-0000-000000000000';
update public.profiles set display_name = 'Dipu',   leaderboard_opt_in = false where user_id = '30000004-0000-0000-0000-000000000000';
update public.profiles set display_name = 'Eshita', leaderboard_opt_in = true where user_id = '30000005-0000-0000-0000-000000000000';
update public.profiles set display_name = 'Farhan', leaderboard_opt_in = true where user_id = '30000006-0000-0000-0000-000000000000';
insert into public.user_food_progress (user_id, food_id) values ('30000002-0000-0000-0000-000000000000', 'bakarkhani');

-- the public (signed out) can read it
set role anon;
do $$
declare r jsonb; names text; k text;
begin
  r := public.get_leaderboard();
  select string_agg(x ->> 'display_name', ',' order by (x ->> 'rank')::int) into names from jsonb_array_elements(r -> 'rows') x;
  -- Chitra 50; then the three on 30 XP: Bilal and Farhan (09:00, Bilal's account id sorts first), Ayesha (10:00); then Eshita. Dipu is not on the board.
  if names <> 'Chitra,Bilal,Farhan,Ayesha,Eshita' then raise exception 'wrong order: %', names; end if;
  if (r ->> 'total')::int <> 5 then raise exception 'wrong total: %', r ->> 'total'; end if;
  if (r -> 'rows' -> 1 ->> 'stamps')::int <> 1 then raise exception 'stamps missing: %', r -> 'rows' -> 1; end if;

  -- only these fields ever leave: no email, no account id
  for k in select jsonb_object_keys(r -> 'rows' -> 0) loop
    if k not in ('rank', 'public_id', 'display_name', 'xp', 'stamps', 'badges', 'is_me') then raise exception 'unexpected field %', k; end if;
  end loop;
  if r::text like '%lb%@example.com%' or r::text like '%30000001-0000%' then raise exception 'private data in leaderboard'; end if;
  if (select bool_or((x ->> 'is_me')::boolean) from jsonb_array_elements(r -> 'rows') x) then raise exception 'signed-out viewer flagged as someone'; end if;

  -- paging and limits
  r := public.get_leaderboard(2, 0);
  if jsonb_array_length(r -> 'rows') <> 2 then raise exception 'limit ignored'; end if;
  r := public.get_leaderboard(2, 2);
  if r -> 'rows' -> 0 ->> 'display_name' <> 'Farhan' or (r -> 'rows' -> 0 ->> 'rank')::int <> 3 then raise exception 'page 2 wrong: %', r; end if;
  if jsonb_array_length(public.get_leaderboard(100000, -5) -> 'rows') <> 5 then raise exception 'huge limit / negative offset mishandled'; end if;
  begin perform public.my_leaderboard_rank(); raise exception 'anon read a personal rank';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.ranked_players(); raise exception 'anon called ranked_players';
  exception when insufficient_privilege then null; end;
end $$;

-- the tie is by time, not by name or id: make Farhan reach 30 XP earlier than Bilal and the order flips
reset role;
update public.xp_events set created_at = '2030-01-01 08:30+00' where user_id = '30000006-0000-0000-0000-000000000000';
set role anon;
do $$
declare names text;
begin
  select string_agg(x ->> 'display_name', ',' order by (x ->> 'rank')::int) into names from jsonb_array_elements(public.get_leaderboard() -> 'rows') x;
  if names <> 'Chitra,Farhan,Bilal,Ayesha,Eshita' then raise exception 'earlier to reach XP must rank higher: %', names; end if;
end $$;

-- a signed-in viewer sees themselves flagged, and their own rank, on or off the board
reset role; set role authenticated;
set request.jwt.claim.sub = '30000001-0000-0000-0000-000000000000';
do $$
declare r jsonb;
begin
  if not (select (x ->> 'is_me')::boolean from jsonb_array_elements(public.get_leaderboard() -> 'rows') x where x ->> 'display_name' = 'Ayesha') then
    raise exception 'viewer not flagged';
  end if;
  if (select count(*) from jsonb_array_elements(public.get_leaderboard() -> 'rows') x where (x ->> 'is_me')::boolean) <> 1 then raise exception 'more than one is_me'; end if;
  r := public.my_leaderboard_rank();
  if (r ->> 'rank')::int <> 4 or (r ->> 'xp')::int <> 30 or not (r ->> 'on_board')::boolean then raise exception 'wrong own rank: %', r; end if;
end $$;
reset role; set role authenticated;
set request.jwt.claim.sub = '30000004-0000-0000-0000-000000000000';   -- Dipu, 20 XP, not opted in: sees where they would be, public never does
do $$
declare r jsonb;
begin
  r := public.my_leaderboard_rank();
  if (r ->> 'rank')::int <> 5 or (r ->> 'on_board')::boolean then raise exception 'opted-out rank wrong: %', r; end if;
  if exists (select 1 from jsonb_array_elements(public.get_leaderboard() -> 'rows') x where x ->> 'display_name' = 'Dipu') then raise exception 'opted-out user is listed'; end if;
end $$;

-- hidden (reported) names and deleted accounts disappear; opting out removes you at once
reset role;
update public.profiles set name_hidden = true where user_id = '30000002-0000-0000-0000-000000000000';
update public.profiles set leaderboard_opt_in = false where user_id = '30000005-0000-0000-0000-000000000000';
delete from auth.users where id = '30000003-0000-0000-0000-000000000000';
set role anon;
do $$
declare names text;
begin
  select string_agg(x ->> 'display_name', ',' order by (x ->> 'rank')::int) into names from jsonb_array_elements(public.get_leaderboard() -> 'rows') x;
  if names <> 'Farhan,Ayesha' then raise exception 'hidden / opted-out / deleted still listed: %', names; end if;
end $$;
reset role;

select 'leaderboard tests passed' as result;
