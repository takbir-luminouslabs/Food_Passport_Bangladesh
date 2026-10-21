-- Footer counters: anyone can add themselves once, only totals come back, nothing private is readable.
insert into auth.users (id, email, email_confirmed_at) values
  ('51515151-0000-0000-0000-000000000051', 's1@example.com', now()),
  ('52525252-0000-0000-0000-000000000052', 's2@example.com', now()),
  ('53535353-0000-0000-0000-000000000053', 'asked-but-never-opened@example.com', null);

select set_config('app.confirmed', (select count(*) from auth.users where email_confirmed_at is not null)::text, false) as _ \gset

set role anon;
do $$
declare s jsonb; before_v int; before_d int; k text;
begin
  s := public.get_site_stats();
  before_v := (s ->> 'visitors')::int; before_d := (s ->> 'downloads')::int;

  perform public.record_visit('aaaaaaaa-1111-1111-1111-111111111111');
  perform public.record_visit('aaaaaaaa-1111-1111-1111-111111111111');   -- same browser again
  perform public.record_visit('bbbbbbbb-2222-2222-2222-222222222222');
  perform public.record_visit(null);                                      -- ignored
  s := public.get_site_stats();
  if (s ->> 'visitors')::int <> before_v + 2 then raise exception 'visits should count each browser once: %', s; end if;

  perform public.record_download('aaaaaaaa-1111-1111-1111-111111111111');
  perform public.record_download('aaaaaaaa-1111-1111-1111-111111111111');
  perform public.record_download('cccccccc-3333-3333-3333-333333333333');  -- downloaded before ever "visiting": also a visitor
  perform public.record_download(null);
  s := public.get_site_stats();
  if (s ->> 'downloads')::int <> before_d + 2 then raise exception 'downloads should count each person once: %', s; end if;
  if (s ->> 'visitors')::int <> before_v + 3 then raise exception 'a downloader is also a visitor: %', s; end if;

  -- people who never opened their link are not users
  if (s ->> 'users')::int <> current_setting('app.confirmed')::int then raise exception 'wrong user count: % vs %', s ->> 'users', current_setting('app.confirmed'); end if;

  -- only the three totals come back
  for k in select jsonb_object_keys(s) loop
    if k not in ('users', 'visitors', 'downloads') then raise exception 'unexpected field %', k; end if;
  end loop;

  -- the raw tables stay closed, for reading and writing
  begin perform 1 from public.visitors; raise exception 'anon reads visitors'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.downloaders; raise exception 'anon reads downloaders'; exception when insufficient_privilege then null; end;
  begin insert into public.visitors (visitor_id) values (gen_random_uuid()); raise exception 'anon wrote visitors'; exception when insufficient_privilege then null; end;
  begin delete from public.downloaders; raise exception 'anon deleted downloaders'; exception when insufficient_privilege then null; end;
end $$;

reset role; set role authenticated;
set request.jwt.claim.sub = '51515151-0000-0000-0000-000000000051';
do $$
begin
  perform public.record_visit('dddddddd-4444-4444-4444-444444444444');
  begin perform 1 from public.visitors; raise exception 'signed-in user reads visitors'; exception when insufficient_privilege then null; end;
  if public.get_site_stats() ->> 'users' is null then raise exception 'stats unavailable when signed in'; end if;
end $$;
reset role;
delete from auth.users where id in ('51515151-0000-0000-0000-000000000051', '52525252-0000-0000-0000-000000000052', '53535353-0000-0000-0000-000000000053');
select 'site stats tests passed' as result;
