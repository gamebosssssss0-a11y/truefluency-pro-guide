/**
 * Client for the TrueFluency AI backend (FastAPI service).
 *
 * The base URL comes from VITE_BACKEND_URL. If it isn't configured we fail
 * loudly with a friendly message instead of silently hitting localhost.
 */
import { supabase } from "@/integrations/supabase/client";
import { generateMockInApp, predictTopicsInApp } from "@/lib/ai-analysis.functions";
import type { AIQuestion, Difficulty, Profile } from "@/lib/profile-store";


const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

export const NOT_CONFIGURED_MESSAGE = "Prediction service isn't configured yet";

export function isBackendConfigured(): boolean {
  return typeof BACKEND_URL === "string" && BACKEND_URL.trim().length > 0;
}

export type PredictedTopic = { topic: string; confidence: number };

function base(): string {
  if (!isBackendConfigured()) throw new Error(NOT_CONFIGURED_MESSAGE);
  return BACKEND_URL!.replace(/\/+$/, "");
}

/** Pull FastAPI's `detail` out of an error body so users see a real reason. */
function readErrorDetail(text: string, status: number): string {
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    const detail = parsed?.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
    if (Array.isArray(detail) && detail.length) {
      const first = detail[0] as { msg?: unknown };
      if (typeof first?.msg === "string") return first.msg;
    }
  } catch {
    /* not JSON */
  }
  if (status === 404) return "We couldn't find that upload on the analysis service.";
  if (status === 503) return "The analysis service isn't fully configured yet.";
  if (status >= 500) return "The analysis service had a problem. Please try again.";
  return `The analysis service rejected the request (${status}).`;
}

async function postJson<T>(path: string, body: unknown, timeoutMs = 120_000): Promise<T> {
  const url = `${base()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // The analysis service only serves the signed-in owner of a material, so
    // every call carries the current Supabase access token.
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error("Sign in to use the analysis service.");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[backend] request failed", { path, status: res.status, text });
      throw new Error(readErrorDetail(text, res.status));
    }
    return (await res.json()) as T;
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw new Error("The request timed out.");
    if (e instanceof TypeError) {
      // Network-level failure: offline, DNS, or a CORS rejection.
      console.error("[backend] network error", { path, error: e });
      throw new Error("Couldn't reach the analysis service. Check your connection and try again.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}


/**
 * Real topic prediction for one uploaded material.
 *
 * The external analysis service is tried first; if it can't serve the request
 * (unreachable, misconfigured, or it can't see the upload), the same analysis
 * runs in-app so the student still gets predictions.
 */
export async function predictTopics(input: {
  materialId: string;
  courseCode: string;
  courseName: string;
  level?: string | null;
  department?: string | null;
}): Promise<PredictedTopic[]> {
  let raw: unknown[] = [];
  try {
    if (!isBackendConfigured()) throw new Error(NOT_CONFIGURED_MESSAGE);
    const data = await postJson<{ topics: unknown }>("/predict-topics", {
      material_id: input.materialId,
      course_code: input.courseCode,
      course_name: input.courseName,
      user_level: input.level ? String(input.level) : null,
      user_department: input.department ?? null,
    });
    raw = Array.isArray(data?.topics) ? data.topics : [];
    if (raw.length === 0) throw new Error("The analysis came back empty.");
  } catch (e) {
    console.warn("[backend] predict-topics unavailable, analyzing in-app", e);
    return predictTopicsInApp({
      data: {
        materialId: input.materialId,
        courseCode: input.courseCode,
        courseName: input.courseName,
        level: input.level ?? null,
        department: input.department ?? null,
      },
    });
  }

  const topics: PredictedTopic[] = raw
    .map((t) => {
      const o = t as { topic?: unknown; confidence?: unknown };
      const topic = typeof o.topic === "string" ? o.topic.trim() : "";
      const confidence = typeof o.confidence === "number" ? o.confidence : Number(o.confidence);
      if (!topic || !Number.isFinite(confidence)) return null;
      return { topic, confidence: Math.max(0, Math.min(1, confidence)) };
    })
    .filter((t): t is PredictedTopic => t !== null);

  if (topics.length === 0) throw new Error("The analysis came back empty.");
  return topics;
}


/**
 * Real mock test generation for one uploaded material, with the same in-app
 * fallback as topic prediction.
 */
export async function generateMock(input: {
  materialId: string;
  courseCode: string;
  courseName: string;
  questionCount: number;
  difficulty: Difficulty;
  topicFocus: string[];
  profile: Pick<Profile, "goal" | "timeline" | "level" | "department">;
}): Promise<AIQuestion[]> {
  let raw: unknown[] = [];
  try {
    if (!isBackendConfigured()) throw new Error(NOT_CONFIGURED_MESSAGE);
    const data = await postJson<{ questions: unknown }>("/generate-mock", {
      material_id: input.materialId,
      course_code: input.courseCode,
      course_name: input.courseName,
      question_count: input.questionCount,
      difficulty: input.difficulty,
      topic_focus: input.topicFocus,
      user_goal: input.profile.goal,
      user_timeline: input.profile.timeline,
      user_level: input.profile.level ? String(input.profile.level) : null,
      user_department: input.profile.department,
    });
    raw = Array.isArray(data?.questions) ? data.questions : [];
    if (raw.length === 0) throw new Error("No questions came back from the generator.");
  } catch (e) {
    console.warn("[backend] generate-mock unavailable, generating in-app", e);
    raw = await generateMockInApp({
      data: {
        materialId: input.materialId,
        courseCode: input.courseCode,
        courseName: input.courseName,
        questionCount: input.questionCount,
        difficulty: input.difficulty,
        topicFocus: input.topicFocus,
        level: input.profile.level ? String(input.profile.level) : null,
        department: input.profile.department ?? null,
      },
    });
  }

  const questions: AIQuestion[] = raw

    .map((q, i) => {
      const o = q as Partial<AIQuestion> & { correct_index?: unknown };
      const options: string[] = Array.isArray(o.options)
        ? (o.options as unknown[]).filter((x): x is string => typeof x === "string")
        : [];
      const correct = Number(o.correct_index);
      if (typeof o.question !== "string" || options.length < 2) return null;
      // A question whose answer key is missing or out of range would be graded
      // against option A, so drop it rather than mark right answers wrong.
      if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) return null;
      return {
        id: typeof o.id === "number" ? o.id : i + 1,
        topic: typeof o.topic === "string" && o.topic.trim() ? o.topic : "General",
        question: o.question,
        options,
        correct_index: correct,
        explanation: typeof o.explanation === "string" ? o.explanation : "",
      } satisfies AIQuestion;
    })
    .filter((q): q is AIQuestion => q !== null)
    // Re-key so ids are always unique inside one generated set.
    .map((q, i) => ({ ...q, id: i + 1 }));

  if (questions.length === 0) throw new Error("No questions came back from the generator.");
  return questions;
}
