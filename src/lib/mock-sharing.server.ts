import { createClient } from "@supabase/supabase-js";

type Question = { id: number; topic: string; question: string; options: string[]; correct_index: number; explanation: string };
type MockSnapshot = { kind: "mock"; courseCode: string; courseTitle: string; questions: Question[]; settings?: unknown };

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

export async function createOwnedMockShare(ownerId: string, attemptId: string) {
  const db = admin();
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
    settings: attempt.settings ?? undefined,
  };
  const conversationId = `mock:${attemptId}`;
  const { data: existing, error: findError } = await db.from("chat_shares")
    .select("id, token, is_revoked").eq("owner_id", ownerId).eq("conversation_id", conversationId).maybeSingle();
  if (findError) throw findError;
  const result = existing
    ? await db.from("chat_shares").update({
        snapshot: snapshot as never, visibility: "public", is_revoked: false,
        token: existing.is_revoked ? newToken() : existing.token, updated_at: new Date().toISOString(),
      }).eq("id", existing.id).select("token").single()
    : await db.from("chat_shares").insert({
        owner_id: ownerId, conversation_id: conversationId, token: newToken(),
        visibility: "public", snapshot: snapshot as never, is_revoked: false,
      }).select("token").single();
  if (result.error) throw result.error;
  return { token: result.data.token };
}

export async function readMockShare(token: string, includeAnswers: boolean) {
  const db = admin();
  const { data, error } = await db.from("chat_shares").select("snapshot, visibility, is_revoked")
    .eq("token", token).eq("visibility", "public").eq("is_revoked", false).maybeSingle();
  if (error || !data) return null;
  const snapshot = cleanSnapshot(data.snapshot);
  if (!snapshot) return null;
  return {
    courseCode: snapshot.courseCode,
    courseTitle: snapshot.courseTitle,
    questionCount: snapshot.questions.length,
    questions: snapshot.questions.slice(0, includeAnswers ? undefined : 3).map((question) => includeAnswers
      ? question
      : { id: question.id, topic: question.topic, question: question.question, options: question.options }),
  };
}
