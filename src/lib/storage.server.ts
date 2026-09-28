/**
 * Cloudflare R2 storage — server-only core. Never imported by any browser
 * bundle; R2_* credentials must never reach the client, which is exactly why
 * course-materials.ts (a browser module) no longer talks to storage
 * directly and instead calls the createServerFn wrappers in
 * storage.functions.ts, same architecture as extraction.server.ts /
 * extraction.functions.ts.
 *
 * ONE physical R2 bucket (R2_BUCKET_NAME), keys prefixed with the ORIGINAL
 * Supabase bucket name ("course-materials/...", "past-papers/...") so the
 * two purposes can never collide — mirrors main.py's fetch_file_from_storage
 * on the FastAPI backend, which reads the exact same bucket/keys. The
 * owner-prefixed part of the key ({user_id}/...) is unchanged from the old
 * Supabase paths, so file_path values already in Postgres need no rewrite,
 * and security.safe_storage_path() on the backend keeps working as-is.
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const COURSE_MATERIALS_BUCKET = "course-materials";

function env(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Storage isn't configured — missing ${name}.`);
  return v;
}

let client: S3Client | null = null;

/** Lazy singleton, same reasoning as main.py's _r2_client(): don't blow up
 * at module-load time in an environment where these vars aren't set yet. */
function r2(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    // Required for R2 — the SDK defaults to virtual-hosted-style addressing
    // (bucket-name.account.r2.cloudflarestorage.com), which R2 doesn't
    // support. Without this, requests go to the wrong URL and R2 reports it
    // as an invalid bucket even when the bucket name is correct.
    forcePathStyle: true,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

function bucketName(): string {
  return env("R2_BUCKET_NAME");
}

/** Prefixes a Postgres-stored path with the original Supabase bucket name to
 * form the actual R2 object key. Keep this in sync with main.py's
 * fetch_file_from_storage — same convention, both sides must agree. */
function keyFor(path: string, bucket: string = COURSE_MATERIALS_BUCKET): string {
  return `${bucket}/${path}`;
}

/**
 * A short-lived signed PUT URL the browser uploads directly to — the file's
 * bytes never pass through the Render backend or this Node server at all,
 * which is the entire point (keeps large uploads off both).
 */
export async function presignUpload(opts: {
  path: string;
  contentType: string;
  bucket?: string;
}): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: bucketName(),
    Key: keyFor(opts.path, opts.bucket),
    ContentType: opts.contentType,
  });
  return getSignedUrl(r2(), cmd, { expiresIn: 300 }); // 5 minutes to actually do the PUT
}

/** Signed GET URL for previews/shares — same 30-minute expiry the old
 * Supabase createSignedUrl calls used, so nothing about the frontend's
 * "link expires in 30 min" behavior changes. */
export async function presignDownload(opts: {
  path: string;
  bucket?: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const cmd = new GetObjectCommand({ Bucket: bucketName(), Key: keyFor(opts.path, opts.bucket) });
  return getSignedUrl(r2(), cmd, { expiresIn: opts.expiresInSeconds ?? 60 * 30 });
}

export async function deleteObject(path: string, bucket: string = COURSE_MATERIALS_BUCKET): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: keyFor(path, bucket) }));
}

/** Batches in groups of 1000 — S3's own hard limit on DeleteObjects, well
 * above anything this app will ever send in one call, kept only as a
 * correctness guard rather than something expected to trigger. */
export async function deleteObjects(paths: string[], bucket: string = COURSE_MATERIALS_BUCKET): Promise<void> {
  for (let i = 0; i < paths.length; i += 1000) {
    const batch = paths.slice(i, i + 1000);
    if (batch.length === 0) continue;
    await r2().send(
      new DeleteObjectsCommand({
        Bucket: bucketName(),
        Delete: { Objects: batch.map((p) => ({ Key: keyFor(p, bucket) })) },
      }),
    );
  }
}

/** Server-side copy — the bytes never pass through this process, matching
 * the old supabase.storage.copy() behavior saveSharedFile() relied on. */
export async function copyObject(
  sourcePath: string,
  destPath: string,
  bucket: string = COURSE_MATERIALS_BUCKET,
): Promise<void> {
  await r2().send(
    new CopyObjectCommand({
      Bucket: bucketName(),
      Key: keyFor(destPath, bucket),
      CopySource: `${bucketName()}/${encodeURIComponent(keyFor(sourcePath, bucket))}`,
    }),
  );
}

/** Used by the upload server function to confirm the PUT actually landed
 * before the DB row is created — closes a race the old flow didn't have to
 * worry about, since supabase.storage.upload() was synchronous from the
 * caller's point of view; a presigned PUT is a separate round trip. */
export async function objectExists(path: string, bucket: string = COURSE_MATERIALS_BUCKET): Promise<boolean> {
  try {
    await r2().send(new HeadObjectCommand({ Bucket: bucketName(), Key: keyFor(path, bucket) }));
    return true;
  } catch {
    return false;
  }
}
