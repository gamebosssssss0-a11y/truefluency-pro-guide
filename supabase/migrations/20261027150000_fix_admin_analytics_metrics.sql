-- Correct admin analytics semantics and use index-friendly Africa/Lagos day boundaries.
-- Admin data is aggregate-only and this RPC remains guarded in the function body.
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  result jsonb;
  lagos_today_start timestamptz;
  lagos_tomorrow_start timestamptz;
  seven_day_start timestamptz := now() - interval '7 days';
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Compute the Lagos calendar-day bounds once, then use [start, end) on
  -- timestamptz columns so indexes can be used and midnight is unambiguous.
  lagos_today_start := ((now() at time zone 'Africa/Lagos')::date::timestamp
                        at time zone 'Africa/Lagos');
  lagos_tomorrow_start := (((now() at time zone 'Africa/Lagos')::date + 1)::timestamp
                           at time zone 'Africa/Lagos');

  with
  active_users as (
    select user_id from public.analytics_events
      where created_at >= lagos_today_start and created_at < lagos_tomorrow_start
    union
    select user_id from public.mock_attempts
      where submitted_at >= lagos_today_start and submitted_at < lagos_tomorrow_start
    union
    select user_id from public.chat_messages
      where created_at >= lagos_today_start and created_at < lagos_tomorrow_start
    union
    select user_id from public.flashcards
      where last_reviewed_at >= lagos_today_start and last_reviewed_at < lagos_tomorrow_start
  ),
  upload_courses as (
    select regexp_replace(regexp_replace(upper(trim(course_code)), '\s+', '', 'g'), '^C-', '') as course_code,
           count(distinct id)::int as uploads,
           count(distinct user_id)::int as upload_students
    from public.course_materials
    where nullif(trim(course_code), '') is not null
    group by 1
  ),
  mock_courses as (
    select regexp_replace(regexp_replace(upper(trim(course_code)), '\s+', '', 'g'), '^C-', '') as course_code,
           count(distinct id)::int as submitted_mocks,
           count(distinct user_id)::int as mock_students
    from public.mock_attempts
    where nullif(trim(course_code), '') is not null and submitted_at is not null
    group by 1
  ),
  course_totals as (
    select coalesce(u.course_code, m.course_code) as course_code,
           coalesce(u.uploads, 0) as uploads,
           coalesce(m.submitted_mocks, 0) as submitted_mocks,
           (coalesce(u.upload_students, 0) + coalesce(m.mock_students, 0))::int as student_count_sum,
           u.upload_students, m.mock_students
    from upload_courses u
    full outer join mock_courses m on m.course_code = u.course_code
  ),
  course_students as (
    select course_code, count(distinct user_id)::int as distinct_students
    from (
      select regexp_replace(regexp_replace(upper(trim(course_code)), '\s+', '', 'g'), '^C-', '') as course_code, user_id
      from public.course_materials where nullif(trim(course_code), '') is not null
      union
      select regexp_replace(regexp_replace(upper(trim(course_code)), '\s+', '', 'g'), '^C-', '') as course_code, user_id
      from public.mock_attempts where nullif(trim(course_code), '') is not null and submitted_at is not null
    ) people
    group by course_code
  )
  select jsonb_build_object(
    'registered_students', (select count(*) from public.profiles),
    'active_today', (select count(*) from active_users),
    'trials_in_7_days', (
      select count(*) from public.subscriptions
      where trial_started_at >= seven_day_start and trial_started_at <= now()
    ),
    'mock_sets_7_days', (
      select count(*) from public.mock_attempts
      where submitted_at >= seven_day_start and submitted_at <= now()
    ),
    'upload_to_practice', (
      select count(distinct material_id) from public.analytics_events
      where event_name = 'upload_practice'
        and created_at >= seven_day_start and created_at <= now()
        and material_id is not null
    ),
    'mock_started_7_days', (
      select count(distinct attempt_id) from public.analytics_events
      where event_name = 'mock_started'
        and created_at >= seven_day_start and created_at <= now()
        and attempt_id is not null
    ),
    'mock_submitted_events_7_days', (
      select count(distinct attempt_id) from public.analytics_events
      where event_name = 'mock_submitted'
        and created_at >= seven_day_start and created_at <= now()
        and attempt_id is not null
    ),
    'seven_day_depth', (
      select coalesce(round(avg(active_days), 2), 0)
      from (
        select user_id,
               count(distinct (created_at at time zone 'Africa/Lagos')::date) as active_days
        from public.analytics_events
        where created_at >= seven_day_start and created_at <= now()
        group by user_id
      ) daily
    ),
    'top_courses', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'course_code', c.course_code,
        'uploads', c.uploads,
        'submitted_mocks', c.submitted_mocks,
        'distinct_students', coalesce(s.distinct_students, 0)
      ) order by c.submitted_mocks desc, c.uploads desc, c.course_code asc), '[]'::jsonb)
      from (select * from course_totals order by submitted_mocks desc, uploads desc limit 20) c
      left join course_students s on s.course_code = c.course_code
    ),
    'pipeline_usable', (
      select count(*) from public.course_materials cm
      where cm.extraction_status = 'success'
        and exists (
          select 1 from public.course_topic_analysis cta
          where cta.material_id = cm.id and jsonb_typeof(cta.topics) = 'array'
            and jsonb_array_length(cta.topics) > 0
        )
    ),
    'pipeline_failed', (
      select coalesce(jsonb_agg(f), '[]'::jsonb) from (
        select id as material_id, course_code, extraction_status as status, created_at
        from public.course_materials cm
        where extraction_status = 'failed'
           or not exists (
             select 1 from public.course_topic_analysis cta
             where cta.material_id = cm.id and jsonb_typeof(cta.topics) = 'array'
               and jsonb_array_length(cta.topics) > 0
           )
        order by created_at desc limit 50
      ) f
    )
  ) into result;

  return result;
end;
$function$;

revoke execute on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated, service_role;
