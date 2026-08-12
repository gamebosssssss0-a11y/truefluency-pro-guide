/**
 * Browser fallback for PDF extraction.
 *
 * The primary extractor runs on the server. This fallback uses the bytes the
 * student just selected, so a transient server-function failure cannot leave a
 * normal text PDF stuck at `pending`.
 */
const MAX_PDF_PAGES = 400;

function tidyPdfText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function extractSelectablePdfText(file: Blob): Promise<string> {
  const { getDocumentProxy } = await import("unpdf");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(bytes);
  const pageCount = Number(pdf.numPages ?? 0);
  const limit = Math.min(pageCount, MAX_PDF_PAGES);
  const pages: string[] = [];
  let failedPages = 0;

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
        if (text.trim()) pages.push(text);
      } catch (error) {
        failedPages += 1;
        console.warn("[extraction] browser fallback skipped page", {
          page: pageNumber,
          error,
        });
      }
    }
  } finally {
    await pdf.cleanup().catch(() => undefined);
  }

  const text = tidyPdfText(pages.join("\n\n"));
  console.info("[extraction] browser fallback completed", {
    pageCount,
    parsedPages: limit - failedPages,
    failedPages,
    chars: text.length,
    truncated: pageCount > limit,
  });
  return text;
}