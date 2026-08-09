# Splash screen duration: 5 seconds

The splash animation currently advances to the next screen as soon as its animation loop completes, or immediately when skipped. The user wants the splash screen to remain visible for a fixed 5 seconds on every app open.

## What changes

- Ensure the splash screen always remains visible for exactly 5 seconds, regardless of how long the visual animation takes.
- Keep the splash skippable: a tap or key press during the 5 seconds still jumps to the disclaimer.
- Preserve the reduced-motion path (short version for users who prefer less motion).
- Show the splash on every app open (keep the previously agreed behavior of not gating it behind session storage).

## Technical notes

- `src/components/onboarding/splash.tsx`: introduce a 5-second minimum hold timer using `setTimeout`/`setInterval`. The screen only advances when the timer completes, but still allows manual skip via tap or key press.
- If the animation is shorter than 5 seconds, loop it or hold on the final frame until the timer expires. If it is longer, let the animation finish first (timer already expired).
- Update any displayed progress/skip hint to reflect the 5-second window.
- No other files need edits.
