import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function notFound() {
  return new Response("This file is no longer available.", {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function unauthorized() {
  return new Response("Sign in to view this file.", {
    status: 401,
    headers: { "Cache-Control": "private, no-store" },
  });
}

async function verifiedUserId(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  const token = match?.[1];
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!token || !url || !key || token.split(".").length !== 3) return null;

  const client = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
  const { data, error } = await client.auth.getClaims(token);
  if (error || typeof data?.claims?.sub !== "string") return null;
  return data.claims.sub;
}

export const Route = createFileRoute("/file-preview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const shareToken = url.searchParams.get("shareToken");
        const materialId = url.searchParams.get("materialId");
        const range = request.headers.get("range") ?? undefined;
        if (range && !/^bytes=\d*-\d*$/.test(range)) return new Response("Invalid range.", { status: 416 });
        if (Boolean(shareToken) === Boolean(materialId)) return notFound();

        try {
          const { readSharePreview, readShelfPreview } = await import("@/lib/library.server");
          const preview = shareToken
            ? /^[a-z0-9]{6,64}$/i.test(shareToken)
              ? await readSharePreview(shareToken, range)
              : null
            : /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(materialId ?? "")
              ? await (async () => {
                  const userId = await verifiedUserId(request);
                  if (!userId) return null;
                  return readShelfPreview(materialId!, userId, range);
                })()
              : null;

          if (!preview) return shareToken ? notFound() : unauthorized();
          const { file, mimeType } = preview;
          const headers = new Headers({
            "Cache-Control": "private, no-store, max-age=0",
            "X-Content-Type-Options": "nosniff",
            "Accept-Ranges": "bytes",
            "Content-Type": mimeType || file.contentType || "application/octet-stream",
          });
          if (file.contentLength !== undefined) headers.set("Content-Length", String(file.contentLength));
          if (file.contentRange) headers.set("Content-Range", file.contentRange);
          return new Response(file.body as BodyInit, {
            status: file.contentRange ? 206 : 200,
            headers,
          });
        } catch {
          return notFound();
        }
      },
    },
  },
});