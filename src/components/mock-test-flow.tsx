import { useEffect, useMemo, useRef, useState } from "react";
import { useProfile, bumpStreak, type MockAttempt, type UserCourse, type Difficulty, type CourseTestSettings } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Sparkles, Zap, Trophy, RotateCcw, Quote, X, Lock, History } from "lucide-react";
import { HeaderLogo } from "@/components/brand";
import { AiGeneratedLabel, TopicPill, scoreToStrength } from "@/components/common";
import { cn } from "@/lib/utils";
import { timelineDefaults } from "@/lib/personalization";
import { listMaterialsForCourse } from "@/lib/course-materials";
import { STUDY_QUOTES } from "@/lib/study-quotes";
import { generateMock } from "@/lib/backend-api";
import { consumeFeatureQuota } from "@/lib/entitlements.functions";
import { FOUNDING_PRICE_NAIRA, FREE_MAX_QUESTIONS, PAID_MAX_QUESTIONS, type QuotaVerdict } from "@/lib/entitlements";
import { PaywallNotice, LockedExplanation } from "@/components/paywall-notice";
import { useEntitlement } from "@/hooks/use-entitlement";
import { MathText } from "@/components/math-text";

// The analysis service accepts at most 40 questions per request.
const MAX_GENERATED_QUESTIONS = PAID_MAX_QUESTIONS;

/* ---------- types ---------- */

export type AIQuestion = {
  id: number;
  topic: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

/* ---------- helpers ---------- */

function useActiveCourse(): UserCourse | undefined {
  const { profile, activeCourseCode } = useProfile();
  return profile.courses.find((c) => c.code === activeCourseCode);
}

/* ---------- 1. Generation screen ---------- */

const genSteps = [
  "Scanning predicted topics…",
  "Balancing difficulty…",
  "Sampling from past papers…",
  "Compiling your questions…",
];

const QUOTE_CYCLE_MS = 6000;


export function MockGenerationScreen() {
  const course = useActiveCourse();
  const { navigate, profile, update } = useProfile();
  const [pct, setPct] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  // Random starting quote on every visit to this screen.
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * STUDY_QUOTES.length));

  const [reduceMotion, setReduceMotion] = useState(false);

  // Reuse the SAME analysis already produced during this course's upload step.
  const analysis = course ? profile.courseTopicAnalysis[course.code] : undefined;
  const avgConfidence = analysis?.topics.length
    ? Math.round((analysis.topics.reduce((s, t) => s + t.confidence, 0) / analysis.topics.length) * 100)
    : null;

  const [error, setError] = useState<string | null>(null);
  const [refused, setRefused] = useState<QuotaVerdict | null>(null);
  const fetchedRef = useRef(false);
  const quoteCycleStartedRef = useRef(Date.now());

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReduceMotion(media.matches);
    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    quoteCycleStartedRef.current = Date.now();
    const quoteTimer = window.setInterval(() => {
      quoteCycleStartedRef.current = Date.now();
      setQuoteIdx((current) => (current + 1) % STUDY_QUOTES.length);
    }, QUOTE_CYCLE_MS);
    return () => window.clearInterval(quoteTimer);
  }, [reduceMotion]);

  useEffect(() => {
    if (!course || fetchedRef.current) return;
    fetchedRef.current = true;

    const settings = profile.courseTestSettings[course.code];
    const count = settings?.questionCount ?? 20;
    const difficulty = settings?.difficulty ?? "balanced";
    const topicFocus = settings?.topicFocus ?? [];

    // Animate progress bar
    const start = Date.now();
    const total = 3000;
    const animId = setInterval(() => {
      const t = Math.min(0.9, (Date.now() - start) / total);
      setPct(Math.round(t * 100));
      setStatusIdx(Math.min(genSteps.length - 1, Math.floor(t * genSteps.length)));
    }, 60);

    // Fetch materials for this course then call AI
    const run = async () => {
      try {
        const materials = await listMaterialsForCourse(course.code);
        const ready = materials.find((m) => m.extraction_status === "success");

        if (!ready) {
          clearInterval(animId);
          setError("No extracted material found for this course. Please upload a PDF or DOCX first.");
          return;
        }

        // Daily set limit and question cap are decided on the server; a refusal
        // is a friendly upsell, not an error.
        let allowedCount = Math.min(MAX_GENERATED_QUESTIONS, count);
        try {
          const verdict = await consumeFeatureQuota({
            data: { feature: "mock_sets", requestedQuestions: count },
          });
          if (!verdict.allowed) {
            clearInterval(animId);
            setRefused(verdict);
            return;
          }
          if (verdict.allowedQuestions) {
            allowedCount = Math.min(MAX_GENERATED_QUESTIONS, verdict.allowedQuestions);
          }
        } catch (e) {
          console.warn("[mock] couldn't check your plan, continuing", e);
        }

        // Shared client: attaches the signed-in bearer token, normalises the
        // profile fields the service expects, and surfaces real error text.
        const questions = await generateMock({
          materialId: ready.id,
          courseCode: course.code,
          courseName: course.name,
          questionCount: allowedCount,
          difficulty,
          topicFocus,
          profile: {
            goal: profile.goal,
            timeline: profile.timeline,
            level: profile.level,
            department: profile.department,
          },
        });

        if (!questions || questions.length === 0) {
          throw new Error("No questions returned from AI");
        }

        clearInterval(animId);
        setPct(100);

        // Store the AI questions under this course code so a set generated for
        // one course can never be served during another course's test.
        update({
          aiQuestionsByCourse: {
            ...profile.aiQuestionsByCourse,
            [course.code]: questions,
          },
          inProgressTest: {
            courseCode: course.code,
            courseTitle: course.name,
            questionCount: questions.length,
            durationSec: (settings?.minutes ?? 30) * 60,
            startedAt: Date.now(),
            answers: Array(questions.length).fill(null),
            currentIndex: 0,
            questionIds: questions.map((q) => q.id),
            source: "ai",
          },
        });

        const elapsedInQuoteCycle = Date.now() - quoteCycleStartedRef.current;
        const quoteFinishDelay = reduceMotion
          ? 400
          : Math.max(400, QUOTE_CYCLE_MS - (elapsedInQuoteCycle % QUOTE_CYCLE_MS));
        setTimeout(() => {
          navigate("mock-run", { courseCode: course.code });
        }, quoteFinishDelay);

      } catch (e: unknown) {
        clearInterval(animId);
        setError(e instanceof Error ? e.message : "Something went wrong generating your mock.");
      }
    };

    run();

    return () => clearInterval(animId);
  }, [course?.code]);

  if (refused) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
          <PaywallNotice
            feature="mock_sets"
            verdict={refused}
            onDismiss={() => navigate("mock-tests")}
            dismissLabel="Back to Mock Tests"
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button className="mt-4" onClick={() => navigate("mock-tests")}>Back to Mock Tests</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
        <div className="absolute left-5 top-6">
          <HeaderLogo />
        </div>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Preparing your mock</h1>
          <p className="mt-1 text-sm text-muted-foreground">{course?.code} · {course?.name}</p>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="mt-3 text-center text-sm text-muted-foreground">{genSteps[statusIdx]}</p>

        {analysis && analysis.topics.length > 0 ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-accent/15 bg-card shadow-sm">
            <div className="bg-gradient-to-br from-primary to-primary/85 p-4 text-primary-foreground">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
                <Sparkles className="h-3 w-3" /> Mock prediction ready
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-primary-foreground/15 pt-3">
                <GenStat label="Topics found" value={String(analysis.topics.length)} />
                <GenStat label="Avg prominence" value={`${avgConfidence}%`} />
                <GenStat label="Analyzed" value={new Date(analysis.analyzedAt).toLocaleDateString()} />
              </div>
            </div>
            <div className="p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Top predicted topics
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.topics.slice(0, 5).map((t) => (
                  <TopicPill key={t.topic} label={t.topic} strength={t.confidence} />
                ))}
              </div>
              <AiGeneratedLabel className="mt-3" />
            </div>
          </div>
        ) : null}

        <figure
          key={reduceMotion ? "static-quote" : quoteIdx}
          className={cn(
            "quote-card relative mt-7 overflow-hidden rounded-2xl px-6 py-5 text-center",
            !reduceMotion && "quote-card-cycle",
          )}
        >
          <Quote
            className="pointer-events-none absolute -left-1 -top-2 h-16 w-16 text-accent/25"
            aria-hidden="true"
          />
          <blockquote className="quote-text relative font-display text-base font-semibold leading-relaxed">
            “{STUDY_QUOTES[quoteIdx].quote}”
          </blockquote>
          <figcaption className="relative mt-2 text-xs font-normal text-muted-foreground">
            {STUDY_QUOTES[quoteIdx].author}
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

function GenStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-lg font-semibold leading-none">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-primary-foreground/60">{label}</div>
    </div>
  );
}


/* ---------- 2. Config screen ---------- */

/** Question-count range. Anything above the free limit is a future paid tier. */
export const MIN_QUESTIONS = 20;
export const MAX_QUESTIONS = 120;
export const FREE_QUESTION_LIMIT = 60;

const DIFFICULTY_OPTIONS: { key: Difficulty; label: string; blurb: string }[] = [
  { key: "gentle", label: "Gentle", blurb: "Ease in" },
  { key: "balanced", label: "Balanced", blurb: "Recommended" },
  { key: "challenging", label: "Challenging", blurb: "Push harder" },
  { key: "exam", label: "Exam-level", blurb: "Full pressure" },
];

function smartDefaultsFor(courseCode: string, profile: ReturnType<typeof useProfile>["profile"]): CourseTestSettings {
  const timeline = timelineDefaults(profile.timeline);
  const hasHistory = profile.attempts.some((a) => a.courseCode === courseCode);
  let topicFocus: string[] = [];
  if (hasHistory) {
    topicFocus = profile.topicScores
      .filter((t) => t.course === courseCode && t.score < 60)
      .sort((a, b) => a.score - b.score)
      .slice(0, 2)
      .map((t) => t.topic);
  }
  return {
    questionCount: 40,
    minutes: timeline.minutes,
    difficulty: "balanced",
    topicFocus,
  };
}

export function MockConfigScreen() {
  const course = useActiveCourse();
  const { navigate, update, profile } = useProfile();
  const defaults = useMemo(() => timelineDefaults(profile.timeline), [profile.timeline]);

  const smart = useMemo(
    () => (course ? smartDefaultsFor(course.code, profile) : null),
    [course?.code],
  );
  const remembered = course ? profile.courseTestSettings[course.code] : undefined;
  const initial = remembered ?? smart!;

  const { maxQuestionsPerSet } = useEntitlement();
  const [count, setCount] = useState((initial?.questionCount ?? 40) >= 120 ? 120 : 40);
  const [minutes, setMinutes] = useState(initial?.minutes ?? 30);
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? "balanced");
  const [topicFocus, setTopicFocus] = useState<string[]>(initial?.topicFocus ?? []);

  useEffect(() => {
    setCount((c) => Math.min(c, maxQuestionsPerSet));
  }, [maxQuestionsPerSet]);

  if (!course || !smart) return null;

  const resetToDefaults = () => {
    setCount(smart.questionCount);
    setMinutes(smart.minutes);
    setDifficulty(smart.difficulty);
    setTopicFocus(smart.topicFocus);
  };

  const toggleTopic = (t: string) => {
    setTopicFocus((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  };

  const difficultyLabel = DIFFICULTY_OPTIONS.find((d) => d.key === difficulty)?.label ?? "Balanced";

  // Topic focus options come from THIS course's stored analysis, not from a
  // previously generated question set (which may belong to another course).
  const analysedTopics = profile.courseTopicAnalysis[course.code]?.topics ?? [];
  const ALL_TOPICS = Array.from(new Set(analysedTopics.map((t) => t.topic)));


  const generate = () => {
    const nextSettings: CourseTestSettings = { questionCount: count, minutes, difficulty, topicFocus };
    update({
      courseTestSettings: { ...profile.courseTestSettings, [course.code]: nextSettings },
    });
    navigate("mock-gen", { courseCode: course.code });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <button
            onClick={() => navigate("mock-tests")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Mock Tests
          </button>
        </div>

        <h1 className="font-display text-3xl font-semibold text-foreground">Customize your test</h1>
        <p className="mt-1 text-sm text-muted-foreground">{course.code} · {course.name}</p>
        {defaults.toneLine ? (
          <p className="mt-2 text-[12px] italic text-muted-foreground">{defaults.toneLine}</p>
        ) : null}

        <div className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Questions
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[40, 120].map((n) => {
                const locked = n > maxQuestionsPerSet;
                const on = count === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={locked}
                    onClick={() => setCount(n)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition",
                      on ? "border-accent bg-accent/10" : "border-border bg-background hover:border-accent/50",
                      locked && "opacity-55",
                    )}
                  >
                    <div className="font-display text-xl font-semibold text-foreground">{n}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {locked ? <Lock className="h-3 w-3" aria-hidden="true" /> : null}
                      {n === 40 ? "Standard set" : locked ? "Full access" : "Long set"}
                    </div>
                  </button>
                );
              })}
            </div>
            {maxQuestionsPerSet <= FREE_MAX_QUESTIONS ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                <span>
                  Free accounts cap a set at {FREE_MAX_QUESTIONS} questions. Full access raises it
                  to {PAID_MAX_QUESTIONS}.
                </span>
              </p>
            ) : null}
          </div>


          <ConfigSlider label="Duration" unit="minutes" value={minutes} min={5} max={120} step={5} onChange={setMinutes} />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Difficulty</label>
            <div className="grid grid-cols-2 gap-2">
              {DIFFICULTY_OPTIONS.map((d) => {
                const on = difficulty === d.key;
                return (
                  <button key={d.key} type="button" onClick={() => setDifficulty(d.key)}
                    className={cn("rounded-xl border p-2.5 text-left transition", on ? "border-accent bg-accent/10" : "border-border bg-background hover:border-accent/50")}>
                    <div className="text-sm font-semibold text-foreground">{d.label}</div>
                    <div className="text-[11px] text-muted-foreground">{d.blurb}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {ALL_TOPICS.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Topic focus <span className="normal-case text-muted-foreground/70">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TOPICS.map((t) => {
                  const on = topicFocus.includes(t);
                  return (
                    <button key={t} type="button" onClick={() => toggleTopic(t)}
                      className={cn("rounded-full border px-2.5 py-1 text-[11px] transition",
                        on ? "border-accent bg-accent/15 text-accent-foreground" : "border-border bg-background text-muted-foreground hover:border-accent/50")}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question type</label>
            <div className="rounded-xl border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
              Multiple choice. More formats coming soon.
            </div>
          </div>

          <button type="button" onClick={resetToDefaults}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            <RotateCcw className="h-3 w-3" /> Reset to default
          </button>
        </div>

        <Button size="lg" className="mt-5 h-auto w-full py-4" onClick={generate}>
          <Zap className="mr-2 h-4 w-4" />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-base font-semibold">Generate Mock Test</span>
            <span className="text-[11px] font-normal opacity-90">
              {count} questions · {minutes} min · {difficultyLabel}
              {topicFocus.length > 0 ? ` · ${topicFocus.length} topic${topicFocus.length > 1 ? "s" : ""}` : ""}
            </span>
          </span>
        </Button>

        {profile.inProgressTest && profile.inProgressTest.courseCode === course.code ? (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Generating a new test will discard your current in-progress attempt.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ConfigSlider({ label, unit, value, min, max, step, onChange, hardCeiling }: {
  label: string; unit: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
  /** Values above this are shown on the track but cannot be selected. */
  hardCeiling?: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
        <span className="font-display text-2xl font-semibold text-primary">
          {value} <span className="text-xs font-medium text-muted-foreground">{unit}</span>
        </span>
      </div>
      <input type="range" min={min} max={hardCeiling ?? max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-accent" />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{min}</span>
        {hardCeiling && hardCeiling < max ? (
          <span className="inline-flex items-center gap-1">
            {hardCeiling}
            <span className="rounded-full bg-muted px-1.5 py-0.5 font-semibold uppercase tracking-wider">
              {max} soon
            </span>
          </span>
        ) : (
          <span>{max}</span>
        )}
      </div>
    </div>
  );
}

/* ---------- 3. Run screen ---------- */

export function MockRunScreen() {
  const { profile, update, navigate } = useProfile();
  const t = profile.inProgressTest;
  // Only this course's generated set, so questions never cross courses.
  const aiQuestions: AIQuestion[] = t ? (profile.aiQuestionsByCourse[t.courseCode] ?? []) : [];

  const [now, setNow] = useState(Date.now());
  const submittedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const remaining = useMemo(() => {
    if (!t) return 0;
    const elapsed = Math.floor((now - t.startedAt) / 1000);
    return Math.max(0, t.durationSec - elapsed);
  }, [t, now]);

  // Use AI questions instead of hardcoded sampleQuestions
  const questions = useMemo(() => {
    if (!t || aiQuestions.length === 0) return [];
    return t.questionIds.map((id) => aiQuestions.find((q) => q.id === id)).filter(Boolean) as AIQuestion[];
  }, [t, aiQuestions]);

  const submit = () => {
    if (!t || submittedRef.current) return;
    submittedRef.current = true;

    let correct = 0;
    const topicMap = new Map<string, { correct: number; total: number }>();
    questions.forEach((q, i) => {
      const bucket = topicMap.get(q.topic) ?? { correct: 0, total: 0 };
      bucket.total += 1;
      if (t.answers[i] === q.correct_index) { correct += 1; bucket.correct += 1; }
      topicMap.set(q.topic, bucket);
    });
    const score = Math.round((correct / Math.max(1, questions.length)) * 100);

    const topics = Array.from(topicMap.entries()).map(([topic, b]) => ({
      topic, score: Math.round((b.correct / b.total) * 100),
    }));

    const attempt: MockAttempt = {
      id: `att-${Date.now()}`,
      courseCode: t.courseCode,
      courseTitle: t.courseTitle,
      score,
      correct,
      total: questions.length,
      submittedAt: Date.now(),
      topics,
      // Snapshot the exact questions and selections so the review screen can
      // replay this attempt without regenerating anything.
      questions,
      answers: questions.map((_, i) => t.answers[i] ?? null),
      settings: profile.courseTestSettings[t.courseCode],
    };


    const newTopicScores = [...profile.topicScores];
    for (const tp of topics) {
      const idx = newTopicScores.findIndex((s) => s.course === t.courseCode && s.topic === tp.topic);
      const entry = { course: t.courseCode, topic: tp.topic, score: tp.score };
      if (idx >= 0) newTopicScores[idx] = entry; else newTopicScores.push(entry);
    }

    const avg = (() => {
      const rel = [...profile.attempts, attempt].filter((a) => a.courseCode === t.courseCode);
      return rel.reduce((s, a) => s + a.score, 0) / rel.length;
    })();
    const mastered = profile.masteredCourses.slice();
    if (avg >= 70 && !mastered.includes(t.courseCode)) mastered.push(t.courseCode);

    update({
      attempts: [...profile.attempts, attempt],
      topicScores: newTopicScores,
      inProgressTest: null,
      lastResultId: attempt.id,
      hasCompletedFirstMock: true,
      masteredCourses: mastered,
      ...bumpStreak(profile),
    });
    navigate("mock-result", { courseCode: t.courseCode });
  };

  useEffect(() => {
    if (!t) return;
    if (remaining === 0) submit();
  }, [remaining, t]);

  if (!t) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-5 pt-6">
          <Button variant="ghost" onClick={() => navigate("home")}>← Back</Button>
          <p className="mt-6 text-sm text-muted-foreground">No test in progress.</p>
        </div>
      </div>
    );
  }

  const idx = t.currentIndex;
  const q = questions[idx];
  const answered = t.answers.filter((a) => a !== null).length;
  const pct = Math.round((remaining / t.durationSec) * 100);
  const timerColor = pct <= 20 ? "text-destructive" : pct <= 50 ? "text-warning" : "text-primary";

  const setAnswer = (a: number) => {
    const next = [...t.answers]; next[idx] = a;
    update({ inProgressTest: { ...t, answers: next } });
  };
  const move = (delta: number) => {
    const nextIdx = Math.max(0, Math.min(questions.length - 1, idx + delta));
    update({ inProgressTest: { ...t, currentIndex: nextIdx } });
  };

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-24 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeaderLogo />
            <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t.courseCode}</div>
            <div className="truncate text-sm font-semibold text-foreground">{t.courseTitle}</div>
            </div>
          </div>
          <div className={cn("font-display text-2xl font-semibold tabular-nums", timerColor)}>
            {mm}:{String(ss).padStart(2, "0")}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <Progress value={((idx + 1) / questions.length) * 100} className="h-1.5 flex-1" />
          <span className="text-[11px] text-muted-foreground">Q{idx + 1}/{questions.length}</span>
        </div>

        {q ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">{q.topic}</div>
            <div className="font-display text-lg font-semibold text-foreground"><MathText>{q.question}</MathText></div>

            <div className="mt-4 space-y-2">
              {q.options.map((opt, i) => {
                const on = t.answers[idx] === i;
                return (
                  <button key={i} onClick={() => setAnswer(i)}
                    className={cn("flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition",
                      on ? "border-accent bg-accent/10" : "border-border bg-background hover:border-accent/50")}>
                    <div className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                      on ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground")}>
                      {on ? <Check className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-sm text-foreground"><MathText>{opt}</MathText></span>
                  </button>
                );
              })}
            </div>
            <AiGeneratedLabel className="mt-4" />
          </div>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center gap-2 px-5 py-3">
            <Button variant="outline" size="lg" onClick={() => move(-1)} disabled={idx === 0} className="flex-1">
              <ChevronLeft className="mr-1 h-4 w-4" /> Prev
            </Button>
            {idx === questions.length - 1 ? (
              <Button size="lg" onClick={submit} className="flex-1" disabled={answered === 0}>
                Submit ({answered}/{questions.length})
              </Button>
            ) : (
              <Button size="lg" onClick={() => move(1)} className="flex-1">
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 4. Result screen ---------- */

export function MockResultScreen() {
  const { profile, navigate } = useProfile();
  const attempt = profile.attempts.find((a) => a.id === profile.lastResultId);

  if (!attempt) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-5 pt-6">
          <Button variant="ghost" onClick={() => navigate("home")}>← Back</Button>
          <p className="mt-6 text-sm text-muted-foreground">No result to show.</p>
        </div>
      </div>
    );
  }

  const celebratory = attempt.score >= 70;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
        </div>
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          <div className={cn("mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl",
            celebratory ? "bg-success/15 text-success" : "bg-secondary text-primary")}>
            <Trophy className="h-6 w-6" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {celebratory ? "Nice work!" : "Result"}
          </div>
          <div className="mt-1 font-display text-5xl font-semibold text-primary">{attempt.score}%</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {attempt.correct} of {attempt.total} correct · {attempt.courseCode}
          </div>
          {profile.streakDays > 0 ? (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent">
              🔥 {profile.streakDays}-day streak
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topic breakdown</h2>
          <div className="space-y-2">
            {attempt.topics.map((t) => (
              <div key={t.topic} className="flex items-center justify-between gap-3">
                <div className="text-sm text-foreground">{t.topic}</div>
                <TopicPill label={`${t.score}%`} strength={scoreToStrength(t.score)} />
              </div>
            ))}
          </div>
          <AiGeneratedLabel className="mt-3" />
        </div>

        <Button
          size="lg"
          variant="outline"
          className="mt-5 w-full"
          onClick={() => navigate("attempt-review", { attemptId: attempt.id })}
        >
          Review every question
        </Button>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={() => navigate("test-history")}>
            <History className="mr-1.5 h-4 w-4" /> History
          </Button>
          <Button size="lg" onClick={() => navigate("mock-gen", { courseCode: attempt.courseCode })}>
            <Zap className="mr-1.5 h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 5. Attempt review screen ---------- */

export function AttemptReviewScreen() {
  const { profile, navigate, update, activeAttemptId } = useProfile();
  const attempt = profile.attempts.find((a) => a.id === activeAttemptId);

  if (!attempt) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-5 pt-6">
          <Button variant="ghost" onClick={() => navigate("home")}>← Back</Button>
          <p className="mt-6 text-sm text-muted-foreground">That attempt is no longer available.</p>
        </div>
      </div>
    );
  }

  const questions = attempt.questions ?? [];
  const answers = attempt.answers ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <button
            onClick={() => navigate("test-history")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Test history
          </button>
        </div>

        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground shadow-sm">
          <div className="text-xs font-medium text-primary-foreground/70">{attempt.courseCode}</div>
          <div className="mt-0.5 font-display text-xl font-semibold leading-tight">{attempt.courseTitle}</div>
          <div className="mt-1 text-[11px] text-primary-foreground/70">
            Completed {new Date(attempt.submittedAt).toLocaleString()}
          </div>
          <div className="mt-4 flex items-baseline gap-2 border-t border-primary-foreground/15 pt-4">
            <span className="font-display text-4xl font-semibold leading-none">{attempt.score}%</span>
            <span className="text-sm text-primary-foreground/75">
              {attempt.correct}/{attempt.total} correct
            </span>
          </div>
        </div>

        <AiGeneratedLabel className="mt-4" />

        {questions.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
            This attempt was recorded before question-by-question review was available, so its
            individual questions weren't saved.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {questions.map((q, i) => {
              const selected = answers[i] ?? null;
              const isCorrect = selected === q.correct_index;
              return (
                <div key={`${q.id}-${i}`} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Q{i + 1} · {q.topic}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        isCorrect ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>

                  <div className="font-display text-base font-semibold text-foreground"><MathText>{q.question}</MathText></div>

                  <div className="mt-3 space-y-1.5">
                    {q.options.map((opt, oi) => {
                      const isAnswer = oi === q.correct_index;
                      const isPicked = oi === selected;
                      return (
                        <div
                          key={oi}
                          className={cn(
                            "flex items-start gap-2.5 rounded-xl border p-2.5 text-sm",
                            isAnswer
                              ? "border-success/50 bg-success/10"
                              : isPicked
                                ? "border-destructive/50 bg-destructive/10"
                                : "border-border bg-background",
                          )}
                        >
                          <span className="mt-0.5 shrink-0">
                            {isAnswer ? (
                              <Check className="h-4 w-4 text-success" aria-label="Correct answer" />
                            ) : isPicked ? (
                              <X className="h-4 w-4 text-destructive" aria-label="Your incorrect answer" />
                            ) : (
                              <span className="grid h-4 w-4 place-items-center text-[10px] font-semibold text-muted-foreground">
                                {String.fromCharCode(65 + oi)}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1 text-foreground"><MathText>{opt}</MathText></span>
                          {isPicked ? (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Your answer
                            </span>
                          ) : isAnswer ? (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Correct
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {selected === null ? (
                    <p className="mt-2 text-[11px] italic text-muted-foreground">
                      You left this question unanswered.
                    </p>
                  ) : null}

                  <div className="mt-3 rounded-xl border border-border bg-background p-3">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Why this is the answer
                    </div>
                    {q.explanation?.trim() ? (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                        <MathText>{q.explanation}</MathText>
                      </p>
                    ) : (
                      <LockedExplanation priceNaira={FOUNDING_PRICE_NAIRA} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AiGeneratedLabel className="mt-5" />

        <Button
          size="lg"
          className="mt-4 w-full"
          onClick={() => {
            if (attempt.settings) {
              update({
                courseTestSettings: {
                  ...profile.courseTestSettings,
                  [attempt.courseCode]: attempt.settings,
                },
              });
            }
            navigate("mock-gen", { courseCode: attempt.courseCode });
          }}
        >
          <Zap className="mr-1.5 h-4 w-4" /> Retake This Test
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Generates a fresh set of questions using the same course and settings.
        </p>
      </div>
    </div>
  );
}
