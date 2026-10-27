# TrueFluency Pro: safe improvement plan

## Change strategy
Keep existing TanStack Router routes, profile store, auth/session handling, component structure, and Supabase integration. Prefer narrow, reversible changes and review the preview before merging.

## Security checklist

- [x] Enforce subscription rows as read-only for browser clients; retain trusted server/service-role writes.
- [x] Restrict unauthenticated access to profiles and role membership.
- [x] Narrow administrator RLS policies to signed-in users while preserving admin visibility.
- [x] Remove anonymous execution of selected SECURITY DEFINER RPCs and block direct execution of the trigger-only indexing function.
- [x] Verify an authenticated admin can still read all profiles, subscriptions, and roles, and can call the admin dashboard RPC.
- [x] Verify a student sees only their own subscription and has no subscription INSERT/UPDATE/DELETE privileges.
- [ ] Review every RLS-enabled table without policies. A table with no policy is normally inaccessible to API roles under RLS; verify grants and server access before changing these policies.
- [ ] Test cross-user reads/writes for mock results, storage, materials/chunks, chat records, and other student data.
- [ ] Enable leaked-password protection in Supabase Auth settings and review recovery/session policy.
- [ ] Review the Supabase advisor's remaining authenticated SECURITY DEFINER warnings. The admin dashboard RPC and flashcard-rating RPC remain intentionally available to signed-in clients; both must continue enforcing authorization internally.

## Reliability and tests
The project currently defines typecheck, lint, and build scripts. CI is added to run them for pull requests and pushes to main. Add integration tests with a dedicated test Supabase project for actual RLS and entitlement boundaries; static unit tests alone cannot prove database isolation.

## Performance
- [ ] Re-check Supabase advisors after each migration.
- [ ] Use `(select auth.uid())` for row-independent auth expressions in RLS policies where semantics are unchanged.
- [ ] Add missing foreign-key indexes only after validating workload/query plans.
- [ ] Do not drop advisor-reported unused indexes without checking constraints, query plans, and representative usage.
- [ ] Do not move the vector extension until all dependent functions/operators and migrations are verified.

## Learning analytics
Build on existing mock attempt and flashcard-rating data. Report accuracy, practice consistency, mock exam trends, and topic-level weaknesses only where source data is sufficient; label sparse data and avoid fabricating readiness scores.

## UI quality checklist
- Preserve route names, navigation, auth/onboarding, and student/admin workflows.
- Use the existing cream/ink/amber brand tokens and existing UI primitives.
- Prioritize narrow Android viewports, readable type, consistent spacing, accessible focus/contrast, clear primary actions, and loading/empty/error states.
- Check dashboard, flashcards, mock exam run/results, library, account/settings, and admin pages in the existing app preview.
- Do not publish/deploy until CI passes and the preview has been manually checked.

## Deployment note
The security hardening has been applied directly to the connected Supabase database and verified with simulated authenticated-admin and student-role checks. The matching SQL migration is included in the draft GitHub PR for version control; because the live changes were applied via SQL, confirm migration history before attempting to apply the file elsewhere. No subscription data was changed or deleted. Never put a service-role key in client code or CI variables exposed to builds.
