-- Footer counters: registered users, total visitors, people who downloaded a passport. ("Online now" is Supabase
-- Realtime presence in the browser and stores nothing.)
--
-- Privacy: a visitor is a random id the browser makes up and keeps in its own storage. It is not linked to an account,
-- an email or anything else, and the tables are not readable through the API. Only the three totals leave the database.
-- Honest limit: anyone can invent ids, so the numbers are a friendly indicator, not an audited statistic.

create table public.visitors (
  visitor_id  uuid primary key,
  first_seen  date not null default current_date,
  last_seen   date not null default current_date
);
create table public.downloaders (
  visitor_id  uuid primary key,
  first_at    timestamptz not null default now()
);
alter table public.visitors enable row level security;
alter table public.downloaders enable row level security;
revoke all on public.visitors, public.downloaders from anon, authenticated;

-- once per browser (a repeat visit only moves last_seen to today)
create function public.record_visit(p_visitor uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_visitor is null then return; end if;
  insert into public.visitors (visitor_id) values (p_visitor)
    on conflict (visitor_id) do update set last_seen = current_date;
end;
$$;

-- someone downloaded their passport (image or PDF). Counted once per browser.
create function public.record_download(p_visitor uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_visitor is null then return; end if;
  insert into public.visitors (visitor_id) values (p_visitor) on conflict (visitor_id) do nothing;
  insert into public.downloaders (visitor_id) values (p_visitor) on conflict (visitor_id) do nothing;
end;
$$;

-- people who really have an account: the email link was opened (asking for a link alone does not count)
create function public.get_site_stats() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'users', (select count(*) from auth.users where email_confirmed_at is not null),
    'visitors', (select count(*) from public.visitors),
    'downloads', (select count(*) from public.downloaders)
  )
$$;

revoke all on function public.record_visit(uuid) from public, anon, authenticated;
revoke all on function public.record_download(uuid) from public, anon, authenticated;
revoke all on function public.get_site_stats() from public, anon, authenticated;
grant execute on function public.record_visit(uuid) to anon, authenticated;
grant execute on function public.record_download(uuid) to anon, authenticated;
grant execute on function public.get_site_stats() to anon, authenticated;
