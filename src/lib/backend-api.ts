/**
 * Client for the TrueFluency AI backend (FastAPI service).
 *
 * The base URL comes from VITE_BACKEND_URL. If it isn't configured we fail
 * loudly with a friendly message instead of silently hitting localhost.
 */
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

async function postJson<T>(path: string, body: unknown, timeoutMs = 90_000): Promise<T> {
  const url = `${base()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[backend] request failed", { path, status: res.status, text });
      throw new Error(`Backend responded with ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw new Error("The request timed out.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Real topic prediction for one uploaded material. */
export async function predictTopics(input: {
  materialId: string;
  courseCode: string;
  courseName: string;
  level?: string | null;
  department?: string | null;
}): Promise<PredictedTopic[]> {
  const data = await postJson<{ topics: unknown }>("/predict-topics", {
    material_id: input.materialId,
    course_code: input.courseCode,
    course_name: input.courseName,
    user_level: input.level ? String(input.level) : null,
    user_department: input.department ?? null,
  });

  const raw = Array.isArray(data?.topics) ? data.topics : [];
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

/** Real mock test generation for one uploaded material. */
export async function generateMock(input: {
  materialId: string;
  courseCode: string;
  courseName: string;
  questionCount: number;
  difficulty: Difficulty;
  topicFocus: string[];
  profile: Pick<Profile, "goal" | "timeline" | "level" | "department">;
}): Promise<AIQuestion[]> {
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

  const raw = Array.isArray(data?.questions) ? data.questions : [];
  const questions: AIQuestion[] = raw
    .map((q, i) => {
      const o = q as Partial<AIQuestion> & { correct_index?: unknown };
      const options: string[] = Array.isArray(o.options)
        ? (o.options as unknown[]).filter((x): x is string => typeof x === "string")
        : [];
      const correct = Number(o.correct_index);
      if (typeof o.question !== "string" || options.length < 2) return null;
      return {
        id: typeof o.id === "number" ? o.id : i + 1,
        topic: typeof o.topic === "string" && o.topic.trim() ? o.topic : "General",
        question: o.question,
        options,
        correct_index: Number.isInteger(correct) && correct >= 0 && correct < options.length ? correct : 0,
        explanation: typeof o.explanation === "string" ? o.explanation : "",
      } satisfies AIQuestion;
    })
    .filter((q): q is AIQuestion => q !== null)
    // Re-key so ids are always unique inside one generated set.
    .map((q, i) => ({ ...q, id: i + 1 }));

  if (questions.length === 0) throw new Error("No questions came back from the generator.");
  return questions;
}
