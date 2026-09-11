# PDF viewer: faster big files, remembered page, cancellable loading

## Answer first: the sign-up password message

No — the email sign-up screen never says anything about "uppercase, lowercase and digits", and there is no such rule in the app. The only live messages are:

- "Use at least 8 characters."
- "Those two passwords do not match."

Any characters are accepted (the password is turned into a scrambled value before it leaves the phone), so no character-set notice is needed. If you still want a friendly line under the password box, say so and I will add one — otherwise this stays untouched.

## What changes in the viewer

1. **Remember the last page.** Reopening the same file returns to the page the student left, per file, remembered on the device. New file starts at page 1. A small "Back to page N" is not needed — it just opens there, and the page counter shows where they are.
2. **Cancel while opening.** The "Opening your file…" state gets a "Cancel" button. Cancelling stops the download, closes the viewer (Library) or returns to the shared-file card (share link), and never leaves a spinner running.
3. **Faster on very large files.** Keep the 800-page maximum, but make the opening step light:
   - open the document without pulling the whole file up front, so page 1 paints as soon as it arrives;
   - only paint the page being viewed, releasing the previous page's memory;
   - prefetch just the next page so Next feels instant;
   - drop stale paint work when the student pages quickly, so fast tapping cannot pile up work or flicker.
4. **Jump to a page.** With hundreds of pages, tapping Next is not usable, so the bottom bar gets a small page box: type a number, press go, land there. Nothing else in the bar changes.

Unchanged: the cream screen, filename, Close, "page n / total", the heavy-file message, the no-download rule, the PPT/DOC card, splash, entitlement numbers, mock polling, and environment settings.

## Technical notes

- `src/components/pdf-viewer.tsx`: accept an optional `fileKey` prop; persist `lastPage` in `localStorage` under `tf.pdf.page.<fileKey>` (clamped to `total`). Load with `disableAutoFetch: true`, `disableStream: false`, `rangeChunkSize` tuned for range requests; keep the worker import as-is.
- Track the in-flight `PDFDocumentLoadingTask` in a ref; Cancel calls `task.destroy()`, sets a `cancelled` status, and invokes a new optional `onCancel` (falling back to `onClose`).
- Render effect: cancel the previous `RenderTask` via its `cancel()`, call `page.cleanup()` after paint, and ignore `RenderingCancelledException` instead of showing the error card. Prefetch `page + 1` with `getPage` only.
- Add a compact numeric page input in the footer bound to `total`.
- `src/components/library.tsx`: pass `fileKey={preview.id}` and `onCancel={() => setPreview(null)}`.
- `src/routes/s.$token.tsx`: pass `fileKey={"share:" + token}`; cancel returns to the share card body.

## Files touched

`src/components/pdf-viewer.tsx`, `src/components/library.tsx`, `src/routes/s.$token.tsx`.
