/**
 * Shared upload logic for course materials.
 *
 * ONE function, called with a different course_code each time — this is what
 * keeps every course's upload button working identically.
 *
 * Path: course-materials/{user_id}/{course_code}/{timestamp}-{filename}
 * DB:   public.course_materials row with user_id + course_code + file_path
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
    | "scanned_pdf";
  extraction_error: string | null;
  created_at: string;
};

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const PDF_TYPE = "application/pdf";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Conservative: keep enough detail for AI OCR later.
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

  // 2) Classify + (image only) compress.
  const isImage = IMAGE_TYPES.includes(file.type);
  const isPdf = file.type === PDF_TYPE;
  if (!isImage && !isPdf) {
    const msg = "Only JPG, PNG or PDF files are supported.";
    emit({ kind: "error", message: msg });
    throw new Error(msg);
  }

  let payload: Blob = file;
  const originalKB = Math.round(file.size / 1024);

  if (isImage) {
    emit({ kind: "compressing", originalKB });
    try {
      payload = await compressImage(file);
    } catch {
      payload = file; // fall back to original
    }
    const compressedKB = Math.round(payload.size / 1024);
    emit({ kind: "compressing", originalKB, compressedKB });
  }

  // 3) Upload to storage.
  const path = `${userId}/${courseCode}/${Date.now()}-${safeName(file.name)}`;
  emit({ kind: "uploading", pct: 10 });

  const { error: upErr } = await supabase.storage
    .from("course-materials")
    .upload(path, payload, {
      contentType: file.type,
      upsert: false,
    });

  if (upErr) {
    emit({ kind: "error", message: upErr.message });
    throw upErr;
  }
  emit({ kind: "uploading", pct: 80 });

  // 4) Insert DB row linking file → user + course.
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
    emit({ kind: "error", message: insErr?.message ?? "Insert failed" });
    // Best-effort cleanup of the orphaned storage object.
    await supabase.storage.from("course-materials").remove([path]);
    throw insErr ?? new Error("Insert failed");
  }

  // 5) For PDFs, kick off extraction.
  if (isPdf) {
    emit({ kind: "extracting" });
    try {
      const { data, error } = await supabase.functions.invoke(
        "extract-pdf-text",
        { body: { materialId: row.id } },
      );
      if (error) throw error;
      // Refresh row so caller sees final status.
      const { data: fresh } = await supabase
        .from("course_materials")
        .select("*")
        .eq("id", row.id)
        .maybeSingle();
      emit({ kind: "done" });
      return (fresh ?? row) as CourseMaterial;
    } catch (e) {
      emit({
        kind: "error",
        message:
          "We couldn't read the PDF's text. If it's a scanned document, try uploading it as an image instead.",
      });
      // Row still exists with status pending/failed — return it so UI can show state.
      return row as CourseMaterial;
    }
  }

  emit({ kind: "done" });
  return row as CourseMaterial;
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

export async function deleteMaterial(m: CourseMaterial) {
  await supabase.storage.from("course-materials").remove([m.file_path]);
  await supabase.from("course_materials").delete().eq("id", m.id);
}
