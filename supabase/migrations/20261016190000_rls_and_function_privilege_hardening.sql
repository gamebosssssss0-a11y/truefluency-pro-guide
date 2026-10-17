-- Defense-in-depth for the live Supabase RLS gaps found during the 2026-10-16 audit.
-- Client-facing entitlement data is read through the authenticated server functions;
-- all writes are performed with the server-only service-role client.
begin;

-- RLS is row-level, not a substitute for least-privilege table grants.
-- In particular, TRUNCATE bypasses RLS.
revoke truncate, references, trigger on all tables in schema public
  from public, anon, authenticated;

-- Entitlements and usage counters must never be writable by a client.
drop policy if exists "Users can access own subscription" on public.subscriptions;
create policy "Users can read own subscription"
  on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

revoke all on table public.subscriptions from public, anon, authenticated;
grant select on table public.subscriptions to authenticated;
grant all on table public.subscriptions to service_role;

drop policy if exists "Users can access own usage counters" on public.usage_counters;
revoke all on table public.usage_counters from public, anon, authenticated;
grant all on table public.usage_counters to service_role;

-- Library shares are created, listed, redeemed, and revoked only by
-- library.server.ts using the server-role client. Never let a client forge
-- a share row, token, owner, usage count, or material relationship.
drop policy if exists "Owners manage their own shares" on public.library_shares;
revoke all on table public.library_shares from public, anon, authenticated;
grant all on table public.library_shares to service_role;

-- These tables are intentionally server-only and have no client policies.
revoke all on table public.chat_conversations from public, anon, authenticated;
revoke all on table public.chat_flagged_uploads from public, anon, authenticated;
revoke all on table public.course_context from public, anon, authenticated;
revoke all on table public.generated_question_log from public, anon, authenticated;
revoke all on table public.material_chunks from public, anon, authenticated;
revoke all on table public.mock_attempt_results from public, anon, authenticated;
revoke all on table public.mock_jobs from public, anon, authenticated;
grant all on table public.chat_conversations, public.chat_flagged_uploads,
  public.course_context, public.generated_question_log, public.material_chunks,
  public.mock_attempt_results, public.mock_jobs to service_role;

-- Client uploads need insert access only to their own file metadata.
-- Extraction fields are client-updated; identity, storage path, publish state,
-- and peer-copy attribution remain server-controlled after insert.
revoke all on table public.course_materials from public, anon, authenticated;
grant select, delete on table public.course_materials to authenticated;
grant insert (user_id, course_code, file_path, file_name, file_type, mime_type, size_bytes)
  on table public.course_materials to authenticated;
grant update (extracted_content, extraction_status, extraction_error)
  on table public.course_materials to authenticated;
grant all on table public.course_materials to service_role;

-- Profile sync and avatar editing do not need permission to forge streak state.
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (
  user_id, display_name, email, goal, timeline, study_preference, faculty,
  department, level, setup_complete, disclaimer_accepted, cgpa_intro_seen,
  tour_seen, has_completed_first_mock, mastered_courses, cgpa_inputs, cgpa_plan,
  cgpa_actual, avatar_path
) on table public.profiles to authenticated;
grant update (
  display_name, email, goal, timeline, study_preference, faculty, department,
  level, setup_complete, disclaimer_accepted, cgpa_intro_seen, tour_seen,
  has_completed_first_mock, mastered_courses, cgpa_inputs, cgpa_plan,
  cgpa_actual, avatar_path
) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- User-owned sync tables retain CRUD only for authenticated callers; RLS
-- policies below continue to isolate each row by auth.uid().
revoke all on table public.ai_question_sets, public.course_topic_analysis,
  public.mock_attempts, public.user_courses from public, anon, authenticated;
grant select, insert, update, delete on table public.ai_question_sets,
  public.course_topic_analysis, public.mock_attempts, public.user_courses
  to authenticated;
grant all on table public.ai_question_sets, public.course_topic_analysis,
  public.mock_attempts, public.user_courses to service_role;

-- The streak writer can update protected streak columns only after validating
-- that a Supabase identity exists and that it writes only auth.uid()'s row.
alter function public.record_mock_streak(integer) security definer;
alter function public.record_mock_streak(integer) set search_path = pg_catalog, public;
revoke all on function public.record_mock_streak(integer) from public, anon;
grant execute on function public.record_mock_streak(integer) to authenticated, service_role;

-- Public site settings are intentionally readable, but only admins may update.
revoke all on table public.site_settings from public, anon, authenticated;
grant select on table public.site_settings to anon, authenticated;
grant update on table public.site_settings to authenticated;
grant all on table public.site_settings to service_role;
alter policy "Admins can update site settings" on public.site_settings to authenticated;
alter policy "Anyone can read site settings" on public.site_settings to anon, authenticated;

-- Keep gate-hit reads for admins, but never let a client write or truncate them.
revoke all on table public.gate_hits from public, anon, authenticated;
grant select on table public.gate_hits to authenticated;
grant all on table public.gate_hits to service_role;
alter policy "Admins can view gate hits" on public.gate_hits to authenticated;

-- The helper is SECURITY DEFINER, so enforce caller identity in its body and
-- remove the inherited PUBLIC EXECUTE grant (revoking only anon is insufficient).
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select auth.uid() is not null
     and auth.uid() = _user_id
     and exists (
       select 1
       from public.user_roles as ur
       where ur.user_id = auth.uid()
         and ur.role = _role
     );
$function$;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

-- Keep role membership rows admin-readable only; role writes stay server-only.
revoke all on table public.user_roles from public, anon, authenticated;
grant select on table public.user_roles to authenticated;
grant all on table public.user_roles to service_role;
alter policy "Admins can view roles" on public.user_roles to authenticated;

-- The trigger function is invoked by its installed trigger, not through RPC.
revoke all on function public.trg_index_material_chunks() from public, anon, authenticated;
grant execute on function public.trg_index_material_chunks() to service_role;

-- Admin read policies must not be reachable through the anon API role.
alter policy "Admins can read all profiles" on public.profiles to authenticated;
alter policy "Admins can read all subscriptions" on public.subscriptions to authenticated;
alter policy "Admins can read all mock attempts" on public.mock_attempts to authenticated;
alter policy "Admins can read all course materials" on public.course_materials to authenticated;
alter policy "Admins can read all flashcards" on public.flashcards to authenticated;
alter policy "Admins can read all flashcard decks" on public.flashcard_decks to authenticated;
alter policy "Admins can read all chat messages" on public.chat_messages to authenticated;

-- The aggregate is SECURITY INVOKER. Grant only the SELECT it needs; RLS
-- still limits these rows to administrators (or each user's own rows).
revoke all on table public.chat_messages, public.flashcards, public.flashcard_decks
  from public, anon, authenticated;
grant select on table public.chat_messages, public.flashcards, public.flashcard_decks
  to authenticated;
grant all on table public.chat_messages, public.flashcards, public.flashcard_decks
  to service_role;

alter function public.admin_dashboard_stats() set search_path = pg_catalog, public;
revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated, service_role;

-- Owner-only policies explicitly target signed-in users and validate new rows.
drop policy if exists "own rows" on public.ai_question_sets;
create policy "Users manage own question sets"
  on public.ai_question_sets for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "own rows" on public.course_topic_analysis;
create policy "Users manage own topic analysis"
  on public.course_topic_analysis for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "own rows" on public.mock_attempts;
create policy "Users manage own mock attempts"
  on public.mock_attempts for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "own rows" on public.profiles;
create policy "Users manage own profile"
  on public.profiles for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "own rows" on public.user_courses;
create policy "Users manage own courses"
  on public.user_courses for all to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);


-- Quota enforcement is a single database operation: concurrent requests cannot
-- both observe the same count and overwrite each other's increments. Only the
-- service-role server client may call this RPC.
create or replace function public.consume_usage_quota(
  p_user_id uuid,
  p_feature text,
  p_day date,
  p_daily_limit integer
)
returns table (allowed boolean, used integer)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_count integer;
begin
  if p_user_id is null
     or p_feature not in ('mock_sets', 'chatbot_messages', 'flashcard_decks', 'library_uploads')
     or p_day is null
     or p_daily_limit < 1 then
    raise exception 'Invalid quota request';
  end if;

  insert into public.usage_counters as current_counter (user_id, feature, day, count)
  values (p_user_id, p_feature, p_day, 1)
  on conflict (user_id, feature, day)
  do update
    set count = current_counter.count + 1
    where current_counter.count < p_daily_limit
  returning current_counter.count into v_count;

  if found then
    return query select true, v_count;
  else
    select uc.count into v_count
      from public.usage_counters as uc
      where uc.user_id = p_user_id
        and uc.feature = p_feature
        and uc.day = p_day;
    return query select false, coalesce(v_count, 0);
  end if;
end;
$function$;
revoke all on function public.consume_usage_quota(uuid, text, date, integer) from public, anon, authenticated;
grant execute on function public.consume_usage_quota(uuid, text, date, integer) to service_role;

-- Never accept a caller-asserted answer count for streak credit. Resolve the
-- count from the authenticated user's persisted attempt for today's Lagos day.
drop function if exists public.record_mock_streak(integer);
create function public.record_mock_streak(attempt_id text)
returns table (
  streak_days integer,
  last_active_date text,
  freezes_available integer,
  freeze_used_on text,
  event text,
  today_wat text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_answered integer;
  v_streak integer;
  v_last date;
  v_freezes integer;
  v_freeze_used date;
  v_event text := 'none';
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if attempt_id is null or length(attempt_id) > 64 then
    raise exception 'A completed mock is required';
  end if;

  select count(*)::integer into v_answered
    from public.mock_attempts as a
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(a.answers) = 'array' then a.answers else '[]'::jsonb end
    ) as answer(value)
    where a.user_id = v_user_id
      and a.id::text = attempt_id
      and a.total >= 5
      and (a.submitted_at at time zone 'Africa/Lagos')::date = v_today
      and answer.value <> 'null'::jsonb;

  if coalesce(v_answered, 0) < 5 then
    raise exception 'At least five saved answers are required';
  end if;

  insert into public.profiles (user_id, freezes_available)
    values (v_user_id, 1)
    on conflict (user_id) do nothing;

  select p.streak_days, p.last_active_date, p.freezes_available, p.freeze_used_on
    into v_streak, v_last, v_freezes, v_freeze_used
    from public.profiles as p
    where p.user_id = v_user_id
    for update;

  if v_last = v_today then
    v_event := 'none';
  elsif v_last is null or v_streak = 0 then
    v_streak := 1; v_last := v_today; v_event := 'incremented';
  elsif v_today = v_last + 1 then
    v_streak := v_streak + 1; v_last := v_today; v_event := 'incremented';
    if v_streak = 7 then v_freezes := least(2, v_freezes + 1); end if;
  elsif v_today = v_last + 2 and v_freezes > 0 then
    v_freezes := v_freezes - 1; v_freeze_used := v_today; v_last := v_today; v_event := 'protected';
  else
    v_streak := 1; v_last := v_today; v_event := 'reset';
  end if;

  update public.profiles as p
    set streak_days = v_streak,
        last_active_date = v_last,
        freezes_available = v_freezes,
        freeze_used_on = v_freeze_used
    where p.user_id = v_user_id;

  return query select v_streak, v_last::text, v_freezes, v_freeze_used::text, v_event, v_today::text;
end;
$function$;
revoke all on function public.record_mock_streak(text) from public, anon;
grant execute on function public.record_mock_streak(text) to authenticated, service_role;


commit;
