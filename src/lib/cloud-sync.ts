/**
 * Cloud sync: the database is the source of truth for a signed-in user's
 * profile, courses, attempts, streaks, AI question sets and topic analysis.
 * localStorage stays as an offline cache so the app renders instantly.
 *
 * Guest (anonymous) sessions are real auth users, so their rows are isolated
 * by the same RLS policies.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Level, CatalogStatus } from "@/lib/uni-data";
import type {
  Profile,
  UserCourse,
  MockAttempt,
  AIQuestion,
  CourseTestSettings,
  CourseTopicAnalysis,
  Goal,
  Timeline,
  StudyPreference,
  CgpaInputs,
  CgpaPlan,
  CgpaActual,
} from "@/lib/profile-store";


export type CloudSnapshot = Partial<Profile> | null;

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ---------------- Load ---------------- */

/**
 * Pull everything for the signed-in user. Returns null when the user has no
 * cloud profile row yet (first sign-in), so the caller can migrate local data.
 */
export async function loadCloudProfile(): Promise<CloudSnapshot> {
  const userId = await currentUserId();
  if (!userId) return null;

  const [profileRes, coursesRes, attemptsRes, questionsRes, analysisRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_courses").select("*").eq("user_id", userId),
    supabase.from("mock_attempts").select("*").eq("user_id", userId).order("submitted_at", { ascending: false }),
    supabase.from("ai_question_sets").select("*").eq("user_id", userId).order("generated_at", { ascending: false }),
    supabase.from("course_topic_analysis").select("*").eq("user_id", userId),
  ]);

  if (profileRes.error) {
    console.error("[cloud-sync] profile load failed", profileRes.error);
    return null;
  }
  const row = profileRes.data;
  if (!row) return null;

  const courses: UserCourse[] = (coursesRes.data ?? []).map((c) => ({
    code: c.course_code,
    name: c.title ?? "",
    status: (c.status ?? "Compulsory") as CatalogStatus,
    ...(c.label_override
      ? { labelOverride: c.label_override as "stem" | "humanities" | "neutral" }
      : {}),
    source: c.source === "verified" ? "verified" : "manual",
  }));


  const courseTestSettings: Record<string, CourseTestSettings> = {};
  for (const c of coursesRes.data ?? []) {
    if (c.test_settings) courseTestSettings[c.course_code] = c.test_settings as unknown as CourseTestSettings;
  }

  const attempts: MockAttempt[] = (attemptsRes.data ?? []).map((a) => ({
    id: a.id,
    courseCode: a.course_code,
    courseTitle: a.course_title ?? "",
    score: a.score ?? 0,
    correct: a.correct ?? 0,
    total: a.total ?? 0,
    submittedAt: new Date(a.submitted_at).getTime(),
    topics: (a.topics as unknown as MockAttempt["topics"]) ?? [],
    questions: (a.questions as unknown as AIQuestion[]) ?? undefined,
    answers: (a.answers as unknown as (number | null)[]) ?? undefined,
    settings: (a.settings as unknown as CourseTestSettings) ?? undefined,
  }));

  const aiQuestions =
    ((questionsRes.data ?? [])[0]?.questions as unknown as AIQuestion[]) ?? [];

  const courseTopicAnalysis: Record<string, CourseTopicAnalysis> = {};
  for (const t of analysisRes.data ?? []) {
    courseTopicAnalysis[t.course_code] = {
      materialId: t.material_id ?? "",
      analyzedAt: new Date(t.analyzed_at).getTime(),
      topics: (t.topics as unknown as CourseTopicAnalysis["topics"]) ?? [],
    };
  }

  const topicScores = attempts.flatMap((a) =>
    a.topics.map((t) => ({ course: a.courseCode, topic: t.topic, score: t.score })),
  );

  return {
    goal: (row.goal as Goal | null) ?? null,
    timeline: (row.timeline as Timeline | null) ?? null,
    studyPreference: (row.study_preference as StudyPreference | null) ?? null,
    faculty: row.faculty ?? null,
    department: row.department ?? null,
    level: (row.level as Level | null) ?? null,
    setupComplete: !!row.setup_complete,
    disclaimerAccepted: !!row.disclaimer_accepted,
    cgpaIntroSeen: !!row.cgpa_intro_seen,
    streakDays: row.streak_days ?? 0,
    lastQualifyingDay: row.last_qualifying_day ?? null,
    hasCompletedFirstMock: !!row.has_completed_first_mock,
    masteredCourses: (row.mastered_courses as unknown as string[]) ?? [],
    cgpaInputs: (row.cgpa_inputs as unknown as CgpaInputs) ?? null,
    cgpaPlan: (row.cgpa_plan as unknown as CgpaPlan) ?? null,
    cgpaActual: (row.cgpa_actual as unknown as CgpaActual) ?? null,
    courses,
    courseTestSettings,
    attempts,
    topicScores,
    aiQuestions,
    courseTopicAnalysis,
  };
}

/* ---------------- Push ---------------- */

/**
 * Write-through the whole profile for the signed-in user. Idempotent, so it
 * doubles as the "migrate my existing local data" path on first sign-in and as
 * the retry when an earlier write failed offline.
 */
export async function pushCloudProfile(profile: Profile): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;

  try {
    const { error: pErr } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        display_name: profile.identity?.name ?? null,
        email: profile.identity?.email ?? null,
        goal: profile.goal,
        timeline: profile.timeline,
        study_preference: profile.studyPreference,
        faculty: profile.faculty,
        department: profile.department,
        level: profile.level as number | null,
        setup_complete: profile.setupComplete,
        disclaimer_accepted: profile.disclaimerAccepted,
        cgpa_intro_seen: profile.cgpaIntroSeen,
        streak_days: profile.streakDays,
        last_qualifying_day: profile.lastQualifyingDay,
        has_completed_first_mock: profile.hasCompletedFirstMock,
        mastered_courses: profile.masteredCourses,
        cgpa_inputs: profile.cgpaInputs as never,
        cgpa_plan: profile.cgpaPlan as never,
        cgpa_actual: profile.cgpaActual as never,
      },
      { onConflict: "user_id" },
    );
    if (pErr) throw pErr;

    if (profile.courses.length) {
      const { error } = await supabase.from("user_courses").upsert(
        profile.courses.map((c) => ({
          user_id: userId,
          course_code: c.code,
          title: c.title ?? "",
          units: (c as { units?: number }).units ?? null,
          source: c.source,
          test_settings: (profile.courseTestSettings[c.code] ?? null) as never,
        })),
        { onConflict: "user_id,course_code" },
      );
      if (error) throw error;

      // Drop courses the user removed locally.
      const codes = profile.courses.map((c) => c.code);
      const { error: delErr } = await supabase
        .from("user_courses")
        .delete()
        .eq("user_id", userId)
        .not("course_code", "in", `(${codes.map((c) => `"${c}"`).join(",")})`);
      if (delErr) console.error("[cloud-sync] course cleanup failed", delErr);
    }

    if (profile.attempts.length) {
      const { error } = await supabase.from("mock_attempts").upsert(
        profile.attempts.map((a) => ({
          id: a.id,
          user_id: userId,
          course_code: a.courseCode,
          course_title: a.courseTitle,
          score: a.score,
          correct: a.correct,
          total: a.total,
          submitted_at: new Date(a.submittedAt).toISOString(),
          topics: a.topics as never,
          questions: (a.questions ?? null) as never,
          answers: (a.answers ?? null) as never,
          settings: (a.settings ?? null) as never,
        })),
        { onConflict: "user_id,id" },
      );
      if (error) throw error;
    }

    if (profile.aiQuestions.length) {
      const code = profile.attempts[0]?.courseCode ?? "current";
      const { error } = await supabase.from("ai_question_sets").upsert(
        {
          user_id: userId,
          course_code: code,
          questions: profile.aiQuestions as never,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,course_code" },
      );
      if (error) throw error;
    }

    const analysisRows = Object.entries(profile.courseTopicAnalysis).map(([code, a]) => ({
      user_id: userId,
      course_code: code,
      material_id: a.materialId,
      topics: a.topics as never,
      analyzed_at: new Date(a.analyzedAt).toISOString(),
    }));
    if (analysisRows.length) {
      const { error } = await supabase
        .from("course_topic_analysis")
        .upsert(analysisRows, { onConflict: "user_id,course_code" });
      if (error) throw error;
    }

    return true;
  } catch (err) {
    console.error("[cloud-sync] push failed, keeping local cache", err);
    return false;
  }
}

/** True when the signed-in user has no cloud profile row yet. */
export async function hasCloudProfile(): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const { data } = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}
