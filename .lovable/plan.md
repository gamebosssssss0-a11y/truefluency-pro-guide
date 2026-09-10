# Restore the Home quote and study-tip card

## What will change
- Replace the current Home quote/tip presentation with the same navy-and-amber card treatment used during mock generation, matching the attached reference.
- Keep the existing verified quote collection and existing study tips; both will continue rotating on Home.
- Synchronize the Home rotation with the mock-generation card’s fade cycle so each item fades away before the next appears instead of changing abruptly.
- Preserve a stable card area while content changes, and disable animation for students who prefer reduced motion.

## Scope
- Update the Home card in `src/components/dashboard.tsx`.
- Reuse the existing quote-card styling and animation in `src/styles.css`; adjust only if needed to support both quotes and tips cleanly.
- Do not change mock generation behavior, quote/tip wording, navigation, or other Home sections.

## Verification
- Confirm quotes and study tips both appear in the restored card.
- Confirm the transition fades rather than switching immediately.
- Compare the Home card against the mock-generation card at phone and desktop widths.
- Run typecheck and confirm the preview build is healthy.
