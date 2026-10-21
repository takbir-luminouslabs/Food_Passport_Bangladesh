-- Food Passport Bangladesh: cloud schema (PRD section 9).
--
-- Rules this schema enforces:
--  * Content tables (foods, challenges, badges) are public read-only reference data.
--  * Every user-owned table has row level security: a signed-in user can only read their own rows.
--  * Nothing the leaderboard or XP depends on can be written by the browser. Progress, XP, badges and quiz rows are
--    written only by trusted SECURITY DEFINER functions (added in the next migration), never directly by clients.
--  * Only profiles.display_name and profiles.leaderboard_opt_in can be edited by the user.

-- ---------------------------------------------------------------- content (reference data) ----------------------

create table public.foods (
  id                      text primary key,
  name_bn                 text not null,
  name_en                 text not null,
  description_bn          text not null,
  description_en          text not null,
  category                text not null,
  scope                   text not null check (scope in ('regional', 'national')),
  district_en             text,
  district_bn             text,
  division                text,
  xp                      integer not null check (xp >= 0),
  image_url               text,
  image_attribution       text,
  source_url              text,
  verification_status     text not null check (verification_status in ('unverified', 'verified')),
  association_confidence  text check (association_confidence in ('high', 'medium', 'low')),
  created_at              timestamptz not null default now()
);

create table public.challenges (
  id               text primary key,
  challenge_type   text not null,
  title_bn         text not null,
  title_en         text not null,
  description_bn   text not null,
  description_en   text not null,
  rules            jsonb not null,
  xp_reward        integer not null check (xp_reward >= 0),
  is_active        boolean not null default true
);

create table public.badges (
  id               text primary key,
  name_bn          text not null,
  name_en          text not null,
  description_bn   text not null,
  description_en   text not null,
  unlock_rule      jsonb not null
);

-- ---------------------------------------------------------------- accounts ---------------------------------------

create table public.profiles (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  display_name         text check (display_name is null or char_length(btrim(display_name)) between 2 and 24),
  leaderboard_opt_in   boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- being on the public leaderboard needs a name to show
  constraint opt_in_needs_name check (not leaderboard_opt_in or display_name is not null)
);

-- ---------------------------------------------------------------- user progress ----------------------------------

create table public.user_food_progress (
  user_id   uuid not null references auth.users (id) on delete cascade,
  food_id   text not null references public.foods (id),
  tried_at  timestamptz not null default now(),
  primary key (user_id, food_id)
);

create table public.user_challenge_progress (
  user_id        uuid not null references auth.users (id) on delete cascade,
  challenge_id   text not null references public.challenges (id),
  progress       integer not null default 0 check (progress >= 0),
  completed_at   timestamptz,
  primary key (user_id, challenge_id)
);

create table public.user_badges (
  user_id    uuid not null references auth.users (id) on delete cascade,
  badge_id   text not null references public.badges (id),
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  quiz_id     text not null,
  score       integer not null check (score >= 0),
  created_at  timestamptz not null default now()
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id, created_at desc);

-- The source of truth for XP. The unique key is what stops the same eligible event paying twice.
create table public.xp_events (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  event_type   text not null check (event_type in ('food_tried', 'quiz_correct', 'challenge_completed')),
  reference_id text not null,
  xp_awarded   integer not null check (xp_awarded >= 0),
  created_at   timestamptz not null default now(),
  constraint xp_events_once unique (user_id, event_type, reference_id)
);
create index xp_events_user_idx on public.xp_events (user_id);

-- ---------------------------------------------------------------- housekeeping triggers --------------------------

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Every new account gets a private profile row (no name, not on the leaderboard).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- row level security ----------------------------

alter table public.foods                   enable row level security;
alter table public.challenges              enable row level security;
alter table public.badges                  enable row level security;
alter table public.profiles                enable row level security;
alter table public.user_food_progress      enable row level security;
alter table public.user_challenge_progress enable row level security;
alter table public.user_badges             enable row level security;
alter table public.quiz_attempts           enable row level security;
alter table public.xp_events               enable row level security;

-- content: anyone may read, nobody may write through the API
create policy foods_read      on public.foods      for select to anon, authenticated using (true);
create policy challenges_read on public.challenges for select to anon, authenticated using (true);
create policy badges_read     on public.badges     for select to anon, authenticated using (true);

-- profiles: you see and edit only your own (the public leaderboard reads through a restricted function later)
create policy profiles_select_own on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- private progress: read your own, write nothing directly
create policy food_progress_select_own  on public.user_food_progress      for select to authenticated using (user_id = (select auth.uid()));
create policy challenge_select_own      on public.user_challenge_progress  for select to authenticated using (user_id = (select auth.uid()));
create policy badges_select_own         on public.user_badges              for select to authenticated using (user_id = (select auth.uid()));
create policy quiz_select_own           on public.quiz_attempts            for select to authenticated using (user_id = (select auth.uid()));
create policy xp_select_own             on public.xp_events                for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- privileges (second line of defence) -----------
-- RLS decides which rows; grants decide which operations at all. Start from nothing and add only what is needed.

revoke all on all tables in schema public from anon, authenticated;

grant select on public.foods, public.challenges, public.badges to anon, authenticated;
grant select on public.user_food_progress, public.user_challenge_progress, public.user_badges,
                public.quiz_attempts, public.xp_events to authenticated;
grant select on public.profiles to authenticated;
-- the only fields a user may change on their own profile
grant update (display_name, leaderboard_opt_in) on public.profiles to authenticated;

-- future tables and functions in this schema are not exposed to the API unless a migration grants them
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;
