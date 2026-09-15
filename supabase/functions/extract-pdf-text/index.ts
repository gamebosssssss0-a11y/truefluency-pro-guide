// Extracts text from a PDF stored in the private "course-materials" bucket
// and writes it back onto the matching course_materials row.
//
// Called by the client after upload with { materialId }. Uses the caller's
// JWT so RLS enforces ownership.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const { materialId } = await req.json();
    if (!materialId) return json({ error: "materialId required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Load material row (RLS scopes to owner)
    const { data: mat, error: matErr } = await supabase
      .from("course_materials")
      .select("id, file_path, file_type")
      .eq("id", materialId)
      .maybeSingle();

    if (matErr || !mat) return json({ error: matErr?.message ?? "Not found" }, 404);
    if (mat.file_type !== "pdf") return json({ error: "Not a PDF" }, 400);

    await supabase
      .from("course_materials")
      .update({ extraction_status: "pending" })
      .eq("id", materialId);

    // Download the PDF from storage
    const { data: blob, error: dlErr } = await supabase.storage
      .from("course-materials")
      .download(mat.file_path);

    if (dlErr || !blob) {
      await supabase
        .from("course_materials")
        .update({ extraction_status: "failed", extraction_error: dlErr?.message ?? "download failed" })
        .eq("id", materialId);
      return json({ error: dlErr?.message ?? "download failed" }, 500);
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());

    let extracted = "";
    try {
      const pdf = await getDocumentProxy(bytes);
      const { text } = await extractText(pdf, { mergePages: true });
      extracted = (Array.isArray(text) ? text.join("\n\n") : text ?? "").trim();
    } catch (e) {
      await supabase
        .from("course_materials")
        .update({
          extraction_status: "failed",
          extraction_error: (e as Error).message,
        })
        .eq("id", materialId);
      return json({ error: "extraction failed", detail: (e as Error).message }, 500);
    }

    // Heuristic: if we got almost no text, it's very likely a scanned PDF.
    const looksScanned = extracted.replace(/\s+/g, "").length < 40;

    if (looksScanned) {
      await supabase
        .from("course_materials")
        .update({
          extraction_status: "scanned_pdf",
          extracted_content: extracted || null,
        })
        .eq("id", materialId);
      return json({ status: "scanned_pdf", chars: extracted.length });
    }

    await supabase
      .from("course_materials")
      .update({
        extraction_status: "success",
        extracted_content: extracted,
        extraction_error: null,
      })
      .eq("id", materialId);

    return json({ status: "success", chars: extracted.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
