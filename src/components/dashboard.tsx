import { useMemo } from "react";
import { useProfile, averageForCourse, hasQualifyingActivityToday, type UserCourse } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Settings as SettingsIcon, Sparkles, Upload, ChevronRight, TrendingUp,
  BookOpen, Flame, Target, PlayCircle, Zap, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AiGeneratedLabel, TopicPill, scoreToStrength } from "@/components/common";
import { focusCardCopy, greetingSubline, timelineDefaults, courseFeatureOrder } from "@/lib/personalization";

export function DashboardScreen() {
  const { profile, navigate } = useProfile();
  const name = profile.identity?.name ?? "there";
  const courses = profile.courses;

  const [firstCourse, ...rest] = courses;

  const activeToday = hasQualifyingActivityToday(profile);

  // "Focus on this" = lowest-scoring topic across recent attempts.
  const focus = useMemo(() => {
    if (!profile.topicScores.length) return null;
    return [...profile.topicScores].sort((a, b) => a.score - b.score)[0];
  }, [profile.topicScores]);

  const resume = profile.inProgressTest;
  const timeline = timelineDefaults(profile.timeline);
  const subline = greetingSubline(profile.goal);
  const focusCopy = focusCardCopy(profile.goal, focus?.topic ?? "");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Welcome back
            </div>
            <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-foreground">
              Hi, {name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.department} · {profile.level}L
            </p>
            {subline ? (
              <p className="mt-1 text-[12px] text-muted-foreground">{subline}</p>
            ) : null}
            {timeline.urgency ? (
              <span
                className={cn(
                  "mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  timeline.urgency.tone === "urgent"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-primary/10 text-primary"
                )}
              >
                {timeline.urgency.tone === "urgent" ? <AlertTriangle className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {timeline.urgency.badge}
              </span>
            ) : null}
          </div>
          <button
            onClick={() => navigate("settings")}
            className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition hover:text-accent"
            aria-label="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Streak strip */}
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
          <div className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            activeToday ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
          )}>
            <Flame className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">
              {profile.streakDays > 0 ? `${profile.streakDays}-day streak` : "Start your streak"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {activeToday
                ? "Nice, you've qualified for today."
                : "Take a mock test today to keep it going."}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-semibold text-primary">{profile.attempts.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">attempts</div>
          </div>
        </div>

        {/* Resume in-progress test */}
        {resume ? (
          <button
            onClick={() => navigate("mock-run", { courseCode: resume.courseCode })}
            className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-left shadow-sm transition hover:bg-accent/15"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <PlayCircle className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">Pick up where you left off</div>
              <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{resume.courseTitle}</div>
              <div className="text-[11px] text-muted-foreground">
                Question {Math.min(resume.currentIndex + 1, resume.questionCount)} of {resume.questionCount}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-accent" />
          </button>
        ) : null}

        {/* Focus card */}
        {focus ? (
          <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> {focusCopy.label}
            </div>
            <div className="text-sm font-semibold text-foreground">{focusCopy.heading}</div>
            <div className="mt-2 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-muted-foreground">{focus.course}</div>
              </div>
              <TopicPill label={`${focus.score}%`} strength={scoreToStrength(focus.score)} big />
            </div>
            <Progress value={focus.score} className="mt-3 h-1.5" />
          </div>
        ) : null}

        {/* Featured course with mock prediction preview */}
        {firstCourse ? <FeaturedCourseCard course={firstCourse} /> : null}

        {/* Section heading */}
        <div className="mb-3 mt-8 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your courses</h2>
          <span className="text-[11px] text-muted-foreground">{courses.length} total</span>
        </div>

        <div className="space-y-2.5">
          {rest.map((c) => (
            <CourseCard key={c.code} course={c} avg={averageForCourse(profile, c.code)} />
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
          Predictions are statistical estimates. Always cross-check against your official material.
        </p>
      </div>
    </div>
  );
}

function FeaturedCourseCard({ course }: { course: UserCourse }) {
  const { navigate, profile } = useProfile();
  const { order, flashcardsPlaceholderNote } = courseFeatureOrder(profile.studyPreference);

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
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="h-3 w-3" /> Mock prediction ready
          </span>
          <TrendingUp className="h-4 w-4 text-primary-foreground/60" />
        </div>
        <div className="text-xs font-medium text-primary-foreground/70">{course.code}</div>
        <div className="mt-0.5 font-display text-xl font-semibold leading-tight">{course.name}</div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-primary-foreground/15 pt-4">
          <Stat label="Predicted topics" value="8" />
          <Stat label="Confidence" value="72%" />
          <Stat label="Past papers" value="5 yrs" />
        </div>
      </div>

      <div className="p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Top predicted topics
        </div>
        <div className="flex flex-wrap gap-1.5">
          <TopicPill label="Recursion & Trees" strength={0.9} />
          <TopicPill label="Sorting Algorithms" strength={0.75} />
          <TopicPill label="Complexity Analysis" strength={0.55} />
          <TopicPill label="Graph Traversal" strength={0.35} />
          <TopicPill label="Dynamic Programming" strength={0.15} />
        </div>

        <AiGeneratedLabel className="mt-4" />

        {primaryBtn}
        {secondaryBtn}
        {openBtn}
        {flashcardsPlaceholderNote ? (
          <p className="mt-2 text-center text-[11px] italic text-muted-foreground">
            Flashcards coming soon, your preferred study method.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CourseCard({ course, avg }: { course: UserCourse; avg: number | null }) {
  const { navigate } = useProfile();
  return (
    <button
      onClick={() => navigate("course-detail", { courseCode: course.code })}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-accent/50"
    >
      <div className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
        course.source === "manual" ? "bg-warning/15 text-warning" :
        course.status === "Compulsory" ? "bg-primary text-primary-foreground" :
        course.status === "Required" ? "bg-secondary text-primary" :
        "bg-accent/15 text-accent"
      )}>
        <BookOpen className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground">{course.code}</span>
          {course.source === "manual" ? (
            <span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-warning">
              Manually Added
            </span>
          ) : (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {course.status}
            </span>
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground">{course.name}</div>
        {avg !== null ? (
          <div className="mt-1.5">
            <TopicPill label={`Avg ${avg}%`} strength={scoreToStrength(avg)} />
          </div>
        ) : (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Upload className="h-3 w-3" />
            Upload your first past paper to unlock predictions for {course.code}
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-lg font-semibold leading-none">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-primary-foreground/60">{label}</div>
    </div>
  );
}
