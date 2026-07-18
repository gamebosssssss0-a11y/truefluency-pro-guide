// Extracts text from a PPTX (a zip of XML parts) stored in the private
// "course-materials" bucket and writes it back onto the matching
// course_materials row.
//
// IMPORTANT: this function ALWAYS returns HTTP 200 with a JSON status
// payload so that the calling client's `supabase.functions.invoke` never
// rejects. All internal failures (download, unzip, XML parse, DB update)
// are caught, persisted as extraction_status: "failed" on the row, and
// returned as { status: "failed", error }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { unzipSync, strFromU8 } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let supabase: ReturnType<typeof createClient> | null = null;
  let materialId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return ok({ status: "failed", error: "missing authorization" });

    const body = await req.json().catch(() => ({}));
    materialId = body?.materialId ?? null;
    if (!materialId) return ok({ status: "failed", error: "materialId required" });

    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: mat, error: matErr } = await supabase
      .from("course_materials")
      .select("id, file_path, file_type")
      .eq("id", materialId)
      .maybeSingle();

    if (matErr || !mat) {
      return ok({ status: "failed", error: matErr?.message ?? "not found" });
    }
    if (mat.file_type !== "pptx") {
      return ok({ status: "failed", error: "not a pptx" });
    }

    await supabase
      .from("course_materials")
      .update({ extraction_status: "pending" })
      .eq("id", materialId);

    const { data: blob, error: dlErr } = await supabase.storage
      .from("course-materials")
      .download(mat.file_path);

    if (dlErr || !blob) {
      await persistFailure(supabase, materialId, dlErr?.message ?? "download failed");
      return ok({ status: "failed", error: dlErr?.message ?? "download failed" });
    }

    let extracted = "";
    try {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const unzipped = unzipSync(bytes, {
        filter: (f) => /^ppt\/slides\/slide\d+\.xml$/.test(f.name),
      });

      const entries = Object.entries(unzipped).sort((a, b) => {
        const na = parseInt(a[0].match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
        const nb = parseInt(b[0].match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
        return na - nb;
      });

      const parts: string[] = [];
      for (const [name, data] of entries) {
        try {
          const slideNum = parseInt(name.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
          const xml = strFromU8(data);
          const runs = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
            .map((m) => decodeXmlEntities(m[1]))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          if (runs) parts.push(`[Slide ${slideNum}]\n${runs}`);
        } catch (slideErr) {
          console.error("[extract-pptx] slide parse failed", name, slideErr);
        }
      }
      extracted = parts.join("\n\n").trim();
    } catch (e) {
      const msg = (e as Error)?.message ?? "unzip crash";
      console.error("[extract-pptx] unzip threw", msg);
      await persistFailure(supabase, materialId, msg);
      return ok({ status: "failed", error: msg });
    }

    if (!extracted) {
      await persistFailure(supabase, materialId, "no slide text found");
      return ok({ status: "failed", error: "no slide text found" });
    }

    await supabase
      .from("course_materials")
      .update({
        extraction_status: "success",
        extracted_content: extracted,
        extraction_error: null,
      })
      .eq("id", materialId);

    return ok({ status: "success", chars: extracted.length });
  } catch (e) {
    const msg = (e as Error)?.message ?? "unknown error";
    console.error("[extract-pptx] top-level catch", msg);
    if (supabase && materialId) {
      try { await persistFailure(supabase, materialId, msg); } catch { /* ignore */ }
    }
    return ok({ status: "failed", error: msg });
  }
});

async function persistFailure(
  supabase: ReturnType<typeof createClient>,
  materialId: string,
  error: string,
) {
  try {
    await supabase
      .from("course_materials")
      .update({ extraction_status: "failed", extraction_error: error })
      .eq("id", materialId);
  } catch (e) {
    console.error("[extract-pptx] failed to persist failure", e);
  }
}

function decodeXmlEntities(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
