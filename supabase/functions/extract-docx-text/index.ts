// Extracts raw text from a DOCX stored in the private "course-materials"
// bucket and writes it back onto the matching course_materials row.
//
// IMPORTANT: this function ALWAYS returns HTTP 200 with a JSON status
// payload so that the calling client's `supabase.functions.invoke` never
// rejects. All internal failures (download, mammoth crash, DB update) are
// caught, persisted as extraction_status: "failed" on the row, and returned
// as { status: "failed", error }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import mammoth from "https://esm.sh/mammoth@1.8.0";

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
    if (mat.file_type !== "docx") {
      return ok({ status: "failed", error: "not a docx" });
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
      const arrayBuffer = await blob.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      extracted = (result?.value ?? "").trim();
    } catch (e) {
      const msg = (e as Error)?.message ?? "extraction crash";
      console.error("[extract-docx] mammoth threw", msg);
      await persistFailure(supabase, materialId, msg);
      return ok({ status: "failed", error: msg });
    }

    if (!extracted) {
      await persistFailure(supabase, materialId, "no text found");
      return ok({ status: "failed", error: "no text found" });
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
    console.error("[extract-docx] top-level catch", msg);
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
    console.error("[extract-docx] failed to persist failure", e);
  }
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
