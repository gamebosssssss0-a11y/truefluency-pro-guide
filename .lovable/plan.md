# PDF extraction fix, math rendering, and entitlement enforcement

Three independent pieces of work. The upload → extract → predicted topics → mock generation pipeline is treated as untouchable except for the extraction reliability fix in part 1, which is explicitly about that step failing.

## 1. PDF uploads that "fail to read content"

What the data shows: several PDFs (including two attempts on `PHY102_Study_Notes.pdf` today) are sitting at `extraction_status = 'pending'` with an empty `extraction_error`. That means the extraction call never came back with a verdict at all — the server function threw or was cut off before it wrote any status, so the row stays "pending" forever and the UI reports that content couldn't be read. Successful extractions exist for other PDFs of similar and much larger size, so this is not "PDFs don't work"; it is an unhandled crash path with no recorded reason.

Fixes:

- Make a verdict always land on the row. Wrap the whole handler so any thrown error (download failure, parser crash, timeout) writes `failed` plus a readable reason instead of leaving `pending`.
- Extract page by page instead of one whole-document call, collecting text from pages that parse and skipping individual pages that throw. One malformed page or font table currently kills the entire document.
- Add a page budget for very large PDFs (extract up to a generous page cap, then stop) so a huge file can't run past the request budget and die silently.
- Distinguish real outcomes in the message shown to the user: encrypted/password-protected, no selectable text (scan), damaged file, and "took too long" each get their own wording plus the existing retry action.
- Have the upload path record the same failure reason the retry path already records, so the materials list never shows a stuck "Extracting…" state.
- Log parse diagnostics server-side (page count, pages skipped, characters recovered) so future reports are diagnosable.

Verification: re-run extraction on the currently stuck rows (`PHY102_Study_Notes.pdf`, `CHE 102 compiled slides.pdf`, `1. Lectures 1-6 (1).pdf`, the CBT hall allocation PDF) and confirm each ends in `success` with real text, or in a `failed`/`scanned_pdf` state with an accurate reason. Then run one fresh upload end to end.

## 2. KaTeX math rendering (display layer only)

- Add `katex` as a dependency and load its stylesheet via the root route head.
- Add one small `MathText` component that splits a string on `\( ... \)` and `\[ ... \]` and renders those segments with KaTeX, leaving all other text exactly as-is. Invalid LaTeX falls back to showing the raw text rather than throwing.
- Use it for question text, all four options, and the explanation/WHY text in the mock test screen, and for the same fields in the Test History review screen.
- No change to generation, answer selection, scoring, spacing, or surrounding layout.

Verification: a GST/humanities mock renders identically to before (plain text, no stray symbols); an MTH-style mock renders vectors and equations as formatted notation, including math that appears inside options.

## 3. Entitlement and paywall enforcement

New table `subscriptions`: `user_id`, `tier` (`trial` / `free` / `paid`), `trial_started_at`, `trial_ends_at`, `paid_until`, `paying_user_number`. A row is created on first sign-in with a 7-day trial. Users can read their own row; only server-side privileged code can change tier, `paid_until`, or the founding-user number, so a user cannot grant themselves access.

New table `usage_counters` for per-day counts (mock sets, chatbot messages, new flashcard decks) keyed by user and day, written only through server-side checks.

Founding price: the current count of paid users decides whether the app quotes ₦1,000 or ₦2,000, using `paying_user_number` against the 500 threshold.

Limits, resolved from your answers:

| Feature | Free (after trial) | Trial / Paid |
| --- | --- | --- |
| Mock test sets | 3 per day, max 60 questions per set | Unlimited, up to 120 per set |
| WHY explanations | Locked | Unlocked |
| Predicted Topics | Unlimited | Unlimited |
| Course-material upload (existing flow) | Unlimited | Unlimited |
| CGPA calculator and goal setter | Unlimited | Unlimited |
| Chatbot messages | 25 per day | Unlimited |
| New flashcard decks | 3 per day (reviewing due cards never capped) | Unlimited |
| Resource Library uploads (future) | Locked | Unlocked |

Chatbot, Flashcards and Library are still coming-soon screens, so their caps are defined and enforceable in the backend now and simply have no UI calling them yet.

Enforcement: a single server-side entitlement gate runs before each gated action and either allows it or returns a "limit reached" verdict with the reason and the current founding price. Mock generation calls this gate before generating, and it also clamps the requested question count, so bypassing the frontend slider does nothing. The gate wraps the existing generation flow as a permission check and does not alter extraction, upload, or generation logic.

Frontend: when the gate refuses, a friendly paywall sheet explains the specific limit and the ₦1,000/semester founding price, with a "notify me when payment opens" acknowledgement rather than a dead end. WHY text on wrong answers shows a locked state with the same upsell instead of disappearing. The question slider still moves past 60 for free users but shows the paywall on start rather than a hard error.

No payment provider integration in this task; `paid_until` is set manually or by a future webhook.

Verification: with a simulated expired-trial free account, confirm the 4th mock set of the day and a 90-question request both surface the paywall, WHY is locked, and CGPA plus Predicted Topics stay unrestricted; with a paid account confirm everything is unlimited. Separately, re-run a full upload → extract → predicted topics → mock generation cycle on both account types to confirm the existing pipeline is unchanged.

## Technical notes

- Extraction changes stay inside `src/lib/extraction.server.ts` and `src/lib/extraction.functions.ts` (status persistence), plus the materials list messaging.
- Math rendering adds one component used by `src/components/mock-test-flow.tsx` and the history review screen; no other files change behaviour.
- Entitlement adds a migration for the two tables with row-level security, a server-side gate module, a client hook that reads the user's own entitlement for display, and the paywall sheet component.
