/**
 * Server-only AI analysis helpers (topic prediction and mock generation).
 * Routes through the TrueFluency Render backend — NOT Lovable AI gateway.
 */

export type PredictedTopic = { topic: string; confidence: number };

export type GeneratedQuestion = {
  id: number;
  topic: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

const BACKEND_URL = (process.env["VITE_BACKEND_URL"] ?? "").replace(/\/+$/, "");

async function callBackend<T>(path: string, body: unknown, token: string): Promise<T> {
  if (!BACKEND_URL) throw new Error("The analysis service isn't configured yet.");

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Analysis service error (${res.status}): ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export async function predictTopicsFromText(input: {
  text: string;
  courseCode: string;
  courseName: string;
  level?: string | null;
  department?: string | null;
  materialId?: string;
  token?: string;
}): Promise<PredictedTopic[]> {
  if (!input.materialId || !input.token) {
    throw new Error("The analysis service isn't configured yet.");
  }

  const data = await callBackend<{ topics: unknown[] }>("/predict-topics", {
    material_id: input.materialId,
    course_code: input.courseCode,
    course_name: input.courseName,
    user_level: input.level ?? null,
    user_department: input.department ?? null,
  }, input.token);

  const topics: PredictedTopic[] = (data.topics ?? [])
    .map((t) => {
      const o = t as { topic?: unknown; confidence?: unknown };
      const topic = typeof o.topic === "string" ? o.topic.trim() : "";
      const confidence = Number(o.confidence);
      if (!topic) return null;
      return { topic, confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.6 };
    })
    .filter((t): t is PredictedTopic => t !== null);

  if (topics.length === 0) throw new Error("The analysis came back empty.");
  return topics;
}

export async function generateMockFromText(input: {
  text: string;
  courseCode: string;
  courseName: string;
  questionCount: number;
  difficulty: string;
  topicFocus: string[];
  level?: string | null;
  department?: string | null;
  materialId?: string;
  token?: string;
}): Promise<GeneratedQuestion[]> {
  if (!input.materialId || !input.token) {
    throw new Error("The analysis service isn't configured yet.");
  }

  const data = await callBackend<{ questions: unknown[] }>("/generate-mock", {
    material_id: input.materialId,
    course_code: input.courseCode,
    course_name: input.courseName,
    question_count: input.questionCount,
    difficulty: input.difficulty,
    topic_focus: input.topicFocus,
    user_level: input.level ?? null,
    user_department: input.department ?? null,
  }, input.token);

  const questions: GeneratedQuestion[] = (data.questions ?? [])
    .map((q, i) => {
      const o = q as Record<string, unknown>;
      const question = typeof o["question"] === "string" ? o["question"].trim() : "";
      const options = Array.isArray(o["options"])
        ? (o["options"] as unknown[]).filter((x): x is string => typeof x === "string")
        : [];
      const correct = Number(o["correct_index"]);
      if (!question || options.length < 2) return null;
      if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) return null;
      return {
        id: i + 1,
        topic: typeof o["topic"] === "string" && o["topic"].trim() ? o["topic"] as string : "General",
        question,
        options,
        correct_index: correct,
        explanation: typeof o["explanation"] === "string" ? o["explanation"] as string : "",
      };
    })
    .filter((q): q is GeneratedQuestion => q !== null);

  if (questions.length === 0) throw new Error("No questions came back from the generator.");
  return questions;
}
