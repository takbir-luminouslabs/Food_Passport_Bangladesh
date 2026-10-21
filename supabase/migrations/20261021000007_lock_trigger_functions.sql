-- The permission test for step 7 found two trigger helper functions from migration 1 that the API roles could still
-- execute (functions get PUBLIC execute by default and migration 1 created them before the default was removed).
-- Triggers still fire; only direct calls from the browser are closed.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
alter function public.touch_updated_at() set search_path = '';
