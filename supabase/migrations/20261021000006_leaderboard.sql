-- Public leaderboard (Plan C, step 6). A community progress ranking for people who chose to be on it; it says nothing
-- about anyone who did not opt in.
--
-- What leaves the database: rank, a public handle, the display name, XP, stamps and badges. Never an email, never the
-- account id. The public handle (profiles.public_id) is a random value that exists only so a name can be reported.
--
-- Order: more XP first. Equal XP: whoever reached that XP first ranks higher. XP is append-only, so "when did this
-- person reach their current total" is the time of their latest XP-earning event. A final tie on both falls back to the
-- account id, which only keeps the order stable and is never returned.

alter table public.profiles add column public_id uuid not null default gen_random_uuid() unique;

-- reports now name the person by the public handle, not the account id
drop function public.report_display_name(uuid);

create function public.report_display_name(p_public_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target uuid;
  v_count integer;
  v_hidden boolean;
begin
  if v_user is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select user_id into v_target from public.profiles
    where public_id = p_public_id and leaderboard_opt_in and not name_hidden and display_name is not null;
  if v_target is null or v_target = v_user then raise exception 'not_reportable' using errcode = '22023'; end if;
  if (select count(*) from public.name_reports where reporter_id = v_user and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too_many_reports' using errcode = '22023';
  end if;

  insert into public.name_reports (reporter_id, reported_id) values (v_user, v_target) on conflict do nothing;
  select count(*) into v_count from public.name_reports where reported_id = v_target;
  v_hidden := v_count >= 3;
  if v_hidden then update public.profiles set name_hidden = true where user_id = v_target; end if;
  return jsonb_build_object('reported', true, 'hidden', v_hidden);
end;
$$;

-- every account with XP, in rank order (internal; includes accounts that are not on the board, for "your rank")
create function public.ranked_players() returns table (user_id uuid, rank bigint, xp bigint, reached_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select e.user_id,
         row_number() over (order by sum(e.xp_awarded) desc, max(e.created_at) filter (where e.xp_awarded > 0) asc, e.user_id) as rank,
         sum(e.xp_awarded)::bigint as xp,
         max(e.created_at) filter (where e.xp_awarded > 0) as reached_at
    from public.xp_events e
   group by e.user_id
  having sum(e.xp_awarded) > 0
$$;

create function public.get_leaderboard(p_limit integer default 50, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  v_offset integer := least(greatest(coalesce(p_offset, 0), 0), 950);
  v_rows jsonb;
  v_total integer;
begin
  select count(*) into v_total from public.profiles where leaderboard_opt_in and not name_hidden and display_name is not null;

  -- rank among the people on the board only (1, 2, 3 ...), in the order described above
  select coalesce(jsonb_agg(row_to_json(r) order by r.rank), '[]'::jsonb) into v_rows from (
    select row_number() over (order by p.xp desc, p.reached_at asc, p.user_id) as rank,
           pr.public_id, pr.display_name, p.xp,
           (select count(*) from public.user_food_progress f where f.user_id = p.user_id) as stamps,
           (select count(*) from public.user_badges b where b.user_id = p.user_id) as badges,
           p.user_id = auth.uid() as is_me
      from public.ranked_players() p
      join public.profiles pr on pr.user_id = p.user_id
     where pr.leaderboard_opt_in and not pr.name_hidden and pr.display_name is not null
     order by p.xp desc, p.reached_at asc, p.user_id
     limit v_limit offset v_offset
  ) r;
  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

-- Where you stand, for you only. Counts the people on the board who are ahead of you, whether or not you are on it.
create function public.my_leaderboard_rank() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_me record;
  v_ahead integer;
  v_on boolean;
begin
  if v_user is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select leaderboard_opt_in and not name_hidden and display_name is not null into v_on from public.profiles where user_id = v_user;
  select xp, reached_at into v_me from public.ranked_players() where user_id = v_user;
  if v_me.xp is null then return jsonb_build_object('xp', 0, 'rank', null, 'on_board', coalesce(v_on, false)); end if;
  select count(*) into v_ahead from public.ranked_players() p join public.profiles pr on pr.user_id = p.user_id
    where pr.leaderboard_opt_in and not pr.name_hidden and pr.display_name is not null and p.user_id <> v_user
      and (p.xp > v_me.xp or (p.xp = v_me.xp and (p.reached_at < v_me.reached_at or (p.reached_at = v_me.reached_at and p.user_id < v_user))));
  return jsonb_build_object('xp', v_me.xp, 'rank', v_ahead + 1, 'on_board', coalesce(v_on, false));
end;
$$;

revoke all on function public.report_display_name(uuid) from public, anon, authenticated;
revoke all on function public.ranked_players() from public, anon, authenticated;
revoke all on function public.get_leaderboard(integer, integer) from public, anon, authenticated;
revoke all on function public.my_leaderboard_rank() from public, anon, authenticated;
grant execute on function public.report_display_name(uuid) to authenticated;
grant execute on function public.get_leaderboard(integer, integer) to anon, authenticated;
grant execute on function public.my_leaderboard_rank() to authenticated;
