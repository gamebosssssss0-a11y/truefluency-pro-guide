# Loading path inventory

Recorded before applying the shared delayed loading UI. Typical durations are
not instrumented in the repository, so the table distinguishes known local
behavior from wait times that still need production telemetry. The shared UI
shows after 150 ms, remains visible at least 300 ms, and uses status copy at
8 s / 20 s without invented percentages.

| Screen / component | Current loading path | Wait currently represented | Replacement / current disposition |
| --- | --- | --- | --- |
| Session restore / `SigningInScreen` via `routes/index.tsx` | Auth session and profile hydration gate | Unknown; no timeout in component | Keep the sign-in frame stable; replace its static status with `LoadingStatus` only after restore timing is measured. |
| Account sign-in / `onboarding/identity.tsx` | Busy state for guest, sign-up, login, Google | Button-scoped spinner; request duration is not measured | Preserve button placement and action lock; shared status is not appropriate for these short actions. |
| Google profile / `onboarding/google-profile.tsx` | Photo and profile save | Inline spinner; duration not measured | Preserve the form skeleton/geometry; switch to shared delayed status for any blocking profile load. |
| Practice materials / `mock-tests-tab.tsx` | Per-course material checks | “Checking…” action state | Keep the card dimensions and disabled action; do not show a page-level loader. |
| Mock generation / `mock-test-flow.tsx` | Backend job creation, polling and completion | Poll progress; request timeout is reported by the existing generation flow | Keep backend progress unchanged; the shared 20 s status copy still needs integration into the generation screen. |
| Course analysis / `course-detail.tsx` | Material analysis and upload actions | Inline spinner and current status string | Keep the action row stable; shared delayed state still needs integration for long analysis. |
| Library own files / `library.tsx` | Private locker listing | Three skeleton rows; no delayed threshold | Existing row shapes are gated through `useDelayedLoading` (150 ms show, 300 ms minimum). |
| Library course shelf / `library.tsx` | Published shelf refresh | Three static rows and “Updating course shelf…” | Initial skeleton uses the shared delayed visibility hook; refresh retains its in-place status line. |
| File preview / `library.tsx`, `pdf-viewer.tsx` | Lazy viewer mount and PDF.js document/page rendering | “Opening…” placeholder and page-level spinner | Use a page-shaped skeleton during first-page rendering; current canvas sizing stays unchanged. |
| Chat thread / `chatbot.tsx` | Load saved per-course conversation | Spinner plus an indeterminate-looking bar | Replaced with shared delayed status and three fixed-size skeleton lines; 8 s / 20 s status messages are truthful elapsed-time messages. |
| Chat image attachment / `chatbot.tsx` | Image preparation | Inline “Preparing your photo…” indicator | Preserve the composer row; no screen skeleton. |
| Chat history / `chatbot.tsx` | Load conversations across courses | Inline loading and partial-result messaging | Preserve rows and retry behavior; shared delay still needs integration. |
| Chat link / `routes/chat-share.$token.tsx` | Read share snapshot | Centered spinner | Keep the existing share-route layout; shared status still needs integration. |
| Mock link / `routes/mock-share.$token.tsx` | Read mock snapshot | Centered spinner | Replaced with `LoadingStatus` plus fixed-size skeleton blocks. |
| Flashcard decks / `flashcards.tsx` | Load decks and review cards | Static skeleton rows | Preserve card dimensions; add delayed visibility where it does not cause a layout shift. |
| Upgrade entitlement / `upgrade.tsx` | Read active tier and plan capabilities | Entitlement hook loading state | Keep plan-card dimensions; skeleton application still needs integration. |
| Logout and profile save / `settings.tsx`, `edit-identity.tsx` | User-triggered writes | Button-scoped spinner | Preserve button geometry and disable duplicate action. |
| Token share routes / `routes/s.$token.tsx`, `routes/chat-share.$token.tsx` | Read published snapshot | Centered spinner | Replace with matching snapshot-shaped skeletons and elapsed-time copy in a follow-up within this phase. |

`LoadingStatus` and `SkeletonBlock` live in `src/components/loading-state.tsx`.
Remaining integration rows are intentionally listed so the loading sweep is
auditable instead of implying every spinner has already been migrated.
