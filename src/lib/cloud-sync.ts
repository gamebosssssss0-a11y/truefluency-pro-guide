/**
 * Cloud sync: the database is the source of truth for a signed-in user's
 * profile, courses, attempts, streaks, AI question sets and topic analysis.
 * localStorage stays as an offline cache so the app renders instantly.
 *
 * Guest (anonymous) sessions are real auth users, so their rows are isolated
 * by the same RLS policies.
 *
 * DATA SAFETY: a failed query must never be read as "the user has nothing".
 * Every read checks `.error` and, when a table errored, that part of the
 * snapshot is simply omitted so the caller keeps its existing local value.
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
 *
 * Tables that fail are left OUT of the returned partial, so merging it over
 * the local profile keeps the local value instead of blanking it.
 */
export async function loadCloudProfile(local?: Partial<Profile> | null): Promise<CloudSnapshot> {
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
    console.error("[cloud-sync] profiles load failed", profileRes.error.message, profileRes.error);
    return null;
  }
  const row = profileRes.data;
  if (!row) return null;

  const snapshot: Partial<Profile> = {
    goal: (row.goal as Goal | null) ?? null,
    timeline: (row.timeline as Timeline | null) ?? null,
    studyPreference: (row.study_preference as StudyPreference | null) ?? null,
    faculty: row.faculty ?? null,
    department: row.department ?? null,
    level: (row.level as Level | null) ?? null,
    setupComplete: !!row.setup_complete,
    disclaimerAccepted: !!row.disclaimer_accepted,
    cgpaIntroSeen: !!row.cgpa_intro_seen,
    // A saved display name is the account-level proof that the welcome screen
    // has already been completed, so it is never asked for twice.
    profileCompleted: !!(row.display_name ?? "").trim(),
    streakDays: row.streak_days ?? 0,
    // Prefer the new last_active_date column; fall back to the legacy
    // last_qualifying_day for existing rows that haven't been migrated yet.
    lastActiveDate: row.last_active_date ?? row.last_qualifying_day ?? null,
    freezesAvailable: row.freezes_available ?? 1,
    freezeUsedOn: row.freeze_used_on ?? null,
    tourSeen: row.tour_seen ?? false,
    hasCompletedFirstMock: !!row.has_completed_first_mock,
    masteredCourses: (row.mastered_courses as unknown as string[]) ?? [],
    cgpaInputs: (row.cgpa_inputs as unknown as CgpaInputs) ?? null,
    cgpaPlan: (row.cgpa_plan as unknown as CgpaPlan) ?? null,
    cgpaActual: (row.cgpa_actual as unknown as CgpaActual) ?? null,
  };

  if (coursesRes.error) {
    console.error("[cloud-sync] user_courses load failed, keeping local courses", coursesRes.error.message);
  } else {
    const courses: UserCourse[] = (coursesRes.data ?? []).map((c) => ({
      code: c.course_code ?? "",
      name: c.title ?? "",
      status: (c.status ?? "Compulsory") as CatalogStatus,
      ...(c.label_override
        ? { labelOverride: c.label_override as "stem" | "humanities" | "neutral" }
        : {}),
      source: c.source === "verified" ? "verified" : "manual",
    }));

    const courseTestSettings: Record<string, CourseTestSettings> = {};
    for (const c of coursesRes.data ?? []) {
      if (c.test_settings && c.course_code)
        courseTestSettings[c.course_code] = c.test_settings as unknown as CourseTestSettings;
    }
    // An empty successful SELECT must never wipe courses this device already
    // has (e.g. a push that failed or hasn't run yet).
    const localCourses = local?.courses ?? [];
    if (!courses.length && localCourses.length) {
      console.warn("[cloud-sync] server returned 0 courses; keeping local courses");
    } else {
      snapshot.courses = courses;
      snapshot.courseTestSettings = courseTestSettings;
    }
  }

  if (attemptsRes.error) {
    console.error("[cloud-sync] mock_attempts load failed, keeping local history", attemptsRes.error.message);
  } else {
    const attempts: MockAttempt[] = (attemptsRes.data ?? []).map((a) => ({
      id: a.id,
      courseCode: a.course_code ?? "",
      courseTitle: a.course_title ?? "",
      score: a.score ?? 0,
      correct: a.correct ?? 0,
      total: a.total ?? 0,
      submittedAt: new Date(a.submitted_at ?? 0).getTime(),
      topics: (a.topics as unknown as MockAttempt["topics"]) ?? [],
      questions: (a.questions as unknown as AIQuestion[]) ?? undefined,
      answers: (a.answers as unknown as (number | null)[]) ?? undefined,
      settings: (a.settings as unknown as CourseTestSettings) ?? undefined,
    }));
    // History is append-only from the student's point of view: union local and
    // server by attempt id, and never let an empty server list erase local rows.
    const localAttempts = local?.attempts ?? [];
    const byId = new Map<string, MockAttempt>();
    for (const a of localAttempts) byId.set(a.id, a);
    for (const a of attempts) byId.set(a.id, a);
    const merged = Array.from(byId.values()).sort((x, y) => y.submittedAt - x.submittedAt);

    if (!attempts.length && localAttempts.length) {
      console.warn("[cloud-sync] server returned 0 attempts; keeping local history");
    }

    snapshot.attempts = merged;
    snapshot.topicScores = merged.flatMap((a) =>
      a.topics.map((t) => ({ course: a.courseCode, topic: t.topic, score: t.score })),
    );
  }

  if (questionsRes.error) {
    console.error("[cloud-sync] ai_question_sets load failed, keeping local sets", questionsRes.error.message);
  } else {
    // Keyed by course code so each course only ever sees its own question set.
    const aiQuestionsByCourse: Record<string, AIQuestion[]> = {};
    for (const qrow of questionsRes.data ?? []) {
      const qs = (qrow.questions as unknown as AIQuestion[]) ?? [];
      if (qrow.course_code && qs.length) aiQuestionsByCourse[qrow.course_code] = qs;
    }
    snapshot.aiQuestionsByCourse = aiQuestionsByCourse;
  }

  if (analysisRes.error) {
    console.error(
      "[cloud-sync] course_topic_analysis load failed, keeping local analysis",
      analysisRes.error.message,
    );
  } else {
    const courseTopicAnalysis: Record<string, CourseTopicAnalysis> = {};
    for (const t of analysisRes.data ?? []) {
      if (!t.course_code) continue;
      courseTopicAnalysis[t.course_code] = {
        materialId: t.material_id ?? "",
        analyzedAt: new Date(t.analyzed_at ?? 0).getTime(),
        topics: (t.topics as unknown as CourseTopicAnalysis["topics"]) ?? [],
      };
    }
    snapshot.courseTopicAnalysis = courseTopicAnalysis;
  }

  return snapshot;
}

/* ---------------- Push ---------------- */

/**
 * Write-through the whole profile for the signed-in user. Idempotent, so it
 * doubles as the "migrate my existing local data" path on first sign-in and as
 * the retry when an earlier write failed offline.
 *
 * Every table is written in its own try: a failure on one table must never
 * stop the others (in particular, a profiles failure must not stop the mock
 * history from being saved).
 */
export async function pushCloudProfile(profile: Profile): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;

  const failed: string[] = [];

  try {
    const { error } = await supabase.from("profiles").upsert(
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
        tour_seen: profile.tourSeen,
        has_completed_first_mock: profile.hasCompletedFirstMock,
        mastered_courses: profile.masteredCourses,
        cgpa_inputs: profile.cgpaInputs as never,
        cgpa_plan: profile.cgpaPlan as never,
        cgpa_actual: profile.cgpaActual as never,
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
  } catch (err) {
    failed.push("profiles");
    console.error("[cloud-sync] profiles push failed", err);
  }

  try {
    if (profile.courses.length) {
      const { error } = await supabase.from("user_courses").upsert(
        profile.courses.map((c) => ({
          user_id: userId,
          course_code: c.code,
          title: c.name ?? "",
          status: c.status,
          label_override: c.labelOverride ?? null,
          units: null,

          source: c.source,
          test_settings: (profile.courseTestSettings[c.code] ?? null) as never,
        })),
        { onConflict: "user_id,course_code" },
      );
      if (error) throw error;
    }

    // Cleanup runs even when the local list is now empty, otherwise removing
    // the last course leaves it in the cloud and it reappears on next load.
    const codes = profile.courses.map((c) => c.code);
    let del = supabase.from("user_courses").delete().eq("user_id", userId);
    if (codes.length) {
      del = del.not("course_code", "in", `(${codes.map((c) => `"${c}"`).join(",")})`);
    }
    const { error: delErr } = await del;
    if (delErr) console.error("[cloud-sync] course cleanup failed", delErr);
  } catch (err) {
    failed.push("user_courses");
    console.error("[cloud-sync] user_courses push failed", err);
  }

  try {
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
  } catch (err) {
    failed.push("mock_attempts");
    console.error("[cloud-sync] mock_attempts push failed", err);
  }

  try {
    // One row per course: a question set generated for GST 111 must never be
    // served during a CHM 102 test.
    const questionRows = Object.entries(profile.aiQuestionsByCourse)
      .filter(([, qs]) => Array.isArray(qs) && qs.length > 0)
      .map(([code, qs]) => ({
        user_id: userId,
        course_code: code,
        questions: qs as never,
        generated_at: new Date().toISOString(),
      }));
    if (questionRows.length) {
      const { error } = await supabase
        .from("ai_question_sets")
        .upsert(questionRows, { onConflict: "user_id,course_code" });
      if (error) throw error;
    }
  } catch (err) {
    failed.push("ai_question_sets");
    console.error("[cloud-sync] ai_question_sets push failed", err);
  }

  try {
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
  } catch (err) {
    failed.push("course_topic_analysis");
    console.error("[cloud-sync] course_topic_analysis push failed", err);
  }

  if (failed.length) {
    console.error("[cloud-sync] push finished with failures on:", failed.join(", "));
    return false;
  }
  return true;
}

/** True when the signed-in user has no cloud profile row yet. */
export async function hasCloudProfile(): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const { data } = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

/* ---------------- Single attempt write ---------------- */

/**
 * Write ONE finished attempt immediately, so History is never empty after a
 * refresh even if the debounced full-profile write hasn't run yet. Throws the
 * real PostgREST message so the caller can surface it.
 */
export async function pushMockAttempt(attempt: MockAttempt): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new Error("You're signed out, so this result wasn't saved.");
  const { error } = await supabase.from("mock_attempts").upsert(
    {
      id: attempt.id,
      user_id: userId,
      course_code: attempt.courseCode,
      course_title: attempt.courseTitle,
      score: attempt.score,
      correct: attempt.correct,
      total: attempt.total,
      submitted_at: new Date(attempt.submittedAt).toISOString(),
      topics: attempt.topics as never,
      questions: (attempt.questions ?? null) as never,
      answers: (attempt.answers ?? null) as never,
      settings: (attempt.settings ?? null) as never,
    },
    { onConflict: "user_id,id" },
  );
  if (error) {
    console.error("[cloud-sync] mock_attempts write failed", error.message, error);
    throw new Error(error.message);
  }
}
