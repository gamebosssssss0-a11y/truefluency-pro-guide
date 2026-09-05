/**
 * Client-callable Plan B Library endpoints. Thin wrappers only: all privileged
 * reads and writes live in library.server.ts, which is never imported at module
 * scope here. Nothing returned exposes file_path, extracted text, or secrets.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRICE_LINE } from "@/lib/pricing-copy";

export const SHARING_OFFLINE_MESSAGE = "Sharing isn't live yet.";
/** Free accounts can keep this many peer copies per course. */
export const FREE_PEER_SAVES_PER_COURSE = 5;

function sharingLive(): boolean {
  return Boolean(process.env["SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"]);
}

function cleanId(value: unknown): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id || id.length > 64) throw new Error("File not found.");
  return id;
}

function cleanToken(value: unknown): string {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token || !/^[a-z0-9]{6,64}$/i.test(token)) throw new Error("This link is no longer available.");
  return token;
}

function cleanText(value: unknown, max: number): string | undefined {
  const text = typeof value === "string" ? value.trim().slice(0, max) : "";
  return text || undefined;
}

/** Published files from other students, aliases only, no text and no paths. */
export const listShelfItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseCode?: string; search?: string } | undefined) => ({
    courseCode: cleanText(input?.courseCode, 24),
    search: cleanText(input?.search, 60),
  }))
  .handler(async ({ data, context }) => {
    if (!sharingLive()) return { items: [], courses: [], offline: true as const };
    const { listShelf } = await import("@/lib/library.server");
    const shelf = await listShelf({
      viewerId: context.userId,
      courseCode: data.courseCode,
      search: data.search,
    });
    return { ...shelf, offline: false as const };
  });

export const setMaterialPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { materialId: string; published: boolean }) => ({
    materialId: cleanId(input?.materialId),
    published: Boolean(input?.published),
  }))
  .handler(async ({ data, context }) => {
    if (!sharingLive()) return { ok: false as const, reason: SHARING_OFFLINE_MESSAGE };
    const { setPublished } = await import("@/lib/library.server");
    try {
      const result = await setPublished({
        ownerId: context.userId,
        materialId: data.materialId,
        published: data.published,
      });
      return { ok: true as const, published: result.published };
    } catch (e) {
      return { ok: false as const, reason: userMessage(e) };
    }
  });

export const createOneFileLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { materialId: string }) => ({ materialId: cleanId(input?.materialId) }))
  .handler(async ({ data, context }) => {
    if (!sharingLive()) return { ok: false as const, reason: SHARING_OFFLINE_MESSAGE };
    const { createShareLink } = await import("@/lib/library.server");
    try {
      const link = await createShareLink({ ownerId: context.userId, materialId: data.materialId });
      return {
        ok: true as const,
        token: link.token,
        expiresAt: link.expires_at,
        usesLeft: Math.max(0, link.max_uses - link.use_count),
        maxUses: link.max_uses,
        fileName: link.file_name,
      };
    } catch (e) {
      return { ok: false as const, reason: userMessage(e) };
    }
  });

export const revokeOneFileLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => ({ token: cleanToken(input?.token) }))
  .handler(async ({ data, context }) => {
    if (!sharingLive()) return { ok: false as const, reason: SHARING_OFFLINE_MESSAGE };
    const { revokeShareLink } = await import("@/lib/library.server");
    try {
      await revokeShareLink({ ownerId: context.userId, token: data.token });
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, reason: userMessage(e) };
    }
  });

/** Signed, short-lived preview of a shelf file. Never a download URL to storage paths. */
export const getShelfPreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { materialId: string }) => ({ materialId: cleanId(input?.materialId) }))
  .handler(async ({ data }) => {
    if (!sharingLive()) return { ok: false as const, reason: SHARING_OFFLINE_MESSAGE };
    const { shelfPreviewUrl } = await import("@/lib/library.server");
    const preview = await shelfPreviewUrl(data.materialId);
    if (!preview) return { ok: false as const, reason: "This file is no longer available." };
    return { ok: true as const, ...preview };
  });

export const readOneFileLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => ({ token: cleanToken(input?.token) }))
  .handler(async ({ data }) => {
    if (!sharingLive()) return { ok: false as const, reason: SHARING_OFFLINE_MESSAGE };
    const { redeemShareLink, REDEEM_MISS_MESSAGE } = await import("@/lib/library.server");
    const share = await redeemShareLink(data.token);
    if (!share) return { ok: false as const, reason: REDEEM_MISS_MESSAGE };
    return { ok: true as const, share };
  });

/** Copy a shared or shelf file into the caller's locker. No OCR, no re-extraction. */
export const savePeerFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token?: string; materialId?: string; courseCode?: string }) => ({
    token: input?.token ? cleanToken(input.token) : undefined,
    materialId: input?.materialId ? cleanId(input.materialId) : undefined,
    courseCode: cleanText(input?.courseCode, 24),
  }))
  .handler(async ({ data, context }) => {
    if (!sharingLive()) return { ok: false as const, reason: SHARING_OFFLINE_MESSAGE };

    // Free accounts keep up to five peer copies per course.
    const { resolveAccess } = await import("@/lib/entitlements.server");
    const access = await resolveAccess(context.userId);
    if (!access.fullAccess && data.courseCode) {
      const { count } = await context.supabase
        .from("course_materials")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .eq("course_code", data.courseCode)
        .eq("is_peer_copy", true);
      if ((count ?? 0) >= FREE_PEER_SAVES_PER_COURSE) {
        return {
          ok: false as const,
          reason: `Free accounts can keep ${FREE_PEER_SAVES_PER_COURSE} saved peer files per course. ${PRICE_LINE}`,
        };
      }
    }

    const { saveSharedFile } = await import("@/lib/library.server");
    const result = await saveSharedFile({
      recipientId: context.userId,
      token: data.token,
      materialId: data.materialId,
    });
    if (!result.ok) return { ok: false as const, reason: result.reason };
    return { ok: true as const, materialId: result.materialId };
  });

function userMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  if (/not configured/i.test(raw)) return SHARING_OFFLINE_MESSAGE;
  if (raw && raw.length < 120 && !/^\{/.test(raw)) return raw;
  return "Something went wrong. Try again.";
}
