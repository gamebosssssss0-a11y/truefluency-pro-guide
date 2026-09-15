/**
 * On-device cache for PDF bytes so a file a student already opened never has to
 * be downloaded again. Keyed by the stable file key (not the signed URL, which
 * rotates). Every call is best effort: if the device refuses to store anything
 * the viewer simply streams the file as before.
 */
const CACHE_NAME = "tf-pdf-v1";
const INDEX_KEY = "tf.pdf.cache.index";
const MAX_TOTAL_BYTES = 300 * 1024 * 1024;
const MAX_FILE_BYTES = 60 * 1024 * 1024;

type Entry = { key: string; size: number; ts: number };

const requestUrl = (fileKey: string) =>
  `https://tf-pdf-cache.local/${encodeURIComponent(fileKey)}`;

function available(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

function readIndex(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as Entry[]) : [];
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.key === "string") : [];
  } catch {
    return [];
  }
}

function writeIndex(entries: Entry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
  } catch {
    /* the cache still works, we just lose eviction bookkeeping */
  }
}

/** Bytes for a previously opened file, or null when nothing is stored. */
export async function getCachedPdf(fileKey?: string): Promise<ArrayBuffer | null> {
  if (!fileKey || !available()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(requestUrl(fileKey));
    if (!hit) return null;
    const buffer = await hit.arrayBuffer();
    if (!buffer.byteLength) return null;
    // Touch the entry so eviction keeps recently used files.
    const index = readIndex();
    const found = index.find((e) => e.key === fileKey);
    if (found) {
      found.ts = Date.now();
      writeIndex(index);
    }
    return buffer;
  } catch {
    return null;
  }
}

/** Store bytes for later opens, evicting the oldest files past the budget. */
export async function putCachedPdf(fileKey: string | undefined, buffer: ArrayBuffer) {
  if (!fileKey || !available()) return;
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_FILE_BYTES) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      requestUrl(fileKey),
      new Response(buffer, { headers: { "content-type": "application/pdf" } }),
    );
    const index = readIndex().filter((e) => e.key !== fileKey);
    index.push({ key: fileKey, size: buffer.byteLength, ts: Date.now() });
    index.sort((a, b) => b.ts - a.ts);
    let total = 0;
    const keep: Entry[] = [];
    for (const entry of index) {
      total += entry.size;
      if (total > MAX_TOTAL_BYTES && entry.key !== fileKey) {
        await cache.delete(requestUrl(entry.key)).catch(() => undefined);
      } else {
        keep.push(entry);
      }
    }
    writeIndex(keep);
  } catch {
    /* private mode or storage full: streaming still works */
  }
}
