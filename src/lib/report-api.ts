/**
 * "Report this question" (question_reports.py on the Render backend).
 * A report makes that question stop coming back for the student who sent it, and once two different students have
 * reported the same question it stops for everyone on that course and the question writer is told what went wrong.
 */
import { supabase } from "@/integrations/supabase/client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

export type ReportReason = "wrong_answer" | "unclear" | "off_topic" | "duplicate" | "too_easy" | "too_hard" | "other";

export const REPORT_REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: "wrong_answer", label: "The marked answer is wrong", hint: "Another option is right, or none is." },
  { value: "unclear", label: "It's unclear or badly worded", hint: "I can't tell what it's asking." },
  { value: "off_topic", label: "It isn't from my notes", hint: "The topic isn't in what I uploaded." },
  { value: "duplicate", label: "It repeats another question", hint: "Same question, different words." },
  { value: "too_easy", label: "Too easy for this level", hint: "" },
  { value: "too_hard", label: "Too hard for this level", hint: "" },
  { value: "other", label: "Something else", hint: "" },
];

export async function reportQuestion(input: {
  courseCode: string;
  materialId?: string | null;
  question: string;
  options: string[];
  markedIndex?: number | null;
  reason: ReportReason;
  note?: string;
}): Promise<{ status: "recorded" | "already_reported"; verified: boolean }> {
  if (typeof BACKEND_URL !== "string" || !BACKEND_URL.trim()) throw new Error("Reporting isn't available right now.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to report a question.");
  const res = await fetch(`${BACKEND_URL.replace(/\/+$/, "")}/questions/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      course_code: input.courseCode,
      material_id: input.materialId || undefined,
      question: input.question,
      options: input.options.slice(0, 6),
      marked_index: input.markedIndex ?? undefined,
      reason: input.reason,
      note: input.note?.trim() || undefined,
    }),
  });
  if (res.status === 429) throw new Error("You've sent a lot of reports. Please try again in a while.");
  if (!res.ok) throw new Error("Couldn't send your report. Please try again.");
  return res.json();
}
