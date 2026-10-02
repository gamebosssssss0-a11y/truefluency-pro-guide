# Reliable file removal, uploads, and Study Chat

## What I confirmed
- File removal is not consistently confirmed: the course-material delete control calls its handler immediately, while the Library's Remove action only deletes the database row and doesn't report database failures.
- Uploads already have stage messages and a retry option, but a picker watchdog and limited inline recovery leave room for unclear or stalled states.
- Study Chat starts a new server thread when its screen first mounts. Since the screen unmounts during navigation, returning to Chat can start another thread instead of restoring the one from earlier in the same app session.
- History fetches each course in parallel, but waits for every course request before showing results; a slow request delays the whole sheet.
- Existing course materials use an authenticated, owner-scoped policy in the checked migration. This work does not need a schema change.

## Plan
1. Add a clear confirmation dialog before removing a file from every file-removal surface. Keep the dialog open while removal is in progress, prevent duplicate taps, refresh the visible list on success, and show a retryable error without hiding the file on failure.
2. Tighten upload recovery: keep the native file-picker fallback, make picker/upload progress and errors persist visibly, and offer a safe retry without starting duplicate uploads. Preserve the current file types and upload flow.
3. Correct Study Chat session behavior: start a fresh thread once per course on a new app session, then restore the same in-session thread and draft/messages when the student navigates away and returns. Keep older conversations available in History.
4. Refine chat loading and history: show cached rows immediately, render fresh course results progressively instead of waiting for the slowest request, and add bounded waiting plus a clear retry state. Aim for usable history within four seconds; report when the external chat service prevents meeting that target rather than hiding the delay.
5. Add consistent visible loading, empty, success, and error/retry states for these file and chat flows, then verify confirmation/cancel/delete, upload fallback/retry, same-session chat return, new-session fresh chat, and history loading.

## Technical notes
- Frontend changes will use existing dialogs, upload helpers, chat API, and session storage; no new Supabase tables, Cloud setup, `.env` changes, Paystack changes, or unrelated feature changes are planned.
- History requests are served by the configured external chat service. The app can improve caching, concurrency, progressive display, and timeout feedback, but cannot guarantee its server response time when that service is slow.
