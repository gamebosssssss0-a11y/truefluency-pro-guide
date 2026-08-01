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
  file_type: "image" | "pdf" | "docx" | "pptx";
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
const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PPTX_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const EXTRACTION_TIMEOUT_MS = 30_000;

function classifyFile(file: File): CourseMaterial["file_type"] | null {
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (file.type === PDF_TYPE) return "pdf";
  if (file.type === DOCX_TYPE || /\.docx$/i.test(file.name)) return "docx";
  if (file.type === PPTX_TYPE || /\.pptx$/i.test(file.name)) return "pptx";
  return null;
}

/** File-type → edge function name for text extraction. */
const EXTRACTION_FN: Partial<Record<CourseMaterial["file_type"], string>> = {
  pdf: "extract-pdf-text",
  docx: "extract-docx-text",
  pptx: "extract-pptx-text",
};

export const ACCEPTED_UPLOAD_MIME =
  "image/jpeg,image/jpg,image/png,application/pdf," +
  ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation";

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
  const emit = (s: UploadStage) => {
    try { onStage?.(s); } catch (e) { console.error("[upload] onStage handler threw", e); }
  };

  console.info("[upload] start", { name: file.name, size: file.size, type: file.type, courseCode });

  // 1) Auth check — RLS needs a real Supabase session.
  let userId: string | undefined;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    userId = sessionData.session?.user.id;
  } catch (e) {
    console.error("[upload] getSession failed", e);
  }
  if (!userId) {
    const msg = "You need to be signed in to upload files.";
    emit({ kind: "error", message: msg });
    throw new Error(msg);
  }

  // 2) Classify.
  const fileType = classifyFile(file);
  console.info("[upload] classified", { fileType });
  if (!fileType) {
    const msg = "Only JPG, PNG, PDF, DOCX or PPTX files are supported.";
    emit({ kind: "error", message: msg });
    throw new Error(msg);
  }
  const isImage = fileType === "image";
  const extractionFn = EXTRACTION_FN[fileType];

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
    } catch (e) {
      console.error("[upload] compression failed, using original", e);
      payload = file;
      didCompress = false;
    }
  }

  const path = `${userId}/${courseCode}/${Date.now()}-${safeName(file.name)}`;

  // 4) Upload to storage.
  emit({ kind: "uploading", pct: didCompress ? 10 : 5 });
  const contentType = file.type ||
    (fileType === "docx" ? DOCX_TYPE : fileType === "pptx" ? PPTX_TYPE : "application/octet-stream");

  let upErr: unknown = null;
  try {
    const res = await supabase.storage
      .from("course-materials")
      .upload(path, payload, { contentType, upsert: false });
    upErr = res.error;
  } catch (e) {
    upErr = e;
  }
  if (upErr) {
    console.error("[upload] storage upload failed", upErr);
    emit({
      kind: "error",
      message: "Upload didn't go through. Try a smaller file or check your connection.",
    });
    throw upErr instanceof Error ? upErr : new Error("Storage upload failed");
  }
  emit({ kind: "uploading", pct: 80 });

  // 5) Insert DB row. Roll back the storage object on failure.
  let row: CourseMaterial | null = null;
  try {
    const { data, error } = await supabase
      .from("course_materials")
      .insert({
        user_id: userId,
        course_code: courseCode,
        file_path: path,
        file_name: file.name,
        file_type: fileType,
        mime_type: contentType,
        size_bytes: payload.size,
        extraction_status: extractionFn ? "pending" : "not_applicable",
      })
      .select("*")
      .single();
    if (error) throw error;
    row = data as CourseMaterial;
  } catch (e) {
    console.error("[upload] db insert failed, rolling back storage", e);
    try {
      await supabase.storage.from("course-materials").remove([path]);
    } catch (rollbackErr) {
      console.error("[upload] storage rollback also failed", rollbackErr);
    }
    emit({
      kind: "error",
      message: "Upload didn't go through. Try a smaller file or check your connection.",
    });
    throw e instanceof Error ? e : new Error("Insert failed");
  }

  console.info("[upload] db row created", { id: row.id });

  // 6) File upload SUCCEEDED. From here nothing may throw. Extraction is
  //    best-effort; failures are recorded as row status only.
  if (extractionFn) {
    emit({ kind: "extracting" });
    console.info("[upload] invoking extraction fn", extractionFn);
    try {
      const invokePromise = supabase.functions.invoke(extractionFn, {
        body: { materialId: row.id },
      });
      // Swallow any late rejection so it doesn't become an unhandled
      // rejection after the timeout race resolves.
      Promise.resolve(invokePromise).catch((e) =>
        console.error("[upload] extraction invoke late-rejected", e),
      );
      const res = (await withTimeout(invokePromise, EXTRACTION_TIMEOUT_MS)) as {
        error?: { message?: string } | null;
      };
      if (res?.error) {
        console.error("[upload] extraction invoke returned error", res.error);
        try {
          await supabase
            .from("course_materials")
            .update({
              extraction_status: "failed",
              extraction_error: res.error.message ?? "extraction failed",
            })
            .eq("id", row.id);
        } catch (updErr) {
          console.error("[upload] persist extraction failure status failed", updErr);
        }
      } else {
        console.info("[upload] extraction invoke ok");
      }
    } catch (e) {
      const isTimeout = (e as Error)?.message === "__timeout__";
      console.error("[upload] extraction threw", { isTimeout, err: e });
      try {
        await supabase
          .from("course_materials")
          .update({
            extraction_status: isTimeout ? "timeout" : "failed",
            extraction_error: isTimeout ? "timed out" : ((e as Error)?.message ?? "extraction failed"),
          })
          .eq("id", row.id);
      } catch (updErr) {
        console.error("[upload] persist extraction failure status failed", updErr);
      }
    }

    let fresh: CourseMaterial | null = null;
    try {
      const { data } = await supabase
        .from("course_materials")
        .select("*")
        .eq("id", row.id)
        .maybeSingle();
      fresh = (data as CourseMaterial | null) ?? null;
    } catch (e) {
      console.error("[upload] refetch after extraction failed", e);
    }
    emit({ kind: "done" });
    return (fresh ?? row) as CourseMaterial;
  }

  emit({ kind: "done" });
  return row;
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

/**
 * A material is usable for AI analysis/generation once its text extracted
 * successfully. Images need no extraction, so they count too.
 * Returns the most recent usable material, preferring extracted text.
 */
export function pickAnalyzableMaterial(items: CourseMaterial[]): CourseMaterial | null {
  const sorted = [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return (
    sorted.find((m) => m.extraction_status === "success") ??
    sorted.find((m) => m.file_type === "image") ??
    null
  );
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
