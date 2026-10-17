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

commit;
