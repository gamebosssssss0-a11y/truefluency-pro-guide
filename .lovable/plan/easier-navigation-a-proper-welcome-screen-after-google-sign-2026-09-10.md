# Easier navigation + a proper welcome screen after Google sign-in

Two things: fix the empty name after "Continue with Google", and make the whole app easier for a first-time student to move around.

## 1. Welcome screen after a first Google sign-in

Right now, when someone signs in with Google, the app quietly guesses a name from the Google account and moves on — which often leaves the name blank and never asks for a photo.

New "Finish your profile" screen, shown **only** the first time a Google account signs in (never again, and never for email sign-ups or guests):

- Their Google email shown as read-only, with a line saying this is the account they signed in with.
- Full name field, pre-filled with whatever Google gave us (may be empty) — required, must be more than one character.
- Photo: round picker with "Add a photo" — optional. Tapping it opens the phone's gallery, the photo is cropped square and saved to their account. A "Skip for now" style hint says they can add it later in Account, and the coloured letter circle is used until they do.
- One amber "Continue" button. After it, they go into the normal setup (goal → courses) if they are new, or straight to Home if their account already has everything.

Never-again rule: a flag on the profile records that this screen has been completed, saved to the account (not just the phone), so a second device or a re-install does not ask again. Existing signed-in users who already have a name are treated as done.

## 2. Making the app easier to move around

**Plain labels and one-line help**
Every tab and screen gets a plain-English name and one short line under the title saying what it is for, in student words ("Your uploads and shared notes", "Practice with questions from your own material"). Buttons get verbs, not nouns.

**First-run walkthrough on Home**
The first time someone lands on Home, a short 4-step guided tour points at: upload a file, take a mock test, flashcards, and Account. Each step is one sentence with "Next", plus a "Skip tour" link. It can be replayed from Account. Shown once, remembered on the account.

**Simpler Home with one obvious next step**
Home gets a single "Do this next" card at the top that always tells them the one useful action right now — upload your first file, continue the file you started, or take a mock test on your weakest topic. Everything else on Home stays but sits below it with more breathing room, so the screen reads as one clear instruction instead of six competing cards.

## Technical notes

- New `src/components/onboarding/profile-setup-google.tsx` plus a `google-profile` onboarding step in `src/lib/profile-store.tsx`; routed from `src/routes/index.tsx`.
- In the `onAuthStateChange` sync path in `profile-store.tsx`, an OAuth session whose synced profile has no `profileCompleted` flag routes to `google-profile` instead of `goal`/`dashboard`. Email/password and anonymous guest paths are unchanged.
- New persisted booleans `profileCompleted` and `tourSeen`, written through the existing cloud-sync push so they follow the account.
- Photo reuses `src/lib/avatar.ts` (`uploadMyAvatar`) — same `course-materials/{uid}/avatar/` path, no new bucket, no new route.
- Home changes stay in `src/components/dashboard.tsx`; labels/help lines in `tab-bar.tsx` and the screen headers; tour as a small local overlay component, no new dependency.
- Untouched: entitlements and caps (30/60), pipeline, CGPA math, Gemini, splash, signing-in screen, landing, trial-welcome, payment button, Library schema, `/s/:token`, `.env`.
