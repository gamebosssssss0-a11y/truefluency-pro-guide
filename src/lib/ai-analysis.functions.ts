/**
 * In-app analysis of an uploaded material: topic prediction and mock
 * generation. Used as the fallback when the external analysis service can't
 * serve a request.
 *
 * The material's text is always read from the caller's own row, so a request
 * can never reach another student's upload.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateMockFromText,
  predictTopicsFromText,
  type GeneratedQuestion,
  type PredictedTopic,
} from "@/lib/ai-analysis.server";

const NO_TEXT = "We haven't read any text from that upload yet.";

function requireId(value: unknown): string {
  const id = String(value ?? "").trim();
  if (!id || id.length > 64) throw new Error("A material id is required.");
  return id;
}

export const predictTopicsInApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    materialId: string;
    courseCode: string;
    courseName: string;
    level?: string | null;
    department?: string | null;
  }) => ({
    materialId: requireId(input?.materialId),
    courseCode: String(input?.courseCode ?? "").slice(0, 32),
    courseName: String(input?.courseName ?? "").slice(0, 160),
    level: input?.level ? String(input.level).slice(0, 16) : null,
    department: input?.department ? String(input.department).slice(0, 160) : null,
  }))
  .handler(async ({ data, context }): Promise<PredictedTopic[]> => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("course_materials")
      .select("extracted_content")
      .eq("id", data.materialId)
      .eq("user_id", userId)
      .maybeSingle();

    const text = row?.extracted_content ?? "";
    if (!text.trim()) throw new Error(NO_TEXT);

    return predictTopicsFromText({
      text,
      courseCode: data.courseCode,
      courseName: data.courseName,
      level: data.level,
      department: data.department,
    });
  });

export const generateMockInApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    materialId: string;
    courseCode: string;
    courseName: string;
    questionCount: number;
    difficulty: string;
    topicFocus?: string[];
    level?: string | null;
    department?: string | null;
  }) => ({
    materialId: requireId(input?.materialId),
    courseCode: String(input?.courseCode ?? "").slice(0, 32),
    courseName: String(input?.courseName ?? "").slice(0, 160),
    questionCount: Math.max(5, Math.min(40, Number(input?.questionCount) || 20)),
    difficulty: String(input?.difficulty ?? "medium").slice(0, 24),
    topicFocus: Array.isArray(input?.topicFocus)
      ? input.topicFocus.filter((t) => typeof t === "string").slice(0, 20)
      : [],
    level: input?.level ? String(input.level).slice(0, 16) : null,
    department: input?.department ? String(input.department).slice(0, 160) : null,
  }))
  .handler(async ({ data, context }): Promise<GeneratedQuestion[]> => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("course_materials")
      .select("extracted_content")
      .eq("id", data.materialId)
      .eq("user_id", userId)
      .maybeSingle();

    const text = row?.extracted_content ?? "";
    if (!text.trim()) throw new Error(NO_TEXT);

    return generateMockFromText({
      text,
      courseCode: data.courseCode,
      courseName: data.courseName,
      questionCount: data.questionCount,
      difficulty: data.difficulty,
      topicFocus: data.topicFocus,
      level: data.level,
      department: data.department,
    });
  });
