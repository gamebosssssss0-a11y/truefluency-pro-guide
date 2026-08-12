# OCR fallback for scanned and unreadable PDFs

Right now a PDF with no selectable text ends as "Scanned, upload as image", and a PDF that breaks the parser ends as "Failed to read content". Neither produces usable study material. This adds an OCR stage that reads the actual page images, so scans, photographed notes, and damaged PDFs still yield text.

## How it will work for the student

1. Upload a PDF as usual.
2. If normal text extraction finds nothing usable (scan) or fails outright (damaged/encrypted-content PDF), the app automatically moves to "Reading pages as images…".
3. Pages are rendered as images and read by the AI vision model, then saved as the upload's content, exactly as if the text had been selectable. Predicted topics and mock tests then work normally.
4. If OCR also comes back empty, the upload shows a clear final reason ("We couldn't read any text from these pages, try a clearer scan") instead of a dead end.
5. Existing uploads stuck at "Scanned" or "Failed" get a "Try OCR" action in the materials list, so nothing has to be re-uploaded.

Only the first 12 pages are OCR'd (kept for cost and speed); the badge notes when a long document was partially read.

## Technical approach

**Page rendering (browser).** The serverless runtime has no canvas, so page rasterisation happens in the browser with `pdfjs-dist` (already in the bundle) drawing to an `OffscreenCanvas`, downscaled to ~1600px on the long edge and encoded as JPEG (quality ~0.8). New module `src/lib/pdf-ocr.browser.ts`:
- `renderPdfPagesToJpeg(file: Blob, maxPages)` → `string[]` of base64 data URLs, page-by-page with per-page try/catch so one bad page doesn't kill the run.
- For the retry path, the file is fetched first via a signed URL from the private `course-materials` bucket.

**OCR (server function).** New `src/lib/ocr.functions.ts` with `ocrMaterialPages`, using `.middleware([requireSupabaseAuth])`, input `{ materialId, pages: string[] }` (page count and per-image size validated, ownership re-checked against `user_id` like `extraction.functions.ts` does). Logic lives in a new `src/lib/ocr.server.ts` helper that calls the Lovable AI gateway (`google/gemini-2.5-flash`, multimodal `image_url` blocks, batched a few pages per request) with a transcription-only prompt: preserve reading order, keep maths as LaTeX so the existing `MathText` renderer picks it up, no commentary.

**Status handling.** Results write back through the same race-safe update used today (never overwrite an existing `success`):
- text found → `extraction_status: 'success'`, `extracted_content` set, error cleared.
- nothing found → keep `scanned_pdf`/`failed` and set `extraction_error` to the friendly OCR message.
- New intermediate stage `{ kind: "ocr" }` added to `UploadStage` in `src/lib/course-materials.ts`, wired after the existing server extraction and browser fallback both come up empty, for PDFs only.

**UI touches.** `src/components/course-detail.tsx`: show the "Reading pages as images…" stage during upload, add the "Try OCR" button next to retry for `scanned_pdf`/`failed` PDFs, and update the badge copy so "Scanned, upload as image" only appears after OCR has also failed.

Scope: PDFs only. Image uploads and DOCX/PPTX behaviour stay as they are.
