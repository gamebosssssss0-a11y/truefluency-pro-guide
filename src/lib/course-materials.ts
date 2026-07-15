/**
 * Shared upload logic for course materials.
 *
 * Handles: transactional upload (storage+DB rollback on failure), duplicate
 * detection, image compression with fallback, PDF text extraction with a
 * 30s timeout, and cross-course listing for the "All My Uploads" view.
 *
 * Path: course-materials/{user_id}/{course_code}/{timestamp}-{filename}
 */
import Compressor from "compressorjs";
import { supabase } from "@/integrations/supabase/client";

export type UploadStage =
  | { kind: "compressing"; originalKB: number; compressedKB?: number }
  | { kind: "uploading"; pct: number }
  | { kind: "extracting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export type CourseMaterial = {
  id: string;
  user_id: string;
  course_code: string;
  file_path: string;
  file_name: string;
  file_type: "image" | "pdf";
  mime_type: string;
  size_bytes: number;
  extracted_content: string | null;
  extraction_status:
    | "not_applicable"
    | "pending"
    | "success"
    | "failed"
    | "timeout"
    | "scanned_pdf";
  extraction_error: string | null;
  created_at: string;
};

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const PDF_TYPE = "application/pdf";
const EXTRACTION_TIMEOUT_MS = 30_000;

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.85,
      maxWidth: 1800,
      maxHeight: 1800,
      convertSize: Infinity,
      mimeType: file.type,
      success: (result) => resolve(result),
      error: (err) => reject(err),
    });
  });
}

/** Check whether the same filename already exists for this user+course. */
export async function findDuplicateMaterial(opts: {
  courseCode: string;
  fileName: string;
}): Promise<CourseMaterial | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;
  const { data } = await supabase
    .from("course_materials")
    .select("*")
    .eq("user_id", userId)
    .eq("course_code", opts.courseCode)
    .eq("file_name", opts.fileName)
    .order("created_at", { ascending: false })
    .limit(1);
  return (data?.[0] as CourseMaterial) ?? null;
}

export async function uploadCourseMaterial(opts: {
  file: File;
  courseCode: string;
  onStage?: (s: UploadStage) => void;
}): Promise<CourseMaterial> {
  const { file, courseCode, onStage } = opts;
  const emit = (s: UploadStage) => onStage?.(s);

  // 1) Auth check — RLS needs a real Supabase session.
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) {
    const msg = "You need to be signed in to upload files.";
    emit({ kind: "error", message: msg });
    throw new Error(msg);
  }

  // 2) Classify.
  const isImage = IMAGE_TYPES.includes(file.type);
  const isPdf = file.type === PDF_TYPE;
  if (!isImage && !isPdf) {
    const msg = "Only JPG, PNG or PDF files are supported.";
    emit({ kind: "error", message: msg });
    throw new Error(msg);
  }

  // 3) (Image only) compress with graceful fallback.
  let payload: Blob = file;
  let didCompress = false;
  const originalKB = Math.round(file.size / 1024);

  if (isImage) {
    emit({ kind: "compressing", originalKB });
    try {
      const compressed = await compressImage(file);
      payload = compressed;
      didCompress = true;
      const compressedKB = Math.round(payload.size / 1024);
      emit({ kind: "compressing", originalKB, compressedKB });
    } catch {
      // Compression failed — silently fall back to original. Do NOT show the
      // "X → Y" compression banner since no compression happened.
      payload = file;
      didCompress = false;
    }
  }

  const path = `${userId}/${courseCode}/${Date.now()}-${safeName(file.name)}`;

  // 4) Upload to storage.
  emit({ kind: "uploading", pct: didCompress ? 10 : 5 });
  const { error: upErr } = await supabase.storage
    .from("course-materials")
    .upload(path, payload, { contentType: file.type, upsert: false });

  if (upErr) {
    emit({
      kind: "error",
      message:
        "Upload didn't go through — try a smaller file or check your connection",
    });
    throw upErr;
  }
  emit({ kind: "uploading", pct: 80 });

  // 5) Insert DB row. If this fails, roll back the storage object so we
  //    never leave an orphan on either side.
  const { data: row, error: insErr } = await supabase
    .from("course_materials")
    .insert({
      user_id: userId,
      course_code: courseCode,
      file_path: path,
      file_name: file.name,
      file_type: isImage ? "image" : "pdf",
      mime_type: file.type,
      size_bytes: payload.size,
      extraction_status: isPdf ? "pending" : "not_applicable",
    })
    .select("*")
    .single();

  if (insErr || !row) {
    await supabase.storage.from("course-materials").remove([path]);
    emit({
      kind: "error",
      message:
        "Upload didn't go through — try a smaller file or check your connection",
    });
    throw insErr ?? new Error("Insert failed");
  }

  // 6) For PDFs, kick off extraction with a 30s timeout. The file upload
  //    itself is already successful — extraction failing/timing out just
  //    updates status, it never removes the file.
  if (isPdf) {
    emit({ kind: "extracting" });
    try {
      await withTimeout(
        supabase.functions.invoke("extract-pdf-text", {
          body: { materialId: row.id },
        }),
        EXTRACTION_TIMEOUT_MS,
      );
    } catch (e) {
      const isTimeout = (e as Error).message === "__timeout__";
      await supabase
        .from("course_materials")
        .update({
          extraction_status: isTimeout ? "timeout" : "failed",
          extraction_error: isTimeout ? "timed out" : (e as Error).message,
        })
        .eq("id", row.id);
    }

    const { data: fresh } = await supabase
      .from("course_materials")
      .select("*")
      .eq("id", row.id)
      .maybeSingle();
    emit({ kind: "done" });
    return (fresh ?? row) as CourseMaterial;
  }

  emit({ kind: "done" });
  return row as CourseMaterial;
}

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("__timeout__")), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      },
    );
  });
}

export async function listMaterialsForCourse(courseCode: string) {
  const { data, error } = await supabase
    .from("course_materials")
    .select("*")
    .eq("course_code", courseCode)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CourseMaterial[];
}

/** All materials the signed-in user has ever uploaded, across every course. */
export async function listAllUserMaterials() {
  const { data, error } = await supabase
    .from("course_materials")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CourseMaterial[];
}

export async function deleteMaterial(m: CourseMaterial) {
  await supabase.storage.from("course-materials").remove([m.file_path]);
  await supabase.from("course_materials").delete().eq("id", m.id);
}

/** Wipe every uploaded file (storage + DB) for the signed-in user. */
export async function deleteAllUserMaterials() {
  const all = await listAllUserMaterials();
  if (all.length === 0) return;
  const paths = all.map((m) => m.file_path);
  // Storage bucket delete first, then DB rows. RLS scopes both to auth.uid().
  for (let i = 0; i < paths.length; i += 100) {
    await supabase.storage.from("course-materials").remove(paths.slice(i, i + 100));
  }
  await supabase
    .from("course_materials")
    .delete()
    .in("id", all.map((m) => m.id));
}
