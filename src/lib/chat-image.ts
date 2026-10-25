/**
 * Chat photo uploads. Browser-only: the photo is written to the student's own folder inside the existing private
 * "course-materials" bucket ({uid}/chat-images/...), and only the resulting storage PATH (never a public URL) is sent to the
 * backend, which fetches the bytes itself with the service key, moderates them, and deletes the file immediately after.
 * See chat.py's moderate_image() for the other half of this.
 *
 * Every photo is turned into a JPEG of at most 1600 px on the longest side BEFORE it is uploaded (preparePhoto). Why:
 *   - a phone camera original is often 4-15 MB; the old code refused anything over 8 MB and sent the rest over a slow
 *     connection, which is where "I can't upload my picture" came from;
 *   - WebP and GIF were accepted here but refused by the upload server, so they failed after the student pressed Send;
 *   - a 1600 px JPEG of a page of notes or a handwritten working is about 200-500 KB, easily readable by the AI, and
 *     uploads in a second.
 * Anything the browser cannot draw (a format it does not know) is explained at the moment it is picked, not after Send.
 */
import { supabase } from "@/integrations/supabase/client";
import { presignMaterialUpload, confirmMaterialUpload } from "@/lib/storage.functions";

const MAX_PICKED_BYTES = 40 * 1024 * 1024; // above this it is not a photo (and decoding it could freeze a phone)
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // after shrinking; must match chat.py's MAX_CHAT_IMAGE_BYTES
export const MAX_SIDE_PX = 1600;
const JPEG_QUALITY = 0.85;

/** The size to draw a photo at: never larger than it is, never more than maxSide on its longest side. */
export function fitWithin(width: number, height: number, maxSide: number = MAX_SIDE_PX): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      // "from-image" applies the camera's rotation, so a portrait photo is not drawn on its side.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      /* fall through to an <img> element: older Safari and some formats only decode there */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("This photo's format isn't supported by your browser. Take a new photo, or pick a JPEG or PNG.");
  }
}

/** Shrinks any picked image to a JPEG ready to upload. Throws a short, student-facing message on failure. */
export async function preparePhoto(file: File): Promise<File> {
  if (!file || file.size === 0) throw new Error("That photo is empty. Pick another one.");
  if (file.size > MAX_PICKED_BYTES) throw new Error("That file is too large to be a photo (over 40 MB).");
  const decoded = await decode(file);
  try {
    const { width, height } = fitWithin(decoded.width, decoded.height);
    if (!width || !height) throw new Error("That photo has no picture in it. Pick another one.");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser couldn't prepare that photo. Try again.");
    ctx.fillStyle = "#ffffff"; // transparent PNGs would otherwise turn black as a JPEG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(decoded.source, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size === 0) throw new Error("Your browser couldn't prepare that photo. Try again.");
    if (blob.size > MAX_UPLOAD_BYTES) throw new Error("That photo is still too large after shrinking. Try a smaller one.");
    return new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    decoded.release();
  }
}

/** True for a file preparePhoto produced (so uploadChatImage does not shrink it twice). */
function isPrepared(file: File): boolean {
  return file.type === "image/jpeg" && file.size <= MAX_UPLOAD_BYTES && /^photo-\d+\.jpg$/.test(file.name);
}

/** Uploads a photo and returns its storage path. Throws a short, user-facing message on any rejection. */
export async function uploadChatImage(picked: File): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sign in first to attach a photo.");

  const file = isPrepared(picked) ? picked : await preparePhoto(picked);

  // Goes to R2 (same store the backend reads from), via a presigned PUT. The server builds the key as
  // {uid}/chat-images/{timestamp}-{name}, exactly the owner-prefixed shape the backend's ownership check expects.
  const { path, uploadUrl } = await presignMaterialUpload({
    data: { courseCode: "chat-images", fileName: file.name, contentType: "image/jpeg", sizeBytes: file.size },
  });
  let putOk = false;
  try {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: file,
    });
    putOk = res.ok;
  } catch {
    putOk = false;
  }
  if (!putOk) throw new Error("Couldn't upload that photo. Check your connection and try again.");
  const { exists } = await confirmMaterialUpload({ data: { path } });
  if (!exists) throw new Error("Couldn't upload that photo. Try again.");

  return path;
}
