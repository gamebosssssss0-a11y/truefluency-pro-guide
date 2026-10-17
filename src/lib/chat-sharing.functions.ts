import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CHAT_SHARE_OFFLINE_MESSAGE = "Sharing isn't live yet.";
export const CHAT_SHARE_UNAVAILABLE_MESSAGE = "This conversation link is no longer available.";

export type ChatShareVisibility = "public" | "private";
export type SharedChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: string | null;
};
export type SharedConversation = {
  courseCode: string;
  createdAt: string | null;
  visibility: ChatShareVisibility;
  messages: SharedChatMessage[];
};

function sharingReady(): boolean {
  return Boolean(process.env["SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"]);
}

function cleanConversationId(value: unknown): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id || id.length > 128 || /[\u0000-\u001f]/.test(id)) {
    throw new Error("Conversation not found.");
  }
  return id;
}

function cleanToken(value: unknown): string {
  const token = typeof value === "string" ? value.trim() : "";
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error(CHAT_SHARE_UNAVAILABLE_MESSAGE);
  return token;
}

function cleanVisibility(value: unknown): ChatShareVisibility {
  if (value !== "public" && value !== "private") throw new Error("Choose public or private access.");
  return value;
}

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/not configured/i.test(message)) return CHAT_SHARE_OFFLINE_MESSAGE;
  if (message === "Conversation not found." || message === "Add a saved message before sharing.") return message;
  console.warn("[chat-share] operation failed");
  return "Couldn't update this share link. Try again.";
}

export const getChatShareState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string }) => ({
    conversationId: cleanConversationId(input?.conversationId),
  }))
  .handler(async ({ data, context }) => {
    if (!sharingReady()) return { ok: false as const, reason: CHAT_SHARE_OFFLINE_MESSAGE };
    try {
      const { getOwnedChatShare } = await import("@/lib/chat-sharing.server");
      return { ok: true as const, share: await getOwnedChatShare({ ownerId: context.userId, conversationId: data.conversationId }) };
    } catch (error) {
      return { ok: false as const, reason: safeMessage(error) };
    }
  });

export const createOrUpdateChatShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string; visibility: ChatShareVisibility }) => ({
    conversationId: cleanConversationId(input?.conversationId),
    visibility: cleanVisibility(input?.visibility),
  }))
  .handler(async ({ data, context }) => {
    if (!sharingReady()) return { ok: false as const, reason: CHAT_SHARE_OFFLINE_MESSAGE };
    try {
      const { createOrUpdateOwnedChatShare } = await import("@/lib/chat-sharing.server");
      const share = await createOrUpdateOwnedChatShare({
        ownerId: context.userId,
        conversationId: data.conversationId,
        visibility: data.visibility,
      });
      return { ok: true as const, share };
    } catch (error) {
      return { ok: false as const, reason: safeMessage(error) };
    }
  });

export const revokeChatShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string }) => ({
    conversationId: cleanConversationId(input?.conversationId),
  }))
  .handler(async ({ data, context }) => {
    if (!sharingReady()) return { ok: false as const, reason: CHAT_SHARE_OFFLINE_MESSAGE };
    try {
      const { revokeOwnedChatShare } = await import("@/lib/chat-sharing.server");
      await revokeOwnedChatShare({ ownerId: context.userId, conversationId: data.conversationId });
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, reason: safeMessage(error) };
    }
  });

export const readPublicChatShare = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => ({ token: cleanToken(input?.token) }))
  .handler(async ({ data }) => {
    if (!sharingReady()) return { ok: false as const, reason: CHAT_SHARE_OFFLINE_MESSAGE };
    try {
      const { readChatShareForViewer } = await import("@/lib/chat-sharing.server");
      const conversation = await readChatShareForViewer({ token: data.token, visibility: "public" });
      return conversation
        ? { ok: true as const, conversation }
        : { ok: false as const, reason: CHAT_SHARE_UNAVAILABLE_MESSAGE };
    } catch {
      return { ok: false as const, reason: CHAT_SHARE_UNAVAILABLE_MESSAGE };
    }
  });

export const readPrivateChatShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => ({ token: cleanToken(input?.token) }))
  .handler(async ({ data, context }) => {
    if (!sharingReady()) return { ok: false as const, reason: CHAT_SHARE_OFFLINE_MESSAGE };
    try {
      const { readChatShareForViewer } = await import("@/lib/chat-sharing.server");
      const conversation = await readChatShareForViewer({
        token: data.token,
        visibility: "private",
        viewerId: context.userId,
      });
      return conversation
        ? { ok: true as const, conversation }
        : { ok: false as const, reason: CHAT_SHARE_UNAVAILABLE_MESSAGE };
    } catch {
      return { ok: false as const, reason: CHAT_SHARE_UNAVAILABLE_MESSAGE };
    }
  });
