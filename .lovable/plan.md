# Price, Library theme, Study Chat, and math rendering

## Build
- Fix the existing CGPA type error only because the current build is red; do not change calculator formulas or behavior.
- Change student-facing payment periods from semester to month while keeping the exact naira amounts, founding-student count, and trial length.
- Convert Library, locker, shelf, sheets, dialogs, and preview chrome to existing theme tokens so light and dark follow the app theme without altering PDF pixels or file-type colors.
- Tighten the existing `chatbot.tsx` layout: keep all current controls, move loading to a muted header status, center the empty state, place Camera/Gallery with the bottom composer, and add the Camera/Gallery attachment sheet without OCR.
- Improve the existing KaTeX presentation through `math-text.tsx` and the current rich-text path: centered display equations, spacing, whole-formula display, step-title styling when supplied, and boxed final lines. Keep mock/review guards and generation unchanged.

## Verification
- Confirm Study Chat still mounts the existing screen and no coming-soon screen is routed.
- Check the requested light/dark Library and Chat states at 360px, plus chat attachment and equation rendering.
- Check the current build result and report exact remaining semester-money strings.
- Restrict the two exposed billing/usage policies to service access plus each signed-in user’s own row, then mark the security findings fixed.

## Locked areas
No environment, project, Cloud, PDF engine, Vite exclusions, mock generation/polling, caps, OCR, new chat service, CGPA formulas, or cloud-sync history merge changes.
