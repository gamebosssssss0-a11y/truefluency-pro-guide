# Fix upload analysis, predicted topics and mock tests

## What's actually broken (confirmed)

The analysis service on Render is up (`/health` returns ok), but it is running an **older build** of the code than the copy in this project. Your app now sends `{ material_id, file_type }` to `/extract-text` (the hardening that stopped trusting a client-supplied file path), while the deployed service still demands a `file_path` field. It answers `422 Field required: file_path`, the app logs it and moves on, and the upload is left at `extraction_status = "pending"` forever.

Confirmed in the database: 5 older files are `success`, and **every upload since Aug 4 (7 files) is stuck at `pending`** — CHM102, GST111, PHY102 and the rest.

Everything else follows from that one failure:

- **"Analyze Upload" disappeared** — the button only renders when a course has a material with successfully extracted text.
- **Predicted topics are empty** — they come from that analyze run.
- **"Customize Mock Test" is disabled** — same gate.

So no feature is individually broken; they are all gated behind text extraction, and extraction has been failing silently since Aug 4.

## The fix

**1. Move text extraction into the app.** Extraction stops depending on the Render service being redeployed. A new authenticated server function reads the file from your private storage bucket, extracts the text in-app, and writes `extracted_content` + `extraction_status` on the material row:

- PDF, Word (.docx) and PowerPoint (.pptx) all handled in-app
- Scanned/image-only PDFs still get the honest `scanned_pdf` status instead of a false success
- A real failure sets `failed` with a readable reason, so the UI can say why

The upload flow calls this instead of the Render `/extract-text` endpoint.

**2. Repair the 7 stuck uploads.** Any material sitting at `pending` or `failed` gets a visible "Retry text extraction" action in the materials list, and the app auto-retries a pending material once when you open a course. Your existing files become usable without re-uploading them.

**3. Leave predictions and mock generation on Render.** `/predict-topics` and `/generate-mock` accept the request shape the app already sends, so they will start working again as soon as materials have text. I'll add clearer error surfacing so a service-side problem shows a real reason instead of a silent empty state.

**4. Verify end to end.** I'll re-extract one of the stuck files, confirm the status flips to `success`, then confirm Analyze Upload appears, predicted topics render, and a mock test generates.

## Note on the Render service

The copy of `main.py` in this project is already the correct version — it just was never redeployed. After this change, extraction no longer needs it, but you should still redeploy it at some point so the deployed code and the repo stop drifting apart. I can't deploy to Render from here.

## Technical notes

- New `src/lib/extraction.functions.ts`: `extractMaterialText` server function using `.middleware([requireSupabaseAuth])`; resolves `file_path` from the caller's own row (never from the request), so the ownership guarantee is preserved.
- Pure-JS, Worker-safe extraction libraries only (no native binaries): `unpdf` for PDF, `mammoth` for Word, `fflate` + slide-XML parsing for PowerPoint — the same approach as the existing edge functions.
- `src/lib/course-materials.ts`: replace the `fetch(${BACKEND_URL}/extract-text)` block with the server function call; add an exported `retryExtraction(materialId)`.
- `src/components/course-detail.tsx`: retry affordance in the materials list, single auto-retry for a pending material, clearer error text from the analysis service.
- The three existing extraction edge functions stay untouched.
