/** Owner-scoped rendered thumbnails only. Never signed URLs, file bytes or peer previews. */
const memory = new Map<string, { image: string; savedAt: number }>();
let epoch = 0;
const MAX_ENTRIES = 100;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function openStore(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open("tf_thumbnail_store_v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("thumbnails", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export function thumbnailCacheKey(ownerId: string, fileId: string, revision: string): string {
  return `${ownerId}:${fileId}:${revision}:v1`;
}

export async function getCachedThumbnail(key: string): Promise<string | null> {
  const cached = memory.get(key);
  if (cached && Date.now() - cached.savedAt < MAX_AGE) return cached.image;
  if (cached) memory.delete(key);
  const expectedEpoch = epoch;
  const db = await openStore();
  if (!db) return null;
  return new Promise((resolve) => {
    const transaction = db.transaction("thumbnails", "readonly");
    const request = transaction.objectStore("thumbnails").get(key);
    request.onsuccess = () => {
      const row = request.result as { image?: string; savedAt?: number } | undefined;
      const image = epoch === expectedEpoch && row?.savedAt && Date.now() - row.savedAt < MAX_AGE &&
        row.image?.startsWith("data:image/") ? row.image : null;
      if (image) {
        memory.set(key, { image, savedAt: row?.savedAt ?? Date.now() });
        if (memory.size > MAX_ENTRIES) { const oldest = memory.keys().next().value; if (oldest) memory.delete(oldest); }
      }
      resolve(image);
    };
    request.onerror = () => resolve(null);
    transaction.oncomplete = () => db.close();
    transaction.onabort = () => { db.close(); resolve(null); };
  });
}

export async function setCachedThumbnail(key: string, image: string): Promise<void> {
  if (!image.startsWith("data:image/") || image.length > 500_000) return;
  const expectedEpoch = epoch;
  memory.set(key, { image, savedAt: Date.now() });
  if (memory.size > MAX_ENTRIES) { const oldest = memory.keys().next().value; if (oldest) memory.delete(oldest); }
  const db = await openStore();
  if (!db) return;
  if (expectedEpoch !== epoch) { db.close(); return; }
  await new Promise<void>((resolve) => {
    const transaction = db.transaction("thumbnails", "readwrite");
    const store = transaction.objectStore("thumbnails");
    store.put({ key, image, savedAt: Date.now() });
    const request = store.getAll();
    request.onsuccess = () => {
      const rows = (request.result as { key: string; savedAt: number }[]).sort((a, b) => b.savedAt - a.savedAt);
      rows.forEach((row, index) => { if (index >= MAX_ENTRIES || Date.now() - row.savedAt > MAX_AGE) store.delete(row.key); });
    };
    transaction.oncomplete = transaction.onabort = transaction.onerror = () => { db.close(); resolve(); };
  });
}

export async function clearThumbnailCache(ownerId?: string, fileId?: string): Promise<void> {
  epoch += 1;
  const matches = (key: string) => !ownerId || key.startsWith(`${ownerId}:${fileId ? `${fileId}:` : ""}`);
  for (const key of memory.keys()) if (matches(key)) memory.delete(key);
  const db = await openStore();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const transaction = db.transaction("thumbnails", "readwrite");
    const store = transaction.objectStore("thumbnails");
    const request = store.openCursor();
    request.onsuccess = () => { const cursor = request.result; if (!cursor) return; if (matches(String(cursor.key))) cursor.delete(); cursor.continue(); };
    transaction.oncomplete = transaction.onabort = transaction.onerror = () => { db.close(); resolve(); };
  });
}