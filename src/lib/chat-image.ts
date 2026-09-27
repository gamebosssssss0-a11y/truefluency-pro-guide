/**
 * Chat photo uploads. Browser-only: the photo is written to the student's
 * own folder inside the existing private "course-materials" bucket
 * ({uid}/chat-images/...), and only the resulting storage PATH (never a
 * public URL) is sent to the backend, which fetches the bytes itself with
 * the service key, moderates them, and deletes the file immediately after —
 * whether it passed moderation or not. See chat.py's moderate_image() and
 * MAX_CHAT_IMAGE_BYTES for the other half of this.
 */
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "course-materials";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB — must match chat.py's MAX_CHAT_IMAGE_BYTES
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Confirms the file's first bytes match a real image format's magic number.
 * `file.type` is spoofable (rename a script to .png); this reads the actual
 * header bytes so a disguised non-image file never reaches storage at all —
 * belt-and-suspenders alongside the backend's own moderation pass, which
 * only runs on files that make it this far.
 */
async function sniffIsImage(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hex = (n: number) => head[n]?.toString(16).padStart(2, "0");
  if (hex(0) === "ff" && hex(1) === "d8") return true; // JPEG
  if (hex(0) === "89" && hex(1) === "50" && hex(2) === "4e" && hex(3) === "47") return true; // PNG
  if (hex(0) === "47" && hex(1) === "49" && hex(2) === "46") return true; // GIF
  if (hex(0) === "52" && hex(1) === "49" && hex(2) === "46" && hex(3) === "46") return true; // WEBP
  return false;
}

/**
 * Validates and uploads a chat photo, returning its storage path. Throws a
 * short, user-facing message on any rejection — chatbot.tsx shows these
 * directly rather than a generic failure.
 */
export async function uploadChatImage(file: File): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sign in first to attach a photo.");

  if (file.size > MAX_UPLOAD_BYTES) throw new Error("That photo is too large (max 8MB).");
  if (!ALLOWED_MIME.has(file.type)) throw new Error("Pick a JPEG, PNG, WEBP, or GIF image.");
  if (!(await sniffIsImage(file))) throw new Error("That file doesn't look like a valid image.");

  const ext = file.type.split("/")[1] || "jpg";
  const path = `${uid}/chat-images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error("Couldn't upload that photo. Try again.");

  return path;
}
