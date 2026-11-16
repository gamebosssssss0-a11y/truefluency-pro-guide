import { createClient } from "@supabase/supabase-js";

type Question = { id: number; topic: string; question: string; options: string[]; correct_index: number; explanation: string };
type MockSettings = { mode?: "tutor" | "exam"; questionCount: number; minutes: number; difficulty: string; topicFocus: string[] };
type MockSnapshot = { kind: "mock"; courseCode: string; courseTitle: string; questions: Question[]; settings?: MockSettings };
type ShareVisibility = "private" | "public";
type ShareRow = { token: string; owner_id: string; visibility: ShareVisibility; expires_at: string; revoked_at: string | null; snapshot: unknown };

function admin() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Sharing is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== "object") return false;
  const q = value as Partial<Question>;
  return typeof q.question === "string" && Array.isArray(q.options) &&
    q.options.every((option) => typeof option === "string") &&
    Number.isInteger(q.correct_index) && typeof q.explanation === "string";
}
function cleanSnapshot(value: unknown): MockSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Partial<MockSnapshot>;
  if (snapshot.kind !== "mock" || typeof snapshot.courseCode !== "string" ||
      typeof snapshot.courseTitle !== "string" || !Array.isArray(snapshot.questions) ||
      snapshot.questions.length < 1 || snapshot.questions.length > 60 ||
      !snapshot.questions.every(isQuestion)) return null;
  return snapshot as MockSnapshot;
}
function cleanSettings(value: unknown): MockSettings | undefined {
  if (!value || typeof value !== "object") return undefined;
  const settings = value as Partial<MockSettings>;
  const questionCount = Number(settings.questionCount);
  const minutes = Number(settings.minutes);
  if (!Number.isFinite(questionCount) || !Number.isFinite(minutes)) return undefined;
  return {
    ...(settings.mode === "tutor" || settings.mode === "exam" ? { mode: settings.mode } : {}),
    questionCount: Math.max(1, Math.min(60, Math.round(questionCount))),
    minutes: Math.max(1, Math.min(180, Math.round(minutes))),
    difficulty: typeof settings.difficulty === "string" ? settings.difficulty.slice(0, 32) : "balanced",
    topicFocus: Array.isArray(settings.topicFocus) ? settings.topicFocus.filter((topic): topic is string => typeof topic === "string").slice(0, 60) : [],
  };
}
function shareStatus(row: Pick<ShareRow, "expires_at" | "revoked_at">) {
  if (row.revoked_at) return "revoked" as const;
  if (Date.parse(row.expires_at) <= Date.now()) return "expired" as const;
  return "active" as const;
}
async function findOwnedShare(ownerId: string, attemptId: string) {
  const db = admin();
  const { data, error } = await db.from("mock_shares")
    .select("token, visibility, expires_at, revoked_at, snapshot")
    .eq("owner_id", ownerId).eq("attempt_id", attemptId).maybeSingle();
  if (error) throw error;
  return data as ShareRow | null;
}

export async function createOwnedMockShare(ownerId: string, attemptId: string, visibility: ShareVisibility) {
  const db = admin();
  const existing = await findOwnedShare(ownerId, attemptId);
  if (existing) {
    return { token: existing.token, visibility: existing.visibility, expiresAt: existing.expires_at, status: shareStatus(existing) };
  }

  const { data: attempt, error } = await db.from("mock_attempts")
    .select("id, user_id, course_code, course_title, questions, settings")
    .eq("id", attemptId).eq("user_id", ownerId).maybeSingle();
  if (error || !attempt) throw new Error("This completed mock could not be found in your account.");
  const questions = Array.isArray(attempt.questions) ? attempt.questions.filter(isQuestion) : [];
  if (!questions.length) throw new Error("This mock has no saved questions to share.");
  const snapshot: MockSnapshot = {
    kind: "mock",
    courseCode: attempt.course_code ?? "Course",
    courseTitle: attempt.course_title ?? attempt.course_code ?? "Practice mock",
    questions,
    settings: cleanSettings(attempt.settings),
  };

  const { data, error: insertError } = await db.from("mock_shares").insert({
    owner_id: ownerId,
    attempt_id: attemptId,
    token: newToken(),
    visibility,
    snapshot: snapshot as never,
  }).select("token, visibility, expires_at, revoked_at").single();

  if (insertError?.code === "23505") {
    const raced = await findOwnedShare(ownerId, attemptId);
    if (raced) return { token: raced.token, visibility: raced.visibility, expiresAt: raced.expires_at, status: shareStatus(raced) };
  }
  if (insertError || !data) throw insertError ?? new Error("Couldn't create this share link.");
  return { token: data.token, visibility: data.visibility as ShareVisibility, expiresAt: data.expires_at, status: shareStatus(data) };
}

export async function getOwnedMockShareStatus(ownerId: string, attemptId: string) {
  const row = await findOwnedShare(ownerId, attemptId);
  if (!row) return { exists: false as const };
  return { exists: true as const, token: row.token, visibility: row.visibility, expiresAt: row.expires_at, status: shareStatus(row) };
}

export async function revokeOwnedMockShare(ownerId: string, attemptId: string) {
  const db = admin();
  const row = await findOwnedShare(ownerId, attemptId);
  if (!row) return { exists: false as const };
  if (!row.revoked_at) {
    const { error } = await db.from("mock_shares").update({ revoked_at: new Date().toISOString() })
      .eq("owner_id", ownerId).eq("attempt_id", attemptId).is("revoked_at", null);
    if (error) throw error;
  }
  return { exists: true as const, token: row.token, visibility: row.visibility, expiresAt: row.expires_at, status: "revoked" as const };
}

export async function readMockShare(token: string, includeAnswers: boolean, requestingUserId?: string) {
  const db = admin();
  const { data, error } = await db.from("mock_shares")
    .select("snapshot, owner_id, visibility, expires_at, revoked_at")
    .eq("token", token).maybeSingle();
  if (error || !data || data.revoked_at || Date.parse(data.expires_at) <= Date.now()) return null;
  if (data.visibility === "private" && data.owner_id !== requestingUserId) return null;
  if (includeAnswers && data.owner_id !== requestingUserId) return null;
  const snapshot = cleanSnapshot(data.snapshot);
  if (!snapshot) return null;
  return {
    courseCode: snapshot.courseCode,
    courseTitle: snapshot.courseTitle,
    questionCount: snapshot.questions.length,
    settings: snapshot.settings ?? null,
    questions: snapshot.questions.slice(0, includeAnswers ? undefined : 3).map((question) => includeAnswers
      ? question
      : { id: question.id, topic: question.topic, question: question.question, options: question.options }),
  };
}
