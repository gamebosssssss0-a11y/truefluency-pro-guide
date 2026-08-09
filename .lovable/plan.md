# Splash animation on every app open

Right now the splash screen is gated: the first time it plays, it writes a
`truefluency-splash-seen` flag to session storage, and every later open in that
same browser tab skips the animation instantly. That contradicts the agreed
behaviour of showing it every time someone enters the app.

## What changes

- Remove the once-per-session gate so the full "Sonic Unfurl" animation plays on
  every app open, including reloads and returning to the tab's app entry.
- Keep it skippable: a tap or key press still jumps straight to the disclaimer.
- Keep the reduced-motion path (short version for users who prefer less motion).
- No visual, timing, or layout changes to the animation itself.

## Technical notes

- `src/components/onboarding/splash.tsx`: delete the `SESSION_KEY` constant, the
  `sessionStorage` read that auto-advances, and the write inside `advance()`.
  The component then always renders `SonicUnfurlLoader` and advances on
  `onDone`, pointer, or key input.
- No other files need edits; `src/components/loading-splash.tsx` and the store's
  step routing stay as they are.
