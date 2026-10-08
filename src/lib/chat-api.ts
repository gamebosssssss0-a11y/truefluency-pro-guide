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
  /** Present on getCourseHistory results — lets the History sheet group by
   * an actual conversation instead of by date alone, so a row can be opened
   * or deleted precisely. Absent on live-thread reads, where it's implied
   * by the single active conversation already being viewed. */
  conversation_id?: string;
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

/**
 * Same request as sendChatMessage, but reads the reply as it streams in
 * instead of waiting for the whole thing — see chat.py's stream_chat_reply.
 * onDelta is called with each new chunk of text as it arrives (already
 * de-duplicated — call it with the growing full text, or accumulate it
 * yourself; this function does NOT accumulate on your behalf, so you always
 * get exactly the new piece).
 *
 * The backend's moderation/quota short-circuits (blocked message, image
 * rejected, out of replies) are NOT streamed — they come back as a normal
 * JSON response instead, same shape sendChatMessage already returns. This
 * function handles both: if the response isn't actually an event-stream,
 * it falls back to reading it as plain JSON, calls onDelta once with the
 * whole reply (so callers don't need two code paths), and returns.
 */
export async function streamChatMessage(
  message: string,
  courseCode: string,
  mode: string,
  imagePath: string | null | undefined,
  onDelta: (deltaText: string) => void,
  /** "Explain this page" text — sent separately so it doesn't count toward the message length limit. */
  pageContext?: string | null,
): Promise<{
  conversationId?: string;
  reply: string;
  moderated?: boolean;
  actions: ChatAction[];
  saved: boolean;
}> {
  const url = `${base()}/chat`;
  const auth = await authHeader();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({
      message,
      course_code: courseCode,
      mode,
      image_path: imagePath || undefined,
      page_context: pageContext || undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(readErrorDetail(text, res.status));
  }

  const contentType = res.headers.get("content-type") ?? "";

  // Moderation/quota short-circuits come back as plain JSON, not a stream —
  // same shape as sendChatMessage's return. Surface it through onDelta once
  // so the caller's single render path still works for this case.
  if (!contentType.includes("text/event-stream") || !res.body) {
    const data = (await res.json()) as {
      conversation_id?: string;
      reply: string;
      moderated?: boolean;
      actions?: ChatAction[];
      saved?: boolean;
    };
    onDelta(data.reply);
    return {
      conversationId: data.conversation_id,
      reply: data.reply,
      moderated: data.moderated,
      actions: Array.isArray(data.actions) ? data.actions : [],
      saved: data.saved !== false,
    };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullReply = "";
  let actions: ChatAction[] = [];
  let saved = true;
  let streamError: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by a blank line.
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const line = rawEvent.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      let parsed: { delta?: string; done?: boolean; actions?: ChatAction[]; saved?: boolean; error?: string };
      try {
        parsed = JSON.parse(line.slice("data: ".length));
      } catch {
        continue; // a malformed chunk shouldn't kill an otherwise-working stream
      }
      if (parsed.error) {
        streamError = parsed.error;
      } else if (parsed.delta) {
        fullReply += parsed.delta;
        onDelta(parsed.delta);
      } else if (parsed.done) {
        actions = Array.isArray(parsed.actions) ? parsed.actions : [];
        saved = parsed.saved !== false;
      }
    }
  }

  if (streamError) throw new Error(streamError);
  if (!fullReply.trim()) throw new Error("The study chat had a problem. Please try again.");

  return { reply: fullReply, moderated: false, actions, saved };
}

/**
 * Permanently deletes one conversation (and every message in it) from the
 * History sheet. See main.py's DELETE /chat/conversation/{id} — ownership
 * is enforced server-side, never trust-on-click here.
 */
export async function deleteChatConversation(conversationId: string): Promise<void> {
  const url = `${base()}/chat/conversation/${encodeURIComponent(conversationId)}`;
  const auth = await authHeader();
  const res = await fetch(url, { method: "DELETE", headers: auth });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(readErrorDetail(text, res.status));
  }
}

/**
 * Makes one archived conversation (from the History sheet) the live active
 * thread for its course again — "continue from here", not just viewing it.
 * Returns the course it belongs to, so the caller knows which tab to switch
 * the live chat screen to. See main.py's POST /chat/resume/{id}.
 */
export async function resumeConversation(conversationId: string): Promise<{ courseCode: string }> {
  const url = `${base()}/chat/resume/${encodeURIComponent(conversationId)}`;
  const auth = await authHeader();
  const res = await fetch(url, { method: "POST", headers: auth });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(readErrorDetail(text, res.status));
  }
  const data = (await res.json()) as { course_code: string };
  return { courseCode: data.course_code };
}
