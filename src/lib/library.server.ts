/**
 * Plan B Library, server-only core.
 *
 * Everything that reads or writes another student's row happens here with the
 * service role key, behind explicit ownership / token checks. The browser never
 * selects other users' rows directly, and RLS stays untouched.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** A file needs this much extracted text before mocks can use it. */
export const READY_FOR_MOCKS_MIN_CHARS = 50;
const BUCKET = "course-materials";
const SHARE_TTL_DAYS = 7;
export const SHARE_MAX_USES = 5;
export const REDEEM_MISS_MESSAGE = "This link is no longer available.";

export type ShelfItem = {
  id: string;
  course_code: string;
  file_name: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
  peer_alias: string;
  readyForMocks: boolean;
};

export type ShelfCourse = { course_code: string; count: number };

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
  const url = process.env["SUPABASE_URL"];
  // Lovable blocks the SUPABASE_ prefix for user secrets, so the service role
  // key lives under SERVICE_ROLE_KEY. Server-only, never VITE_.
  const key = process.env["SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Library service is not configured.");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: serviceFetch(key) },
  });
}

function ready(text: string | null): boolean {
  return (text ?? "").trim().length >= READY_FOR_MOCKS_MIN_CHARS;
}

async function aliasFor(ownerId: string): Promise<string> {
  try {
    const { data } = await admin()
      .from("profiles")
      .select("display_name")
      .eq("user_id", ownerId)
      .maybeSingle();
    const first = (data?.display_name ?? "").trim().split(/\s+/)[0];
    return first ? `${first} (peer)` : "A peer";
  } catch {
    return "A peer";
  }
}

/** Published files from other students. Never returns extracted text. */
export async function listShelf(opts: {
  viewerId: string;
  courseCode?: string | undefined;
  search?: string | undefined;
}): Promise<{ items: ShelfItem[]; courses: ShelfCourse[] }> {
  const db = admin();
  let query = db
    .from("course_materials")
    .select(
      "id, user_id, course_code, file_name, file_type, size_bytes, created_at, extracted_content, published",
    )
    .eq("published", true)
    .eq("is_peer_copy", false)
    .neq("user_id", opts.viewerId)
    .order("created_at", { ascending: false })
    .limit(300);

  const code = (opts.courseCode ?? "").trim().toUpperCase();
  if (code) query = query.eq("course_code", code);

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];

  const search = (opts.search ?? "").trim().toLowerCase();
  const filtered = search
    ? rows.filter(
        (r) =>
          r.course_code.toLowerCase().includes(search) ||
          r.file_name.toLowerCase().includes(search),
      )
    : rows;

  const owners = Array.from(new Set(filtered.map((r) => r.user_id)));
  const aliases = new Map<string, string>();
  for (const owner of owners.slice(0, 50)) aliases.set(owner, await aliasFor(owner));

  const items: ShelfItem[] = filtered.map((r) => ({
    id: r.id,
    course_code: r.course_code,
    file_name: r.file_name,
    file_type: r.file_type,
    size_bytes: r.size_bytes,
    created_at: r.created_at,
    peer_alias: aliases.get(r.user_id) ?? "A peer",
    readyForMocks: ready(r.extracted_content),
  }));

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.course_code, (counts.get(r.course_code) ?? 0) + 1);
  const courses = Array.from(counts.entries())
    .map(([course_code, count]) => ({ course_code, count }))
    .sort((a, b) => a.course_code.localeCompare(b.course_code));

  return { items, courses };
}

/** Owner-only publish toggle. */
export async function setPublished(opts: {
  ownerId: string;
  materialId: string;
  published: boolean;
}): Promise<{ published: boolean }> {
  const db = admin();
  const { data: row, error } = await db
    .from("course_materials")
    .select("id, user_id, is_peer_copy")
    .eq("id", opts.materialId)
    .maybeSingle();
  if (error) throw error;
  if (!row || row.user_id !== opts.ownerId) throw new Error("File not found.");
  if (row.is_peer_copy) throw new Error("Saved peer copies cannot be published.");

  const { error: upErr } = await db
    .from("course_materials")
    .update({
      published: opts.published,
      published_at: opts.published ? new Date().toISOString() : null,
    })
    .eq("id", opts.materialId);
  if (upErr) throw upErr;

  if (!opts.published) {
    await db
      .from("library_shares")
      .update({ is_revoked: true })
      .eq("material_id", opts.materialId);
  }
  return { published: opts.published };
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 28);
}

export type ShareLink = {
  token: string;
  expires_at: string;
  max_uses: number;
  use_count: number;
  is_revoked: boolean;
  file_name: string;
};

/** One file, one link. Seven day expiry, five uses, revocable. */
export async function createShareLink(opts: {
  ownerId: string;
  materialId: string;
}): Promise<ShareLink> {
  const db = admin();
  const { data: row, error } = await db
    .from("course_materials")
    .select("id, user_id, file_name, is_peer_copy")
    .eq("id", opts.materialId)
    .maybeSingle();
  if (error) throw error;
  if (!row || row.user_id !== opts.ownerId) throw new Error("File not found.");
  if (row.is_peer_copy) throw new Error("Saved peer copies cannot be shared.");

  const { data: existing } = await db
    .from("library_shares")
    .select("token, expires_at, max_uses, use_count, is_revoked")
    .eq("material_id", opts.materialId)
    .eq("owner_id", opts.ownerId)
    .eq("is_revoked", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  const live = existing?.[0];
  if (live && live.use_count < live.max_uses) {
    return { ...live, file_name: row.file_name };
  }

  const token = newToken();
  const expires_at = new Date(Date.now() + SHARE_TTL_DAYS * 86_400_000).toISOString();
  const { data: created, error: insErr } = await db
    .from("library_shares")
    .insert({
      material_id: opts.materialId,
      owner_id: opts.ownerId,
      token,
      expires_at,
      max_uses: SHARE_MAX_USES,
    })
    .select("token, expires_at, max_uses, use_count, is_revoked")
    .single();
  if (insErr) throw insErr;
  return { ...created, file_name: row.file_name };
}

export async function revokeShareLink(opts: {
  ownerId: string;
  token: string;
}): Promise<{ revoked: boolean }> {
  const db = admin();
  const { error } = await db
    .from("library_shares")
    .update({ is_revoked: true })
    .eq("token", opts.token)
    .eq("owner_id", opts.ownerId);
  if (error) throw error;
  return { revoked: true };
}

export async function listShareLinks(ownerId: string): Promise<
  (ShareLink & { material_id: string })[]
> {
  const db = admin();
  const { data, error } = await db
    .from("library_shares")
    .select("token, expires_at, max_uses, use_count, is_revoked, material_id")
    .eq("owner_id", ownerId)
    .eq("is_revoked", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s) => ({ ...s, file_name: "" }));
}

type ResolvedShare = {
  share: { id: string; use_count: number; max_uses: number };
  material: {
    id: string;
    user_id: string;
    course_code: string;
    file_name: string;
    file_type: string;
    mime_type: string;
    size_bytes: number;
    file_path: string;
    extracted_content: string | null;
    extraction_status: string;
  };
};

async function resolveShare(token: string): Promise<ResolvedShare | null> {
  const db = admin();
  const { data: share } = await db
    .from("library_shares")
    .select("id, material_id, use_count, max_uses, is_revoked, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!share || share.is_revoked) return null;
  if (new Date(share.expires_at).getTime() <= Date.now()) return null;
  if (share.use_count >= share.max_uses) return null;

  const { data: material } = await db
    .from("course_materials")
    .select(
      "id, user_id, course_code, file_name, file_type, mime_type, size_bytes, file_path, extracted_content, extraction_status",
    )
    .eq("id", share.material_id)
    .maybeSingle();
  if (!material) return null;
  return { share, material };
}

export type RedeemedShare = {
  token: string;
  file_name: string;
  file_type: string;
  course_code: string;
  size_bytes: number;
  readyForMocks: boolean;
  peer_alias: string;
  previewUrl: string | null;
  usesLeft: number;
  maxUses: number;
};

/** Read a one-file link. Returns null for every miss, expiry or exhaustion. */
export async function redeemShareLink(token: string): Promise<RedeemedShare | null> {
  const resolved = await resolveShare(token);
  if (!resolved) return null;
  const { share, material } = resolved;

  let previewUrl: string | null = null;
  try {
    const { data } = await admin()
      .storage.from(BUCKET)
      .createSignedUrl(material.file_path, 60 * 30);
    previewUrl = data?.signedUrl ?? null;
  } catch {
    previewUrl = null;
  }

  return {
    token,
    file_name: material.file_name,
    file_type: material.file_type,
    course_code: material.course_code,
    size_bytes: material.size_bytes,
    readyForMocks: ready(material.extracted_content),
    peer_alias: await aliasFor(material.user_id),
    previewUrl,
    usesLeft: Math.max(0, share.max_uses - share.use_count),
    maxUses: share.max_uses,
  };
}

/** Signed, time limited preview of a published shelf file. No download UI. */
export async function shelfPreviewUrl(materialId: string): Promise<{
  url: string | null;
  file_name: string;
  file_type: string;
  course_code: string;
  readyForMocks: boolean;
} | null> {
  const db = admin();
  const { data: material } = await db
    .from("course_materials")
    .select("id, file_path, file_name, file_type, course_code, published, extracted_content")
    .eq("id", materialId)
    .maybeSingle();
  if (!material || !material.published) return null;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(material.file_path, 60 * 30);
  return {
    url: data?.signedUrl ?? null,
    file_name: material.file_name,
    file_type: material.file_type,
    course_code: material.course_code,
    readyForMocks: ready(material.extracted_content),
  };
}

/**
 * Copy one file into the recipient's locker: object copy first, row insert
 * second, use_count last. An orphaned copy is deleted when the insert fails.
 * Extracted text is carried over as-is, never re-OCR'd.
 */
export async function saveSharedFile(opts: {
  recipientId: string;
  token?: string | undefined;
  materialId?: string | undefined;
}): Promise<{ ok: true; materialId: string } | { ok: false; reason: string }> {
  const db = admin();

  let source: ResolvedShare["material"] | null = null;
  let shareId: string | null = null;
  let useCount = 0;

  if (opts.token) {
    const resolved = await resolveShare(opts.token);
    if (!resolved) return { ok: false, reason: REDEEM_MISS_MESSAGE };
    source = resolved.material;
    shareId = resolved.share.id;
    useCount = resolved.share.use_count;
  } else if (opts.materialId) {
    const { data } = await db
      .from("course_materials")
      .select(
        "id, user_id, course_code, file_name, file_type, mime_type, size_bytes, file_path, extracted_content, extraction_status, published",
      )
      .eq("id", opts.materialId)
      .maybeSingle();
    if (!data || !data.published) return { ok: false, reason: REDEEM_MISS_MESSAGE };
    source = data;
  } else {
    return { ok: false, reason: REDEEM_MISS_MESSAGE };
  }

  if (source.user_id === opts.recipientId) {
    return { ok: false, reason: "This file is already in your locker." };
  }

  const { data: dupe } = await db
    .from("course_materials")
    .select("id")
    .eq("user_id", opts.recipientId)
    .eq("course_code", source.course_code)
    .eq("file_name", source.file_name)
    .eq("is_peer_copy", true)
    .maybeSingle();
  if (dupe) return { ok: false, reason: "This file is already in your locker." };

  const alias = await aliasFor(source.user_id);
  const destPath = `${opts.recipientId}/${source.course_code}/${Date.now()}-${source.file_name}`;

  const { error: copyErr } = await db.storage.from(BUCKET).copy(source.file_path, destPath);
  if (copyErr) return { ok: false, reason: "We couldn't copy this file. Try again." };

  const { data: inserted, error: insErr } = await db
    .from("course_materials")
    .insert({
      user_id: opts.recipientId,
      course_code: source.course_code,
      file_path: destPath,
      file_name: source.file_name,
      file_type: source.file_type,
      mime_type: source.mime_type,
      size_bytes: source.size_bytes,
      extracted_content: source.extracted_content,
      extraction_status: source.extraction_status,
      is_peer_copy: true,
      peer_alias: alias,
      published: false,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    await db.storage.from(BUCKET).remove([destPath]);
    return { ok: false, reason: "We couldn't save this file. Try again." };
  }

  if (shareId) {
    await db
      .from("library_shares")
      .update({ use_count: useCount + 1 })
      .eq("id", shareId);
  }

  return { ok: true, materialId: inserted.id };
}
