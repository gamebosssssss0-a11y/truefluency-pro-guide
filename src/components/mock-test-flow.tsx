import { useEffect, useMemo, useRef, useState } from "react";
import { useProfile, bumpStreak, type MockAttempt, type UserCourse } from "@/lib/profile-store";
import { sampleQuestions } from "@/lib/questions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Sparkles, Zap, Trophy } from "lucide-react";
import { AiGeneratedLabel, TopicPill, scoreToStrength } from "@/components/common";
import { cn } from "@/lib/utils";
import { timelineDefaults } from "@/lib/personalization";

/* ---------- helpers ---------- */

function useActiveCourse(): UserCourse | undefined {
  const { profile, activeCourseCode } = useProfile();
  return profile.courses.find((c) => c.code === activeCourseCode);
}

function pickQuestionIds(count: number) {
  const shuffled = [...sampleQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, sampleQuestions.length)).map((q) => q.id);
}

/* ---------- 1. Generation screen (status rotation) ---------- */

const genSteps = [
  "Scanning predicted topics…",
  "Balancing difficulty…",
  "Sampling from past papers…",
  "Compiling your questions…",
];

export function MockGenerationScreen() {
  const course = useActiveCourse();
  const { navigate } = useProfile();
  const [pct, setPct] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const total = 2200;
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / total);
      setPct(Math.round(t * 100));
      setStatusIdx(Math.min(genSteps.length - 1, Math.floor(t * genSteps.length)));
      if (t >= 1) {
        clearInterval(id);
        navigate("mock-config", { courseCode: course?.code ?? null });
      }
    }, 60);
    return () => clearInterval(id);
  }, [course?.code, navigate]);

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

export function MockConfigScreen() {
  const course = useActiveCourse();
  const { navigate, update, profile } = useProfile();
  const defaults = useMemo(() => {
    // Inline import avoids a circular dep at module load.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return timelineDefaultsFn(profile.timeline);
  }, [profile.timeline]);
  const [count, setCount] = useState(defaults.questionCount);
  const [minutes, setMinutes] = useState(defaults.minutes);

  if (!course) return null;

  const start = () => {
    const ids = pickQuestionIds(count);
    update({
      inProgressTest: {
        courseCode: course.code,
        courseTitle: course.name,
        questionCount: ids.length,
        durationSec: minutes * 60,
        startedAt: Date.now(),
        answers: Array(ids.length).fill(null),
        currentIndex: 0,
        questionIds: ids,
      },
    });
    navigate("mock-run", { courseCode: course.code });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <button
          onClick={() => navigate("dashboard")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Cancel
        </button>

        <h1 className="font-display text-3xl font-semibold text-foreground">Configure your test</h1>
        <p className="mt-1 text-sm text-muted-foreground">{course.code} · {course.name}</p>

        <div className="mt-6 space-y-5">
          <Slider label="Questions" unit={count === 1 ? "question" : "questions"} value={count} min={5} max={20} step={5} onChange={setCount} />
          <Slider label="Duration" unit="minutes" value={minutes} min={5} max={45} step={5} onChange={setMinutes} />
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
          You'll get {count} questions in {minutes} minutes. The timer turns amber at half, red at 20%.
          You can pause and resume from the dashboard.
        </div>

        <Button size="lg" className="mt-6 w-full" onClick={start}>
          <Zap className="mr-2 h-4 w-4" /> Start test
        </Button>

        {profile.inProgressTest && profile.inProgressTest.courseCode === course.code ? (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Starting a new test will discard your current in-progress attempt.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Slider({ label, unit, value, min, max, step, onChange }: {
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
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
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

  const questions = useMemo(() => {
    if (!t) return [];
    return t.questionIds.map((id) => sampleQuestions.find((q) => q.id === id)!).filter(Boolean);
  }, [t]);

  const submit = () => {
    if (!t || submittedRef.current) return;
    submittedRef.current = true;

    let correct = 0;
    const topicMap = new Map<string, { correct: number; total: number }>();
    questions.forEach((q, i) => {
      const bucket = topicMap.get(q.topic) ?? { correct: 0, total: 0 };
      bucket.total += 1;
      if (t.answers[i] === q.correctIndex) { correct += 1; bucket.correct += 1; }
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

    // Merge topic scores (keep the latest per topic+course).
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const timerColor =
    pct <= 20 ? "text-destructive"
    : pct <= 50 ? "text-warning"
    : "text-primary";

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
                  <button
                    key={i}
                    onClick={() => setAnswer(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition",
                      on ? "border-accent bg-accent/10" : "border-border bg-background hover:border-accent/50"
                    )}
                  >
                    <div className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                      on ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground"
                    )}>
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
          <div className={cn(
            "mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl",
            celebratory ? "bg-success/15 text-success" : "bg-secondary text-primary"
          )}>
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
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Topic breakdown
          </h2>
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
