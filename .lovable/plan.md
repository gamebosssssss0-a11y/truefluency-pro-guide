# Full Diagnostic and Hardening Pass

I ran a complete check: TypeScript compiles with zero errors, the AI analysis service is online and responding, and the app renders. But the diagnostic found one blocking infrastructure problem and a set of real defects worth fixing.

## The blocker (why things "don't work" right now)

Your hosted database and auth are **paused**. Every error in the current logs is the same failure: sign-in, sign-up, and session refresh all fail with "Failed to fetch" because the backend isn't running. Nothing in the code causes this, and no code change fixes it — the backend has to be resumed first. That is step 1, and I'll ask for your approval before resuming since it affects your live app.

## Real defects found

**1. Cross-course mock question mix-up (highest impact)**
Generated AI questions are stored as one flat list rather than per course, and the cloud loader pulls the single most recently generated set for *any* course. Switching courses or signing in on a second device can serve one course's questions inside another course's test, and can overwrite the wrong course's saved set. Fix: key questions by course code everywhere they are saved, loaded, and read.

**2. Deleting your last course doesn't stick**
The cloud cleanup that removes deleted courses only runs when at least one course remains. Delete your final course and it silently comes back on next sign-in. Fix: always run the cleanup, and delete safely when the list is empty.

**3. Wrong answers can silently default to option A**
If the AI ever returns a malformed answer index, the app quietly treats option A as correct instead of discarding the question. That corrupts scoring with no warning. Fix: drop invalid questions and surface a clear message if too few survive.

**4. Passwords stored in clear text on the device**
Local account records keep the raw password in browser storage. Fix: stop persisting the plaintext password; keep only what's needed to re-derive the session.

**5. Silent sign-in failures**
Two paths fail invisibly: an unmatched local account proceeds as if signed in (uploads then fail with confusing errors), and a failed sign-up silently falls back to a throwaway guest session. Fix: surface both with clear messages instead of failing quietly.

**6. Corrupted saved profile wipes progress with no explanation**
Stored profile data is trusted without validation and parse failures are swallowed. Fix: validate on load, recover what's valid, and tell the user if something was reset.

**7. Dead code from the old extraction pipeline**
Three unused extraction functions still exist server-side, plus an entire unused extraction endpoint and its libraries in the Python service. They duplicate and have drifted from the live in-app extractor. Fix: delete all of them and correct the stale comments describing the old flow.

**8. Unhelpful "not ready" messages**
The analysis service returns the same generic error for scanned, failed, and pending uploads. Fix: return status-specific messages so users know whether to retry, re-upload, or paste text.

**9. Social sharing previews show no image**
The share card is configured for a large image but no image is set. Fix: add the proper preview image tags using your logo.

**10. Mobile polish at 360px and small a11y items**
Three-column stat rows can overflow with long values, and one note is below readable size. Fix: add truncation guards and bump the undersized text.

**11. 4,451 formatting violations across the codebase**
All auto-fixable, plus two loose `any` types and a handful of React hook dependency warnings. Fix: format the codebase, tighten the two types, and resolve the genuine stale-dependency warnings.

## Verification

After the changes: typecheck and lint clean, then a real end-to-end run against the resumed backend — sign in, upload a document, extract, predict topics, generate a mock, take it, review the attempt, delete a course, sign out and back in to confirm the cloud data matches. I'll report exactly what passed.

## Technical notes

- Question storage moves from a flat `aiQuestions` array to a course-keyed map in `profile-store.tsx`, with matching changes in `cloud-sync.ts` (load/push), `mock-test-flow.tsx` (lookup by course + id), and `course-detail.tsx`.
- `cloud-sync.ts` course cleanup is lifted out of the `profile.courses.length` guard; the hand-built PostgREST `not.in` filter is replaced with a parameter-safe form.
- `backend-api.ts` `generateMock` validates `correct_index` bounds and filters instead of coercing to 0.
- `supabase-session.ts` returns an explicit result the caller in `routes/index.tsx` can act on; the anonymous fallback becomes opt-in for guest mode only.
- Delete `supabase/functions/extract-{pdf,docx,pptx}-text/`; remove `/extract-text` plus PyPDF2/python-docx/python-pptx from the Python service and its requirements.
- `main.py` `fetch_extracted_text` branches per `extraction_status`.
- `og:image`/`twitter:image` added to the leaf route head using the absolute logo URL.
- Formatting via the project's Prettier config; hook warnings fixed by correcting dependencies, not by suppressing rules.

I will not touch `.env`, your credentials, or the backend URL.
