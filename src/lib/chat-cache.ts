/** Account-scoped optional device mirror. Tokens, images and signed URLs never belong here. */
export const CHAT_CACHE_DELAY_MS = 500;
const PREFIX = "truefluency-chat-cache-v2:";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const pending = new Map<string, { owner: string; value: unknown; timer: ReturnType<typeof setTimeout> }>();
const keyFor = (owner: string, scope: string) => `${PREFIX}${owner}:${scope}`;

export function readChatMirror<T>(owner: string, scope: string): T | null {
  if (!owner || typeof window === "undefined") return null;
  const key = keyFor(owner, scope);
  const queued = pending.get(key);
  if (queued) return queued.value as T;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const record = JSON.parse(raw) as { owner?: string; savedAt?: number; value?: T };
    if (record.owner !== owner || typeof record.savedAt !== "number" || Date.now() - record.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return record.value ?? null;
  } catch { return null; }
}

function flushKey(key: string) {
  const entry = pending.get(key);
  if (!entry) return;
  clearTimeout(entry.timer);
  pending.delete(key);
  try { window.localStorage.setItem(key, JSON.stringify({ owner: entry.owner, savedAt: Date.now(), value: entry.value })); }
  catch { /* optional storage; remote messages remain authoritative */ }
}

export function writeChatMirror(owner: string, scope: string, value: unknown, immediate = false) {
  if (!owner || typeof window === "undefined") return;
  const key = keyFor(owner, scope);
  const existing = pending.get(key);
  if (existing) {
    existing.value = value;
  } else {
    pending.set(key, { owner, value, timer: setTimeout(() => flushKey(key), CHAT_CACHE_DELAY_MS) });
  }
  if (immediate) flushKey(key);
}

export function flushChatMirrors() { for (const key of pending.keys()) flushKey(key); }

export function clearChatMirrors(owner: string, scope?: string) {
  if (!owner || typeof window === "undefined") return;
  const matches = (key: string) => scope ? key === keyFor(owner, scope) : key.startsWith(`${PREFIX}${owner}:`);
  for (const [key, entry] of pending) if (matches(key)) { clearTimeout(entry.timer); pending.delete(key); }
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key && matches(key)) window.localStorage.removeItem(key);
    }
  } catch { /* optional */ }
}

type ThreadMessage = { id: number; from: string; text: string; createdAt?: string; sendError?: boolean; requestId?: string };
/** Preserve rendered IDs; only unsaved optimistic/error messages survive a server refresh. */
export function reconcileThread<T extends ThreadMessage>(local: T[], remote: T[]): T[] {
  const identity = (message: ThreadMessage) => `${message.from}:${message.createdAt ?? ""}:${message.text}`;
  const known = new Map(local.map((message) => [identity(message), message]));
  const remoteKeys = new Set(remote.map(identity));
  const settled = remote.map((message) => ({ ...message, id: known.get(identity(message))?.id ?? message.id }));
  return [...settled, ...local.filter((message) => (message.sendError || message.requestId) && !remoteKeys.has(identity(message)) &&
    !remote.some((saved) => saved.from === message.from && saved.text === message.text))];
}