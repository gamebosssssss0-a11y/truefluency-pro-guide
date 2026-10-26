import { useEffect, useMemo, useState } from "react";
import { canonicalCourseCode } from "@/lib/course-code";
import { useProfile, averageForCourse, type MockAttempt } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/math-text";
import { supabase } from "@/integrations/supabase/client";
import { FREE_MAX_QUESTIONS } from "@/lib/entitlements";
import { HeaderLogo } from "@/components/brand";
import { TopicPill, scoreToStrength, AiGeneratedLabel, CourseDescription } from "@/components/common";
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronRight, History, Search, Sparkles, Zap, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { difficultyLabelOf } from "@/lib/why-blocks";
import { listMaterialsForCourse } from "@/lib/course-materials";
import { SOURCE_CHANGE_EVENT, pickSource, readSourceChoice } from "@/lib/material-pick";
import { useEntitlement } from "@/hooks/use-entitlement";
import { maxSourceFiles } from "@/lib/entitlements";

/* ================= Tab 2: Mock Tests ================= */

// A display-only snapshot lets a revisited tab paint course readiness before
// the background material refresh finishes. Starting a mock still goes
// through the live analysis and entitlement checks below.
let practiceMaterialCache: Record<string, string | null> = {};

export function MockTestsScreen({ active = true }: { active?: boolean } = {}) {
  const { profile, navigate } = useProfile();
  const { access: planAccess } = useEntitlement();
  const sourceLimit = maxSourceFiles(planAccess?.tier);
  const [readyMaterialIds, setReadyMaterialIds] = useState<Record<string, string | null>>(() => ({ ...practiceMaterialCache }));
  const [materialsLoading, setMaterialsLoading] = useState(() =>
    profile.courses.some((course) => !Object.hasOwn(practiceMaterialCache, course.code)),
  );
  const [courseSearch, setCourseSearch] = useState("");
  const filteredCourses = useMemo(() => {
    const query = courseSearch.trim().toLocaleLowerCase();
    if (!query) return profile.courses;
    return profile.courses.filter((course) =>
      course.code.toLocaleLowerCase().includes(query) ||
      course.name.toLocaleLowerCase().includes(query) ||
      canonicalCourseCode(course.code).toLocaleLowerCase().includes(query),
    );
  }, [courseSearch, profile.courses]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const loadMaterials = async () => {
      setMaterialsLoading(profile.courses.some((course) => !Object.hasOwn(practiceMaterialCache, course.code)));
      const results = await Promise.allSettled(profile.courses.map(async (course) => {
          const materials = await listMaterialsForCourse(course.code);
          return [course.code, pickSource(materials, readSourceChoice(course.code), sourceLimit)?.id ?? null] as const;
      }));
      const next = { ...practiceMaterialCache };
      for (const result of results) {
        if (result.status === "fulfilled") next[result.value[0]] = result.value[1];
        else console.error("[practice] course materials load failed", result.reason);
      }
      practiceMaterialCache = next;
      if (!cancelled) {
        setReadyMaterialIds({ ...next });
        setMaterialsLoading(profile.courses.some((course) => !Object.hasOwn(next, course.code)));
      }
    };
    void loadMaterials();
    window.addEventListener("course-materials-refresh", loadMaterials);
    window.addEventListener(SOURCE_CHANGE_EVENT, loadMaterials);
    return () => {
      cancelled = true;
      window.removeEventListener("course-materials-refresh", loadMaterials);
      window.removeEventListener(SOURCE_CHANGE_EVENT, loadMaterials);
    };
  }, [active, profile.courses, sourceLimit]);

  const attempts = [...profile.attempts].sort((a, b) => b.submittedAt - a.submittedAt);
  const recent = attempts.slice(0, 3);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-md px-5 pb-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#F3E6C8]/90 dark:text-[#C4B8A0]">
            Practice
          </span>
        </div>

        <h1 className="font-display text-3xl font-bold text-[#F7F3EA] dark:text-[#F7F3EA]">Practice</h1>
        <p className="mt-1 text-sm text-[#F3E6C8]/80 dark:text-[#C4B8A0]">
          Sit a mock test built from your own uploads. Pick a course, choose how long, then start.
        </p>

        {profile.inProgressTest ? (
          <section aria-label="Practice in progress" className="mt-5 rounded-2xl border border-accent/40 border-l-4 border-l-accent bg-card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-accent">Practice in progress</div>
            <h2 className="mt-1 text-base font-semibold text-foreground">{profile.inProgressTest.courseCode}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Your answers and question position are saved. Continue where you left off.
            </p>
            <Button
              className="mt-3 w-full bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => navigate("mock-run", { courseCode: profile.inProgressTest!.courseCode })}
            >
              Continue practice
            </Button>
          </section>
        ) : null}

        {/* Course selection */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-[#F3E6C8]/90 dark:text-[#C4B8A0]">
          Choose a course
        </h2>
        {profile.courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-5 text-center text-xs text-muted-foreground">
            No courses on your profile yet. Add one from the Account tab.
          </div>
        ) : (
          <>
            <label className="relative mt-3 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Search courses</span>
              <input
                type="search"
                value={courseSearch}
                onChange={(event) => setCourseSearch(event.target.value)}
                placeholder="Search by course code or name"
                className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            {filteredCourses.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-border bg-card/60 p-5 text-center text-sm text-muted-foreground">
                No courses match “{courseSearch.trim()}”.
              </div>
            ) : (
              <div className="mt-3 space-y-2.5">
            {filteredCourses.map((c) => {
              const analysis = profile.courseTopicAnalysis[c.code];
              const readyMaterialId = readyMaterialIds[c.code] ?? null;
              const canCustomize = Boolean(
                readyMaterialId &&
                analysis?.materialId === readyMaterialId &&
                analysis.topics.length > 0,
              );
              const avg = averageForCourse(profile, c.code);
              return (
                <div
                  key={c.code}
                  className="rounded-2xl border border-border border-l-4 border-l-accent bg-card p-4 shadow-sm transition hover:border-accent/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                      <BookOpen className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">{canonicalCourseCode(c.code)}</div>
                      <CourseDescription text={c.name} />
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {analysis?.topics.length ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                            <Sparkles className="h-3 w-3" /> {analysis.topics.length} topics predicted
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            No analysis yet
                          </span>
                        )}
                        {avg !== null ? (
                          <TopicPill label={`Avg ${avg}%`} strength={scoreToStrength(avg)} />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("course-detail", { courseCode: c.code })}
                    >
                      Materials
                    </Button>
                    <Button
                      size="sm"
                      disabled={materialsLoading || Boolean(profile.inProgressTest)}
                      onClick={() => navigate(canCustomize ? "mock-config" : "course-detail", { courseCode: c.code })}
                    >
                      <Zap className="mr-1.5 h-3.5 w-3.5" />
                      {profile.inProgressTest ? "Finish current practice first" : materialsLoading ? "Checking…" : canCustomize ? "Customize" : readyMaterialId ? "Analyze first" : "Upload material"}
                    </Button>
                  </div>
                </div>
              );
            })}
              </div>
            )}
          </>
        )}

        {/* Results + history */}
        <div className="mb-2 mt-8 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent results
          </h2>
          <button
            onClick={() => navigate("test-history")}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent/80"
          >
            <History className="h-3 w-3" /> Full history
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-5 text-center text-xs text-muted-foreground">
            No attempts yet. Your scores and topic breakdowns will build up here.
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((a) => (
              <AttemptRow key={a.id} attempt={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: MockAttempt }) {
  const { navigate } = useProfile();
  return (
    <button
      onClick={() => navigate("attempt-review", { attemptId: attempt.id })}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition hover:border-accent/50"
    >
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-sm font-semibold",
          attempt.score >= 70
            ? "bg-success/15 text-success"
            : attempt.score >= 50
              ? "bg-warning/15 text-warning"
              : "bg-destructive/15 text-destructive",
        )}
      >
        {attempt.score}%
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{attempt.courseCode}</div>
        <div className="truncate text-[11px] text-muted-foreground">
          {attempt.correct}/{attempt.total} correct · {new Date(attempt.submittedAt).toLocaleDateString()}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

/* ================= Test history ================= */

type HistoryTab = "attempts" | "progress";

export function TestHistoryScreen() {
  const { profile, navigate, update, activeCourseCode } = useProfile();
  const [tab, setTab] = useState<HistoryTab>("attempts");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(() => new Set());

  const all = useMemo(
    () => [...profile.attempts].sort((a, b) => b.submittedAt - a.submittedAt),
    [profile.attempts],
  );
  const filtered = courseFilter === "all" ? all : all.filter((a) => a.courseCode === courseFilter);
  const courseCodes = Array.from(new Set(all.map((a) => a.courseCode)));

  return (
    <div className="study-utility-page study-page-blend min-h-screen">
      <div className="mx-auto max-w-md px-5 pb-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <button
            onClick={() => navigate("mock-tests")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Mock Tests
          </button>
        </div>

        <h1 className="font-display text-3xl font-semibold text-foreground">Test history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every attempt you've completed, kept with its questions and your answers.
        </p>

        {/* Tabs */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
          {(["attempts", "progress"] as HistoryTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold capitalize transition",
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {all.length === 0 && tab === "attempts" ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-xs text-muted-foreground">
            You haven't completed a mock test yet.
          </div>
        ) : tab === "attempts" ? (
          <>
            {/* Course filter */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              <FilterChip on={courseFilter === "all"} onClick={() => setCourseFilter("all")}>
                All courses
              </FilterChip>
              {courseCodes.map((code) => (
                <FilterChip key={code} on={courseFilter === code} onClick={() => setCourseFilter(code)}>
                  {code}
                </FilterChip>
              ))}
            </div>

            <div className="mt-4 space-y-2.5">
              {filtered.map((a) => {
                const sortedTopics = [...a.topics].sort((left, right) => left.score - right.score);
                const showAllTopics = expandedTopics.has(a.id);
                return (
                <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "grid h-11 w-14 shrink-0 place-items-center rounded-xl font-display text-sm font-semibold",
                        a.score >= 70
                          ? "bg-good/12 text-good"
                          : a.score >= 50
                            ? "bg-warn/12 text-warn"
                            : "bg-bad/12 text-bad",
                      )}
                    >
                      {a.correct} / {a.total}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">{a.courseCode}</div>
                      <div className="break-words text-[11px] text-muted-foreground">{a.courseTitle}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(a.submittedAt).toLocaleString("en-GB", {
                          timeZone: "Africa/Lagos",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {a.score}%
                      </div>

                      {/* Counts come from the SAVED attempt: a 45-question row
                          must never print the current setting's 60. */}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>
                          {a.total} questions
                          {a.settings?.minutes && a.settings?.questionCount === a.total
                            ? ` · ${a.settings.minutes} min`
                            : ""}
                        </span>
                        <span className="rounded-full bg-sand px-2 py-0.5 font-semibold text-navy">
                          {difficultyLabelOf(a.settings?.difficulty)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {a.topics.length ? (
                    <>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {sortedTopics.slice(0, showAllTopics ? undefined : 3).map((t) => (
                          <TopicPill
                            key={t.topic}
                            label={`${t.topic} ${t.score}%`}
                            strength={scoreToStrength(t.score)}
                          />
                        ))}
                      </div>
                      {a.topics.length > 3 ? (
                        <button
                          type="button"
                          onClick={() => setExpandedTopics((current) => {
                            const next = new Set(current);
                            if (next.has(a.id)) next.delete(a.id);
                            else next.add(a.id);
                            return next;
                          })}
                          className="mt-2 text-xs font-semibold text-foreground underline underline-offset-2"
                        >
                          {showAllTopics ? "Show fewer topics" : "Show all topics"}
                        </button>
                      ) : null}
                    </>
                  ) : null}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("attempt-review", { attemptId: a.id })}
                    >
                      Review
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (a.settings) {
                          update({
                            courseTestSettings: {
                              ...profile.courseTestSettings,
                              [a.courseCode]: a.settings,
                            },
                          });
                        }
                        navigate("mock-gen", { courseCode: a.courseCode });
                      }}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retake
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          </>
        ) : (
          <ProgressPanel profile={profile} activeCourseCode={activeCourseCode} navigate={navigate} update={update} />
        )}
      </div>
    </div>
  );
}

function FilterChip({
  on, onClick, children,
}: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        on
          ? "border-accent bg-accent/15 text-accent"
          : "border-border bg-background text-muted-foreground hover:border-accent/50",
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Course progress ---------- */

type ProgressTopic = { topic: string; score: number | null };
type FlashcardRatingCounts = Record<"again" | "hard" | "good" | "easy", number>;

export function ProgressPanel({
  profile,
  activeCourseCode,
  navigate,
  update,
}: {
  profile: ReturnType<typeof useProfile>["profile"];
  activeCourseCode: string | null;
  navigate: ReturnType<typeof useProfile>["navigate"];
  update: ReturnType<typeof useProfile>["update"];
}) {
  const initialCourseCode = profile.courses.find((entry) =>
    canonicalCourseCode(entry.code) === canonicalCourseCode(activeCourseCode ?? ""),
  )?.code ?? profile.courses[0]?.code ?? "";
  const [selectedCourseCode, setSelectedCourseCode] = useState(initialCourseCode);

  useEffect(() => {
    setSelectedCourseCode((current) =>
      profile.courses.some((entry) =>
        canonicalCourseCode(entry.code) === canonicalCourseCode(current),
      )
        ? current
        : profile.courses.find((entry) =>
            canonicalCourseCode(entry.code) === canonicalCourseCode(activeCourseCode ?? ""),
          )?.code ?? profile.courses[0]?.code ?? "",
    );
  }, [profile.courses, activeCourseCode]);

  const course = profile.courses.find((entry) =>
    canonicalCourseCode(entry.code) === canonicalCourseCode(selectedCourseCode),
  ) ?? null;
  const courseCode = course?.code ?? null;
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [expandedProgressTopics, setExpandedProgressTopics] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setSelectedTopic("all");
    setExpandedProgressTopics(new Set());
  }, [courseCode]);
  const courseTopics = useMemo(() => {
    if (!courseCode) return [] as ProgressTopic[];
    const scores = profile.topicScores.filter(
      (entry) => canonicalCourseCode(entry.course) === canonicalCourseCode(courseCode),
    );
    const scoreByTopic = new Map(scores.map((entry) => [entry.topic.toLocaleLowerCase(), entry.score]));
    const analyzedTopics = profile.courseTopicAnalysis[courseCode]?.topics.map((entry) => entry.topic) ?? [];
    const names = new Set([...analyzedTopics, ...scores.map((entry) => entry.topic)]);
    return [...names]
      .map((topic) => ({
        topic,
        score: scoreByTopic.get(topic.toLocaleLowerCase()) ?? null,
      }))
      .sort((left, right) => (left.score ?? -1) - (right.score ?? -1));
  }, [courseCode, profile.topicScores, profile.courseTopicAnalysis]);

  const courseAttempts = useMemo(
    () => courseCode
      ? profile.attempts
          .filter((attempt) => canonicalCourseCode(attempt.courseCode) === canonicalCourseCode(courseCode))
          .sort((left, right) => left.submittedAt - right.submittedAt)
      : [],
    [courseCode, profile.attempts],
  );
  const [ratingCounts, setRatingCounts] = useState<FlashcardRatingCounts | null>(null);
  const [ratingCountsLoading, setRatingCountsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!courseCode) {
      setRatingCounts(null);
      setRatingCountsLoading(false);
      return () => { active = false; };
    }
    setRatingCounts(null);
    setRatingCountsLoading(true);
    void Promise.resolve(supabase.rpc("flashcard_rating_counts", { p_course_code: courseCode }))
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setRatingCounts(null);
          return;
        }
        const counts: FlashcardRatingCounts = { again: 0, hard: 0, good: 0, easy: 0 };
        for (const row of data ?? []) {
          if (row.rating === "again" || row.rating === "hard" || row.rating === "good" || row.rating === "easy") {
            counts[row.rating] = Number(row.total) || 0;
          }
        }
        setRatingCounts(counts);
      })
      .finally(() => { if (active) setRatingCountsLoading(false); });
    return () => { active = false; };
  }, [courseCode]);

  const selectedTopicEntry = courseTopics.find((entry) => entry.topic === selectedTopic) ?? null;
  const lowestTopic = selectedTopic === "all"
    ? courseTopics.find((entry) => entry.score !== null) ?? null
    : selectedTopicEntry?.score !== null ? selectedTopicEntry : null;
  const visibleTopics = selectedTopic === "all"
    ? courseTopics
    : courseTopics.filter((entry) => entry.topic === selectedTopic);
  const scoredTopics = visibleTopics.filter(
    (entry): entry is ProgressTopic & { score: number } => entry.score !== null,
  );
  const average = scoredTopics.length
    ? Math.round(scoredTopics.reduce((sum, entry) => sum + entry.score, 0) / scoredTopics.length)
    : null;
  const mastered = visibleTopics.filter((entry) => entry.score !== null && entry.score >= 80).length;
  const learning = visibleTopics.filter((entry) => entry.score !== null && entry.score >= 40 && entry.score < 80).length;
  const weak = visibleTopics.length - mastered - learning;
  const pct = (count: number) => visibleTopics.length ? (count / visibleTopics.length) * 100 : 0;
  const donutBackground = `conic-gradient(#47835E 0 ${pct(mastered)}%, #B86E0A ${pct(mastered)}% ${pct(mastered + learning)}%, #C8C5BD ${pct(mastered + learning)}% 100%)`;

  const recentMisses = useMemo(() => {
    const found: Array<{
      id: string;
      number: number;
      topic: string;
      question: string;
      chosen: string;
      correct: string;
      explanation: string;
    }> = [];
    for (const attempt of [...courseAttempts].reverse()) {
      if (!Array.isArray(attempt.questions) || !Array.isArray(attempt.answers)) continue;
      attempt.questions.forEach((question, index) => {
        if (selectedTopic !== "all" && question.topic.toLocaleLowerCase() !== selectedTopic.toLocaleLowerCase()) return;
        const chosenIndex = attempt.answers?.[index] ?? null;
        const correct = question.options?.[question.correct_index];
        if (chosenIndex === question.correct_index || typeof correct !== "string" || typeof question.explanation !== "string") return;
        const chosen = chosenIndex === null ? "Not answered" : question.options?.[chosenIndex];
        if (typeof chosen !== "string" && chosenIndex !== null) return;
        found.push({
          id: attempt.id,
          number: index + 1,
          topic: question.topic,
          question: question.question,
          chosen: chosen ?? "Not answered",
          correct,
          explanation: question.explanation,
        });
      });
      if (found.length >= 3) break;
    }
    return found.slice(0, 3);
  }, [courseAttempts, selectedTopic]);

  // A test the student barely started (fewer than 5 answers) is kept in History but is not a measure of progress.
  const meaningfulAttempts = courseAttempts.filter((attempt) => {
    const answered = attempt.answers ? attempt.answers.filter((a) => a !== null && a !== undefined).length : attempt.total;
    return answered >= Math.min(5, attempt.total);
  });
  const progressAttempts = selectedTopic === "all"
    ? meaningfulAttempts
    : meaningfulAttempts.flatMap((attempt) => {
        const topicScore = attempt.topics.find((entry) => entry.topic.toLocaleLowerCase() === selectedTopic.toLocaleLowerCase());
        return topicScore ? [{ ...attempt, score: topicScore.score }] : [];
      });
  const trendPoints = progressAttempts.slice(-5);
  const chartPoints = trendPoints.map((attempt, index) => {
    const x = trendPoints.length === 1 ? 110 : 18 + (index * 184) / (trendPoints.length - 1);
    const y = 100 - Math.max(0, Math.min(100, attempt.score));
    return { x, y, attempt };
  });
  const polyline = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const latest = progressAttempts[progressAttempts.length - 1] ?? null;
  const earlier = progressAttempts.length > 1 ? progressAttempts[progressAttempts.length - 2] : null;
  const scoreChange = latest && earlier ? latest.score - earlier.score : null;

  const startShortMock = () => {
    if (!course) {
      navigate("mock-tests");
      return;
    }
    const focusTopic = selectedTopic !== "all" ? selectedTopic : lowestTopic?.topic;
    if (focusTopic) {
      const previous = profile.courseTestSettings[course.code];
      update({
        courseTestSettings: {
          ...profile.courseTestSettings,
          [course.code]: {
            questionCount: FREE_MAX_QUESTIONS,
            minutes: previous?.minutes ?? 40,
            difficulty: previous?.difficulty ?? "balanced",
            topicFocus: [focusTopic],
          },
        },
      });
      navigate("mock-gen", { courseCode: course.code });
      return;
    }
    navigate("mock-config", { courseCode: course.code });
  };

  return (
    <div className="mt-4 space-y-5">
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Course progress</p>
        {course ? (
          <>
            <div className="mt-1 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-semibold text-foreground">{course.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{canonicalCourseCode(course.code)}</p>
              </div>
              <span className="rounded-xl border border-border bg-background px-2.5 py-2 text-xs font-semibold text-foreground">
                Practice
              </span>
            </div>
            <div className="mt-4 rounded-xl border border-border bg-background p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">Do this next</p>
              {lowestTopic ? (
                <p className="mt-1 font-display text-base font-semibold text-foreground">
                  Next: <span className="text-accent">{lowestTopic.topic}</span> · {lowestTopic.score}%
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Not enough attempts yet</p>
              )}
              <Button className="mt-3 w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={startShortMock}>
                Start a short mock
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">Pick a course</h2>
            <p className="mt-1 text-sm text-muted-foreground">Not enough attempts yet</p>
            <Button className="mt-3 w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate("mock-tests")}>
              Choose a course
            </Button>
          </>
        )}
      </section>

      <section aria-labelledby="course-standing">
        <div className="mb-2">
          <h2 id="course-standing" className="font-display text-lg font-semibold text-foreground">Course standing</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Progress course
              <select
                aria-label="Choose a course for your progress"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium normal-case tracking-normal text-foreground"
                value={selectedCourseCode}
                onChange={(event) => setSelectedCourseCode(event.target.value)}
                disabled={profile.courses.length === 0}
              >
                {profile.courses.length === 0 ? (
                  <option value="">No courses</option>
                ) : profile.courses.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {canonicalCourseCode(entry.code)} · {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Progress topic
              <select
                aria-label="Choose a topic for your progress"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium normal-case tracking-normal text-foreground"
                value={selectedTopic}
                onChange={(event) => setSelectedTopic(event.target.value)}
                disabled={courseTopics.length === 0}
              >
                <option value="all">All topics</option>
                {courseTopics.map((entry) => <option key={entry.topic} value={entry.topic}>{entry.topic}</option>)}
              </select>
            </label>
          </div>
        </div>
        {courseTopics.length > 0 ? (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3">
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-border bg-card p-3">
              <div
                role="img"
                aria-label={`Topic composition: ${mastered} mastered, ${learning} learning, ${weak} weak or unattempted`}
                className="grid h-24 w-24 place-items-center rounded-full"
                style={{ background: donutBackground }}
              >
                <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-card text-center">
                  {average === null ? (
                    <span className="px-1 text-[10px] leading-tight text-muted-foreground">Not counted yet</span>
                  ) : (
                    <span>
                      <strong className="block font-display text-xl text-foreground">{average}%</strong>
                      <small className="text-[9px] uppercase tracking-wider text-muted-foreground">overall</small>
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-x-2 gap-y-1 text-[9px] text-muted-foreground">
                <span>Mastered · {Math.round(pct(mastered))}%</span>
                <span>Learning · {Math.round(pct(learning))}%</span>
                <span>Weak / unattempted · {Math.round(pct(weak))}%</span>
              </div>
              <p className="mt-1 text-center text-[9px] text-muted-foreground">Topic composition · {courseTopics.length} topics</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-sm font-semibold text-foreground">Mock score trend</h3>
                <span className="text-[9px] text-muted-foreground">last 5</span>
              </div>
              {chartPoints.length > 0 ? (
                <>
                  {latest ? <p className="mt-1 font-display text-lg font-semibold text-foreground">{latest.score}% <span className="text-[9px] font-normal text-muted-foreground">{scoreChange === null ? "latest score" : scoreChange > 0 ? `↑ ${scoreChange} points` : scoreChange < 0 ? `↓ ${Math.abs(scoreChange)} points` : "steady"}</span></p> : null}
                  <svg viewBox="0 0 220 110" className="mt-2 h-24 w-full" role="img" aria-label={`Mock scores ${chartPoints.map((point) => point.attempt.score).join(", ")} percent`}>
                    <line x1="18" y1="20" x2="202" y2="20" stroke="#A7A196" strokeDasharray="3 4" />
                    <text x="184" y="16" fill="#817B6F" fontSize="8">80%</text>
                    <polyline points={polyline} fill="none" stroke="#B86E0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {chartPoints.map((point, index) => (
                      <circle key={point.attempt.id} cx={point.x} cy={point.y} r="3" fill="#FBF7EE" stroke="#B86E0A" strokeWidth="2">
                        <title>Set {index + 1}: {point.attempt.score}%</title>
                      </circle>
                    ))}
                  </svg>
                  <div className="flex justify-between text-[8px] text-muted-foreground">
                    {chartPoints.map((point, index) => <span key={point.attempt.id}>Set {index + 1}</span>)}
                  </div>
                </>
              ) : <p className="mt-4 text-xs text-muted-foreground">Not enough attempts yet</p>}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-sm text-muted-foreground">
            Not enough attempts yet
          </div>
        )}
      </section>

      <section aria-labelledby="weakest-topics">
        <h2 id="weakest-topics" className="font-display text-lg font-semibold text-foreground">Topics, weakest first</h2>
        <p className="mb-2 text-xs text-muted-foreground">Open a topic to see your exact score and practice it.</p>
        {courseTopics.length > 0 ? (
          <div className="space-y-2">
            {visibleTopics.map((entry, index) => {
              const score = entry.score ?? 0;
              const masteredTopic = entry.score !== null && score >= 80;
              const learningTopic = entry.score !== null && score >= 40 && score < 80;
              const status = masteredTopic ? "Mastered" : learningTopic ? "Learning" : entry.score === null ? "Not attempted" : "Weak";
              const color = masteredTopic ? "#47835E" : learningTopic ? "#B86E0A" : "#9B9A93";
              const expanded = expandedProgressTopics.has(entry.topic);
              const panelId = `topic-progress-${index}`;
              return (
                <article key={entry.topic} className="overflow-hidden rounded-xl border border-border bg-card">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    aria-label={`${expanded ? "Hide" : "Show"} progress details for ${entry.topic}`}
                    onClick={() => setExpandedProgressTopics((current) => {
                      const next = new Set(current);
                      if (next.has(entry.topic)) next.delete(entry.topic);
                      else next.add(entry.topic);
                      return next;
                    })}
                    className="flex min-h-12 w-full items-center justify-between gap-3 p-3 text-left transition hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{entry.topic}</span>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold text-secondary-foreground">{status}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent">
                      {expanded ? "Hide" : "See progress"}
                      <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                    </span>
                  </button>
                  {expanded ? (
                    <div id={panelId} className="border-t border-border px-3 pb-3 pt-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-display text-2xl font-semibold text-foreground">
                            {entry.score === null ? "—" : `${entry.score}%`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.score === null ? "No score recorded yet" : `Your progress · ${status.toLowerCase()}`}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0 px-3 text-xs"
                          onClick={() => course && navigate("mock-config", { courseCode: course.code })}
                          disabled={!course}
                        >
                          Practice
                        </Button>
                      </div>
                      <div
                        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-label={`${entry.topic} progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={score}
                        aria-valuetext={entry.score === null ? "Not attempted" : `${entry.score}%`}
                      >
                        <div className="h-full rounded-full transition-[width]" style={{ width: `${score}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-sm text-muted-foreground">
            Not enough attempts yet
          </div>
        )}
      </section>

      <section aria-labelledby="recent-misses">
        <h2 id="recent-misses" className="mb-2 font-display text-lg font-semibold text-foreground">Recent misses</h2>
        {recentMisses.length > 0 ? (
          <div className="space-y-2">
            {recentMisses.map((miss) => (
              <article key={`${miss.id}-${miss.number}`} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">{miss.topic}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question {miss.number}</p>
                <div className="mt-2 break-words whitespace-pre-wrap text-base font-semibold leading-7 text-foreground"><MathText>{miss.question}</MathText></div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-destructive/5 p-3 text-sm leading-6 text-destructive">
                    <span className="block text-xs font-semibold">Your answer</span>
                    <div className="mt-1 break-words whitespace-pre-wrap"><MathText>{miss.chosen}</MathText></div>
                  </div>
                  <div className="rounded-xl bg-success/5 p-3 text-sm leading-6 text-success">
                    <span className="block text-xs font-semibold">Correct answer</span>
                    <div className="mt-1 break-words whitespace-pre-wrap"><MathText>{miss.correct}</MathText></div>
                  </div>
                </div>
                <div className="mt-3 border-t border-dashed border-border pt-3 text-sm leading-7 text-muted-foreground">
                  <span className="font-semibold text-foreground">Explanation</span>
                  <div className="mt-1 break-words whitespace-pre-wrap"><MathText>{miss.explanation}</MathText></div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-sm text-muted-foreground">
            Not counted yet
          </div>
        )}
      </section>

      <section aria-labelledby="flashcard-memory" className="rounded-2xl border border-border bg-card p-4">
        <h2 id="flashcard-memory" className="font-display text-lg font-semibold text-foreground">Flashcard rating counts</h2>
        {ratingCountsLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading rating counts…</p>
        ) : ratingCounts ? (
          <>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(["again", "hard", "good", "easy"] as const).map((rating) => (
                <div key={rating} className="rounded-xl border border-border bg-background p-2 text-center">
                  <p className="text-[10px] capitalize text-muted-foreground">{rating}</p>
                  <p className="mt-1 font-display text-xl font-semibold text-foreground">{ratingCounts[rating]}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Counts start with ratings recorded from this update. Earlier ratings were not stored.</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Not counted</p>
        )}
        <Button variant="outline" className="mt-3 w-full" onClick={() => navigate("flashcards-review")}>
          Review due cards
        </Button>
      </section>
    </div>
  );
}
