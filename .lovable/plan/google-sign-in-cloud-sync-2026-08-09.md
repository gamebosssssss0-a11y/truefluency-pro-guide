# Google Sign-In + Cloud Sync

## Task 1 — Continue with Google

The identity screen already has Sign Up / Log In tabs plus "Continue as Guest".
Google is added as a third option in the same visual language, no layout change:

- A white bordered button with the official multicolour Google "G" mark and the
  label "Continue with Google", placed directly under the existing "or" divider
  (above "Continue as Guest"), visible on both the Sign Up and Log In tabs.
- Tapping it starts the managed Google OAuth flow for this project. On return,
  the app reads the signed-in session, fills the profile identity (name, email,
  avatar name fallback) and continues to the next onboarding step for new users,
  or straight to the dashboard for users who already have cloud data.
- Failure or cancellation shows the existing inline error note style
  ("Google sign-in didn't complete. Tap to try again.") with the button returned
  to its normal tappable state. No blank or frozen screen.
- Email/password and Guest stay exactly as they are.

## Task 2 — Cloud sync

Today everything lives in one localStorage blob (`truefluency-profile-v2`).
Cloud becomes the source of truth, localStorage stays as an offline cache.

### Proposed tables (all in the app database, one row-owner per user)

```text
profiles              one row per user
  user_id (PK -> auth user)
  display_name, email
  goal, timeline, study_preference
  faculty, department, level
  setup_complete, disclaimer_accepted, cgpa_intro_seen
  streak_days, last_qualifying_day
  has_completed_first_mock
  cgpa_inputs (json), cgpa_plan (json), cgpa_actual (json)
  created_at, updated_at

user_courses          one row per enrolled course
  id, user_id, course_code, title, units, source ("verified" | "manual")
  test_settings (json: question count, minutes, difficulty, topic focus)
  mastered (bool)
  unique (user_id, course_code)

mock_attempts         one row per completed test
  id, user_id, course_code, course_title
  score, correct, total, submitted_at
  topics (json), questions (json), answers (json), settings (json)

ai_question_sets      saved generated question sets
  id, user_id, course_code, questions (json), generated_at

course_topic_analysis one row per analysed course
  id, user_id, course_code, material_id, topics (json), analyzed_at
  unique (user_id, course_code)
```

Existing `course_materials` is unchanged and already follows this pattern.

### RLS approach

Every table: row level security on, and one policy per table granting all
actions to the signed-in user only when the row's owner equals their own
user id (both for reading and for writing). No anonymous read access, and
no cross-user visibility. Table access is granted to signed-in users and to
the server role only. Guest (anonymous) sessions are real auth users, so
their rows are isolated the same way and are upgraded in place if they later
sign in with Google.

### Sync behaviour

- On sign-in: load all five tables into the profile state, replacing local
  state when a cloud record exists.
- First sign-in with local-only data: push the existing local profile,
  courses, attempts, streaks, questions and analysis into the cloud, then
  treat cloud as authoritative. Nothing is discarded.
- On every write that currently touches localStorage (finishing a mock test,
  streak bump, adding or removing a course, saving test settings, saving
  analysis, CGPA results): write to the database and keep the local cache
  updated so the app still works offline and renders instantly.
- Failed writes queue in the local cache and retry on next load, so a flaky
  connection never loses an attempt.

## Technical notes

- One migration creates the five tables with grants, RLS, policies, and
  `updated_at` triggers. No changes to `course_materials`.
- New `src/lib/cloud-sync.ts` holds load/push/merge helpers; `profile-store`
  gains a sync effect and per-action write-through. All reads and writes go
  through authenticated server-side calls scoped to the current user.
- Google provider is activated for this project in the same pass as the button.
- No UI layout, styling, or animation changes beyond the new Google button.
