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

/** The conversation the client asked to continue no longer exists (deleted, or not theirs). */
export class ChatConversationGoneError extends Error {
  constructor() {
    super("That conversation couldn't be found. Open it again from History.");
    this.name = "ChatConversationGoneError";
  }
}

export type ChatSendResult = {
  conversationId?: string;
  reply: string;
  moderated?: boolean;
  actions: ChatAction[];
  saved: boolean;
  /** The connection dropped after some of the reply had arrived. */
  interrupted?: boolean;
};

/**
 * Non-streaming convenience wrapper. The backend's /chat answers with a
 * Server-Sent-Events stream for normal replies and plain JSON only for the
 * moderation short-circuits; this used to call res.json() unconditionally, which
 * throws on a stream. It now goes through the same parser as streamChatMessage.
 */
export async function sendChatMessage(
  message: string,
  courseCode: string,
  mode: string,
  imagePath?: string | null,
  conversationId?: string | null,
): Promise<ChatSendResult> {
  return streamChatMessage(message, courseCode, mode, imagePath, () => {}, { conversationId });
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

/** No bytes at all for this long -> treat the stream as dead. */
const STREAM_IDLE_TIMEOUT_MS = 45_000;
/** Hard ceiling on one reply, however steadily it trickles in. */
const STREAM_MAX_MS = 150_000;

type StreamEvent = {
  delta?: string;
  done?: boolean;
  actions?: ChatAction[];
  saved?: boolean;
  error?: string;
  conversation_id?: string;
};

/**
 * Sends one message and reads the reply as it streams in — see chat.py's
 * stream_chat_reply. onDelta receives each NEW piece of text as it arrives (it
 * does not accumulate for you).
 *
 * conversationId is the conversation the student has open. Pass it and the
 * message goes to THAT conversation (resuming it if it was archived); omit it
 * and the course's active thread is used.
 *
 * The backend's moderation/quota short-circuits come back as plain JSON rather
 * than a stream; both shapes are handled here so callers have a single path.
 *
 * Failure handling: an idle/overall timeout aborts the request; a stream that
 * ends early after partial text resolves with `interrupted: true` (so the
 * student keeps what they were shown) instead of throwing it away; one that
 * ends with nothing throws.
 */
export async function streamChatMessage(
  message: string,
  courseCode: string,
  mode: string,
  imagePath: string | null | undefined,
  onDelta: (deltaText: string) => void,
  options: { conversationId?: string | null } = {},
): Promise<ChatSendResult> {
  const url = `${base()}/chat`;
  const auth = await authHeader();
  const controller = new AbortController();
  let timedOut = false;
  const timeout = () => { timedOut = true; controller.abort(); };
  let idleTimer = setTimeout(timeout, STREAM_IDLE_TIMEOUT_MS);
  const hardTimer = setTimeout(timeout, STREAM_MAX_MS);
  const touch = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(timeout, STREAM_IDLE_TIMEOUT_MS);
  };

  let fullReply = "";
  let actions: ChatAction[] = [];
  let saved = true;
  let conversationId: string | undefined;
  let sawDone = false;
  let streamError: string | null = null;

  const handleEvent = (rawEvent: string) => {
    // An SSE event is one or more "data:" lines; ours are always one JSON line.
    const data = rawEvent
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n");
    if (!data) return;
    let parsed: StreamEvent;
    try {
      parsed = JSON.parse(data) as StreamEvent;
    } catch {
      return; // a malformed chunk shouldn't kill an otherwise-working stream
    }
    if (parsed.error) {
      streamError = parsed.error;
    } else if (parsed.delta) {
      fullReply += parsed.delta;
      onDelta(parsed.delta);
    } else if (parsed.done) {
      sawDone = true;
      actions = Array.isArray(parsed.actions) ? parsed.actions : [];
      saved = parsed.saved !== false;
      if (typeof parsed.conversation_id === "string") conversationId = parsed.conversation_id;
    }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({
        message,
        course_code: courseCode,
        mode,
        image_path: imagePath || undefined,
        conversation_id: options.conversationId || undefined,
      }),
      signal: controller.signal,
    });
    touch();

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[chat] request failed", { status: res.status, text });
      if (res.status === 404 && options.conversationId) throw new ChatConversationGoneError();
      throw new Error(readErrorDetail(text, res.status));
    }

    const contentType = res.headers.get("content-type") ?? "";

    // Moderation/quota short-circuits come back as plain JSON, not a stream.
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
    let dropped = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        touch();
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n?/g, "\n");
        // SSE events are separated by a blank line.
        let boundary: number;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          handleEvent(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);
        }
      }
      buffer += decoder.decode().replace(/\r\n?/g, "\n");
      if (buffer.trim()) handleEvent(buffer); // a final event with no trailing blank line
    } catch (e) {
      // The connection died mid-stream (network drop, our own timeout). Keep any
      // text already shown rather than discarding it.
      dropped = true;
      if (!fullReply.trim()) {
        if (timedOut || (e as Error)?.name === "AbortError") throw new Error("Study chat timed out. Try again.");
        throw new Error("Couldn't reach study chat. Check your connection and try again.");
      }
    }

    if (streamError) throw new Error(streamError);
    if (!fullReply.trim()) throw new Error("The study chat had a problem. Please try again.");

    // Stream ended without its terminal event: the reply is incomplete, and we
    // can't know whether the server managed to save it.
    const interrupted = dropped || !sawDone;
    return {
      conversationId,
      reply: fullReply,
      moderated: false,
      actions,
      saved: interrupted ? false : saved,
      interrupted,
    };
  } catch (e) {
    if (e instanceof ChatConversationGoneError) throw e;
    if ((e as Error)?.name === "AbortError") throw new Error("Study chat timed out. Try again.");
    if (e instanceof TypeError) {
      throw new Error("Couldn't reach study chat. Check your connection and try again.");
    }
    throw e;
  } finally {
    clearTimeout(idleTimer);
    clearTimeout(hardTimer);
  }
}

/**
 * Opens ONE specific conversation (for the History sheet). Returns only that
 * conversation's messages — never merged with the course's other conversations.
 * Throws ChatConversationGoneError if it no longer exists.
 */
export async function getConversation(
  conversationId: string,
): Promise<{ conversationId: string; courseCode: string; archived: boolean; messages: ChatMessage[] }> {
  const url = `${base()}/chat/conversation/${encodeURIComponent(conversationId)}`;
  const auth = await authHeader();
  const res = await fetch(url, { method: "GET", headers: auth });
  if (res.status === 404) throw new ChatConversationGoneError();
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(readErrorDetail(text, res.status));
  }
  const data = (await res.json()) as {
    conversation_id: string;
    course_code: string;
    archived?: boolean;
    messages: ChatMessage[];
  };
  return {
    conversationId: data.conversation_id,
    courseCode: data.course_code,
    archived: data.archived === true,
    messages: data.messages ?? [],
  };
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
