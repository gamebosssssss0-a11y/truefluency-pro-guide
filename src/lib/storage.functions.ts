/**
 * Authenticated storage operations for course materials. Browser calls these
 * instead of talking to R2 (or Supabase Storage) directly — same split as
 * extraction.functions.ts / extraction.server.ts. Ownership is checked here,
 * server-side, before any credentialed operation runs; the browser never
 * gets R2 credentials, only short-lived signed URLs scoped to one object.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as storage from "@/lib/storage.server";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

/** One student's own prefix, always — the path is built server-side from
 * the authenticated userId, never trusted from the client, so a request
 * can't be crafted to write into another student's folder. */
export const presignMaterialUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseCode: string; fileName: string; contentType: string }) => {
    const courseCode = String(input?.courseCode ?? "").trim();
    const fileName = String(input?.fileName ?? "").trim();
    const contentType = String(input?.contentType ?? "application/octet-stream").trim();
    if (!courseCode || courseCode.length > 32) throw new Error("A course is required.");
    if (!fileName || fileName.length > 200) throw new Error("A file name is required.");
    return { courseCode, fileName, contentType };
  })
  .handler(async ({ data, context }): Promise<{ path: string; uploadUrl: string }> => {
    const { userId } = context;
    const path = `${userId}/${data.courseCode}/${Date.now()}-${safeName(data.fileName)}`;
    const uploadUrl = await storage.presignUpload({ path, contentType: data.contentType });
    return { path, uploadUrl };
  });

/** Confirms a presigned PUT actually landed before the caller inserts the
 * DB row for it — closes the race a two-step (get-URL, then PUT) upload
 * has that the old single-call supabase.storage.upload() didn't. */
export const confirmMaterialUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string }) => {
    const path = String(input?.path ?? "").trim();
    if (!path) throw new Error("A path is required.");
    return { path };
  })
  .handler(async ({ data, context }): Promise<{ exists: boolean }> => {
    const { userId } = context;
    if (!data.path.startsWith(`${userId}/`)) throw new Error("Not found.");
    return { exists: await storage.objectExists(data.path) };
  });

/** Signed GET for one of the caller's own R2-backed course materials. */
export const presignMaterialDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { materialId: string }) => {
    const materialId = String(input?.materialId ?? "").trim();
    if (!materialId || materialId.length > 64) throw new Error("This file couldn't be opened.");
    return { materialId };
  })
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const { data: material, error } = await context.supabase
      .from("course_materials")
      .select("file_path")
      .eq("id", data.materialId)
      .eq("user_id", context.userId)
      .maybeSingle();
    const path = material?.file_path;
    if (error || !path || !path.startsWith(`${context.userId}/`)) {
      throw new Error("This file couldn't be opened.");
    }
    const url = await storage.presignDownload({ path, expiresInSeconds: 60 * 30 });
    return { url };
  });

/** Deletes one or more of the CALLER'S OWN files. Every path is checked
 * against the authenticated userId before anything is deleted — a request
 * can't be used to delete another student's object even if a path were
 * somehow guessed. */
export const deleteMaterialFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paths: string[] }) => {
    const paths = Array.isArray(input?.paths) ? input.paths.map(String) : [];
    if (paths.length === 0 || paths.length > 500) throw new Error("Invalid file list.");
    return { paths };
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { userId } = context;
    const owned = data.paths.filter((p) => p.startsWith(`${userId}/`));
    if (owned.length !== data.paths.length) throw new Error("Not found.");
    await storage.deleteObjects(owned);
    return { ok: true };
  });
