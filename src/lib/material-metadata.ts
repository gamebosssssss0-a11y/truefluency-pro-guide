/**
 * Soft, advisory-only metadata heuristic for uploaded course materials.
 *
 * This NEVER blocks or rejects an upload. It looks at document metadata
 * (Producer / Creator / Application fields) for signs the file may not be
 * genuine course material, and returns a reason string when the metadata looks
 * atypical. It makes no claim of certainty.
 *
 * Flags are cached client-side against the material id, along with dismissals,
 * since this is advisory UI state rather than data worth persisting server-side.
 */

const FLAG_KEY = "truefluency-metadata-flags-v1";

type FlagStore = Record<string, { reason: string; dismissed?: boolean }>;

function readStore(): FlagStore {
  try {
    return JSON.parse(localStorage.getItem(FLAG_KEY) ?? "{}") as FlagStore;
  } catch {
    return {};
  }
}

function writeStore(s: FlagStore) {
  try { localStorage.setItem(FLAG_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function setMetadataFlag(materialId: string, reason: string) {
  const s = readStore();
  s[materialId] = { reason };
  writeStore(s);
}

export function getMetadataFlag(materialId: string): string | null {
  const entry = readStore()[materialId];
  if (!entry || entry.dismissed) return null;
  return entry.reason;
}

export function dismissMetadataFlag(materialId: string) {
  const s = readStore();
  if (s[materialId]) {
    s[materialId].dismissed = true;
    writeStore(s);
  }
}

export const METADATA_NOTE =
  "This file's metadata looks unusual, please make sure this is your actual course material for best prediction accuracy.";

/** Tools that commonly appear in the metadata of generated documents. */
const SUSPECT_TOOLS = [
  "chatgpt", "openai", "gpt-", "claude", "anthropic", "gemini", "bard",
  "copilot", "jasper", "quillbot", "notion ai", "writesonic", "copy.ai",
  "perplexity", "deepseek", "llama", "mistral",
];

/** Producers/creators typical of standard Office and PDF exports. */
const TYPICAL_TOOLS = [
  "microsoft", "word", "powerpoint", "excel", "libreoffice", "openoffice",
  "acrobat", "distiller", "pdfmaker", "quartz", "preview", "google", "docs",
  "pages", "keynote", "latex", "pdftex", "xetex", "pdflatex", "ghostscript",
  "canva", "wps", "scanner", "epson", "canon", "hp ", "xerox", "printer",
  "skia", "chromium", "safari", "firefox", "foxit", "nitro", "pdf24",
];

function judge(fields: string[]): string | null {
  const joined = fields.filter(Boolean).join(" ").toLowerCase().trim();
  if (!joined) {
    return "This file has no author or creation-tool metadata at all, which is unusual for a normal Office or PDF export.";
  }
  const suspect = SUSPECT_TOOLS.find((t) => joined.includes(t));
  if (suspect) {
    return `The creation-tool metadata on this file mentions "${suspect.trim()}", which is unusual for course material.`;
  }
  const typical = TYPICAL_TOOLS.some((t) => joined.includes(t));
  if (!typical) {
    return "The creation-tool metadata on this file doesn't match the usual Office, PDF or scanner exports.";
  }
  return null;
}

/* ---------- format readers ---------- */

async function pdfFields(file: File): Promise<string[]> {
  // PDF metadata dictionaries live near the head or tail; sample both ends.
  const head = await file.slice(0, 200_000).text();
  const tail = await file.slice(Math.max(0, file.size - 200_000)).text();
  const text = head + "\n" + tail;
  const grab = (key: string) => {
    const m = text.match(new RegExp(`/${key}\\s*\\(([^)]*)\\)`));
    return m?.[1] ?? "";
  };
  const xmp = text.match(/<xmp:CreatorTool>([^<]*)<\/xmp:CreatorTool>/)?.[1] ?? "";
  return [grab("Producer"), grab("Creator"), grab("Author"), xmp];
}

/** Minimal ZIP entry reader for OOXML docProps, using DecompressionStream. */
async function readZipEntry(file: File, name: string): Promise<string | null> {
  const buf = new Uint8Array(await file.slice(0, Math.min(file.size, 4_000_000)).arrayBuffer());
  const view = new DataView(buf.buffer);
  const target = new TextEncoder().encode(name);

  for (let i = 0; i + 30 < buf.length; i++) {
    if (view.getUint32(i, true) !== 0x04034b50) continue;
    const method = view.getUint16(i + 8, true);
    const compSize = view.getUint32(i + 18, true);
    const nameLen = view.getUint16(i + 26, true);
    const extraLen = view.getUint16(i + 28, true);
    const nameBytes = buf.subarray(i + 30, i + 30 + nameLen);
    if (nameLen !== target.length || !nameBytes.every((b, k) => b === target[k])) continue;

    const start = i + 30 + nameLen + extraLen;
    const data = buf.subarray(start, start + compSize);
    if (compSize === 0) return null;
    if (method === 0) return new TextDecoder().decode(data);
    if (method === 8 && typeof DecompressionStream !== "undefined") {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return await new Response(stream).text();
    }
    return null;
  }
  return null;
}

async function ooxmlFields(file: File): Promise<string[]> {
  const app = (await readZipEntry(file, "docProps/app.xml")) ?? "";
  const core = (await readZipEntry(file, "docProps/core.xml")) ?? "";
  const pick = (xml: string, tag: string) =>
    xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`))?.[1] ?? "";
  return [
    pick(app, "Application"),
    pick(core, "dc:creator"),
    pick(core, "cp:lastModifiedBy"),
  ];
}

/**
 * Returns an advisory reason when the file's metadata looks atypical, or null
 * when it looks standard. Any failure returns null: never block on this.
 */
export async function inspectFileMetadata(
  file: File,
  fileType: "pdf" | "docx" | "pptx" | "image" | "pasted",
): Promise<string | null> {
  try {
    if (fileType === "pdf") return judge(await pdfFields(file));
    if (fileType === "docx" || fileType === "pptx") return judge(await ooxmlFields(file));
    return null;
  } catch (e) {
    console.error("[metadata] inspection failed, ignoring", e);
    return null;
  }
}
