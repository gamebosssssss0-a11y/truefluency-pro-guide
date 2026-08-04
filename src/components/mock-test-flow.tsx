import { useEffect, useMemo, useRef, useState } from "react";
import { useProfile, bumpStreak, type MockAttempt, type UserCourse, type Difficulty, type CourseTestSettings } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Sparkles, Zap, Trophy, RotateCcw } from "lucide-react";
import { AiGeneratedLabel, TopicPill, scoreToStrength } from "@/components/common";
import { cn } from "@/lib/utils";
import { timelineDefaults } from "@/lib/personalization";
import { listMaterialsForCourse } from "@/lib/course-materials";

// Your FastAPI backend URL — change to Render URL when deployed
const BACKEND_URL = "https://truefluency-pro-backend.onrender.com";

/* ---------- types ---------- */

type AIQuestion = {
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

export function MockGenerationScreen() {
  const course = useActiveCourse();
  const { navigate, profile, update } = useProfile();
  const [pct, setPct] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

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

        const res = await fetch(`${BACKEND_URL}/generate-mock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            material_id: ready.id,
            course_code: course.code,
            course_name: course.name,
            question_count: count,
            difficulty,
            topic_focus: topicFocus,
            user_goal: profile.goal,
            user_timeline: profile.timeline,
            user_level: profile.level,
            user_department: profile.department,
          }),
        });

        if (!res.ok) {
          throw new Error(`Backend error: ${res.status}`);
        }

        const data = await res.json();
        const questions: AIQuestion[] = data.questions;

        if (!questions || questions.length === 0) {
          throw new Error("No questions returned from AI");
        }

        clearInterval(animId);
        setPct(100);

        // Store AI questions in profile state so MockRunScreen can use them
        update({ aiQuestions: questions });

        setTimeout(() => {
          navigate("mock-config", { courseCode: course.code });
        }, 400);

      } catch (e: unknown) {
        clearInterval(animId);
        setError(e instanceof Error ? e.message : "Something went wrong generating your mock.");
      }
    };

    run();

    return () => clearInterval(animId);
  }, [course?.code]);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button className="mt-4" onClick={() => navigate("dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Preparing your mock</h1>
          <p className="mt-1 text-sm text-muted-foreground">{course?.code} · {course?.name}</p>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="mt-3 text-center text-sm text-muted-foreground">{genSteps[statusIdx]}</p>
      </div>
    </div>
  );
}

/* ---------- 2. Config screen ---------- */

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
    questionCount: timeline.questionCount,
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

  const [count, setCount] = useState(initial?.questionCount ?? 20);
  const [minutes, setMinutes] = useState(initial?.minutes ?? 30);
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? "balanced");
  const [topicFocus, setTopicFocus] = useState<string[]>(initial?.topicFocus ?? []);

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

  const aiQuestions: AIQuestion[] = (profile as any).aiQuestions ?? [];
  const ALL_TOPICS = Array.from(new Set(aiQuestions.map((q) => q.topic)));

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
        <button
          onClick={() => navigate("course-detail", { courseCode: course.code })}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="font-display text-3xl font-semibold text-foreground">Customize your test</h1>
        <p className="mt-1 text-sm text-muted-foreground">{course.code} · {course.name}</p>
        {defaults.toneLine ? (
          <p className="mt-2 text-[12px] italic text-muted-foreground">{defaults.toneLine}</p>
        ) : null}

        <div className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-4">
          <ConfigSlider label="Duration" unit="minutes" value={minutes} min={5} max={45} step={5} onChange={setMinutes} />

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

function ConfigSlider({ label, unit, value, min, max, step, onChange }: {
  label: string; unit: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
        <span className="font-display text-2xl font-semibold text-primary">
          {value} <span className="text-xs font-medium text-muted-foreground">{unit}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-accent" />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

/* ---------- 3. Run screen ---------- */

export function MockRunScreen() {
  const { profile, update, navigate } = useProfile();
  const t = profile.inProgressTest;
  const aiQuestions: AIQuestion[] = (profile as any).aiQuestions ?? [];

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
          <Button variant="ghost" onClick={() => navigate("dashboard")}>← Back</Button>
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
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t.courseCode}</div>
            <div className="truncate text-sm font-semibold text-foreground">{t.courseTitle}</div>
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
            <div className="font-display text-lg font-semibold text-foreground">{q.question}</div>

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
                    <span className="text-sm text-foreground">{opt}</span>
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
          <Button variant="ghost" onClick={() => navigate("dashboard")}>← Back</Button>
          <p className="mt-6 text-sm text-muted-foreground">No result to show.</p>
        </div>
      </div>
    );
  }

  const celebratory = attempt.score >= 70;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
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

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={() => navigate("dashboard")}>Dashboard</Button>
          <Button size="lg" onClick={() => navigate("mock-gen", { courseCode: attempt.courseCode })}>
            <Zap className="mr-1.5 h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
