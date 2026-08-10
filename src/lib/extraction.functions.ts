/**
 * Authenticated text extraction for an uploaded course material.
 *
 * The storage path is always resolved from the caller's own material row, so a
 * request can never pull an arbitrary object out of the private bucket.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractText } from "@/lib/extraction.server";

export type ExtractResult = {
  materialId: string;
  status: "success" | "scanned_pdf" | "failed";
  chars: number;
  error?: string;
};

export const extractMaterialText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { materialId: string }) => {
    const id = String(input?.materialId ?? "").trim();
    if (!id || id.length > 64) throw new Error("A material id is required.");
    return { materialId: id };
  })
  .handler(async ({ data, context }): Promise<ExtractResult> => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("course_materials")
      .select("id, file_path, file_type, user_id")
      .eq("id", data.materialId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error("Couldn't look up that upload.");
    if (!row) throw new Error("Material not found");

    const filePath = row.file_path ?? "";
    if (!filePath.startsWith(`${userId}/`)) throw new Error("Material not found");

    const download = await supabase.storage.from("course-materials").download(filePath);
    if (download.error || !download.data) {
      throw new Error("Couldn't download that file from storage.");
    }
    const bytes = new Uint8Array(await download.data.arrayBuffer());

    const outcome = await extractText(row.file_type, bytes);

    if (outcome.status === "success") {
      await supabase
        .from("course_materials")
        .update({
          extracted_content: outcome.text,
          extraction_status: "success",
          extraction_error: null,
        })
        .eq("id", row.id)
        .eq("user_id", userId);
      return { materialId: row.id, status: "success", chars: outcome.chars };
    }

    if (outcome.status === "scanned_pdf") {
      await supabase
        .from("course_materials")
        .update({
          extracted_content: null,
          extraction_status: "scanned_pdf",
          extraction_error:
            "No selectable text found. This looks like a scan or photo of a page.",
        })
        .eq("id", row.id)
        .eq("user_id", userId);
      return { materialId: row.id, status: "scanned_pdf", chars: 0 };
    }

    await supabase
      .from("course_materials")
      .update({
        extracted_content: null,
        extraction_status: "failed",
        extraction_error: outcome.error,
      })
      .eq("id", row.id)
      .eq("user_id", userId);
    return { materialId: row.id, status: "failed", chars: 0, error: outcome.error };
  });
