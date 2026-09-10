# Fix: Flashcards screen appears truncated on entry

## Root cause (confirmed in preview)

Every in-app screen (Home, Flashcards, Library, etc.) renders on the same `/` route, switched by the `view` state. Nothing scrolls the window back to the top when the view changes. The Flashcards card sits partway down the Home page, so tapping it mounts the Flashcards screen while the window is still scrolled down — the header card, course chips, and empty state are pushed off the top of the screen. It looks truncated every time. The same bug affects any screen opened from a scrolled position (Calculator, Goal setter, Upgrade, etc.).

## Fix (one small change)

In `src/routes/index.tsx`, add a `useEffect` keyed on `view` that calls `window.scrollTo(0, 0)` whenever the view changes. This resets scroll for every screen switch, fixing Flashcards and all sibling screens at once.

## Locks respected

- No changes to `flashcards.tsx` content, splash, Library, chatbot, mock poll, landing, `/s/:token`, `.env`, calculator, or entitlement numbers.
- Layout/styling of the Flashcards screen itself is untouched.

## Verification

- `bunx tsgo --noEmit -p tsconfig.json` and build pass.
- Playwright: open Home, scroll down, tap Flashcards card → header card ("Flashcards" + cap chip) visible at the top immediately; same for the review screen; repeat on desktop width.

## Files touched

- `src/routes/index.tsx`
