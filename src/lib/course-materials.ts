/**
 * Shared upload logic for course materials.
 *
 * Handles: transactional upload (storage+DB rollback on failure), duplicate
 * detection, image compression with fallback, text extraction on the backend
 * (with an in-browser PDF fallback), and cross-course listing for the
 * "All My Uploads" view.
 *
 * Path: course-materials/{user_id}/{course_code}/{timestamp}-{filename}
 */
import Compressor from "compressorjs";
import { supabase } from "@/integrations/supabase/client";
import { inspectFileMetadata, setMetadataFlag } from "@/lib/material-metadata";
import { processMaterialOnServer, submitExtractedPdfText, warmBackend } from "@/lib/backend-api";
import { extractPdfPageTexts, extractSelectablePdfText } from "@/lib/pdf-extraction.browser";
import { presignMaterialUpload, confirmMaterialUpload, deleteMaterialFiles } from "@/lib/storage.functions";

export type UploadStage =
  | { kind: "compressing"; originalKB: number; compressedKB?: number }
  | { kind: "uploading"; pct: number }
  /** File is stored; its text is being read in the background. */
  | { kind: "uploaded" }
  /** Text is being read; page/total when the browser is reading a PDF page by page. */
  | { kind: "extracting"; page?: number; total?: number; where?: "device" | "server" }
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
const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PPTX_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

// Which file types carry extractable text.
const EXTRACTABLE_TYPES: CourseMaterial["file_type"][] = ["pdf", "docx", "pptx"];
const MIN_EXTRACTED_CHARS = 20;

async function persistLocalPdfFallback(materialId: string, file: File): Promise<boolean> {
  try {
    const text = await extractSelectablePdfText(file);
    if (text.length < MIN_EXTRACTED_CHARS) return false;

    const { error } = await supabase
      .from("course_materials")
      .update({
        extracted_content: text,
        extraction_status: "success",
        extraction_error: null,
      })
      .eq("id", materialId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[extraction] browser fallback failed", { materialId, error });
    return false;
  }
}

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

/**
 * Uploads bytes straight to R2 via a presigned PUT the file never passes
 * through this app's own server for — see storage.functions.ts. Confirms
 * the object actually landed before returning, so a DB row is never
 * created pointing at a path that silently failed to upload.
 */
async function uploadViaPresignedPut(
  payload: Blob,
  courseCode: string,
  fileName: string,
  contentType: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const { path, uploadUrl } = await presignMaterialUpload({
    data: { courseCode, fileName, contentType },
  });
  // XMLHttpRequest rather than fetch: fetch can't report upload progress,
  // which left the bar frozen for the whole upload on a slow connection.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Storage upload failed")));
    xhr.onerror = () => reject(new TypeError("Failed to fetch"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(payload);
  });
  const { exists } = await confirmMaterialUpload({ data: { path } });
  if (!exists) throw new Error("Storage upload failed");
  return path;
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
  /**
   * Called once the file's text has been read in the background (or reading
   * failed), with the refreshed row. The upload itself resolves as soon as the
   * file is stored, so the student isn't held on "Extracting…" while a
   * sleeping server wakes up or a scan is being read.
   */
  onProcessed?: (row: CourseMaterial | null) => void;
}): Promise<CourseMaterial> {
  const { file, courseCode, onStage, onProcessed } = opts;
  // Wake a sleeping (free-plan) backend now, so its ~1 min cold start
  // overlaps the upload instead of starting after it.
  warmBackend();
  const emit = (s: UploadStage) => {
    try {
      onStage?.(s);
    } catch (e) {
      console.error("[upload] onStage handler threw", e);
    }
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
  const needsExtraction = EXTRACTABLE_TYPES.includes(fileType);

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

  const extension = file.name.split(".").pop()?.toLowerCase();
  const contentType = file.type || (
    fileType === "docx" ? DOCX_TYPE :
    fileType === "pptx" ? PPTX_TYPE :
    fileType === "pdf" ? PDF_TYPE :
    fileType === "image" && extension === "png" ? "image/png" :
    fileType === "image" && (extension === "jpg" || extension === "jpeg") ? "image/jpeg" :
    "application/octet-stream"
  );

  let path: string;
  emit({ kind: "uploading", pct: 2 });
  try {
    path = await uploadViaPresignedPut(payload, courseCode, file.name, contentType, (fraction) =>
      emit({ kind: "uploading", pct: Math.max(2, Math.round(fraction * 90)) }),
    );
  } catch (e) {
    console.error("[upload] storage upload failed", e);
    emit({
      kind: "error",
      message: "Upload didn't go through. Try a smaller file or check your connection.",
    });
    throw e instanceof Error ? e : new Error("Storage upload failed");
  }
  emit({ kind: "uploading", pct: 95 });

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
      await deleteMaterialFiles({ data: { paths: [path] } });
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

  // 6) Read the text on the backend (main.py POST /materials/process). It
  // resolves the storage path from the caller's own row, fetches the file
  // from R2 itself, saves the text, builds the study chat's search index, and
  // sends scanned PDFs to the OCR service. The old in-app server function
  // downloaded from Supabase Storage, where uploads no longer live, so it
  // failed for every file — Word and PowerPoint uploads could never be read.
  //
  // Runs in the BACKGROUND: the upload resolves as soon as the file is stored
  // (the row shows "pending" → "Reading…" in the list), and onProcessed
  // reports the outcome. It used to hold the student on "Extracting content…"
  // for the whole read, including a sleeping server's cold start.
  if (needsExtraction) {
    const uploadedRow = row;
    // "extracting" stays on screen until onProcessed fires, so the student
    // can see their text is being read rather than wondering if it stalled.
    emit({ kind: "extracting" });
    void (async () => {
      onProcessed?.(await readUploadedText(uploadedRow, fileType, file, emit));
    })();
    return uploadedRow;
  }

  emit({ kind: "done" });
  return row;
}

/** Background half of an upload: read the text, then return the refreshed row. */
async function readUploadedText(
  row: CourseMaterial,
  fileType: CourseMaterial["file_type"],
  file: File,
  emit: (s: UploadStage) => void,
): Promise<CourseMaterial | null> {
  const refetch = async (): Promise<CourseMaterial | null> => {
    try {
      const { data } = await supabase.from("course_materials").select("*").eq("id", row.id).maybeSingle();
      return (data as CourseMaterial | null) ?? null;
    } catch (e) {
      console.error("[upload] refetch after extraction failed", e);
      return null;
    }
  };

  // Typed PDFs: read on the student's device (pdf.js), many times faster than
  // the free Render instance — a 294-page PDF timed out there. The backend
  // only saves + indexes the page texts. A scan has no text layer, so it
  // falls through to the server, the only place OCR can run.
  if (fileType === "pdf") {
    let pageTexts: string[] | null = null;
    try {
      pageTexts = await extractPdfPageTexts(file, (page, total) =>
        emit({ kind: "extracting", page, total, where: "device" }),
      );
    } catch (e) {
      console.warn("[upload] in-browser PDF reading failed, using the server", e);
    }
    if (pageTexts && pageTexts.join("").replace(/\s/g, "").length >= MIN_EXTRACTED_CHARS) {
      emit({ kind: "extracting", where: "server" });
      try {
        const res = await submitExtractedPdfText(row.id, pageTexts);
        if (res.status === "ready") return await refetch();
      } catch (e) {
        // Backend unreachable: keep the text anyway (no search index until
        // the chat's backfill builds one from it).
        console.error("[upload] couldn't send page texts, saving them directly", e);
        const text = pageTexts.filter((p) => p.trim()).join("\n\n");
        const { error } = await supabase
          .from("course_materials")
          .update({ extracted_content: text, extraction_status: "success", extraction_error: null })
          .eq("id", row.id);
        if (!error) return await refetch();
      }
    }
    emit({ kind: "extracting", where: "server" });
  }

  const outcome = await processMaterialOnServer(row.id);
  console.info("[upload] server processing", outcome);
  // ready / failed: the backend has already written the final status and
  // reason on the row. processing: a scan is still being read — the row
  // stays "pending" and updates itself when the OCR service finishes.
  let extracted = outcome.status !== "unavailable";

  // Backend unreachable: for a freshly selected PDF, recover directly from
  // the local bytes rather than telling the student their text couldn't be read.
  if (!extracted && fileType === "pdf") {
    extracted = await persistLocalPdfFallback(row.id, file);
  }

  if (!extracted) {
    const reason =
      fileType === "pdf"
        ? "No selectable text was found. This may be a scan, an encrypted PDF, or a damaged file."
        : "We couldn't reach the server to read this file. Tap retry in a moment.";
    try {
      const { error } = await supabase
        .from("course_materials")
        .update({ extraction_status: "failed", extraction_error: reason })
        .eq("id", row.id)
        .neq("extraction_status", "success");
      if (error) throw error;
    } catch (persistErr) {
      console.error("[upload] couldn't record extraction failure", persistErr);
    }
  }

  return await refetch();
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
    try {
      onStage?.(s);
    } catch (e) {
      console.error("[paste] onStage handler threw", e);
    }
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
  const fileName = safeName(
    opts.title?.trim() || `Pasted text ${new Date(stamp).toLocaleDateString()}`,
  );
  const displayFileName = `${fileName}.txt`;

  emit({ kind: "uploading", pct: 20 });

  const blob = new Blob([text], { type: "text/plain" });
  let path: string;
  try {
    path = await uploadViaPresignedPut(blob, courseCode, displayFileName, "text/plain");
  } catch (e) {
    console.error("[paste] storage upload failed", e);
    emit({
      kind: "error",
      message: "Couldn't save your text. Check your connection and try again.",
    });
    throw e instanceof Error ? e : new Error("Storage upload failed");
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
      await deleteMaterialFiles({ data: { paths: [path] } });
    } catch (rollbackErr) {
      console.error("[paste] storage rollback also failed", rollbackErr);
    }
    emit({ kind: "error", message: "Couldn't save your text. Please try again." });
    throw e instanceof Error ? e : new Error("Insert failed");
  }
}

/**
 * Give any abandoned "pending" row a terminal verdict.
 *
 * An extraction run can be cut short by a closed tab, a lost connection or a
 * dropped RPC. Without this sweep those rows would render as "Extracting…"
 * forever, so the student would never learn what to do next.
 */
async function resolveStuckPending(items: CourseMaterial[]): Promise<CourseMaterial[]> {
  const { isStuckPending, STUCK_PENDING_REASON } = await import("@/lib/extraction-status");
  const stuck = items.filter(isStuckPending);
  if (stuck.length === 0) return items;

  try {
    const { error } = await supabase
      .from("course_materials")
      .update({ extraction_status: "failed", extraction_error: STUCK_PENDING_REASON })
      .in(
        "id",
        stuck.map((m) => m.id),
      )
      .eq("extraction_status", "pending");
    if (error) throw error;
  } catch (e) {
    console.error("[extraction] couldn't resolve stuck pending rows", e);
    return items;
  }

  const stuckIds = new Set(stuck.map((m) => m.id));
  return items.map((m) =>
    stuckIds.has(m.id)
      ? { ...m, extraction_status: "failed", extraction_error: STUCK_PENDING_REASON }
      : m,
  );
}

export async function listMaterialsForCourse(courseCode: string) {
  const { data, error } = await supabase
    .from("course_materials")
    .select("*")
    .eq("course_code", courseCode)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return resolveStuckPending((data ?? []) as CourseMaterial[]);
}

/** All materials the signed-in user has ever uploaded, across every course. */
export async function listAllUserMaterials() {
  const { data, error } = await supabase
    .from("course_materials")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return resolveStuckPending((data ?? []) as CourseMaterial[]);
}


export async function deleteMaterial(m: Pick<CourseMaterial, "id" | "file_path">) {
  await deleteMaterialFiles({ data: { paths: [m.file_path] } });
  const { error } = await supabase.from("course_materials").delete().eq("id", m.id);
  if (error) throw error;
}

/** Wipe every uploaded file (storage + DB) for the signed-in user. */
export async function deleteAllUserMaterials() {
  const all = await listAllUserMaterials();
  if (all.length === 0) return;
  const paths = all.map((m) => m.file_path);
  for (let i = 0; i < paths.length; i += 100) {
    await deleteMaterialFiles({ data: { paths: paths.slice(i, i + 100) } });
  }
  await supabase
    .from("course_materials")
    .delete()
    .in(
      "id",
      all.map((m) => m.id),
    );
}

/**
 * Pick the best material that can actually be analyzed by the backend:
 * text was extracted successfully and it isn't an image.
 */
/** True when a material's text extraction can usefully be run again. */
export function isRetryableMaterial(m: CourseMaterial): boolean {
  return (
    EXTRACTABLE_TYPES.includes(m.file_type) &&
    (m.extraction_status === "pending" ||
      m.extraction_status === "failed" ||
      m.extraction_status === "timeout")
  );
}

/**
 * Re-run text extraction for one upload. Returns the refreshed row so callers
 * can immediately reflect the new status. A crash in the extractor is recorded
 * on the row itself so the materials list can show a real reason instead of
 * leaving the upload stuck at "Extracting…" forever.
 */
export async function retryExtraction(materialId: string): Promise<CourseMaterial | null> {
  const outcome = await processMaterialOnServer(materialId);
  if (outcome.status === "unavailable") {
    // The row is left as it was — nothing new is known about the file itself.
    throw new Error("We couldn't reach the server to read this file. Try again in a moment.");
  }
  // ready / failed / processing: the backend has written the result to the
  // row (or left it pending while a scan is still being read).
  const { data } = await supabase
    .from("course_materials")
    .select("*")
    .eq("id", materialId)
    .maybeSingle();
  return (data as CourseMaterial | null) ?? null;
}

export function pickAnalyzableMaterial(materials: CourseMaterial[]): CourseMaterial | null {
  return (
    materials.find((m) => m.file_type !== "image" && m.extraction_status === "success") ?? null
  );
}
