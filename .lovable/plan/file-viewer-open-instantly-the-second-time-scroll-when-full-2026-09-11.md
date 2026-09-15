# File viewer: open instantly the second time, scroll when full screen

## What changes

1. **The file is kept after the first successful open.** Once a student has opened a file, its content is saved on the device. Coming back to it later — even after closing the app — skips the download entirely and it opens in a few seconds instead of repeating the whole process.
2. **No repeat work inside the same session.** Closing and reopening a file the student just viewed reuses what is already in memory, so it appears immediately.
3. **Space is managed quietly.** Saved files are kept newest-first up to a sensible total (about 300 MB, and only files up to 60 MB each). When the limit is reached, the oldest saved file is dropped. If the device refuses to save (private mode, storage full), the viewer simply works as it does today — no error shown.
4. **Full screen scrolls.** When maximized, pages stack vertically and the student scrolls continuously through the file; the page counter follows whichever page is on screen. Typing a page number jumps to it.
5. **Normal size stays one page at a time.** Minimized keeps only the Back / Next arrows and the page box — no vertical page scrolling between pages.

Unchanged: the 800-page maximum, cream screen, filename, Close, expand/shrink button and Escape, "page n / total", Cancel while opening, remembered page, heavy-file message, no-download rule, PPT/DOC card, splash, entitlement numbers, mock polling, and environment settings.

## Technical notes

- New `src/lib/pdf-cache.ts`:
  - Uses the Cache Storage API (`caches.open("tf-pdf-v1")`) keyed by a stable synthetic request URL derived from `fileKey` (not the signed URL, which rotates), so cache hits survive new signed URLs.
  - `getCachedPdf(fileKey)` returns an `ArrayBuffer` or null; `putCachedPdf(fileKey, buffer)` writes and records `{ key, size, ts }` in a `tf.pdf.cache.index` localStorage list; eviction trims oldest entries past 300 MB total. Skip writes for buffers > 60 MB.
  - All calls wrapped in try/catch — a failure degrades to normal streaming.
- `src/components/pdf-viewer.tsx`:
  - Load path: on mount, try `getCachedPdf(fileKey)`. Hit → `getDocument({ data })`. Miss → keep today's range-request path (`disableAutoFetch`, `rangeChunkSize: 524288`) for first paint, then after `status === "ready"` fetch the full bytes in the background (`fetch(url)`) and store them via `putCachedPdf`, so the current open stays fast and the next one is instant.
  - Add a module-level `Map<fileKey, { url, buffer }>` short-lived memory cache so a close/reopen in the same session skips even the cache read; keep it to one entry to bound memory.
  - Maximized rendering: when `expanded`, render a scrollable column of per-page canvases (windowed — mount only pages near the viewport, ~2 before/after) inside the existing scroll container, with an `IntersectionObserver` updating `page`. Page-box submit and remembered-page restore call `scrollIntoView` on the target page node.
  - Minimized rendering: unchanged single-canvas paint driven by `page`, with Back/Next.
  - Switching between modes carries `page` over: expanding scrolls to the current page, shrinking paints the page last in view.
  - Cleanup: cancel render tasks per page node, `page.cleanup()` on unmount from the window.

## Files touched

`src/lib/pdf-cache.ts` (new), `src/components/pdf-viewer.tsx`
