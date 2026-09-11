# File viewer: full-screen mode and faster opening

## What changes

1. **Full screen toggle.** A small expand button sits in the viewer's top bar, next to the page counter. Tapping it fills the whole screen with the file (cream background, same top bar and bottom page bar). The button becomes a shrink button, which returns the file to its normal place on the page. The phone/computer back gesture and the Escape key also return it to normal, so nobody gets stuck.
2. **Re-fit on resize.** When the view expands or shrinks, the page repaints to the new width so it always fills the space instead of staying small.
3. **Faster opening.** The opening step gets noticeably quicker:
   - the reading engine starts loading the moment the viewer appears, instead of waiting for extra setup;
   - the engine files are reused between openings, so the second and later files open almost instantly;
   - the first page is requested and drawn before the rest of the document is inspected;
   - larger network chunks and a small pre-warm of the file mean less back-and-forth before page one appears;
   - the remembered page is applied on the first paint, so a returning student doesn't see page 1 flash first.

Unchanged: the 800-page maximum, the cream screen, filename, Close, "page n / total", the Cancel button while opening, remembered page, type-a-page box, the heavy-file message, the no-download rule, the PPT/DOC card, splash, entitlement numbers, mock polling, and environment settings.

## Technical notes

- `src/components/pdf-viewer.tsx`:
  - Add `expanded` state. When true, wrap the viewer in a `fixed inset-0 z-50` container (rendered in place, no portal needed) and add `Maximize2`/`Minimize2` (lucide) toggle in the header with `aria-label` "Full screen" / "Exit full screen". Bind `Escape` via a keydown listener while expanded, and lock `document.body.style.overflow` while expanded, restoring on cleanup.
  - Repaint on size change: add a `ResizeObserver` on `wrapRef` (debounced ~120ms) that stores container width in state, and include that width in the render effect deps so the canvas re-scales; include `expanded` implicitly through it.
  - Loading speed: hoist pdf.js + worker into a module-level memoized `loadPdfjs()` promise so subsequent opens skip the dynamic import; raise `rangeChunkSize` to 524288; keep `disableAutoFetch: true`; call `getPage(startPage)` immediately after `task.promise` resolves and paint before any prefetch work.
  - Compute `start` from `readLastPage` before first paint (already done) — ensure `page` state is set in the same batch as `status = "ready"` so no page-1 paint occurs.
- No changes needed at the call sites in `src/components/library.tsx` or `src/routes/s.$token.tsx`; expanded mode covers the screen from inside the existing frame.

## Files touched

`src/components/pdf-viewer.tsx`
