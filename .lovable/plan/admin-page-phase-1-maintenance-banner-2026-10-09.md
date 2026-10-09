# Admin Page Phase 1 + Maintenance Banner

Build `/admin` and the student-facing maintenance banner using the existing Supabase role, gate-hit, and settings objects. Keep all listed student surfaces and product limits untouched.

## Scope

- Gate both the page data and every admin operation with an authenticated session and `has_role(auth.uid(), 'admin')`; redirect non-admins to `/` before displaying data.
- Add an invoker-side aggregate function for safe dashboard data and admin-only RLS read policies on the existing source tables. Return counts, course codes, statuses, material ids, and dates only.
- Display four count cards, top 20 courses, three ratio cards, pipeline totals and up to 50 failed rows, and one 7-day count per existing `gate_hits` value.
- Show “not counted yet” where the current schema or code cannot provide a trustworthy number. Existing `gate_hits` has no server insert call sites, so all five gates will be marked not counted yet; no insert wiring is in this pass.
- Add a root-level maintenance banner backed by one public settings read per app session, plus an admin toggle and message editor saved through an authenticated, role-checked server function. No polling; another already-open student session will see changes after reload/new session.
- Give `/admin` its own page metadata; do not add navigation links, tabs, charts, alerts, tables, or authentication screens.

## Data limitations

- “Active today” uses the Africa/Lagos calendar-day boundary; the database has no student-location field.
- Mock attempts are not linked to a specific uploaded material, so upload-to-practice will say “not counted yet” rather than imply a precise match.
- Started attempts are not stored; show submitted attempts only and state that limitation.
- Flashcard review counts use `last_reviewed_at`, which stores each card’s latest review only.

## Technical details

- Use the current TanStack Start `createServerFn` + `requireSupabaseAuth` pattern, and the authenticated Supabase client so RLS remains in force.
- Use an explicitly role-checked, `SECURITY INVOKER` database aggregate function; add only `has_role`-based admin read policies needed by that function. Do not add `profiles.is_admin`, an INSERT policy on `gate_hits`, or any new table.
- Keep maintenance reads public and read-only. Save changes with the existing admin-role check and the existing `site_settings` update policy.
- Verify the privacy surface, current `gate_hits` policies/constraint, current maintenance update rule, and available preview sessions before reporting live-test status.
