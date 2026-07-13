import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { GraduationCap, Settings as SettingsIcon, Sparkles, Upload, ChevronRight, TrendingUp, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Course } from "@/lib/uni-data";

function TopicPill({ label, strength }: { label: string; strength: number }) {
  // strength 0..1 → red to green
  const hue = Math.round(strength * 130); // 0=red, 130=green
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
      style={{
        borderColor: `hsl(${hue} 70% 55% / 0.35)`,
        backgroundColor: `hsl(${hue} 70% 55% / 0.12)`,
        color: `hsl(${hue} 60% 30%)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: `hsl(${hue} 65% 45%)` }}
      />
      {label}
    </span>
  );
}

export function DashboardScreen() {
  const { profile, resetSetup } = useProfile();
  const name = profile.identity?.name ?? "there";
  const courses = profile.courses;

  // Attach a mock prediction preview only to the first course.
  const [firstCourse, ...rest] = courses;

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
          </div>
          <button
            onClick={() => {
              if (confirm("Reset your setup? This will clear your saved profile and disclaimer acceptance.")) {
                resetSetup();
              }
            }}
            className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition hover:text-accent"
            aria-label="Settings"
          >
            <SettingsIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Featured / first course with mock prediction */}
        {firstCourse ? (
          <FeaturedCourseCard course={firstCourse} />
        ) : null}

        {/* Section heading */}
        <div className="mb-3 mt-8 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your courses
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {courses.length} total
          </span>
        </div>

        <div className="space-y-2.5">
          {rest.map((c) => (
            <CourseCard key={c.code} course={c} />
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
          Predictions are statistical estimates. Always cross-check against your official material.
        </p>
      </div>
    </div>
  );
}

function FeaturedCourseCard({ course }: { course: Course }) {
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
        <div className="mt-0.5 font-display text-xl font-semibold leading-tight">{course.title}</div>

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

        <p className="mt-4 text-[11px] italic text-muted-foreground">
          AI-generated — verify against your material.
        </p>

        <Button className="mt-4 w-full" size="lg">
          Open course
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
        course.kind === "compulsory" ? "bg-primary text-primary-foreground"
          : course.kind === "required" ? "bg-secondary text-primary"
          : "bg-accent/15 text-accent"
      )}>
        <BookOpen className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{course.code}</span>
          {course.kind !== "department" ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {course.kind}
            </span>
          ) : null}
        </div>
        <div className="truncate text-xs text-muted-foreground">{course.title}</div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Upload className="h-3 w-3" />
          Upload your first past paper to unlock predictions for {course.code}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
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
