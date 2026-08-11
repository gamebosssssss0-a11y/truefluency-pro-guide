/**
 * Server-only AI analysis helpers (topic prediction and mock generation).
 *
 * These run through the Lovable AI gateway so the app can analyze an upload
 * even when the external analysis service is unreachable or misconfigured.
 */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

/** Keep prompts well inside the model's context window. */
const MAX_CHARS = 24_000;

export type PredictedTopic = { topic: string; confidence: number };

export type GeneratedQuestion = {
  id: number;
  topic: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

function trimContent(text: string): string {
  const clean = text.replace(/\s+\n/g, "\n").trim();
  return clean.length > MAX_CHARS ? `${clean.slice(0, MAX_CHARS)}\n…` : clean;
}

async function chat(system: string, user: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("The analysis service isn't configured yet.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (res.status === 429) throw new Error("The analysis service is busy. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[ai-analysis] gateway error", { status: res.status, body: body.slice(0, 400) });
    throw new Error("The analysis service had a problem. Please try again.");
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) throw new Error("The analysis came back empty.");
  return content;
}

/** Models sometimes wrap JSON in prose or fences, so pull the first array/object out. */
function parseJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.search(/[[{]/);
  const end = Math.max(candidate.lastIndexOf("]"), candidate.lastIndexOf("}"));
  const slice = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  return JSON.parse(slice) as T;
}

export async function predictTopicsFromText(input: {
  text: string;
  courseCode: string;
  courseName: string;
  level?: string | null;
  department?: string | null;
}): Promise<PredictedTopic[]> {
  const raw = await chat(
    "You are an exam analyst for Nigerian university courses. You reply with JSON only, no commentary.",
    [
      `Course: ${input.courseCode} ${input.courseName}`,
      input.level ? `Student level: ${input.level}` : "",
      input.department ? `Department: ${input.department}` : "",
      "",
      "From the course material below, list the 8 to 12 topics most likely to appear in the next exam.",
      'Reply with a JSON array only: [{"topic": "short specific topic", "confidence": 0.0-1.0}]',
      "Order by confidence, highest first. Topics must be specific to this material, never generic.",
      "",
      "MATERIAL:",
      trimContent(input.text),
    ]
      .filter(Boolean)
      .join("\n"),
  );

  const parsed = parseJson<unknown>(raw);
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { topics?: unknown }).topics)
      ? ((parsed as { topics: unknown[] }).topics)
      : [];

  const topics: PredictedTopic[] = [];
  for (const item of list) {
    const o = item as { topic?: unknown; confidence?: unknown };
    const topic = typeof o.topic === "string" ? o.topic.trim() : "";
    const confidence = Number(o.confidence);
    if (!topic) continue;
    topics.push({
      topic,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.6,
    });
  }
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
}): Promise<GeneratedQuestion[]> {
  const count = Math.max(5, Math.min(40, Math.round(input.questionCount)));
  const raw = await chat(
    "You are an exam question writer for Nigerian university courses. You reply with JSON only, no commentary.",
    [
      `Course: ${input.courseCode} ${input.courseName}`,
      input.level ? `Student level: ${input.level}` : "",
      input.department ? `Department: ${input.department}` : "",
      `Difficulty: ${input.difficulty}`,
      input.topicFocus.length ? `Focus on these topics: ${input.topicFocus.join(", ")}` : "",
      "",
      `Write exactly ${count} multiple-choice questions grounded in the material below.`,
      'Reply with a JSON array only: [{"topic": "...", "question": "...", "options": ["a","b","c","d"], "correct_index": 0, "explanation": "..."}]',
      "Every question needs exactly 4 options, one correct answer, and a one sentence explanation.",
      "correct_index is the 0-based index of the correct option and must be accurate.",
      "",
      "MATERIAL:",
      trimContent(input.text),
    ]
      .filter(Boolean)
      .join("\n"),
  );

  const parsed = parseJson<unknown>(raw);
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { questions?: unknown }).questions)
      ? ((parsed as { questions: unknown[] }).questions)
      : [];

  const questions: GeneratedQuestion[] = [];
  for (const item of list) {
    const o = item as Record<string, unknown>;
    const question = typeof o["question"] === "string" ? o["question"].trim() : "";
    const options = Array.isArray(o["options"])
      ? (o["options"] as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    const correct = Number(o["correct_index"]);
    if (!question || options.length < 2) continue;
    if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) continue;
    questions.push({
      id: questions.length + 1,
      topic: typeof o["topic"] === "string" && o["topic"].trim() ? (o["topic"] as string) : "General",
      question,
      options,
      correct_index: correct,
      explanation: typeof o["explanation"] === "string" ? (o["explanation"] as string) : "",
    });
  }
  if (questions.length === 0) throw new Error("No questions came back from the generator.");
  return questions;
}
