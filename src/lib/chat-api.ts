/**
 * Client for TrueFluency's chat feature (FastAPI on Render, chat.py).
 * Kept separate from backend-api.ts on purpose, matching the backend's own
 * chat.py being separate from main.py's mock-generation pipeline — chat is a
 * simpler, lower-stakes call, no need to share the same file.
 *
 * Course threads are resolved server-side; this client never stores a
 * conversation_id itself.
 */
import { supabase } from "@/integrations/supabase/client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

export function isChatConfigured(): boolean {
  return typeof BACKEND_URL === "string" && BACKEND_URL.trim().length > 0;
}

function base(): string {
  if (!isChatConfigured()) throw new Error("Chat service isn't configured yet");
  return BACKEND_URL!.replace(/\/+$/, "");
}

/** A "jump to a feature" chip the assistant suggested (validated server-side). */
export type ChatAction = { key: string; label: string; view: string };

function readErrorDetail(text: string, status: number): string {
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    const detail = parsed?.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
  } catch {
    /* not JSON */
  }
  if (status === 402) return "You've hit your free chat limit for today.";
  if (status === 502) return "The study chat couldn't get a reply right now. Try again.";
  return "The study chat had a problem. Please try again.";
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sign in to use study chat.");
  return { Authorization: `Bearer ${accessToken}` };
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  /** Backend timestamp used to group saved history by day. */
  created_at?: string;
};

/**
 * Sends one message in the given course's thread and gets a
 * reply grounded in that course's uploaded material. The thread itself is
 * resolved and persisted server-side from (account, courseCode) — nothing
 * to pass or remember beyond the course code the student is currently in.
 */
export async function sendChatMessage(
  message: string,
  courseCode: string,
  mode: string,
  imagePath?: string | null,
): Promise<{
  conversationId: string;
  reply: string;
  moderated?: boolean;
  actions: ChatAction[];
  saved: boolean;
}> {
  const url = `${base()}/chat`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35_000);

  try {
    const auth = await authHeader();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({
        message,
        course_code: courseCode,
        mode,
        image_path: imagePath || undefined,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[chat] request failed", { status: res.status, text });
      throw new Error(readErrorDetail(text, res.status));
    }

    const data = (await res.json()) as {
      conversation_id: string;
      reply: string;
      moderated?: boolean;
      actions?: ChatAction[];
      saved?: boolean;
    };
    return {
      conversationId: data.conversation_id,
      reply: data.reply,
      moderated: data.moderated,
      actions: Array.isArray(data.actions) ? data.actions : [],
      saved: data.saved !== false,
    };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw new Error("Study chat timed out. Try again.");
    if (e instanceof TypeError) {
      throw new Error("Couldn't reach study chat. Check your connection and try again.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Loads the full history for one course thread, creating it server-side on
 * first open. Call this when the selected course changes.
 */
export async function getCourseThread(
  courseCode: string,
): Promise<{ conversationId: string; messages: ChatMessage[] }> {
  const url = `${base()}/chat/thread/${encodeURIComponent(courseCode)}`;
  const auth = await authHeader();
  const res = await fetch(url, { method: "GET", headers: auth });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(readErrorDetail(text, res.status));
  }
  const data = (await res.json()) as { conversation_id: string; messages: ChatMessage[] };
  return { conversationId: data.conversation_id, messages: data.messages ?? [] };
}

/**
 * Every message ever sent in a course — the active thread AND anything
 * archived by startNewChatThread — for the History sheet. Distinct from
 * getCourseThread, which shows only the live active thread.
 */
export async function getCourseHistory(
  courseCode: string,
): Promise<{ messages: ChatMessage[] }> {
  const url = `${base()}/chat/history/${encodeURIComponent(courseCode)}`;
  const auth = await authHeader();
  const res = await fetch(url, { method: "GET", headers: auth });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(readErrorDetail(text, res.status));
  }
  const data = (await res.json()) as { messages: ChatMessage[] };
  return { messages: data.messages ?? [] };
}

/**
 * The real "New chat": retires the course's current active conversation
 * server-side so the next message starts a genuinely fresh thread, instead
 * of only resetting local UI state while the old thread kept growing
 * underneath it unseen.
 */
export async function startNewChatThread(courseCode: string): Promise<void> {
  const url = `${base()}/chat/new-thread`;
  const auth = await authHeader();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ course_code: courseCode }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(readErrorDetail(text, res.status));
  }
}
