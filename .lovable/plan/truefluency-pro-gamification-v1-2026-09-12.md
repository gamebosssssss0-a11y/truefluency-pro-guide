# TrueFluency Pro — Gamification V1

## Goal
Add a truthful, persistent study streak and a two-mock daily goal to the existing experience without introducing new destinations, currencies, rankings, AI, payments, or activity credits.

## Persistence and WAT rules
- Extend the existing `profiles` row with the missing fields: `last_active_date`, `freezes_available` (default 1, constrained to 0–2), `freeze_used_on`, and `tour_seen`; keep and reuse the existing `streak_days` column.
- Replace the old local `lastQualifyingDay` streak path with the cloud-backed streak fields, while retaining the normal local profile cache for fast display and offline rendering.
- Add the new fields to generated database types and both cloud load/write mappings. `tourSeen` will therefore remain one-time across devices, as requested.
- Put the streak transition in an authenticated, atomic database operation. The database—not the phone clock—will derive the current date with `Africa/Lagos`, lock the student’s profile row during the update, and return both the saved values and the event (`incremented`, `protected`, `reset`, or same-day no-op).
- Apply these rules:
  - first qualifying submission starts at 1;
  - same WAT date does nothing;
  - next WAT date increments by 1;
  - one fully missed WAT day (a two-calendar-date gap) consumes one available freeze, preserves the count, records `freezeUsedOn`, and returns the exact protection toast;
  - longer gaps, or a missed day with no freeze, reset the streak to 1;
  - crossing from 6 to 7 awards one freeze, capped at 2.
- Keep the existing profile RLS and grants; add constraints/defaults without creating a new table or guest file.

## Mock submission
- Qualify only a completed mock with at least five non-null answers.
- Invoke the authenticated streak update from the existing submit path after the attempt has been committed locally, never from setup, generation, file activity, CGPA, chat, or flashcards.
- Keep the existing submit guard and use the WAT date check as the durable same-day deduplication rule.
- Merge the returned streak state into the profile immediately. Show `Streak protected. 1 freeze used.` only when the server reports protection.
- Keep the current result screen and existing result streak readout; do not add an overlay or continuous celebration.

## Home
Use the requested order:
1. Welcome
2. Trial/plan chip
3. Streak card when `streakDays > 0`
4. Daily goal card when entitlement data exists
5. Existing next-action / Take a mock card
6. Continue your file
7. Strengths
8. CGPA tools
9. Flashcards
10. Quote slab

- Restyle the existing streak block as a 12px-radius sand/white card with the existing border token, a 4px navy left bar, navy number, muted `day study streak` label, and optional single flame icon.
- Show `Protected` only when `freezeUsedOn` is today or yesterday in WAT. Hide the entire card at zero.
- Add the one-time 180ms fade/4px rise; reduced-motion keeps only the fade.
- Add a white daily-goal card sourced directly from `access.usageToday.mock_sets`, displayed as `{n} of 2 mocks today`; at 2 or more, show `Daily target reached.` Clamp only the visual bar to 100%.
- Use the existing sand track and amber fill at 6px height; animate width for 200ms only. Hide the card when access is unavailable.
- Preserve the amber Take a mock button (`#B86E0A`, white label), the navy quote slab (`#1B2A4A`, cream type), and all existing file, strengths, CGPA, flashcard, and quote behavior.

## Locked scope
- Do not change splash, Library schema, mock generation/start/polling, entitlement numbers, calculator formulas, chatbot/flashcard stubs, `.env`, `/s/:token`, tabs, payment behavior, or the existing UpgradeSheet.
- Do not add leagues, XP, gems, progress screens, analytics suites, asset downloads, Drive viewers, extra destinations, freeze sales, paywall motion, confetti, looping animation, or streak-pressure copy.
- Keep the current palette only; no purple or new visual tokens.

## Verification and self-report
- Test first submission, same-day repeat, next-day increment, one missed day with and without a freeze, longer-gap reset, 7-day freeze award, and the 0–2 cap using WAT dates.
- Confirm a refresh/cloud reload preserves all four streak fields plus `tourSeen`.
- Confirm fewer than five answers gives no streak credit and all non-mock activities give zero credit.
- Confirm the goal reads only `usageToday.mock_sets`, hides without access, and the streak card hides at zero.
- Check Home at phone and desktop widths, including reduced-motion behavior and the exact locked colors.
- Run focused tests/typecheck and confirm the preview build is healthy.
- Final report will state: qualifying activity, freeze rules, persistence location, WAT usage, daily-goal source, zero-state visibility, Take a mock background `#B86E0A`, quote background `#1B2A4A`, and files changed.
