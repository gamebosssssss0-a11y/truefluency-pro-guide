/**
 * Client for TrueFluency's chat feature (FastAPI on Render, chat.py).
 * Kept separate from backend-api.ts on purpose, matching the backend's own
 * chat.py being separate from main.py's mock-generation pipeline — chat is a
 * simpler, lower-stakes call, no need to share the same file.
 *
 * Threads are per (account, course scope) now, resolved server-side — this
 * client never generates or stores a conversation_id itself. "all" is the
 * scope for "All my notes"; any other value is a real course code.
 */
import { supabase } from "@/integrations/supabase/client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

export const ALL_SCOPE = "all";

export function isChatConfigured(): boolean {
  return typeof BACKEND_URL === "string" && BACKEND_URL.trim().length > 0;
}

function base(): string {
  if (!isChatConfigured()) throw new Error("Chat service isn't configured yet");
  return BACKEND_URL!.replace(/\/+$/, "");
}

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
  /** Present on the merged "all my notes" feed only — which course thread this came from. */
  course_code?: string;
};

/**
 * Sends one message in the given course's thread (or "all") and gets a
 * reply grounded in that course's uploaded material. The thread itself is
 * resolved and persisted server-side from (account, courseCode) — nothing
 * to pass or remember beyond the course code the student is currently in.
 */
export async function sendChatMessage(
  message: string,
  courseCode: string,
): Promise<{ conversationId: string; reply: string }> {
  const url = `${base()}/chat`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35_000);

  try {
    const auth = await authHeader();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ message, course_code: courseCode }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[chat] request failed", { status: res.status, text });
      throw new Error(readErrorDetail(text, res.status));
    }

    const data = (await res.json()) as { conversation_id: string; reply: string };
    return { conversationId: data.conversation_id, reply: data.reply };
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
 * Loads the full history for one course's thread (or "all"'s own thread),
 * creating it server-side on first open. Call this whenever the chatbot
 * screen mounts or the course scope changes, so the conversation picks up
 * where it left off instead of resetting on every tab switch.
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
 * The read-only "All my notes" display feed: every course thread's messages
 * merged into one timeline, tagged with which course each message came
 * from. Separate from getCourseThread(ALL_SCOPE), which is the "all"
 * thread's own saved conversation that new "all"-scope messages append to.
 */
export async function getAllMergedThread(): Promise<ChatMessage[]> {
  const url = `${base()}/chat/all-merged`;
  const auth = await authHeader();
  const res = await fetch(url, { method: "GET", headers: auth });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(readErrorDetail(text, res.status));
  }
  const data = (await res.json()) as { messages: ChatMessage[] };
  return data.messages ?? [];
}
