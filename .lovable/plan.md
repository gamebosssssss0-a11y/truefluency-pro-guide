# Gamification finish and review UI

## Scope
- Keep the app connected to the existing `ikwhfcxfzoammhmwmzxy` project and current Render service. Do not create or reconnect any backend, change environment values, AI prompts, mock generation/polling, entitlements, PDFs, or locked screens.
- Finish the existing streak presentation and make the review screen consistent, concise, and safe when explanations fail quality checks.

## Implementation
1. **Streak reliability**
   - Keep the existing authenticated `record_mock_streak` call only after a successful mock submission with at least five answered questions.
   - Treat a missing RPC as unavailable rather than an app error: do not crash, toast, or fabricate a streak; keep the displayed streak at zero.
   - Preserve WAT-backed values returned by the RPC and show the existing protection toast only for `protected`.
   - Show a one-time `+1` result tick only when the returned event is `incremented`.

2. **Home order and motion**
   - Keep the top order as Welcome, trial/plan chip, nonzero streak, daily goal from `usageToday.mock_sets`, then a filled amber “Take a mock” action, followed by the existing Home content.
   - Add the specified 180ms streak entrance and 200ms daily-bar width transition, with reduced-motion removing movement while retaining the fade.
   - Preserve the amber and navy palette roles exactly.

3. **Result and review headers**
   - Add a sand/navy difficulty chip using the saved attempt settings on both the result and review headers.

4. **WHY and paywall behavior**
   - Use only the explanation already returned with each question; do not change prompts or generate replacement content.
   - Present unlocked explanations as labeled `CORRECT`, conditional `WHY YOUR PICK WAS WRONG`, and `KEY CONCEPT` blocks, with concise line limits and vertical calculation steps when the source contains working.
   - Apply the requested case-insensitive hedge filter and replace rejected explanation bodies with the exact quality-check notice.
   - For locked reviews, show `PRICE_LINE + "Unlock WHY for this set."` once above the questions and show only a lock icon per question. Continue deriving access solely from `getMyAccess`.

5. **Verification**
   - Restore the complete generated database type surface if needed so unrelated existing tables still compile, without changing the connected backend.
   - Verify type/build output, static counts of `PRICE_LINE`, project binding, and the review/streak UI behavior in the preview.
