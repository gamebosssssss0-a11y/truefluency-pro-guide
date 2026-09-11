/**
 * TrueFluency backend client.
 *
 * All AI calls go through the FastAPI backend on Render.
 *
 * Backend routes used:
 *   POST /extract-text
 *   POST /predict-topics
 *   POST /generate-mock/start
 *   GET  /generate-mock/status/{job_id}
 *   POST /generate-mock/cancel/{job_id}
 *   POST /submit-results
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  AIQuestion,
  Difficulty,
  Profile,
} from "@/lib/profile-store";


// ── CONFIGURATION ─────────────────────────────────────────────────────────────

const BACKEND_URL = (
  import.meta.env. VITE_BACKEND_URL as string | undefined
)?.trim();

export const NOT_CONFIGURED_MESSAGE =
  "Prediction service isn't configured yet";

export function isBackendConfigured(): boolean {
  return Boolean(BACKEND_URL);
}

function base(): string {
  if (! BACKEND_URL) {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }

  if (!/^https?:\/\//i.test(BACKEND_URL)) {
    throw new Error(
      "VITE_BACKEND_URL must be a complete HTTP or HTTPS backend URL.",
    );
  }

  return BACKEND_URL.replace(/\/+\$/, "");
}


// ── TYPES ─────────────────────────────────────────────────────────────────────

export type PredictedTopic = {
  topic: string;
  confidence: number;
  basis?: "past_pattern" | "student_performance" | "material_only";
};

export type ExtractTextResponse = {
  material_id: string;
  status: "success" | "scanned_pdf" | string;
  chars: number;
  preview?: string;
  message?: string;
};

type StartJobResponse = {
  job_id?: unknown;
  existing_job_id?: unknown;
  status?: unknown;
  detail?: unknown;
};

type MockStatusResponse = {
  status: string;
  result?: {
    questions?: unknown;
  } | null;
  error?: string;
  ready?: number | null;
  total?: number | null;
  questions?: unknown[];
};

type ProgressUpdate = {
  ready: number | null;
  total: number | null;
  questions?: AIQuestion[];
};


// ── ERROR HANDLING ────────────────────────────────────────────────────────────

class BackendRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "BackendRequestError";
  }
}

function readErrorDetail(
  text: string,
  status: number,
): string {
  try {
    const parsed = JSON.parse(text) as {
      detail?: unknown;
      message?: unknown;
    };

    const detail = parsed?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown };

      if (
        typeof first?.msg === "string"
        && first.msg.trim()
      ) {
        return first.msg.trim();
      }
    }

    if (
      typeof parsed?.message === "string"
      && parsed.message.trim()
    ) {
      return parsed.message.trim();
    }
  } catch {
    // Response was not JSON.
  }

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 402) {
    return "You've hit your free limit for today.";
  }

  if (status === 403) {
    return "You are not authorised to use this service.";
  }

  if (status === 404) {
    return "The requested backend route or upload was not found.";
  }

  if (status === 422) {
    return "The uploaded material is not ready for analysis yet.";
  }

  if (status === 429) {
    return "The analysis service is busy. Please try again shortly.";
  }

  if (status === 503) {
    return "The analysis service isn't fully configured yet.";
  }

  if (status >= 500) {
    return "The analysis service had a server problem. Please try again.";
  }

  return `The analysis service rejected the request (\${status}).`;
}


// ── AUTHENTICATION ────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const {
    data: sessionData,
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(
      "Could not read your sign-in session. Please sign in again.",
    );
  }

  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error(
      "Sign in to use the analysis service.",
    );
  }

  return accessToken;
}


// ── HTTP HELPERS ──────────────────────────────────────────────────────────────

type HttpMethod = "GET" | "POST";

async function requestJson<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  timeoutMs = 30_000,
  acceptedStatuses: number[] = [],
): Promise<{
  data: T;
  status: number;
}> {
  const url = `\${base()}\${path}`;
  const controller = new AbortController();

  const timer = window.setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    const accessToken = await getAccessToken();

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer \${accessToken}`,
    };

    const requestInit: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(
      url,
      requestInit,
    );

    const rawText = await response
      .text()
      .catch(() => "");

    if (
      !response.ok
      && !acceptedStatuses.includes(response.status)
    ) {
      console.error(
        "[backend] request failed",
        {
          method,
          path,
          status: response.status,
          response: rawText,
        },
      );

      const retryable =
        response.status === 408
        || response.status === 425
        || response.status === 429
        || response.status >= 500;

      throw new BackendRequestError(
        readErrorDetail(
          rawText,
          response.status,
        ),
        response.status,
        retryable,
      );
    }

    let parsed: unknown = null;

    if (rawText.trim()) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        if (response.ok) {
          throw new BackendRequestError(
            "The backend returned an invalid response.",
            response.status,
            false,
          );
        }

        parsed = null;
      }
    }

    return {
      data: parsed as T,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof BackendRequestError) {
      throw error;
    }

    if (
      error instanceof Error
      && error.name === "AbortError"
    ) {
      throw new BackendRequestError(
        `The backend request timed out: \${path}`,
        0,
        true,
      );
    }

    if (error instanceof TypeError) {
      console.error(
        "[backend] network or CORS error",
        {
          method,
          path,
          error,
        },
      );

      throw new BackendRequestError(
        "Couldn't reach the analysis service. Check your connection and backend URL.",
        0,
        true,
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function postJson<T>(
  path: string,
  body?: unknown,
  timeoutMs = 30_000,
): Promise<T> {
  const response = await requestJson<T>(
    "POST",
    path,
    body,
    timeoutMs,
  );

  return response.data;
}

async function getJson<T>(
  path: string,
  timeoutMs = 15_000,
): Promise<T> {
  const response = await requestJson<T>(
    "GET",
    path,
    undefined,
    timeoutMs,
  );

  return response.data;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}


// ── FILE EXTRACTION ───────────────────────────────────────────────────────────

/**
 * Call this after the file has been uploaded to Supabase Storage and the
 * course_materials row has been created.
 *
 * This must finish successfully before predictTopics or generateMock can
 * retrieve the material from the backend.
 */
export async function extractText(input: {
  materialId: string;
  filePath: string;
  fileType: "pdf" | "docx" | "pptx" | "txt";
}): Promise<ExtractTextResponse> {
  const result = await postJson<ExtractTextResponse>(
    "/extract-text",
    {
      material_id: input.materialId,
      file_path: input.filePath,
      file_type: input.fileType,
    },
    60_000,
  );

  if (
    result.status === "scanned_pdf"
  ) {
    throw new Error(
      result.message
      || "This file appears to be scanned and has no readable text.",
    );
  }

  if (result.status !== "success") {
    throw new Error(
      result.message
      || "The backend could not extract text from this file.",
    );
  }

  return result;
}


// ── TOPIC PREDICTION ──────────────────────────────────────────────────────────

export async function predictTopics(input: {
  materialId: string;
  courseCode: string;
  courseName: string;
  level?: string | number | null;
  department?: string | null;
}): Promise<PredictedTopic[]> {
  if (!isBackendConfigured()) {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }

  const data = await postJson<{
    topics?: unknown;
  }>(
    "/predict-topics",
    {
      material_id: input.materialId,
      course_code: input.courseCode,
      course_name: input.courseName,
      user_level:
        input.level !== null
        && input.level !== undefined
          ? String(input.level)
          : null,
      user_department: input.department ?? null,
    },
    120_000,
  );

  const rawTopics = Array.isArray(data?.topics)
    ? data.topics
    : [];

  if (rawTopics.length === 0) {
    throw new Error(
      "The backend returned no predicted topics.",
    );
  }

  const topics: PredictedTopic[] = rawTopics
    .map((value): PredictedTopic | null => {
      if (
        !value
        || typeof value !== "object"
      ) {
        return null;
      }

      const topicObject = value as {
        topic?: unknown;
        confidence?: unknown;
        basis?: unknown;
      };

      const topic =
        typeof topicObject.topic === "string"
          ? topicObject.topic.trim()
          : "";

      const confidence =
        typeof topicObject.confidence === "number"
          ? topicObject.confidence
          : typeof topicObject.confidence === "string"
            ? Number(topicObject.confidence)
            : Number. NaN;

      if (
        !topic
        || ! Number.isFinite(confidence)
      ) {
        return null;
      }

      const basis =
        topicObject.basis === "past_pattern"
        || topicObject.basis === "student_performance"
        || topicObject.basis === "material_only"
          ? topicObject.basis
          : undefined;

      return {
        topic,
        confidence: Math.max(
          0,
          Math.min(1, confidence),
        ),
        ...(basis ? { basis } : {}),
      };
    })
    .filter(
      (topic): topic is PredictedTopic => topic !== null,
    );

  if (topics.length === 0) {
    throw new Error(
      "The backend returned invalid topic data.",
    );
  }

  return topics;
}


// ── MOCK JOB START ────────────────────────────────────────────────────────────

async function startOrResumeMockJob(
  body: unknown,
): Promise<{
  job_id: string;
  resumed: boolean;
}> {
  const response = await requestJson<StartJobResponse>(
    "POST",
    "/generate-mock/start",
    body,
    20_000,
    [409],
  );

  const data = response.data;

  const detailObject =
    data?.detail
    && typeof data.detail === "object"
      ? data.detail as {
          existing_job_id?: unknown;
        }
      : null;

  const existingJobId =
    typeof data?.existing_job_id === "string"
      ? data.existing_job_id
      : typeof detailObject?.existing_job_id === "string"
        ? detailObject.existing_job_id
        : null;

  if (existingJobId) {
    return {
      job_id: existingJobId,
      resumed: true,
    };
  }

  if (response.status === 409) {
    throw new BackendRequestError(
      "The backend reported an existing job but did not return its job ID.",
      409,
      false,
    );
  }

  if (typeof data?.job_id !== "string") {
    throw new BackendRequestError(
      "The backend did not return a mock-generation job ID.",
      response.status,
      false,
    );
  }

  return {
    job_id: data.job_id,
    resumed: false,
  };
}


// ── MOCK JOB CANCELLATION ─────────────────────────────────────────────────────

export async function cancelMockJob(
  jobId: string,
): Promise<void> {
  await postJson(
    `/generate-mock/cancel/\${encodeURIComponent(jobId)}`,
    undefined,
    15_000,
  );
}


// ── QUESTION NORMALISATION ────────────────────────────────────────────────────

function normaliseQuestions(
  raw: unknown,
): AIQuestion[] {
  if (! Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((value, index): AIQuestion | null => {
      if (
        !value
        || typeof value !== "object"
      ) {
        return null;
      }

      const questionObject =
        value as Record<string, unknown>;

      const question =
        typeof questionObject.question === "string"
          ? questionObject.question.trim()
          : "";

      const rawOptions = questionObject.options;

      if (
        ! Array.isArray(rawOptions)
        || rawOptions.length !== 4
        || !rawOptions.every(
          (option) =>
            typeof option === "string"
            && option.trim().length > 0,
        )
      ) {
        return null;
      }

      const correctIndex =
        questionObject.correct_index;

      if (
        typeof correctIndex !== "number"
        || ! Number.isInteger(correctIndex)
        || correctIndex < 0
        || correctIndex >= rawOptions.length
      ) {
        return null;
      }

      if (!question) {
        return null;
      }

      const id =
        typeof questionObject.id === "number"
        && Number.isInteger(questionObject.id)
          ? questionObject.id
          : index + 1;

      const topic =
        typeof questionObject.topic === "string"
        && questionObject.topic.trim()
          ? questionObject.topic.trim()
          : "General";

      const explanation =
        typeof questionObject.explanation === "string"
          ? questionObject.explanation
          : "";

      return {
        id,
        topic,
        question,
        options: rawOptions as string[],
        correct_index: correctIndex,
        explanation,
      } satisfies AIQuestion;
    })
    .filter(
      (question): question is AIQuestion =>
        question !== null,
    )
    .map((question, index) => ({
      ...question,
      id: index + 1,
    }));
}


// ── MOCK GENERATION ───────────────────────────────────────────────────────────

export async function generateMock(
  input: {
    materialId: string;
    courseCode: string;
    courseName: string;
    questionCount: number;
    difficulty: Difficulty;
    topicFocus: string[];
    profile: Pick<
      Profile,
      "goal"
      | "timeline"
      | "level"
      | "department"
    >;
  },
  options?: {
    onProgress?: (
      progress: ProgressUpdate,
    ) => void;
    maxWaitMs?: number;
  },
): Promise<AIQuestion[]> {
  if (!isBackendConfigured()) {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }

  const body = {
    material_id: input.materialId,
    course_code: input.courseCode,
    course_name: input.courseName,
    question_count: input.questionCount,
    difficulty: input.difficulty,
    topic_focus: input.topicFocus,
    user_goal: input.profile.goal,
    user_timeline: input.profile.timeline,
    user_level:
      input.profile.level !== null
      && input.profile.level !== undefined
        ? String(input.profile.level)
        : null,
    user_department: input.profile.department ?? null,
  };

  const started = await startOrResumeMockJob(body);

  console.info(
    "[backend] mock generation started",
    {
      jobId: started.job_id,
      resumed: started.resumed,
    },
  );

  const maxWaitMs =
    options?.maxWaitMs
    ?? 5 * 60_000;

  const pollIntervalMs = 3_000;
  const deadline = Date.now() + maxWaitMs;

  let completedResult:
    MockStatusResponse | null = null;

  while (Date.now() < deadline) {
    let poll: MockStatusResponse;

    try {
      poll = await getJson<MockStatusResponse>(
        `/generate-mock/status/\${encodeURIComponent(started.job_id)}`,
        15_000,
      );
    } catch (error) {
      if (error instanceof BackendRequestError) {
        /*
         * A missing job means the Render process restarted and its in-memory
         * job dictionary was lost. Continuing to poll for five minutes would
         * only hide the real error.
         */
        if (error.status === 404) {
          throw new Error(
            "The mock-generation job no longer exists. The backend may have restarted. Please start the mock again.",
          );
        }

        /*
         * Authentication, quota, validation, and permission errors are not
         * fixed by retrying. Surface them immediately.
         */
        if (!error.retryable) {
          throw error;
        }

        /*
         * Network errors, timeouts, 429, and 5xx errors are transient.
         * Retry the next poll.
         */
        await sleep(
          Math.min(
            pollIntervalMs,
            Math.max(0, deadline - Date.now()),
          ),
        );

        continue;
      }

      throw error;
    }

    if (poll.status === "completed") {
      completedResult = poll;
      break;
    }

    if (poll.status === "failed") {
      throw new Error(
        poll.error || "Mock generation failed.",
      );
    }

    if (poll.status !== "processing") {
      throw new Error(
        `The backend returned an unknown job status: \${poll.status}`,
      );
    }

    const partialQuestions =
      normaliseQuestions(poll.questions);

    options?.onProgress?.({
      ready:
        typeof poll.ready === "number"
          ? poll.ready
          : null,
      total:
        typeof poll.total === "number"
          ? poll.total
          : null,
      questions: partialQuestions,
    });

    const remainingMs =
      deadline - Date.now();

    if (remainingMs <= 0) {
      break;
    }

    await sleep(
      Math.min(
        pollIntervalMs,
        remainingMs,
      ),
    );
  }

  if (
    !completedResult
    || completedResult.status !== "completed"
  ) {
    throw new Error(
      "This is taking longer than expected. The mock may still be running in the background. Please try checking again shortly.",
    );
  }

  const rawQuestions =
    completedResult.result?.questions;

  const questions =
    normaliseQuestions(rawQuestions);

  if (questions.length === 0) {
    throw new Error(
      "The backend completed the job but returned no valid questions.",
    );
  }

  return questions;
}


// ── RESULT SUBMISSION ─────────────────────────────────────────────────────────

export async function submitResults(input: {
  courseCode: string;
  results: Array<{
    topic: string;
    item_type?: string;
    difficulty?: string;
    was_correct: boolean;
  }>;
}): Promise<void> {
  if (!isBackendConfigured()) {
    return;
  }

  try {
    await postJson(
      "/submit-results",
      {
        course_code: input.courseCode,
        results: input.results,
      },
      15_000,
    );
  } catch (error) {
    console.warn(
      "[backend] result submission failed",
      error,
    );

    // This must never block the results screen.
  }
}
