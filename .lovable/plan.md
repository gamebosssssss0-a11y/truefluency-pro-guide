# Raise PDF viewer preview cap to 800 pages

## What we will change
- Update `src/components/pdf-viewer.tsx`:
  - Change `MAX_PREVIEW_PAGES` from `15` to `800`.
  - Update the file comment and the "First X pages shown" label so they reflect the new cap.
- Keep the existing error card and "too heavy" fallback for files that still fail to load or render in pdf.js.
- Run typecheck/build to confirm no regressions.

## What we will not change
- No viewer architecture change (still single canvas, one page at a time).
- No download button or navigation to raw storage URLs.
- No touch to Library schema, entitlements, mock polling, splash, or `.env`.
