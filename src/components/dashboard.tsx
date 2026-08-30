import { useEffect, useMemo, useState } from "react";
import { useProfile, hasQualifyingActivityToday, type UserCourse } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, Upload, ChevronRight, TrendingUp, Flame, Target,
  PlayCircle, Zap, AlertTriangle, Quote as QuoteIcon, Lightbulb, Calculator, GaugeCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiGeneratedLabel, TopicPill, scoreToStrength } from "@/components/common";
import { HeaderLogo } from "@/components/brand";
import { focusCardCopy, greetingSubline, timelineDefaults, courseFeatureOrder } from "@/lib/personalization";
import { buildRotatingDeck, type Rotating } from "@/lib/study-quotes";
import { classify } from "@/lib/cgpa";
import { useEntitlement } from "@/hooks/use-entitlement";

/* ================= Tab 1: Home ================= */

const ROTATE_MS = 8000;

/**
 * Shows the days left on the 7-day full-access trial, using the entitlement
 * data the client already reads. Hidden entirely once the trial is over.
 */
function TrialBanner() {
  const { access } = useEntitlement();
  const endsAt = access?.trialEndsAt ? new Date(access.trialEndsAt).getTime() : null;
  if (!endsAt || access?.tier !== "trial") return null;
  const msLeft = endsAt - Date.now();
  if (msLeft <= 0) return null;
  const days = Math.max(1, Math.ceil(msLeft / 86_400_000));

  return (
    <div className="mb-5 flex items-center gap-2 rounded-2xl border border-accent/40 bg-accent/10 px-3.5 py-2.5">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
      <p className="text-xs font-medium text-foreground">
        {days} {days === 1 ? "day" : "days"} left in your full-access trial
      </p>
    </div>
  );
}

/**
 * Home is glanceable: how you're doing, what to pick up, and one prediction
 * preview. The full course directory lives in the Mock Tests tab.
 */
export function HomeScreen() {
  const { profile, navigate } = useProfile();
  /** First name only, in title case: never the full legal name, never ALL-CAPS. */
  const name = (() => {
    const raw = (profile.identity?.name ?? "").trim();
    const first = raw.split(/\s+/)[0] ?? "";
    if (!first) return "there";
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  })();


  const activeToday = hasQualifyingActivityToday(profile);
  const resume = profile.inProgressTest;
  const timeline = timelineDefaults(profile.timeline);
  const subline = greetingSubline(profile.goal);

  const attempts = profile.attempts;
  const hasResults = attempts.length > 0;

  // Progress snapshot is only shown once real mock data exists.
  const snapshot = useMemo(() => {
    if (!attempts.length) return null;
    const avg = Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length);
    const latest = [...attempts].sort((a, b) => b.submittedAt - a.submittedAt)[0];
    const weakest = profile.topicScores.length
      ? [...profile.topicScores].sort((a, b) => a.score - b.score)[0]
      : null;
    const strongest = profile.topicScores.length
      ? [...profile.topicScores].sort((a, b) => b.score - a.score)[0]
      : null;
    return { avg, latest, weakest, strongest };
  }, [attempts, profile.topicScores]);

  const focusCopy = focusCardCopy(profile.goal, snapshot?.weakest?.topic ?? "");

  // Prediction card: prefer a course that actually has an analysis on file.
  const predictionCourse: UserCourse | undefined =
    profile.courses.find((c) => (profile.courseTopicAnalysis[c.code]?.topics.length ?? 0) > 0) ??
    profile.courses[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-8 pt-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <HeaderLogo />
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Welcome back
            </div>
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-foreground">
            Study Dashboard
          </h1>
          <p className="mt-1 text-base font-medium text-foreground">Welcome back, {name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {[profile.department, profile.level ? `${profile.level}L` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {subline ? <p className="mt-1 text-[12px] text-muted-foreground">{subline}</p> : null}
          {timeline.urgency ? (
            <span
              className={cn(
                "mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                timeline.urgency.tone === "urgent"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-primary/10 text-primary",
              )}
            >
              {timeline.urgency.tone === "urgent" ? <AlertTriangle className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              {timeline.urgency.badge}
            </span>
          ) : null}
        </div>

        <TrialBanner />

        {/* Streak */}
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
          <div className={cn(
            "streak-icon-glow grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            activeToday ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground",
          )}>
            <Flame className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">
              {profile.streakDays > 0 ? `${profile.streakDays}-day streak` : "Start your streak"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {activeToday ? "Nice, you've qualified for today." : "Take a mock test today to keep it going."}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-semibold text-primary">{attempts.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">attempts</div>
          </div>
        </div>

        {/* One prominent next action */}
        {resume ? (
          <button
            onClick={() => navigate("mock-run", { courseCode: resume.courseCode })}
            className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-left shadow-sm transition hover:bg-accent/15"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <PlayCircle className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                Pick up where you left off
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{resume.courseTitle}</div>
              <div className="text-[11px] text-muted-foreground">
                Question {Math.min(resume.currentIndex + 1, resume.questionCount)} of {resume.questionCount}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-accent" />
          </button>
        ) : (
          <Button size="lg" className="mb-5 w-full" onClick={() => navigate("mock-tests")}>
            <Zap className="mr-1.5 h-4 w-4" />
            {hasResults ? "Take another mock test" : "Take your first mock test"}
          </Button>
        )}

        {/* Progress snapshot: real mock data only */}
        {snapshot ? (
          <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <GaugeCircle className="h-3.5 w-3.5" /> Progress snapshot
              </h2>
              <button
                onClick={() => navigate("test-history")}
                className="text-[11px] font-medium text-accent hover:text-accent/80"
              >
                History
              </button>
            </div>
            <div className="flex items-end gap-5">
              <div>
                <div className="font-display text-3xl font-semibold leading-none text-primary">{snapshot.avg}%</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">average score</div>
              </div>
              <div>
                <div className="font-display text-3xl font-semibold leading-none text-foreground">
                  {snapshot.latest.score}%
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  latest, {snapshot.latest.courseCode}
                </div>
              </div>
            </div>
            {snapshot.weakest ? (
              <div className="mt-4 space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                    Weakest: {snapshot.weakest.topic} ({snapshot.weakest.course})
                  </span>
                  <TopicPill label={`${snapshot.weakest.score}%`} strength={scoreToStrength(snapshot.weakest.score)} />
                </div>
                {snapshot.strongest && snapshot.strongest.topic !== snapshot.weakest.topic ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                      Strongest: {snapshot.strongest.topic} ({snapshot.strongest.course})
                    </span>
                    <TopicPill label={`${snapshot.strongest.score}%`} strength={scoreToStrength(snapshot.strongest.score)} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Focus card, only once there is real topic data */}
        {snapshot?.weakest ? (
          <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> {focusCopy.label}
            </div>
            <div className="text-sm font-semibold text-foreground">{focusCopy.heading}</div>
            <div className="mt-2 text-[11px] text-muted-foreground">{snapshot.weakest.course}</div>
            <Progress value={snapshot.weakest.score} className="mt-3 h-1.5" />
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => navigate("mock-config", { courseCode: snapshot.weakest!.course })}
            >
              Drill {snapshot.weakest.course}
            </Button>
          </div>
        ) : null}

        {/* Mock prediction card */}
        {predictionCourse ? <FeaturedCourseCard course={predictionCourse} /> : null}

        {/* CGPA status */}
        <CgpaStatusCard />

        {/* Rotating quotes and study tips */}
        <RotatingWisdomCard />

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
          Predictions are statistical estimates. Always cross-check against your official material.
        </p>
      </div>
    </div>
  );
}

/** Back-compat alias: older navigation still points at "dashboard". */
export const DashboardScreen = HomeScreen;

function CgpaStatusCard() {
  const { profile, navigate } = useProfile();
  const actual = profile.cgpaActual;
  const plan = profile.cgpaPlan;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Calculator className="h-3.5 w-3.5" /> CGPA status
      </h2>

      {actual ? (
        <div className="flex items-end gap-5">
          <div>
            <div className="font-display text-3xl font-semibold leading-none text-primary">
              {actual.cumulativeCgpa.toFixed(2)}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {classify(actual.cumulativeCgpa)}
            </div>
          </div>
          {plan ? (
            <div>
              <div className="font-display text-3xl font-semibold leading-none text-foreground">
                {plan.targetCgpa.toFixed(2)}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">your target</div>
            </div>
          ) : null}
        </div>
      ) : plan ? (
        <p className="text-xs text-muted-foreground">
          Target {plan.targetCgpa.toFixed(2)} ({plan.targetClassification}). Needs a semester GPA of{" "}
          {plan.requiredSemesterGpa.toFixed(2)}.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Work out where you actually stand, then set a target and get a study plan around it.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate("cgpa")}>
          Calculator
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("cgpa-goal")}>
          Goal setter
        </Button>
      </div>
    </div>
  );
}

function RotatingWisdomCard() {
  const [deck] = useState<Rotating[]>(() => buildRotatingDeck());
  const [i, setI] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch { /* ignore */ }
    setReduceMotion(reduced);
    const id = window.setInterval(() => setI((c) => (c + 1) % deck.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [deck.length]);

  const item = deck[i];
  if (!item) return null;

  return (
    <figure
      key={i}
      className={cn(
        "quote-card relative mt-6 overflow-hidden rounded-2xl px-6 py-5 text-center",
        !reduceMotion && "quote-card-cycle",
      )}
    >
      {item.kind === "quote" ? (
        <>
          <QuoteIcon className="pointer-events-none absolute -left-1 -top-2 h-16 w-16 text-accent/25" aria-hidden="true" />
          <blockquote className="quote-text relative font-display text-base font-semibold leading-relaxed">
            “{item.quote.quote}”
          </blockquote>
          <figcaption className="relative mt-2 text-xs text-muted-foreground">{item.quote.author}</figcaption>
        </>
      ) : (
        <>
          <Lightbulb className="pointer-events-none absolute -left-1 -top-2 h-14 w-14 text-accent/25" aria-hidden="true" />
          <div className="relative text-[10px] font-semibold uppercase tracking-wider text-accent">Study tip</div>
          <p className="quote-text relative mt-1.5 text-sm font-medium leading-relaxed">{item.tip}</p>
        </>
      )}
    </figure>
  );
}

export function FeaturedCourseCard({ course }: { course: UserCourse }) {
  const { navigate, profile } = useProfile();
  const { order, flashcardsPlaceholderNote } = courseFeatureOrder(profile.studyPreference);

  // Real analysis result for this course, if the student has run one.
  const analysis = profile.courseTopicAnalysis[course.code];
  const topics = analysis?.topics ?? [];
  const avgConfidence = topics.length
    ? Math.round((topics.reduce((s, t) => s + t.confidence, 0) / topics.length) * 100)
    : null;

  const mockBtn = (
    <Button key="mock" className="mt-2 w-full" size="lg" onClick={() => navigate("mock-config", { courseCode: course.code })}>
      <Zap className="mr-1.5 h-4 w-4" /> Start a mock test
    </Button>
  );
  const materialsBtn = (
    <Button key="materials" className="mt-2 w-full" size="lg" variant="outline" onClick={() => navigate("course-detail", { courseCode: course.code })}>
      <Upload className="mr-1.5 h-4 w-4" /> Upload past paper
    </Button>
  );
  const openBtn = (
    <Button key="open" className="mt-2 w-full" size="lg" variant="ghost" onClick={() => navigate("course-detail", { courseCode: course.code })}>
      Open course <ChevronRight className="ml-1 h-4 w-4" />
    </Button>
  );

  // First button in the ordered list is the primary (solid); render others below.
  const primaryKey = order[0];
  const primaryBtn = primaryKey === "materials" ? (
    <Button key="materials-primary" className="mt-4 w-full" size="lg" onClick={() => navigate("course-detail", { courseCode: course.code })}>
      <Upload className="mr-1.5 h-4 w-4" /> Upload past paper
    </Button>
  ) : (
    <Button key="mock-primary" className="mt-4 w-full" size="lg" onClick={() => navigate("mock-config", { courseCode: course.code })}>
      <Zap className="mr-1.5 h-4 w-4" /> Start a mock test
    </Button>
  );
  const secondaryBtn = primaryKey === "materials" ? mockBtn : materialsBtn;

  return (
    <div className={cn(
      "overflow-hidden rounded-3xl border bg-card shadow-sm",
      topics.length ? "prediction-ready-depth border-accent/15" : "border-border",
    )}>
      <div className="bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="h-3 w-3" />
            {topics.length ? "Mock prediction ready" : "No analysis yet"}
          </span>
          <TrendingUp className="h-4 w-4 text-primary-foreground/60" />
        </div>
        <div className="text-xs font-medium text-primary-foreground/70">{course.code}</div>
        <div className="mt-0.5 font-display text-xl font-semibold leading-tight">{course.name}</div>

        {topics.length ? (
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-primary-foreground/15 pt-4">
            <Stat label="Topics found" value={String(topics.length)} />
            <Stat label="Avg prominence" value={`${avgConfidence}%`} />
            <Stat label="Analyzed" value={new Date(analysis!.analyzedAt).toLocaleDateString()} />
          </div>
        ) : null}
      </div>

      <div className="p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Top predicted topics
        </div>
        {topics.length ? (
          <div className="flex flex-wrap gap-1.5">
            {topics.slice(0, 5).map((t) => (
              <TopicPill key={t.topic} label={t.topic} strength={t.confidence} />
            ))}
          </div>
        ) : (
          <div className="text-center text-xs text-muted-foreground">
            <Upload className="mx-auto mb-2 h-5 w-5 opacity-60" aria-hidden="true" />
            <p>Upload your first past paper and tap Analyze Upload to see predictions for {course.code}.</p>
          </div>
        )}

        <AiGeneratedLabel className="mt-4" />

        {primaryBtn}
        {secondaryBtn}
        {openBtn}
        {flashcardsPlaceholderNote ? (
          <>
            <Button className="mt-2 w-full" size="lg" variant="outline" disabled>
              Flashcards · Coming soon
            </Button>
            <p className="mt-2 text-center text-[11px] italic text-muted-foreground">
              Flashcards coming soon, your preferred study method.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-lg font-semibold leading-none">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-primary-foreground/60">{label}</div>
    </div>
  );
}
