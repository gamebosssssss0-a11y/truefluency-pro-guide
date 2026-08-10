import { useMemo, useState } from "react";
import { useProfile, averageForCourse, type MockAttempt } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HeaderLogo } from "@/components/brand";
import { TopicPill, scoreToStrength, AiGeneratedLabel, CourseDescription } from "@/components/common";
import {
  ArrowLeft, BookOpen, ChevronRight, History, Sparkles, Zap, TrendingUp, TrendingDown,
  Minus, AlertTriangle, RotateCcw, Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ================= Tab 2: Mock Tests ================= */

export function MockTestsScreen() {
  const { profile, navigate } = useProfile();
  const attempts = [...profile.attempts].sort((a, b) => b.submittedAt - a.submittedAt);
  const recent = attempts.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mock Tests
          </span>
        </div>

        <h1 className="font-display text-3xl font-semibold text-foreground">Mock tests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a course, set it up how you want, then sit the test.
        </p>

        {/* Course selection */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Choose a course
        </h2>
        {profile.courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-5 text-center text-xs text-muted-foreground">
            No courses on your profile yet. Add one from the Account tab.
          </div>
        ) : (
          <div className="space-y-2.5">
            {profile.courses.map((c) => {
              const analysis = profile.courseTopicAnalysis[c.code];
              const avg = averageForCourse(profile, c.code);
              return (
                <div
                  key={c.code}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-accent/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                      <BookOpen className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">{c.code}</div>
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
                    <Button size="sm" onClick={() => navigate("mock-config", { courseCode: c.code })}>
                      <Zap className="mr-1.5 h-3.5 w-3.5" /> Customize
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
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
  const { profile, navigate, update } = useProfile();
  const [tab, setTab] = useState<HistoryTab>("attempts");
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const all = useMemo(
    () => [...profile.attempts].sort((a, b) => b.submittedAt - a.submittedAt),
    [profile.attempts],
  );
  const filtered = courseFilter === "all" ? all : all.filter((a) => a.courseCode === courseFilter);
  const courseCodes = Array.from(new Set(all.map((a) => a.courseCode)));

  return (
    <div className="min-h-screen bg-background">
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

        {all.length === 0 ? (
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
              {filtered.map((a) => (
                <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-sm font-semibold",
                        a.score >= 70
                          ? "bg-success/15 text-success"
                          : a.score >= 50
                            ? "bg-warning/15 text-warning"
                            : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {a.score}%
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">{a.courseCode}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{a.courseTitle}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(a.submittedAt).toLocaleString()}
                      </div>
                      {a.settings ? (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {a.settings.questionCount} questions · {a.settings.minutes} min ·{" "}
                          <span className="capitalize">{a.settings.difficulty}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {a.topics.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {a.topics.map((t) => (
                        <TopicPill
                          key={t.topic}
                          label={`${t.topic} ${t.score}%`}
                          strength={scoreToStrength(t.score)}
                        />
                      ))}
                    </div>
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
              ))}
            </div>
          </>
        ) : (
          <ProgressPanel attempts={all} />
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

/* ---------- Progress over time ---------- */

export function ProgressPanel({ attempts }: { attempts: MockAttempt[] }) {
  const chronological = useMemo(
    () => [...attempts].sort((a, b) => a.submittedAt - b.submittedAt),
    [attempts],
  );

  const trend = useMemo(() => {
    if (chronological.length < 2) return null;
    const half = Math.floor(chronological.length / 2);
    const avg = (xs: MockAttempt[]) => xs.reduce((s, a) => s + a.score, 0) / xs.length;
    const before = avg(chronological.slice(0, half));
    const after = avg(chronological.slice(half));
    return Math.round(after - before);
  }, [chronological]);

  /** Topics scored under 60% in at least two separate attempts. */
  const struggles = useMemo(() => {
    const map = new Map<string, { low: number; total: number; last: number }>();
    chronological.forEach((a) => {
      a.topics.forEach((t) => {
        const key = `${a.courseCode}||${t.topic}`;
        const cur = map.get(key) ?? { low: 0, total: 0, last: t.score };
        cur.total += 1;
        if (t.score < 60) cur.low += 1;
        cur.last = t.score;
        map.set(key, cur);
      });
    });
    return Array.from(map.entries())
      .filter(([, v]) => v.low >= 2)
      .map(([key, v]) => {
        const [course, topic] = key.split("||");
        return { course, topic, ...v };
      })
      .sort((a, b) => b.low - a.low);
  }, [chronological]);

  const best = Math.max(...chronological.map((a) => a.score));

  return (
    <div className="mt-4">
      <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground shadow-sm">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary-foreground/70">
          <Trophy className="h-3.5 w-3.5" /> Across {chronological.length} attempt
          {chronological.length === 1 ? "" : "s"}
        </div>
        <div className="mt-2 flex items-end gap-4">
          <div>
            <div className="font-display text-3xl font-semibold leading-none">{best}%</div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-primary-foreground/60">
              best score
            </div>
          </div>
          {trend !== null ? (
            <div>
              <div className="flex items-center gap-1 font-display text-3xl font-semibold leading-none">
                {trend > 0 ? <TrendingUp className="h-5 w-5" /> : trend < 0 ? <TrendingDown className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                {trend > 0 ? "+" : ""}{trend}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-primary-foreground/60">
                points, recent vs earlier
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Score over time
      </h2>
      <div className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
        {chronological.map((a) => (
          <div key={a.id} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-[10px] text-muted-foreground">
              {new Date(a.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
            <Progress value={a.score} className="h-1.5 flex-1" />
            <span className="w-14 shrink-0 text-right text-[11px] font-semibold text-foreground">
              {a.score}% <span className="font-normal text-muted-foreground">{a.courseCode}</span>
            </span>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Topics you keep struggling with
      </h2>
      {struggles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
          Nothing has dropped below 60% twice yet. Sit a few more tests and repeat weak spots will
          show up here.
        </div>
      ) : (
        <div className="space-y-2">
          {struggles.map((s) => (
            <div
              key={`${s.course}-${s.topic}`}
              className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{s.topic}</div>
                <div className="text-[11px] text-muted-foreground">
                  {s.course} · below 60% in {s.low} of {s.total} attempts · last {s.last}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AiGeneratedLabel className="mt-5" />
    </div>
  );
}
