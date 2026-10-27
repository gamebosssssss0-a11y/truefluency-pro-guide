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


-- Admin-only aggregate dashboard. No student identifiers are returned.
create or replace function public.admin_dashboard_stats()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog', 'public'
as $function$
declare result jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'not authorized'; end if;
  select jsonb_build_object(
    'registered_students', (select count(*) from public.profiles),
    'active_today', (select count(distinct user_id) from (
      select user_id from public.analytics_events
       where (created_at at time zone 'Africa/Lagos')::date = (now() at time zone 'Africa/Lagos')::date
      union select user_id from public.mock_attempts
       where (submitted_at at time zone 'Africa/Lagos')::date = (now() at time zone 'Africa/Lagos')::date
      union select user_id from public.chat_messages
       where (created_at at time zone 'Africa/Lagos')::date = (now() at time zone 'Africa/Lagos')::date
      union select user_id from public.flashcards
       where (last_reviewed_at at time zone 'Africa/Lagos')::date = (now() at time zone 'Africa/Lagos')::date
    ) active_users),
    'trials_in_7_days', (select count(*) from public.subscriptions where trial_started_at >= now() - interval '7 days'),
    'mock_sets_7_days', (select count(*) from public.mock_attempts where submitted_at >= now() - interval '7 days'),
    'upload_to_practice', (select count(distinct material_id) from public.analytics_events where event_name = 'upload_practice' and created_at >= now() - interval '7 days'),
    'mock_started_7_days', (select count(*) from public.analytics_events where event_name = 'mock_started' and created_at >= now() - interval '7 days'),
    'mock_submitted_events_7_days', (select count(*) from public.analytics_events where event_name = 'mock_submitted' and created_at >= now() - interval '7 days'),
    'seven_day_depth', (select coalesce(round(avg(active_days), 2), 0) from (
      select user_id, count(distinct (created_at at time zone 'Africa/Lagos')::date) active_days
      from public.analytics_events where created_at >= now() - interval '7 days' group by user_id
    ) daily),
    'top_courses', (select coalesce(jsonb_agg(c), '[]'::jsonb) from (
      select regexp_replace(upper(trim(cm.course_code)), '^C-|\\s+', '', 'g') as course_code,
        count(distinct cm.id) as uploads, count(distinct ma.id) as submitted_mocks,
        count(distinct cm.user_id) as distinct_students
      from public.course_materials cm
      left join public.mock_attempts ma on ma.course_code = cm.course_code
      group by 1 order by submitted_mocks desc, uploads desc limit 20
    ) c),
    'pipeline_usable', (select count(*) from public.course_materials cm where cm.extraction_status = 'success' and exists (select 1 from public.course_topic_analysis cta where cta.material_id = cm.id and jsonb_array_length(cta.topics) > 0)),
    'pipeline_failed', (select coalesce(jsonb_agg(f), '[]'::jsonb) from (
      select id as material_id, course_code, extraction_status as status, created_at from public.course_materials
      where extraction_status = 'failed' or not exists (select 1 from public.course_topic_analysis cta where cta.material_id = course_materials.id and jsonb_array_length(cta.topics) > 0)
      order by created_at desc limit 50
    ) f)
  ) into result;
  return result;
end;
$function$;
