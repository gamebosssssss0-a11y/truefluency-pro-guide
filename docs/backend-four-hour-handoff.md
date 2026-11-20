# Remaining backend deployment

## Status

The frontend is prepared for four-hour WAT windows. **The Supabase migration did not run:** the migration tool is disabled by a saved permission preference. Run `docs/four-hour-chat-and-streak.sql` in the connected project's SQL Editor. It preserves daily history and existing billing rules. The Render chat implementation is outside this repository and is being handled by the owner.

Until the SQL is applied, the app deliberately falls back to the existing authoritative meter; it never fabricates a reset or clears usage locally. After SQL deployment, the app reads `chat_token_windows` through an authenticated server function. The legacy daily-write mirroring trigger supplies new real usage, but the Render daily gate still needs changing before four-hour refreshes are fully usable. Existing daily aggregates cannot safely be split into historic four-hour intervals, so old usage is preserved, not fabricated.

## Render changes

1. Use the same server-side WAT window: `floor((utc_epoch_seconds + 3600) / 14400) * 14400 - 3600`. This is 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 Lagos, not a rolling cooldown. At exactly a boundary, the next slot is active.
2. `/chat/usage` and the pre-generation chat gate must read the authenticated user's `chat_token_windows` row for that exact UTC `window_start`. Return `window_hours: 4`, `resets_at = window_start + 4 hours`, and existing plan budgets (Free 36000, Core/Trial 72000, Exam 144000). Other feature caps remain daily.
3. Record actual provider token use, including summaries, and turns exactly once. Either retain existing `chat_tokens_add`/`chat_turn_add` writes (the new trigger mirrors their positive deltas) OR write `chat_tokens_add_window`; **never do both for one completion**. With the new RPC, capture the active slot before generation and use it when recording the reply so a long stream crossing a boundary is billed to its initiating slot.
4. Keep all metering writes service-only. Do not accept user IDs, allowance totals, timestamps or plan tiers from the browser. Preserve request-id deduplication, moderation, image checks and existing grounded course context.
5. Test an exhausted allowance across 03:59:59/04:00:00 WAT, 07:59:59/08:00:00 WAT, and midnight; reads, sends and streaming usage must agree. Do not reset other daily quotas.
6. Add ongoing retention for `chat_token_windows` older than 30 days using your existing maintenance job. Account deletion is covered by the SQL profile cleanup trigger.

## Streak deployment

The same SQL replaces the mock-only five-answer streak requirement with a nonblank activity path and adds `record_study_activity()`. The app calls it after a nonblank submitted mock, a deck reviewed through completion, or an accepted unmoderated chat question; local feedback is immediate, remote updates are row-locked and daily-idempotent. Blank attempts do not count. Freeze behavior is retained. Pending/offline activity remains local; there is no historic offline replay queue.

## Privacy decisions

Only owner-uploaded thumbnails may be persisted; `presignMaterialDownload` returns server-verified `cacheable: false` for saved peer copies. Each cached preview still requires a fresh authorization check. Peer shelf and saved peer-copy previews remain ephemeral. Account change/sign-out and file deletion clear cached owner thumbnails. Word and slide previews show actual leading text, not a fabricated page-layout screenshot; unavailable formats remain honestly unavailable.
## Tier entitlements (Render must enforce)

The app now blocks these in the interface, but only the Render service can make them impossible to bypass:

1. **Tutor mode is paid-only** (Core, Exam, trial). On `/generate-mock/start`, if the caller's plan is Free, force `mode = "exam"` and return every question with `explanation: ""`. Retire the Free daily Tutor counter (`/tutor/status` may return `limit: 0`).
2. **Daily mock sets** (Free 2, Core 3, Exam 6): reject with 402 before generating.
3. **Question cap** (Free 30, Core 45, Exam 60): clamp `question_count` server-side.
4. **Files combined** (Free 1, Core 3, Exam 6): slice `source_ids` to the plan limit.
5. **Flashcard decks** (Free 2, Core 4, Exam 8): reject with 402 before generating.
6. **Explanations on review**: never return stored explanations to Free accounts.
