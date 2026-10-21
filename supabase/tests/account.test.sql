-- Account deletion removes everything the user owns, and only theirs.
insert into auth.users (id, email) values
  ('eeeeeeee-0000-0000-0000-00000000000e', 'e@example.com'),
  ('ffffffff-0000-0000-0000-00000000000f', 'f@example.com');

set role anon;
do $$
begin
  begin perform public.delete_my_account(); raise exception 'anon could call delete_my_account';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
set role authenticated;
set request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-00000000000e';
select public.mark_food_tried('bakarkhani') as _ \gset
select public.record_quiz_answer('national-fish', 0) as _ \gset
select public.delete_my_account() as _ \gset

reset role;
do $$
declare t text; n int;
begin
  if exists (select 1 from auth.users where id = 'eeeeeeee-0000-0000-0000-00000000000e') then raise exception 'user still exists'; end if;
  foreach t in array array['profiles', 'user_food_progress', 'user_challenge_progress', 'user_badges', 'quiz_attempts', 'xp_events'] loop
    execute format('select count(*) from public.%I where user_id = %L', t, 'eeeeeeee-0000-0000-0000-00000000000e') into n;
    if n <> 0 then raise exception 'deleting the account left % rows in %', n, t; end if;
  end loop;
  if not exists (select 1 from public.profiles where user_id = 'ffffffff-0000-0000-0000-00000000000f') then
    raise exception 'deleting one account touched another';
  end if;
end $$;

select 'account tests passed' as result;
