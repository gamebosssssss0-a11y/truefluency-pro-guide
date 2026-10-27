# TrueFluency Pro: safe improvement plan

## Change strategy
Keep existing TanStack Router routes, profile store, auth/session handling, component structure, and Supabase integration. Prefer narrow, reversible changes and review the preview before merging.

## Security checklist
- [ ] Confirm billing and entitlement mutations run only through trusted server-side code/webhooks.
- [ ] Keep student subscription rows read-only to authenticated clients; verify service-role billing workflow.
- [ ] Audit every SECURITY DEFINER function for a fixed safe search_path, auth/ownership checks, and minimal EXECUTE grants.
- [ ] Review every RLS-enabled table without policies. A table with no policy is normally inaccessible to API roles under RLS; do not add broad policies merely to silence an advisor.
- [ ] Test cross-user reads/writes for profiles, mock attempts/results, subscriptions, storage, roles, materials/chunks, and chat records.
- [ ] Enable leaked-password protection in Supabase Auth settings and review recovery/session policy.

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
The subscription migration in this branch is intentionally a proposal. Verify all subscription writes are already performed by trusted server code or webhooks before applying it to production; otherwise first migrate those write paths to a trusted server-side function. Never put a service-role key in client code or CI variables exposed to builds.
