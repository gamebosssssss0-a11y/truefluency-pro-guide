import { useProfile, averageForCourse } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, Upload, Sparkles, ChevronRight } from "lucide-react";
import { AiGeneratedLabel, TopicPill, scoreToStrength } from "@/components/common";

export function CourseDetailScreen() {
  const { profile, navigate, activeCourseCode } = useProfile();
  const course = profile.courses.find((c) => c.code === activeCourseCode);
  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-5 pt-6">
          <Button variant="ghost" onClick={() => navigate("dashboard")}>← Back</Button>
          <p className="mt-6 text-sm text-muted-foreground">Course not found.</p>
        </div>
      </div>
    );
  }

  const avg = averageForCourse(profile, course.code);
  const relevantAttempts = profile.attempts.filter((a) => a.courseCode === course.code).slice(-3).reverse();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <button
          onClick={() => navigate("dashboard")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </button>

        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground shadow-sm">
          <div className="text-xs font-medium text-primary-foreground/70">{course.code}</div>
          <div className="mt-0.5 font-display text-2xl font-semibold leading-tight">{course.name}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-primary-foreground/60">
            {course.status} · {course.source === "manual" ? "Manually added" : "Verified"}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button size="lg" onClick={() => navigate("mock-gen", { courseCode: course.code })}>
            <Zap className="mr-1.5 h-4 w-4" /> Mock test
          </Button>
          <Button size="lg" variant="outline">
            <Upload className="mr-1.5 h-4 w-4" /> Upload paper
          </Button>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Predicted topics
          </div>
          <div className="flex flex-wrap gap-1.5">
            <TopicPill label="Core Concepts" strength={0.85} />
            <TopicPill label="Applications" strength={0.6} />
            <TopicPill label="Theory & Proofs" strength={0.4} />
            <TopicPill label="Edge cases" strength={0.2} />
          </div>
          <AiGeneratedLabel className="mt-3" />
        </div>

        <div className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your recent attempts
          </h2>
          {relevantAttempts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
              No attempts yet. Start a mock test to build your topic profile.
            </div>
          ) : (
            <div className="space-y-2">
              {avg !== null ? (
                <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Average score</div>
                    <TopicPill label={`${avg}%`} strength={scoreToStrength(avg)} big />
                  </div>
                </div>
              ) : null}
              {relevantAttempts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{a.correct}/{a.total} correct</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(a.submittedAt).toLocaleDateString()} · {a.total} questions
                    </div>
                  </div>
                  <TopicPill label={`${a.score}%`} strength={scoreToStrength(a.score)} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
