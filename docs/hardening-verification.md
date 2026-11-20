# Requested hardening: verification and limits

## Implemented
- History uses metadata/snippet cards and a full-width continuation action, without inline transcript scrolling.
- Streaming follows only near the bottom, with a 44px jump control; opening another screen resets its scroll.
- Root panes are pre-mounted/inert off-screen and now share identical viewport dimensions. Removed the active-only stage gutter that caused width jumps.
- ProfileProvider records subview origins and prevents background restore from hijacking an active guest session. Shared Back controls retain protected mock-leave handling.
- Tutor handover pauses active elapsed time, captures the actual question and selected answer in account/session-scoped memory, supplies context to Verilo, and offers resume without losing answers.
- Course Shelf explanation uses a coordinated short page turn and reduced-motion fallback.
- Own thumbnails use bounded seven-day/100-entry IndexedDB caching after fresh authorization. Peer copies and shelf content remain ephemeral. Course uploads, Settings uploads, source lists and locker/shelf cards use the same renderer. PDF uses page one; DOCX/PPTX use genuine leading text, not an exact pagination/layout reproduction. Images and pasted notes are supported.
- Fixed four-hour WAT calculation and boundary refresh are prepared. The app reads an authenticated Supabase window meter when available and otherwise retains the real existing meter.
- Meaningful nonblank mocks, completed deck review and accepted unmoderated Verilo questions count locally once per Lagos day; zero has no flame. Freeze handling is preserved, including restoring a saved zero-freeze balance.

## Checked
- 47 repository regression checks passed before the final anchor-selector update; rerun recorded by the final verification command.
- 22 focused Vitest checks cover four-hour boundaries, daily streak idempotency/freezes, paused elapsed time, account/attempt snapshot isolation, thumbnail expiry/deletion and existing chat mirror/math behavior.
- Real public guest setup on 360×619: onboarding, Home, Practice, My Files, Verilo, empty History, return to Verilo and Back to My Files. No browser page errors; document viewport stays 360×619 and active/neighbor panes are all 360×619.
- Preview build log reported build OK after source changes.

## Not verified or deployed
- Supabase schema changes did NOT run: saved permission disables migrations. Prepared SQL is in docs/four-hour-chat-and-streak.sql.
- Render allowance enforcement remains daily until the owner applies docs/backend-four-hour-handoff.md. SQL deployment alone does not change that gate.
- Signed-in chat/history continuation, real streaming, protected thumbnails, Tutor-to-Verilo, grading and payment were not end-to-end tested: external authentication has no managed test session.
- An offline streak is immediate locally but cannot synchronize until the RPC is deployed and connectivity returns; no historical offline activity replay is claimed.
- No claim of universal zero animation lag, browser-independent document fidelity or exhaustive all-screen interaction testing. Existing theme/flashcard/mock animation behavior remains intact with reduced motion.
- Nothing was published.