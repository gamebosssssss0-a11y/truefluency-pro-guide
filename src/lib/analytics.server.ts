import { createClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Analytics is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function recordAnalyticsEvent(event: {
  userId: string;
  eventName: "mock_started" | "mock_submitted" | "upload_created" | "upload_practice";
  courseCode?: string;
  materialId?: string;
  attemptId?: string;
}) {
  const db = admin();
  const { error } = await db.from("analytics_events").insert({
    user_id: event.userId,
    event_name: event.eventName,
    course_code: event.courseCode ?? null,
    material_id: event.materialId ?? null,
    attempt_id: event.attemptId ?? null,
  });
  if (error) throw error;
}
