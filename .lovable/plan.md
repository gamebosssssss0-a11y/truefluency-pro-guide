# TrueFluency Pro — In-App Analytics Page

## Purpose

A private, owner-only dashboard inside the app that answers four questions at a glance:

1. **Growth** — how many students are signing up, and how many are on trial vs paid.
2. **Engagement** — are students actually studying (mocks taken, flashcards reviewed, chats sent, files uploaded)?
3. **Retention** — do students come back (daily/weekly active users, streak distribution)?
4. **Content health** — which courses/faculties are most used, so you know where to focus.

This is an admin tool for you (the founder), not a student-facing feature.

## Page Layout (draft)

Route: `/admin/analytics` — hidden from the tab bar; reachable only by direct URL for admins.

```text
┌─────────────────────────────────────┐
│ Analytics                    [7d|30d]│
├─────────────────────────────────────┤
│ KPI cards (2x2 grid)                │
│  Total students | Active today      │
│  Paid / Trial   | Mocks this week   │
├─────────────────────────────────────┤
│ Signups over time (line chart)      │
├─────────────────────────────────────┤
│ Activity mix (bar chart)            │
│  mocks / flashcards / chats / files │
├─────────────────────────────────────┤
│ Streak distribution (histogram)     │
├─────────────────────────────────────┤
│ Top courses by activity (table)     │
│  course | students | mocks | files  │
├─────────────────────────────────────┤
│ Recent signups (last 10, email+date)│
└─────────────────────────────────────┘
```

- Mobile-first (360px), matches existing dark/light tokens — no new colors.
- Time-range toggle: 7 days / 30 days.
- Charts via a lightweight lib already in the stack (or simple CSS bars — no heavy chart dependency unless needed).

## What Data It Keeps

Two categories:

**1. Aggregates computed from existing tables (no new storage):**
- Signup counts and dates — from `auth.users` / profiles
- Mocks taken, flashcard reviews, chat messages, uploads — counts from existing activity tables
- Streak distribution — from the existing streak data

**2. A lightweight daily roll-up table (new, optional but recommended):**
- `analytics_daily` — one row per day: date, signups, active users, mocks, flashcard reviews, chats, uploads
- Written once per day by a scheduled job (pg_cron hitting a secured `/api/public/cron/analytics-rollup` endpoint)
- Keeps the dashboard instant — it reads one small table instead of scanning everything on every load

**What it will NOT keep:** message contents, file contents, answers to mock questions, or any per-student drill-down beyond counts. Aggregate numbers only — no student can be individually profiled from this page.

## Security Model

- **Admin gate, server-side:** a new `user_roles` table (`admin` role) with a `has_role()` security-definer function, per the standard Supabase pattern. Your account gets the admin role via a one-time SQL statement. No client-side role checks, no localStorage flags.
- **Route protection:** the page lives under the `_authenticated` layout plus an admin check in the loader that redirects non-admins to Home. The data itself is served by a protected server function (`requireSupabaseAuth` + `has_role` check) — so even if a non-admin guesses the URL, the data call returns 401/403.
- **RLS on the roll-up table:** `SELECT` allowed only where `has_role(auth.uid(), 'admin')`; writes only from the cron endpoint using the service role. No `anon` grant.
- **Cron endpoint:** verifies a shared secret header before running; lives under `/api/public/` only because cron callers can't hold a session.
- **No secrets in the browser:** everything reads through server functions; nothing new goes to `VITE_`.

## Constraints Respected

- Uses the existing Lovable Cloud / Supabase project — no new services, no `.env` changes, no Paystack, no price/cap/formula changes.
- No changes to splash, mock poll, Library schema, or calculator formulas.

## Build Steps

1. Migration: `app_role` enum + `user_roles` table + `has_role()` function + `analytics_daily` table (with GRANTs and RLS), plus one statement granting you the admin role.
2. `src/lib/analytics.functions.ts` — protected server function returning all dashboard aggregates (admin-checked).
3. `src/routes/api/public/cron/analytics-rollup.ts` — secret-verified daily roll-up writer.
4. `src/routes/_authenticated/admin.analytics.tsx` — the page (KPI cards, charts, tables) per the layout above.
5. Verify: typecheck, build, then a live check signed in as admin (page renders with real numbers) and as a non-admin (redirected, data call rejected).
