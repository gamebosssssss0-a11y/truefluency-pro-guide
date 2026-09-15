/**
 * Profile photo helpers. Browser-only: the photo is written to the student's
 * own folder inside the existing private "course-materials" bucket
 * ({uid}/avatar/...), and the resulting path is stored on profiles.avatar_path.
 * No new bucket, no new route.
 */
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "course-materials";
const SIZE = 512;

/** Centre-crop to a square and re-encode as a small JPEG. */
async function cropToSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't crop images.");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error("We couldn't process that image.");
  return blob;
}

export async function getMyAvatar(): Promise<{ path: string | null; url: string | null }> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return { path: null, url: null };

  const { data } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", uid)
    .maybeSingle();
  const path = data?.avatar_path ?? null;
  if (!path) return { path: null, url: null };

  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return { path, url: signed?.signedUrl ?? null };
}

/** Crop, upload, then record the path. Returns a signed URL for immediate display. */
export async function uploadMyAvatar(file: File): Promise<{ path: string; url: string | null }> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new Error("Sign in first, so your photo is saved to your account.");
  if (!file.type.startsWith("image/")) throw new Error("Pick an image file.");

  const square = await cropToSquare(file);
  const path = `${uid}/avatar/avatar-${Date.now()}.jpg`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, square, { contentType: "image/jpeg", upsert: true });
  if (upErr) throw new Error("We couldn't upload that photo. Try again.");

  const previous = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", uid)
    .maybeSingle();

  const { error: rowErr } = await supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("user_id", uid);
  if (rowErr) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error("We couldn't save that photo to your account. Try again.");
  }

  const old = previous.data?.avatar_path;
  if (old && old !== path) {
    await supabase.storage.from(BUCKET).remove([old]);
  }

  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return { path, url: signed?.signedUrl ?? null };
}

export async function removeMyAvatar(): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return;
  const { data } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", uid)
    .maybeSingle();
  await supabase.from("profiles").update({ avatar_path: null }).eq("user_id", uid);
  if (data?.avatar_path) await supabase.storage.from(BUCKET).remove([data.avatar_path]);
}
