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
import { inspectFileMetadata, setMetadataFlag } from "@/lib/material-metadata";

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
  file_type: "image" | "pdf" | "docx" | "pptx" | "pasted";
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

/** Minimum characters of pasted text that can produce useful predictions. */
export const MIN_PASTED_CHARS = 200;
export const PASTED_TOO_SHORT_MESSAGE =
  "This looks too short to generate useful predictions from, try adding more content.";


const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const PDF_TYPE = "application/pdf";
const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PPTX_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

// We still use this to know WHICH file types need extraction
const EXTRACTION_FN: Partial<Record<CourseMaterial["file_type"], string>> = {
  pdf: "extract-pdf-text",
  docx: "extract-docx-text",
  pptx: "extract-pptx-text",
};

// Your FastAPI backend URL — change to Render URL when deployed
const BACKEND_URL = "https://truefluency-pro-backend.onrender.com";

export const ACCEPTED_UPLOAD_MIME =
  "image/jpeg,image/jpg,image/png,application/pdf," +
  ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation";

function classifyFile(file: File): CourseMaterial["file_type"] | null {
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (file.type === PDF_TYPE) return "pdf";
  if (file.type === DOCX_TYPE || /\.docx$/i.test(file.name)) return "docx";
  if (file.type === PPTX_TYPE || /\.pptx$/i.test(file.name)) return "pptx";
  return null;
}

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

  // 1) Auth check
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


  // 2) Classify file type
  const fileType = classifyFile(file);
  console.info("[upload] classified", { fileType });
  if (!fileType) {
    const msg = "Only JPG, PNG, PDF, DOCX or PPTX files are supported.";
    emit({ kind: "error", message: msg });
    throw new Error(msg);
  }
  const isImage = fileType === "image";
  const needsExtraction = !!EXTRACTION_FN[fileType];

  // 3) (Image only) compress with graceful fallback
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

  // 4) Upload to Supabase storage
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

  // 5) Insert DB row — roll back storage on failure
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
        extraction_status: needsExtraction ? "pending" : "not_applicable",
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

  // 5b) Advisory-only metadata heuristic. Never blocks the upload.
  try {
    const reason = await inspectFileMetadata(file, fileType);
    if (reason) setMetadataFlag(row.id, reason);
  } catch (e) {
    console.error("[upload] metadata heuristic failed, ignoring", e);
  }



  // 6) Call FastAPI backend to extract text — replaces broken Supabase edge functions
  if (needsExtraction) {
    emit({ kind: "extracting" });
    console.info("[upload] calling FastAPI extract-text", { fileType });
    try {
      // The backend requires the caller's Supabase session and resolves the
      // storage path from the owner's own row, so no file_path is sent.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("No active session for extraction");
      const res = await fetch(`${BACKEND_URL}/extract-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          material_id: row.id,
          file_type: fileType,
        }),
      });
      if (!res.ok) {
        console.error("[upload] extraction failed", await res.text());
      } else {
        const result = await res.json();
        console.info("[upload] extraction ok", result);
      }
    } catch (e) {
      console.error("[upload] extraction threw", e);
    }
  }

  // 7) Refetch row to get updated extraction status
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

/**
 * Save raw pasted text as a course material. It goes through the same storage
 * and course-linkage path as a file upload, but since pasted text is already
 * plain text it is stored directly as `extracted_content`, with no extraction
 * step.
 */
export async function savePastedText(opts: {
  text: string;
  courseCode: string;
  title?: string;
  onStage?: (s: UploadStage) => void;
}): Promise<CourseMaterial> {
  const { courseCode, onStage } = opts;
  const text = opts.text.trim();
  const emit = (s: UploadStage) => {
    try { onStage?.(s); } catch (e) { console.error("[paste] onStage handler threw", e); }
  };

  if (text.length < MIN_PASTED_CHARS) {
    emit({ kind: "error", message: PASTED_TOO_SHORT_MESSAGE });
    throw new Error(PASTED_TOO_SHORT_MESSAGE);
  }

  let userId: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    userId = data.session?.user.id;
  } catch (e) {
    console.error("[paste] getSession failed", e);
  }
  if (!userId) {
    const msg = "You need to be signed in to save pasted text.";
    emit({ kind: "error", message: msg });
    throw new Error(msg);
  }

  const stamp = Date.now();
  const fileName = safeName(opts.title?.trim() || `Pasted text ${new Date(stamp).toLocaleDateString()}`);
  const path = `${userId}/${courseCode}/${stamp}-${fileName}.txt`;

  emit({ kind: "uploading", pct: 20 });

  const blob = new Blob([text], { type: "text/plain" });
  let upErr: unknown = null;
  try {
    const res = await supabase.storage
      .from("course-materials")
      .upload(path, blob, { contentType: "text/plain", upsert: false });
    upErr = res.error;
  } catch (e) {
    upErr = e;
  }
  if (upErr) {
    console.error("[paste] storage upload failed", upErr);
    emit({ kind: "error", message: "Couldn't save your text. Check your connection and try again." });
    throw upErr instanceof Error ? upErr : new Error("Storage upload failed");
  }

  emit({ kind: "uploading", pct: 80 });

  try {
    const { data, error } = await supabase
      .from("course_materials")
      .insert({
        user_id: userId,
        course_code: courseCode,
        file_path: path,
        file_name: opts.title?.trim() || `Pasted text · ${new Date(stamp).toLocaleDateString()}`,
        file_type: "pasted",
        mime_type: "text/plain",
        size_bytes: blob.size,
        extracted_content: text,
        extraction_status: "success",
      })
      .select("*")
      .single();
    if (error) throw error;
    emit({ kind: "done" });
    return data as CourseMaterial;
  } catch (e) {
    console.error("[paste] db insert failed, rolling back storage", e);
    try {
      await supabase.storage.from("course-materials").remove([path]);
    } catch (rollbackErr) {
      console.error("[paste] storage rollback also failed", rollbackErr);
    }
    emit({ kind: "error", message: "Couldn't save your text. Please try again." });
    throw e instanceof Error ? e : new Error("Insert failed");
  }
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
  for (let i = 0; i < paths.length; i += 100) {
    await supabase.storage.from("course-materials").remove(paths.slice(i, i + 100));
  }
  await supabase
    .from("course_materials")
    .delete()
    .in("id", all.map((m) => m.id));
}

/**
 * Pick the best material that can actually be analyzed by the backend:
 * text was extracted successfully and it isn't an image.
 */
export function pickAnalyzableMaterial(
  materials: CourseMaterial[],
): CourseMaterial | null {
  return (
    materials.find(
      (m) => m.file_type !== "image" && m.extraction_status === "success",
    ) ?? null
  );
}
