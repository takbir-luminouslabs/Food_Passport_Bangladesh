-- Account deletion (PRD FR-13): a signed-in user can erase their own account. Every user-owned table references
-- auth.users with ON DELETE CASCADE, so this removes their profile, stamps, XP, badges and quiz rows in one step.
-- The browser cannot delete from auth.users itself, so this runs as the table owner but only ever for auth.uid().
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
