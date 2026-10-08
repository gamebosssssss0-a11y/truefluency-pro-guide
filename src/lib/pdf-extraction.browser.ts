/**
 * In-browser PDF text extraction (pdf.js, already bundled for the viewer).
 *
 * This is now the PRIMARY reader for typed PDFs: the student's own device
 * reads a long PDF many times faster than the free Render instance, where a
 * 294-page file timed out. The page texts are sent to the backend
 * (/materials/text), which only saves and indexes them. It also remains the
 * fallback when the backend can't be reached at all.
 */
/** Matches the backend's security.MAX_PDF_PAGES. */
const MAX_PDF_PAGES = 500;
/** Matches the backend's per-page cap (main.MAX_PAGE_TEXT_CHARS). */
const MAX_PAGE_TEXT_CHARS = 20_000;

function tidyPdfText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Text of every page, in order — an empty string for a page with no text
 * layer, so page numbers stay true (the study chat cites them).
 * onProgress(done, total) fires after each page.
 */
export async function extractPdfPageTexts(
  file: Blob,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  // Uses pdfjs-dist (already bundled for the in-app viewer) rather than unpdf,
  // which is a server-side module and breaks the client build.
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pageCount = Number(pdf.numPages ?? 0);
  const limit = Math.min(pageCount, MAX_PDF_PAGES);
  const pages: string[] = [];
  let failedPages = 0;
  const started = Date.now();

  try {
    for (let pageNumber = 1; pageNumber <= limit; pageNumber += 1) {
      try {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => {
            if (!("str" in item)) return "";
            return `${item.str}${item.hasEOL ? "\n" : ""}`;
          })
          .join("");
        pages.push(tidyPdfText(text).slice(0, MAX_PAGE_TEXT_CHARS));
        page.cleanup();
      } catch (error) {
        failedPages += 1;
        pages.push("");
        console.warn("[extraction] browser skipped page", { page: pageNumber, error });
      }
      onProgress?.(pageNumber, limit);
    }
  } finally {
    await pdf.cleanup().catch(() => undefined);
  }

  console.info("[extraction] browser read pages", {
    pageCount,
    parsedPages: limit - failedPages,
    failedPages,
    seconds: Math.round((Date.now() - started) / 100) / 10,
    truncated: pageCount > limit,
  });
  return pages;
}

/** Whole-document text (pages joined) — the fallback path writes this directly. */
export async function extractSelectablePdfText(file: Blob): Promise<string> {
  const pages = await extractPdfPageTexts(file);
  return tidyPdfText(pages.filter((p) => p.trim()).join("\n\n"));
}
