// Extracts text from a PPTX (a zip of XML parts) stored in the private
// "course-materials" bucket and writes it back onto the matching
// course_materials row.
//
// PPTX slide text lives in /ppt/slides/slideN.xml as <a:t>…</a:t> runs.
// We unzip with fflate, iterate slide XML files in numeric order, pull the
// text of every <a:t> run, and concatenate per slide with a "[Slide N]"
// tag so later features can reference specific slides.
//
// Mirrors extract-pdf-text semantics: success | failed | timeout are
// persisted on the row and the uploaded file itself is never removed on
// extraction failure.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { unzipSync, strFromU8 } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const { materialId } = await req.json();
    if (!materialId) return json({ error: "materialId required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: mat, error: matErr } = await supabase
      .from("course_materials")
      .select("id, file_path, file_type")
      .eq("id", materialId)
      .maybeSingle();

    if (matErr || !mat) return json({ error: matErr?.message ?? "Not found" }, 404);
    if (mat.file_type !== "pptx") return json({ error: "Not a PPTX" }, 400);

    await supabase
      .from("course_materials")
      .update({ extraction_status: "pending" })
      .eq("id", materialId);

    const { data: blob, error: dlErr } = await supabase.storage
      .from("course-materials")
      .download(mat.file_path);

    if (dlErr || !blob) {
      await supabase
        .from("course_materials")
        .update({
          extraction_status: "failed",
          extraction_error: dlErr?.message ?? "download failed",
        })
        .eq("id", materialId);
      return json({ error: dlErr?.message ?? "download failed" }, 500);
    }

    let extracted = "";
    try {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const unzipped = unzipSync(bytes, {
        filter: (f) => /^ppt\/slides\/slide\d+\.xml$/.test(f.name),
      });

      // Sort slide files by numeric slide index (slide1, slide2, slide10, ...).
      const entries = Object.entries(unzipped).sort((a, b) => {
        const na = parseInt(a[0].match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
        const nb = parseInt(b[0].match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
        return na - nb;
      });

      const parts: string[] = [];
      for (const [name, data] of entries) {
        const slideNum = parseInt(name.match(/slide(\d+)\.xml$/)?.[1] ?? "0", 10);
        const xml = strFromU8(data);
        // Pull every <a:t>…</a:t> run. Simple regex — slide text is plain
        // text inside these runs, no nested tags to worry about.
        const runs = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
          .map((m) => decodeXmlEntities(m[1]))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (runs) parts.push(`[Slide ${slideNum}]\n${runs}`);
      }
      extracted = parts.join("\n\n").trim();
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

    await supabase
      .from("course_materials")
      .update({
        extraction_status: extracted ? "success" : "failed",
        extracted_content: extracted || null,
        extraction_error: extracted ? null : "no slide text found",
      })
      .eq("id", materialId);

    return json({ status: extracted ? "success" : "failed", chars: extracted.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function decodeXmlEntities(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
