-- Student-facing database hardening while preserving administrator read access.
-- Server-side service_role workflows retain subscription writes.
begin;

-- Entitlements are readable by the owner and admins, but never writable by browser clients.
drop policy if exists "Users can access own subscription" on public.subscriptions;
create policy "Users can read own subscription"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
alter policy "Admins can read all subscriptions" on public.subscriptions to authenticated;
alter policy "Admins can read all profiles" on public.profiles to authenticated;
alter policy "Admins can view roles" on public.user_roles to authenticated;
alter policy "Admins can read all mock attempts" on public.mock_attempts to authenticated;
alter policy "own rows" on public.profiles to authenticated;
alter policy "own rows" on public.mock_attempts to authenticated;

revoke all privileges on table public.subscriptions from public, anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.subscriptions from authenticated;
grant select on table public.subscriptions to authenticated;

-- Prevent unauthenticated reads/writes on identity and role tables.
revoke all privileges on table public.profiles from anon;
revoke all privileges on table public.user_roles from anon;

-- has_role is needed by authenticated admin policies; never expose it to anon/PUBLIC.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
alter function public.has_role(uuid, public.app_role) set search_path = pg_catalog, public;

-- Trigger-only indexing function is not a client RPC.
revoke execute on function public.trg_index_material_chunks() from public, anon, authenticated, service_role;

-- Keep admin dashboard RPC available to authenticated users because its body enforces
-- admin membership before returning any aggregate. The browser must not lose admin access.
revoke execute on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated, service_role;
alter function public.admin_dashboard_stats() set search_path = pg_catalog, public;

-- Rating is an intended signed-in action; its function validates auth, ownership,
-- and the allowed rating values before inserting an event.
revoke execute on function public.record_flashcard_rating(uuid, text) from public, anon;
grant execute on function public.record_flashcard_rating(uuid, text) to authenticated, service_role;

commit;
