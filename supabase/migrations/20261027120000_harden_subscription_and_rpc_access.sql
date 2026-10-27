-- Security hardening for subscription entitlements and exposed privileged functions.
-- Apply only after verifying billing mutations are handled by trusted server code/webhooks.
begin;

-- A user's subscription row is readable by that user, but entitlement fields must
-- never be writable through the public client API. Trusted service_role workflows
-- retain their elevated access (service_role bypasses RLS).
drop policy if exists "Users can access own subscription" on public.subscriptions;
create policy "Users can read own subscription"
  on public.subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Admin read access remains explicit and read-only for authenticated clients.
-- The service role is reserved for trusted server-side billing and admin operations.
revoke insert, update, delete on table public.subscriptions from anon, authenticated;
grant select on table public.subscriptions to authenticated;

-- RPCs intended for internal trigger/server use should not be directly callable
-- by anonymous or signed-in clients. Trigger execution does not require granting
-- EXECUTE to API roles; function owner privileges apply to trigger invocation.
revoke execute on function public.trg_index_material_chunks() from public, anon, authenticated;

-- has_role is used by policies/app role checks; keep it callable only by signed-in
-- users, not anon. The function must still validate the requested user/role safely.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- Admin dashboard RPC checks has_role internally. Remove anonymous execution and
-- retain authenticated execution so the function's internal admin check can run.
revoke execute on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;

-- Flashcard rating RPC is an intended user action; its body must validate ownership
-- and allowed rating values. Keep signed-in access but remove anonymous execution.
revoke execute on function public.record_flashcard_rating(uuid, text) from public, anon;
grant execute on function public.record_flashcard_rating(uuid, text) to authenticated;

commit;
