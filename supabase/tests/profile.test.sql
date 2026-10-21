-- Display names, leaderboard opt-in, blocklist and reports.
insert into auth.users (id, email) select ('1000000' || n || '-0000-0000-0000-000000000000')::uuid, 'p' || n || '@example.com'
  from generate_series(1, 6) n;

-- known public handles, so the tests can report people the way the site does
update public.profiles set public_id = overlay(user_id::text placing '2' from 1 for 1)::uuid
  where user_id::text like '1000000%';

set role anon;
do $$
begin
  begin perform public.set_my_profile('Rafi', false); raise exception 'anon edited a profile';
  exception when insufficient_privilege then null; end;
  begin perform public.report_display_name('20000001-0000-0000-0000-000000000000'::uuid); raise exception 'anon reported';
  exception when insufficient_privilege then null; end;
end $$;

reset role; set role authenticated;
set request.jwt.claim.sub = '10000001-0000-0000-0000-000000000000';

do $$
declare r jsonb; bad text; good text;
begin
  -- default: private, no name
  if (select leaderboard_opt_in from public.profiles) or (select display_name from public.profiles) is not null then raise exception 'default must be off with no name'; end if;

  -- a good name, English and Bangla, trimmed and single-spaced
  r := public.set_my_profile('  Rafi   Ahmed ', true);
  if r ->> 'display_name' <> 'Rafi Ahmed' or not (r ->> 'leaderboard_opt_in')::boolean then raise exception 'good name rejected: %', r; end if;
  r := public.set_my_profile('রাফি আহমেদ', true);
  if r ->> 'display_name' <> 'রাফি আহমেদ' then raise exception 'Bangla name rejected: %', r; end if;
  r := public.set_my_profile('Shakib_99', true);
  r := public.set_my_profile('Magistrate Rahman'::text, false);  -- contains "magi": blocked on purpose (documented false positive)
exception when sqlstate '22023' then
  if sqlerrm <> 'name_blocked' then raise; end if;
end $$;

do $$
declare cases text[][] := array[
  ['x',                 'name_length'],
  ['abcdefghijklmnopqrstuvwxyz', 'name_length'],
  ['   ',               'name_required_or_ok'],
  ['hi <b>',            'name_chars'],
  ['a@b',               'name_chars'],
  ['😀😀',              'name_chars'],
  ['visit www site',    'name_link'],
  ['best.com',          'name_link'],
  ['call 01712345678',  'name_link'],
  ['F u c k',           'name_blocked'],
  ['sh1t_head',         'name_blocked'],
  ['F.U.C.K.er',        'name_blocked'],
  ['ADMIN',             'name_blocked'],
  ['Food Passport',     'name_blocked'],
  ['তুমি খানকি',        'name_blocked'],
  ['Khanki',            'name_blocked']
];
  i int; code text;
begin
  for i in 1..array_length(cases, 1) loop
    if cases[i][2] = 'name_required_or_ok' then continue; end if;
    begin
      perform public.set_my_profile(cases[i][1], true);
      raise exception 'accepted a bad name: %', cases[i][1];
    exception when sqlstate '22023' then
      get stacked diagnostics code = message_text;
      if code <> cases[i][2] then raise exception 'name % gave % expected %', cases[i][1], code, cases[i][2]; end if;
    end;
  end loop;
end $$;

-- opt-in needs a name; clearing the name with opt-in off is fine; the failed attempts above changed nothing
do $$
declare r jsonb;
begin
  if (select display_name from public.profiles) <> 'Shakib_99' then raise exception 'a refused name must not change the profile'; end if;
  begin perform public.set_my_profile(null, true); raise exception 'opt-in without a name accepted';
  exception when sqlstate '22023' then null; end;
  r := public.set_my_profile(null, false);
  if r ->> 'display_name' is not null or (r ->> 'leaderboard_opt_in')::boolean then raise exception 'clear failed: %', r; end if;
  perform public.set_my_profile('Shakib_99', true);
end $$;

-- reports: 3 different people hide the name; one person cannot hide it alone; not self; not a private profile
reset role; set role authenticated;
set request.jwt.claim.sub = '10000002-0000-0000-0000-000000000000';
select public.set_my_profile('Private Pat', false) \gset

do $$
declare r jsonb;
begin
  begin perform public.report_display_name('20000002-0000-0000-0000-000000000000'::uuid); raise exception 'self report accepted';
  exception when sqlstate '22023' then null; end;
  begin perform public.report_display_name('20000003-0000-0000-0000-000000000000'::uuid); raise exception 'report of a profile that is not public accepted';
  exception when sqlstate '22023' then null; end;
  r := public.report_display_name('20000001-0000-0000-0000-000000000000'::uuid);
  r := public.report_display_name('20000001-0000-0000-0000-000000000000'::uuid);
  r := public.report_display_name('20000001-0000-0000-0000-000000000000'::uuid);
  if (r ->> 'hidden')::boolean then raise exception 'one person reporting three times must not hide a name'; end if;
end $$;

reset role; set role authenticated;
set request.jwt.claim.sub = '10000003-0000-0000-0000-000000000000';
do $$ begin perform public.report_display_name('20000001-0000-0000-0000-000000000000'::uuid); end $$;
reset role; set role authenticated;
set request.jwt.claim.sub = '10000004-0000-0000-0000-000000000000';
do $$
declare r jsonb;
begin
  r := public.report_display_name('20000001-0000-0000-0000-000000000000'::uuid);
  if not (r ->> 'hidden')::boolean then raise exception 'third reporter should hide the name: %', r; end if;
  -- once hidden it can no longer be reported
  begin perform public.report_display_name('20000001-0000-0000-0000-000000000000'::uuid); raise exception 'hidden name reportable';
  exception when sqlstate '22023' then null; end;
end $$;

-- the owner sees the flag, keeping the same name stays hidden, a new valid name clears it and the old reports
reset role; set role authenticated;
set request.jwt.claim.sub = '10000001-0000-0000-0000-000000000000';
do $$
declare r jsonb;
begin
  if not (select name_hidden from public.profiles) then raise exception 'owner should see name_hidden'; end if;
  r := public.set_my_profile('Shakib_99', true);
  if not (r ->> 'name_hidden')::boolean then raise exception 'unchanged name must stay hidden'; end if;
  r := public.set_my_profile('Shakib Rahman', true);
  if (r ->> 'name_hidden')::boolean then raise exception 'new name should start visible'; end if;
end $$;
reset role;
do $$
begin
  if exists (select 1 from public.name_reports where reported_id = '10000001-0000-0000-0000-000000000000') then raise exception 'old reports should go with the old name'; end if;
end $$;

select 'profile tests passed' as result;
