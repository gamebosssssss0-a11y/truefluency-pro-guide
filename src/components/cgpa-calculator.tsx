import { useMemo, useState } from "react";
import { useProfile, averageForCourse, type CgpaPlan } from "@/lib/profile-store";
import { buildCgpaPlan, classify, GRADE_SCALE, PROBATION_THRESHOLD } from "@/lib/cgpa";
import { HeaderLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Calculator, Info, AlertCircle, BookOpen, Timer, Target, ListChecks, Zap,
} from "lucide-react";

export function CgpaCalculatorScreen() {
  const { profile, navigate, update } = useProfile();

  const saved = profile.cgpaInputs;
  const [currentCgpa, setCurrentCgpa] = useState(saved?.currentCgpa ?? "");
  const [currentUnits, setCurrentUnits] = useState(saved?.currentUnits ?? "");
  const [targetCgpa, setTargetCgpa] = useState(saved?.targetCgpa ?? "");
  const [daysRemaining, setDaysRemaining] = useState(saved?.daysRemaining ?? "");
  const [units, setUnits] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    profile.courses.forEach((c) => {
      base[c.code] = saved?.units?.[c.code] ?? 3;
    });
    return base;
  });
  const [error, setError] = useState<string | null>(null);

  const plan = profile.cgpaPlan;

  const parsed = useMemo(() => ({
    cgpa: Number(currentCgpa),
    tcu: Number(currentUnits),
    target: Number(targetCgpa),
    days: Number(daysRemaining),
  }), [currentCgpa, currentUnits, targetCgpa, daysRemaining]);

  const calculate = () => {
    const { cgpa, tcu, target, days } = parsed;
    if (!currentCgpa || Number.isNaN(cgpa) || cgpa < 0 || cgpa > 5) {
      setError("Enter your current CGPA on the 0.00 to 5.00 scale.");
      return;
    }
    if (!currentUnits || Number.isNaN(tcu) || tcu < 0) {
      setError("Enter the total credit units you have taken so far (0 if this is your first semester).");
      return;
    }
    if (!targetCgpa || Number.isNaN(target) || target <= 0 || target > 5) {
      setError("Enter a target CGPA between 0.01 and 5.00.");
      return;
    }
    if (!daysRemaining || Number.isNaN(days) || days < 1) {
      setError("Enter how many days you have before exams begin.");
      return;
    }
    if (profile.courses.length === 0) {
      setError("Add at least one course to your profile first.");
      return;
    }
    const bad = profile.courses.find((c) => {
      const u = units[c.code];
      return !u || u < 1 || u > 6;
    });
    if (bad) {
      setError(`Set a credit unit between 1 and 6 for ${bad.code}.`);
      return;
    }
    setError(null);

    const built = buildCgpaPlan({
      currentCgpa: cgpa,
      currentUnits: tcu,
      targetCgpa: target,
      daysRemaining: Math.round(days),
      courses: profile.courses.map((c) => ({
        code: c.code,
        name: c.name,
        units: units[c.code],
        currentAveragePercent: averageForCourse(profile, c.code),
      })),
    });

    update({
      cgpaInputs: { currentCgpa, currentUnits, targetCgpa, daysRemaining, units },
      cgpaPlan: built,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <button
            onClick={() => navigate("settings")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Settings
          </button>
        </div>

        <h1 className="font-display text-3xl font-semibold text-foreground">CGPA calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Work out the grades you need this semester, then get a daily study plan built around them.
        </p>

        {/* Honesty note, deliberately above the results */}
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-accent/40 bg-accent/10 p-3.5 text-xs text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p>
            This plan is calculated once based on what you enter today. It won't automatically
            adjust as you complete mock tests, recalculate anytime by revisiting this screen.
          </p>
        </div>

        {/* Inputs */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Where you stand
        </h2>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <Field label="Current CGPA (0.00 to 5.00)">
            <Input
              inputMode="decimal"
              placeholder="e.g. 3.42"
              value={currentCgpa}
              onChange={(e) => setCurrentCgpa(e.target.value)}
            />
          </Field>
          <Field label="Total credit units completed so far">
            <Input
              inputMode="numeric"
              placeholder="e.g. 48"
              value={currentUnits}
              onChange={(e) => setCurrentUnits(e.target.value)}
            />
          </Field>
          <Field label="Target CGPA">
            <Input
              inputMode="decimal"
              placeholder="e.g. 4.50"
              value={targetCgpa}
              onChange={(e) => setTargetCgpa(e.target.value)}
            />
          </Field>
          <Field label="Days until exams begin">
            <Input
              inputMode="numeric"
              placeholder="e.g. 21"
              value={daysRemaining}
              onChange={(e) => setDaysRemaining(e.target.value)}
            />
          </Field>
        </div>

        {parsed.cgpa > 0 && parsed.cgpa < PROBATION_THRESHOLD ? (
          <div className="mt-3 rounded-2xl border border-border bg-secondary/60 p-3.5 text-xs text-foreground">
            A CGPA below 1.00 sits under the academic probation threshold at UI. Worth knowing early,
            it is recoverable, and the plan below is built to lift it.
          </div>
        ) : null}

        {/* Units per course */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          This semester's courses
        </h2>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Pulled from your confirmed courses. Adjust the credit units to match your course forms.
        </p>
        {profile.courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
            No courses on your profile yet.
          </div>
        ) : (
          <div className="space-y-2">
            {profile.courses.map((c) => (
              <div key={c.code} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{c.code}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{c.name}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    className="h-9 w-16 text-center"
                    inputMode="numeric"
                    min={1}
                    max={6}
                    value={units[c.code] ?? 3}
                    onChange={(e) =>
                      setUnits((u) => ({ ...u, [c.code]: Number(e.target.value) || 0 }))
                    }
                    aria-label={`Credit units for ${c.code}`}
                  />
                  <span className="text-[11px] text-muted-foreground">units</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button size="lg" className="mt-4 w-full" onClick={calculate}>
          <Calculator className="mr-1.5 h-4 w-4" />
          {plan ? "Recalculate my plan" : "Calculate what I need"}
        </Button>

        <GradeScaleCard />

        {plan ? <PlanOutput plan={plan} /> : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function GradeScaleCard() {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        UI grade scale
      </div>
      <div className="space-y-1">
        {GRADE_SCALE.map((g) => (
          <div key={g.grade} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{g.percent}</span>
            <span className="font-semibold text-foreground">
              {g.grade} · {g.points.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        CGPA uses total quality points divided by total credit units, so a 6-unit course moves your
        CGPA far more than a 1-unit one.
      </p>
    </div>
  );
}

function PlanOutput({ plan }: { plan: CgpaPlan }) {
  const { navigate } = useProfile();

  return (
    <div className="mt-8">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Your plan
      </h2>

      <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground shadow-sm">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary-foreground/70">
          <Target className="h-3.5 w-3.5" /> Target {plan.targetCgpa.toFixed(2)}
        </div>
        <div className="mt-1 font-display text-2xl font-semibold leading-tight">
          {plan.targetClassification}
        </div>
        <div className="mt-2 text-xs text-primary-foreground/80">
          Now {plan.currentCgpa.toFixed(2)} ({classify(plan.currentCgpa)}) across{" "}
          {plan.currentUnits} units. {plan.semesterUnits} units this semester,{" "}
          {plan.daysRemaining} days to exams.
        </div>
      </div>

      {!plan.reachable ? (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <div className="font-semibold text-destructive">
              {plan.targetCgpa.toFixed(2)} isn't reachable this semester
            </div>
            <p className="mt-1 text-muted-foreground">
              You would need a semester GPA of {plan.requiredSemesterGpa.toFixed(2)} across{" "}
              {plan.semesterUnits} units, and 5.00 is the maximum. Straight A grades this semester
              would take you to{" "}
              {(
                (plan.currentCgpa * plan.currentUnits + 5 * plan.semesterUnits) /
                (plan.currentUnits + plan.semesterUnits)
              ).toFixed(2)}
              . The plan below is built around all A grades, which is the best outcome available.
            </p>
          </div>
        </div>
      ) : plan.alreadyThere ? (
        <div className="mt-3 rounded-2xl border border-primary/40 bg-primary/10 p-3.5 text-xs text-foreground">
          You are already at or above {plan.targetCgpa.toFixed(2)}. Passing every course keeps you
          there, so the plan below is a maintenance load.
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-border bg-card p-3.5 text-xs text-foreground shadow-sm">
          You need a semester GPA of{" "}
          <span className="font-semibold">{plan.requiredSemesterGpa.toFixed(2)}</span> across{" "}
          {plan.semesterUnits} units to reach {plan.targetCgpa.toFixed(2)}.
        </div>
      )}

      <h3 className="mb-2 mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <ListChecks className="h-3.5 w-3.5" /> Daily breakdown per course
      </h3>
      <div className="space-y-2">
        {plan.courses.map((c) => (
          <div key={c.code} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{c.code}</div>
                <div className="truncate text-[11px] text-muted-foreground">{c.name}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-semibold text-foreground">{c.requiredGrade}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  minimum
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{c.units} units</span>
              <span>·</span>
              <span>{c.requiredPercent}</span>
              <span>·</span>
              <span>{c.requiredPoints.toFixed(2)} points</span>
            </div>

            {c.highImpact ? (
              <div className="mt-2 rounded-xl border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[11px] text-foreground">
                High impact: {c.units} units means this course carries outsized weight in your CGPA.
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-secondary/60 p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Timer className="h-3 w-3" /> Reading
                </div>
                <div className="mt-0.5 text-sm font-semibold text-foreground">
                  {c.dailyReadingMinutes} min/day
                </div>
              </div>
              <div className="rounded-xl bg-secondary/60 p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <BookOpen className="h-3 w-3" /> Mock quota
                </div>
                <div className="mt-0.5 text-sm font-semibold text-foreground">
                  {c.dailyMockQuestions} questions/day
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => navigate("mock-config", { courseCode: c.code })}
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" /> Start {c.code} mock test
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] italic text-muted-foreground">
        Calculated {new Date(plan.createdAt).toLocaleString()}. Recalculating replaces this plan.
      </p>
    </div>
  );
}
