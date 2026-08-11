# Fix the Upload and Analyze buttons

## What I confirmed

- Your signed-in account (`gamebosssssss0@gmail.com`) has **zero** uploaded materials in the database. So every upload you've attempted has failed before anything was saved, which matches "nothing at all happens".
- The button wiring itself is intact: on a desktop preview, tapping "Upload paper" does reach the hidden file input. So the break is on the mobile/in-app browser side, not in the click handler.
- The hidden file input is styled `display: none`. Android WebViews and in-app browsers (and some mobile PWA shells) commonly refuse to open the file picker for a `display: none` input opened programmatically. This is the most likely cause, and it is exactly the kind of failure that produces no error and no visible feedback.
- "Analyze Upload" is not broken and not disabled: it is **not rendered at all** unless the course has a material with successfully extracted text. Your account has no materials, so the button never appears. Three older uploads belonging to other accounts are still stuck at `pending` with no recorded error, which means the retry path is also failing silently.
- The analysis service is up (`/health` returns ok) and the backend config points at the correct project. `.env` will not be touched.

## The fix

**1. Make the file picker work in every mobile browser.**
Replace the `display: none` input with a visually-hidden but still rendered input (off-screen, zero opacity) and wrap the trigger in a real `<label>`, so the tap opens the picker natively instead of relying on a programmatic click. This is the standard fix for Android WebView and in-app browsers.

**2. Never fail silently again.**
If a tap produces no file selection and no upload within a couple of seconds, show an inline message with a plain "Choose a file" fallback link. Every failure in the upload chain (auth, storage, database insert) already throws, but the message will now always be surfaced on screen, not only via a toast that a mobile browser may swallow.

**3. Make "Analyze Upload" always visible.**
Instead of hiding it, the button renders whenever the course has any material and explains its own state:
- material has text: analyzes as it does today
- material still processing or failed: reads text first, then analyzes, showing the real reason if that fails
- no material yet: stays disabled with "Upload a paper first"

**4. Fix silent extraction retries.**
The automatic retry for a `pending` upload will report its outcome: success flips the badge, failure writes a readable reason onto the upload row and shows it in the materials list, with a visible "Retry" action.

**5. Verify end to end.**
I'll drive the app in a real browser, upload a small test PDF as your account, confirm the row is created, text is extracted, the Analyze button appears, and predicted topics come back from the analysis service.

## Technical notes

- `src/components/course-detail.tsx`: `UploadButton` gets a `<label htmlFor>` + `sr-only`-style input (`position:absolute; opacity:0; width:1px`) instead of `className="hidden"`; add a no-response watchdog and a persistent inline error panel; loosen the `ready` gate that hides the Analyze/Customize actions; surface retry results.
- `src/lib/course-materials.ts`: have `retryExtraction` persist the failure reason on the row rather than swallowing it.
- No changes to `.env`, storage policies (verified correct), or the Render service.
