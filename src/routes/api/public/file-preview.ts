import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function unavailable() {
  return new Response("This file is no longer available.", {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function sharingEnabled(): boolean {
  return Boolean(process.env["SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"]);
}

async function verifiedUserId(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = /^Bearer ([^\s]+)$/.exec(authorization)?.[1];
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
  return !error && typeof data?.claims?.sub === "string" ? data.claims.sub : null;
}

export const Route = createFileRoute("/api/public/file-preview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!sharingEnabled()) return unavailable();
        const url = new URL(request.url);
        const shareToken = url.searchParams.get("shareToken");
        const materialId = url.searchParams.get("materialId");
        const range = request.headers.get("range") ?? undefined;
        if (range && !/^bytes=\d*-\d*$/.test(range)) {
          return new Response("Invalid range.", { status: 416, headers: { "Cache-Control": "private, no-store" } });
        }
        if (Boolean(shareToken) === Boolean(materialId)) return unavailable();

        try {
          const { readSharePreview, readShelfPreview } = await import("@/lib/library.server");
          const preview = shareToken
            ? /^[a-z0-9]{6,64}$/i.test(shareToken)
              ? await readSharePreview(shareToken, range)
              : null
            : /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(materialId ?? "")
              ? await (async () => {
                  const viewerId = await verifiedUserId(request);
                  return viewerId ? readShelfPreview(materialId!, viewerId, range) : null;
                })()
              : null;
          if (!preview) return unavailable();

          const { file, mimeType } = preview;
          const headers = new Headers({
            "Cache-Control": "private, no-store, max-age=0",
            "X-Content-Type-Options": "nosniff",
            "Accept-Ranges": "bytes",
            "Content-Type": mimeType || file.contentType || "application/octet-stream",
          });
          if (file.contentLength !== undefined) headers.set("Content-Length", String(file.contentLength));
          if (file.contentRange) headers.set("Content-Range", file.contentRange);
          return new Response(file.body as BodyInit, { status: file.contentRange ? 206 : 200, headers });
        } catch {
          return unavailable();
        }
      },
      HEAD: async ({ request }) => {
        if (!sharingEnabled()) return unavailable();
        const url = new URL(request.url);
        const shareToken = url.searchParams.get("shareToken");
        const materialId = url.searchParams.get("materialId");
        if (Boolean(shareToken) === Boolean(materialId)) return unavailable();
        try {
          const { headSharePreview, headShelfPreview } = await import("@/lib/library.server");
          const preview = shareToken
            ? /^[a-z0-9]{6,64}$/i.test(shareToken)
              ? await headSharePreview(shareToken)
              : null
            : /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(materialId ?? "")
              ? await (async () => {
                  const viewerId = await verifiedUserId(request);
                  return viewerId ? headShelfPreview(materialId!, viewerId) : null;
                })()
              : null;
          if (!preview) return unavailable();
          return new Response(null, {
            status: 200,
            headers: {
              "Cache-Control": "private, no-store, max-age=0",
              "X-Content-Type-Options": "nosniff",
              "Accept-Ranges": "bytes",
              "Content-Type": preview.mimeType || preview.metadata.contentType || "application/octet-stream",
              ...(preview.metadata.contentLength === undefined ? {} : { "Content-Length": String(preview.metadata.contentLength) }),
            },
          });
        } catch {
          return unavailable();
        }
      },
    },
  },
});