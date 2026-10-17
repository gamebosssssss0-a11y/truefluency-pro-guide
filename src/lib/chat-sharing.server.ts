import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { ChatShareVisibility, SharedChatMessage, SharedConversation } from "@/lib/chat-sharing.functions";

const PAGE_SIZE = 500;
const MAX_SHARED_MESSAGES = 5000;

type OwnedConversation = {
  conversation_id: string;
  user_id: string;
  course_code: string;
  created_at: string | null;
};

type ShareState = {
  token: string | null;
  visibility: ChatShareVisibility;
  isRevoked: boolean;
  updatedAt: string;
};

function parseVisibility(value: unknown): ChatShareVisibility {
  if (value === "public" || value === "private") return value;
  throw new Error("Invalid chat share visibility.");
}

function serviceFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function admin() {
  const url = process.env["SB_URL"] ?? process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Chat sharing is not configured.");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: serviceFetch(key) },
  });
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function ownedConversation(
  db: ReturnType<typeof admin>,
  ownerId: string,
  conversationId: string,
): Promise<OwnedConversation> {
  const { data, error } = await db
    .from("chat_conversations")
    .select("conversation_id, user_id, course_code, created_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Conversation not found.");
  return data;
}

async function conversationSnapshot(
  db: ReturnType<typeof admin>,
  ownerId: string,
  conversationId: string,
  conversation?: OwnedConversation,
): Promise<Omit<SharedConversation, "visibility">> {
  const owned = conversation ?? await ownedConversation(db, ownerId, conversationId);
  const messages: SharedChatMessage[] = [];

  for (let offset = 0; offset < MAX_SHARED_MESSAGES; offset += PAGE_SIZE) {
    const { data, error } = await db
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", ownerId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;

    const rows = data ?? [];
    for (const row of rows) {
      if (row.role !== "user" && row.role !== "assistant") continue;
      messages.push({ role: row.role, content: row.content, createdAt: row.created_at });
    }
    if (rows.length < PAGE_SIZE) break;
    if (offset + rows.length >= MAX_SHARED_MESSAGES) {
      throw new Error("This conversation is too long to share in one link.");
    }
  }

  if (!messages.length) throw new Error("Add a saved message before sharing.");
  return { courseCode: owned.course_code, createdAt: owned.created_at, messages };
}

function parseSnapshot(value: Json): Omit<SharedConversation, "visibility"> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as { courseCode?: unknown; createdAt?: unknown; messages?: unknown };
  if (typeof source.courseCode !== "string" || !Array.isArray(source.messages)) return null;
  const messages: SharedChatMessage[] = [];
  for (const item of source.messages) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const message = item as { role?: unknown; content?: unknown; createdAt?: unknown };
    if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") continue;
    messages.push({
      role: message.role,
      content: message.content,
      createdAt: typeof message.createdAt === "string" ? message.createdAt : null,
    });
  }
  if (!messages.length) return null;
  return {
    courseCode: source.courseCode,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : null,
    messages,
  };
}

export async function getOwnedChatShare(opts: {
  ownerId: string;
  conversationId: string;
}): Promise<ShareState | null> {
  const db = admin();
  await ownedConversation(db, opts.ownerId, opts.conversationId);
  const { data, error } = await db
    .from("chat_shares")
    .select("token, visibility, is_revoked, updated_at")
    .eq("owner_id", opts.ownerId)
    .eq("conversation_id", opts.conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    token: data.is_revoked ? null : data.token,
    visibility: parseVisibility(data.visibility),
    isRevoked: data.is_revoked,
    updatedAt: data.updated_at,
  };
}

export async function createOrUpdateOwnedChatShare(opts: {
  ownerId: string;
  conversationId: string;
  visibility: ChatShareVisibility;
}): Promise<ShareState> {
  const db = admin();
  const conversation = await ownedConversation(db, opts.ownerId, opts.conversationId);
  const snapshot = await conversationSnapshot(db, opts.ownerId, opts.conversationId, conversation);
  const { data: existing, error: findError } = await db
    .from("chat_shares")
    .select("id, token, is_revoked")
    .eq("owner_id", opts.ownerId)
    .eq("conversation_id", opts.conversationId)
    .maybeSingle();
  if (findError) throw findError;

  const updatedAt = new Date().toISOString();
  const payload = {
    owner_id: opts.ownerId,
    conversation_id: opts.conversationId,
    visibility: opts.visibility,
    snapshot: snapshot as unknown as Json,
    is_revoked: false,
    updated_at: updatedAt,
  };

  const result = existing
    ? await db
        .from("chat_shares")
        .update({ ...payload, token: existing.is_revoked ? newToken() : existing.token })
        .eq("id", existing.id)
        .select("token, visibility, is_revoked, updated_at")
        .single()
    : await db
        .from("chat_shares")
        .insert({ ...payload, token: newToken() })
        .select("token, visibility, is_revoked, updated_at")
        .single();
  if (result.error) throw result.error;
  return {
    token: result.data.token,
    visibility: parseVisibility(result.data.visibility),
    isRevoked: result.data.is_revoked,
    updatedAt: result.data.updated_at,
  };
}

export async function revokeOwnedChatShare(opts: {
  ownerId: string;
  conversationId: string;
}): Promise<void> {
  const db = admin();
  await ownedConversation(db, opts.ownerId, opts.conversationId);
  const { error } = await db
    .from("chat_shares")
    .update({ is_revoked: true, updated_at: new Date().toISOString() })
    .eq("owner_id", opts.ownerId)
    .eq("conversation_id", opts.conversationId);
  if (error) throw error;
}

export async function readChatShareForViewer(opts: {
  token: string;
  visibility: ChatShareVisibility;
  viewerId?: string;
}): Promise<SharedConversation | null> {
  const db = admin();
  const { data, error } = await db
    .from("chat_shares")
    .select("conversation_id, owner_id, visibility, is_revoked, snapshot")
    .eq("token", opts.token)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.is_revoked || data.visibility !== opts.visibility) return null;
  if (opts.visibility === "private" && (!opts.viewerId || data.owner_id !== opts.viewerId)) return null;

  // A deleted conversation invalidates its snapshot, even if the token was copied elsewhere.
  const conversation = await ownedConversation(db, data.owner_id, data.conversation_id).catch(() => null);
  if (!conversation) return null;
  const snapshot = parseSnapshot(data.snapshot);
  if (!snapshot) return null;
  return { ...snapshot, visibility: parseVisibility(data.visibility) };
}
