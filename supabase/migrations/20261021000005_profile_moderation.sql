-- Profile and leaderboard opt-in (Plan C, step 5).
--
-- A display name is public text on the leaderboard, so it never goes straight into the table. Users stop having direct
-- UPDATE rights on profiles; the only way to change a name or the opt-in is set_my_profile(), which enforces:
--   * length 2-24 after trimming, single spaces
--   * characters: Latin letters, digits, Bengali script, space . _ -   (no links, @, emoji or symbols)
--   * no web addresses and no long digit runs (phone numbers)
--   * no entry from the private blocked_terms list, checked against a normalised copy of the name (case, spacing,
--     punctuation and common digit-for-letter swaps like 0->o, 1->i, 3->e, 4->a, 5->s are ignored)
--   * leaderboard opt-in needs a name; the default is off
-- Anyone can report a leaderboard name; three different reporters hide it automatically until a person reviews it.
-- Reviewing is done in the Supabase dashboard with the service role (README, "Moderating names").

alter table public.profiles add column name_hidden boolean not null default false;

revoke update (display_name, leaderboard_opt_in) on public.profiles from authenticated;

-- ---------------------------------------------------------------- blocklist (no API access) ------------------

create table public.blocked_terms (term text primary key check (term = lower(term) and char_length(term) >= 3));
alter table public.blocked_terms enable row level security;
revoke all on public.blocked_terms from anon, authenticated;

-- Terms are stored in normalised form. Extend this list any time with plain INSERTs; no code change is needed.
insert into public.blocked_terms (term) values
  ('fuck'), ('shit'), ('bitch'), ('cunt'), ('nigger'), ('nigga'), ('faggot'), ('whore'), ('slut'), ('rapist'),
  ('nazi'), ('hitler'), ('porn'), ('asshole'), ('bastard'),
  ('khanki'), ('magi'), ('haramjada'), ('harami'), ('bessha'),
  ('চোদ'), ('মাগি'), ('মাগী'), ('খানকি'), ('হারামি'), ('হারামজাদা'), ('বেশ্যা'), ('শুয়োর'),
  ('admin'), ('moderator'), ('foodpassport'), ('support'), ('official');

-- ---------------------------------------------------------------- reports (no API access) --------------------

create table public.name_reports (
  reporter_id  uuid not null references auth.users (id) on delete cascade,
  reported_id  uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (reporter_id, reported_id)
);
alter table public.name_reports enable row level security;
revoke all on public.name_reports from anon, authenticated;

-- ---------------------------------------------------------------- helpers ---------------------------------------

create function public.normalise_name(p text) returns text
language sql immutable set search_path = ''
as $$
  select regexp_replace(
    translate(lower(p), '0134579@$', 'oieastgas'),
    '[^a-zঀ-৿]', '', 'g')
$$;

-- Returns the cleaned name, or raises with one of: name_length, name_chars, name_link, name_blocked.
create function public.clean_display_name(p text) returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v text := btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g'));
begin
  if char_length(v) < 2 or char_length(v) > 24 then
    raise exception 'name_length' using errcode = '22023';
  end if;
  if v ~ '[^A-Za-z0-9 ._À-ɏঀ-৿‌‍-]' then
    raise exception 'name_chars' using errcode = '22023';
  end if;
  if exists (select 1 from public.blocked_terms b where position(b.term in public.normalise_name(v)) > 0) then
    raise exception 'name_blocked' using errcode = '22023';
  end if;
  if lower(v) ~ '(https?|www|[a-z0-9]\.[a-z]{2,})' or regexp_replace(v, '[ ._-]', '', 'g') ~ '[0-9]{7,}' then
    raise exception 'name_link' using errcode = '22023';
  end if;
  return v;
end;
$$;

-- ---------------------------------------------------------------- the API ---------------------------------------

create function public.set_my_profile(p_name text, p_opt_in boolean) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_old text;
  v_name text;
  v_hidden boolean;
begin
  if v_user is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select display_name, name_hidden into v_old, v_hidden from public.profiles where user_id = v_user for update;

  if p_name is null or btrim(p_name) = '' then
    if coalesce(p_opt_in, false) then raise exception 'name_required' using errcode = '22023'; end if;
    v_name := null;
  else
    v_name := public.clean_display_name(p_name);
  end if;

  -- a new name starts clean (it just passed the filter again); the same name stays hidden until a person reviews it
  if v_name is distinct from v_old then
    v_hidden := false;
    delete from public.name_reports where reported_id = v_user;
  end if;

  update public.profiles set display_name = v_name, leaderboard_opt_in = coalesce(p_opt_in, false), name_hidden = v_hidden
    where user_id = v_user;
  return jsonb_build_object('display_name', v_name, 'leaderboard_opt_in', coalesce(p_opt_in, false), 'name_hidden', v_hidden);
end;
$$;

create function public.report_display_name(p_user uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
  v_hidden boolean;
begin
  if v_user is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if p_user = v_user then raise exception 'not_reportable' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where user_id = p_user and leaderboard_opt_in and not name_hidden and display_name is not null) then
    raise exception 'not_reportable' using errcode = '22023';
  end if;
  if (select count(*) from public.name_reports where reporter_id = v_user and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too_many_reports' using errcode = '22023';
  end if;

  insert into public.name_reports (reporter_id, reported_id) values (v_user, p_user) on conflict do nothing;
  select count(*) into v_count from public.name_reports where reported_id = p_user;
  v_hidden := v_count >= 3;
  if v_hidden then update public.profiles set name_hidden = true where user_id = p_user; end if;
  return jsonb_build_object('reported', true, 'hidden', v_hidden);
end;
$$;

revoke all on function public.normalise_name(text) from public, anon, authenticated;
revoke all on function public.clean_display_name(text) from public, anon, authenticated;
revoke all on function public.set_my_profile(text, boolean) from public, anon, authenticated;
revoke all on function public.report_display_name(uuid) from public, anon, authenticated;
grant execute on function public.set_my_profile(text, boolean) to authenticated;
grant execute on function public.report_display_name(uuid) to authenticated;
