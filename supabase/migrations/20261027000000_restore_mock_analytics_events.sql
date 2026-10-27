-- Adds durable, privacy-preserving engagement events for aggregate admin analytics.
-- Public mock share snapshots are stored in chat_shares with a mock: namespace.
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (event_name in ('mock_started','mock_submitted','upload_created','upload_practice')),
  course_code text,
  material_id uuid,
  attempt_id text,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_user_created_idx on public.analytics_events (user_id, created_at desc);
create index if not exists analytics_events_name_created_idx on public.analytics_events (event_name, created_at desc);
alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;
grant insert on public.analytics_events to authenticated;
grant select on public.analytics_events to authenticated;
create policy "users insert own analytics events" on public.analytics_events for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "admins read analytics events" on public.analytics_events for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));
