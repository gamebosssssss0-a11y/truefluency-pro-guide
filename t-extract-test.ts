import { createClient } from "@supabase/supabase-js";
import { extractText } from "./src/lib/extraction.server";
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data } = await sb.from("course_materials").select("id,file_path,file_type,file_name,extraction_status").eq("extraction_status","pending").limit(3);
for (const m of data ?? []) {
  const dl = await sb.storage.from("course-materials").download(m.file_path);
  if (dl.error) { console.log(m.file_name, "DOWNLOAD FAIL", dl.error.message); continue; }
  const bytes = new Uint8Array(await dl.data!.arrayBuffer());
  const out = await extractText(m.file_type, bytes);
  console.log(m.file_name, m.file_type, out.status, out.status === "success" ? out.chars : (out as any).error ?? "");
}
