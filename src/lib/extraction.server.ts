/**
 * Server-only text extraction for course materials.
 *
 * Pure-JS, Worker-safe extractors (no native binaries): `unpdf` for PDF, and
 * `fflate` + Office XML parsing for Word and PowerPoint. Kept out of
 * the `.functions.ts` wrapper so the server-fn splitter can't strip it.
 */
import { unzipSync, strFromU8 } from "fflate";

/** Anything shorter than this is treated as "no usable text". */
export const MIN_USABLE_CHARS = 20;

/** Upper bound on pages parsed, so a huge deck can't outrun the request budget. */
const MAX_PDF_PAGES = 400;

export type ExtractionOutcome =
  | { status: "success"; text: string; chars: number }
  | { status: "scanned_pdf" }
  | { status: "failed"; error: string };

function tidy(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * PDFs are read one page at a time so a single malformed page, broken font
 * table or odd content stream can't discard the whole document. Whatever
 * parsed is kept.
 */
async function fromPdf(bytes: Uint8Array): Promise<string> {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const total: number = Number((pdf as { numPages?: number }).numPages ?? 0);
  const limit = Math.min(total || 0, MAX_PDF_PAGES);

  const pages: string[] = [];
  let skipped = 0;

  for (let i = 1; i <= limit; i += 1) {
    try {
      const page = await pdf.getPage(i);
      const content = (await page.getTextContent()) as {
        items: Array<{ str?: string; hasEOL?: boolean }>;
      };
      const text = content.items
        .map((item) => (item.str ?? "") + (item.hasEOL ? "\n" : ""))
        .join("");
      if (text.trim()) pages.push(text);
    } catch (e) {
      skipped += 1;
      console.warn("[extraction] skipped unreadable pdf page", { page: i, error: e });
    }
  }

  const joined = pages.join("\n\n");
  console.info("[extraction] pdf parsed", {
    pages: total,
    parsed: limit,
    skipped,
    chars: joined.length,
    truncated: total > limit,
  });

  // Every page failing is a document-level problem, not an empty scan.
  if (limit > 0 && skipped === limit) {
    throw new Error("Every page in this PDF failed to parse.");
  }
  return joined;
}


function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Word text lives in w:t runs; paragraph and break tags become line breaks. */
function fromDocx(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  const parts = Object.keys(files)
    .filter((n) => n === "word/document.xml" || /^word\/(header|footer)\d*\.xml$/.test(n))
    .sort((a, b) => (a === "word/document.xml" ? -1 : b === "word/document.xml" ? 1 : a.localeCompare(b)));

  const chunks: string[] = [];
  for (const name of parts) {
    const entry = files[name];
    if (!entry) continue;
    const text = strFromU8(entry)
      .replace(/<w:br\s*\/?>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<w:tab\s*\/?>/g, " ")
      .replace(/<[^>]+>/g, (tag) => (/^<w:t[\s>]/.test(tag) || tag === "</w:t>" ? "" : " "));
    const decoded = decodeEntities(text);
    if (decoded.trim()) chunks.push(decoded);
  }
  return chunks.join("\n\n");
}

/** Slide order matters for readability, so entries are sorted numerically. */
function fromPptx(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  const slides = Object.keys(files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return na - nb;
    });

  const chunks: string[] = [];
  for (const name of slides) {
    const entry = files[name];
    if (!entry) continue;
    const xml = strFromU8(entry);
    const runs = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => m[1] ?? "");
    const text = decodeEntities(runs.join(" "));
    if (text.trim()) chunks.push(text.trim());
  }
  return chunks.join("\n\n");
}

/** Extract text for one supported file type. Never throws. */
export async function extractText(
  fileType: string,
  bytes: Uint8Array,
): Promise<ExtractionOutcome> {
  try {
    let raw = "";
    if (fileType === "pdf") raw = await fromPdf(bytes);
    else if (fileType === "docx") raw = fromDocx(bytes);
    else if (fileType === "pptx") raw = fromPptx(bytes);
    else return { status: "failed", error: `Unsupported file type: ${fileType}` };

    const text = tidy(raw);
    if (text.length < MIN_USABLE_CHARS) return { status: "scanned_pdf" };
    return { status: "success", text, chars: text.length };
  } catch (e) {
    console.error("[extraction] failed", { fileType, error: e });
    return { status: "failed", error: describeFailure(fileType, e) };
  }
}

/** Turn a parser crash into wording that tells the student what to do next. */
export function describeFailure(fileType: string, e: unknown): string {
  const raw = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();

  if (/password|encrypt/.test(raw)) {
    return "That PDF is password protected, so its text can't be read. Upload an unlocked copy.";
  }
  if (/timeout|timed out|aborted|deadline/.test(raw)) {
    return "Reading that file took too long. Try again, or upload a smaller or split copy.";
  }
  if (/invalid pdf|structure|xref|corrupt|damaged|unexpected end/.test(raw)) {
    return "That PDF looks damaged, so its text can't be read. Try re-saving or re-downloading it.";
  }
  if (fileType === "pdf") {
    return "We couldn't read text from that PDF. Try re-saving it, or paste the text instead.";
  }
  return "We couldn't read text from that file. It may be damaged.";
}

