# /admin, Phase 1 only

Scope is the seven items you listed and nothing else. The stability pass is merged (f04bfed), and none of its files get reopened. No charts, no new tab, no new sign-in, no Paystack, no `.env` changes, same Supabase project.

## Findings that change the brief

1. **No UpgradeSheet exists.** Upgrade is a full screen, and limits are shown inline by `PaywallNotice` inside the mock flow and chat, which are both locked. So gate hits get recorded on the server at the point where the existing quota check refuses an action (`consumeFeatureQuota`). No locked screen is edited.
   - Counted: `mock_cap`, `questions_over_30`, `chat_cap`, and `deck_cap` (only if decks go through the same check).
   - `why_lock`: there is no server event, so it shows "not counted yet".
2. **Students can currently edit their own profile row.** Without a guard, a student could set `is_admin` to true themselves. The migration adds a lock so only the table editor or the service role can change `is_admin`.
3. **"Started" mocks are not stored**, only submitted ones. Mock completion shows submitted only, with that caveat written on the card.
4. **Flashcard review history is not stored.** Only each card's latest `last_reviewed_at` exists, so reviews count from that column. The page says this.

## What the page shows (all numbers, no charts)

- **Cards:** registered students, active today (Lagos time: mock submit, chat send, or flashcard review), trials still inside 7 days, mocks submitted in the last 7 days.
- **Top courses (20):** code, uploads, submitted mocks, distinct students. Sorted by mocks. Course code only.
- **Ratios:** each shows its count over its denominator, or "—" when the denominator is 0.
  - Upload to practice within 1 hour.
  - Mock completion (submitted only, see finding 3).
  - 7-day depth: students active on 4 or more Lagos days out of 7, over registered students.
- **Pipeline health:** "usable" and "failed" totals, then up to 50 failed rows showing course code, status, created date and material id. No links and no text.
- **Paywall hits (7 days):** a count per gate. No users are shown.
- Anything that can't be counted from an existing table shows "not counted yet".

## Security

- New `profiles.is_admin` column, default false. It is never set true in a migration; founders flip it in the table editor.
- The `requireAdmin` server function needs a signed-in session and `is_admin` true.
- All counts come from one database function that re-checks `is_admin` and only ever returns counts, course codes, statuses, ids and dates.
- Non-admins visiting `/admin` are sent to the normal app. Same sign-in as today.
- `gate_hits` table: students can only insert their own rows (through the server), and only admins can read them.

## Technical details

Migration:
- `profiles.is_admin boolean not null default false`.
- A trigger that rejects changes to `is_admin` unless the request comes from the service role or the table editor.
- A `public.is_admin()` security-definer function.
- The `gate_hits` table:
  - Columns: `id`, `user_id`, `gate` checked against the five gate names, `created_at`.
  - Grants: insert/select for authenticated users, all for service role.
  - Row security on: insert own rows, select only where `is_admin()`.
- A security-definer `admin_dashboard_stats()` function that raises an error unless `is_admin()` is true and returns aggregate JSON. It never selects `extracted_content`, `file_path`, `file_name`, chat `content`, or question/answer data.

Files:
- New `src/lib/admin.functions.ts`: `requireAdmin` and `getAdminStats`, using `requireSupabaseAuth` and calling the database function as the signed-in user.
- New `src/routes/admin.tsx`:
  - The page runs in the browser only and does its admin check before showing anything.
  - Non-admins get a replace-redirect to `/`.
  - Cards and tables use the existing design tokens.
  - Its own page title and description; marked noindex.
- `src/lib/entitlements.server.ts`: after a denied verdict, insert the matching row into `gate_hits` (best-effort, never blocks the student). Prices, caps and messages stay the same.
- No other files.

Verification:
- Run the privacy grep on the admin function and the database function for `extracted_content`, `file_path`, `content`, `stem`, `option`, `explanation` and `signedUrl`. The expected result is zero hits.
- Typecheck and build.
- Live check signed in as a student with `is_admin` false: confirm the redirect and that the data call is refused.
- Live check as an admin. If no admin account can be minted, the report says NOT LIVE-TESTED.
- Final self-report answers your four questions and lists the files touched.
