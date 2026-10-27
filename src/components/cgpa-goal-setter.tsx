import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  useProfile,
  averageForCourse,
  type CgpaInputs,
  type CgpaPlan,
  type CourseTestSettings,
  type Profile,
} from "@/lib/profile-store";
import {
  buildCgpaPlan,
  classify,
  daysUntil,
  GRADE_SCALE,
  leverageIndex,
  maxAchievableCgpa,
  PROBATION_THRESHOLD,
} from "@/lib/cgpa";
import { HeaderLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CgpaCoursePicker, useCgpaCourseSelection } from "@/components/cgpa-course-picker";
import { defaultMinutesForCount, MIN_QUESTIONS } from "@/components/mock-test-flow";
import { canonicalCourseCode } from "@/lib/course-code";
import { pushPlanHistory } from "@/lib/cloud-sync";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calculator,
  CalendarDays,
  Info,
  ListChecks,
  Lock,
  Target,
  Timer,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_CGPA = 5;

type PendingPlan = {
  plan: CgpaPlan;
  inputs: CgpaInputs;
  previousPlan: CgpaPlan | null;
};

type Feasibility = {
  requiredSemesterGpa: number;
  maxAchievableCgpa: number;
  alreadyThere: boolean;
  reachable: boolean;
};

function moveToNextNumericField(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const form = event.currentTarget.closest("[data-cgpa-form]");
  const fields = Array.from(
    form?.querySelectorAll<HTMLInputElement>('input[data-cgpa-numeric="true"]') ?? [],
  ).filter((field) => !field.disabled);
  const index = fields.indexOf(event.currentTarget);
  if (index < 0 || index === fields.length - 1) {
    event.currentTarget.blur();
    return;
  }
  fields[index + 1].focus();
}

function isDateISO(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function localDateISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weakestTopicsForCourse(profile: Profile, courseCode: string): string[] {
  const code = canonicalCourseCode(courseCode);
  const byTopic = new Map<string, { total: number; count: number }>();
  for (const score of profile.topicScores) {
    if (canonicalCourseCode(score.course) !== code || !Number.isFinite(score.score)) continue;
    const topic = score.topic.trim();
    if (!topic) continue;
    const current = byTopic.get(topic) ?? { total: 0, count: 0 };
    current.total += score.score;
    current.count += 1;
    byTopic.set(topic, current);
  }
  return [...byTopic.entries()]
    .map(([topic, value]) => ({ topic, average: value.total / value.count }))
    .sort((a, b) => a.average - b.average || a.topic.localeCompare(b.topic))
    .slice(0, 2)
    .map((item) => item.topic);
}

function daysInSchedulePhases(daysLeft: number) {
  const days = Math.max(0, Math.floor(daysLeft));
  if (days >= 14) {
    return { volumeDays: days - 7, simulationDays: 5, finalRevisionDays: 2 };
  }
  if (days < 3) {
    return { volumeDays: 0, simulationDays: 0, finalRevisionDays: days };
  }

  const weights = [7, 5, 2] as const;
  const remaining = days - 3;
  const extras = weights.map((weight) => (remaining * weight) / 14);
  const allocated = extras.map(Math.floor);
  const remainingSlots = remaining - allocated.reduce((sum, count) => sum + count, 0);
  const priority = extras
    .map((extra, index) => ({ index, fraction: extra - Math.floor(extra) }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  for (let index = 0; index < remainingSlots; index += 1) {
    allocated[priority[index].index] += 1;
  }

  return {
    volumeDays: allocated[0] + 1,
    simulationDays: allocated[1] + 1,
    finalRevisionDays: allocated[2] + 1,
  };
}

function dayRangeLabel(startDay: number, days: number): string {
  if (days <= 0) return "No days in this phase";
  const endDay = startDay - days + 1;
  return startDay === endDay ? `Day ${startDay}` : `Days ${startDay}–${endDay}`;
}

export function CgpaGoalSetterScreen() {
  const { profile, navigate, update } = useProfile();
  const { selected: rows } = useCgpaCourseSelection("cgpaGoalCourses");
  const saved = profile.cgpaInputs;
  const plan = profile.cgpaPlan;
  const actual = profile.cgpaActual;
  const [currentCgpa, setCurrentCgpa] = useState(
    saved?.currentCgpa ?? (actual ? actual.cumulativeCgpa.toFixed(2) : ""),
  );
  const [currentUnits, setCurrentUnits] = useState(
    saved?.currentUnits ?? (actual ? String(actual.totalUnits) : ""),
  );
  const [targetCgpa, setTargetCgpa] = useState(saved?.targetCgpa ?? "");
  const [examDate, setExamDate] = useState(saved?.examDate ?? plan?.examDate ?? "");
  const [units, setUnits] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    profile.courses.forEach((course) => {
      const code = canonicalCourseCode(course.code);
      base[code] = saved?.units?.[code] ?? saved?.units?.[course.code] ?? 3;
    });
    return base;
  });
  const [error, setError] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);
  const examDateInput = useRef<HTMLInputElement>(null);

  const parsed = useMemo(
    () => ({
      cgpa: Number(currentCgpa),
      completedUnits: Number(currentUnits),
      target: Number(targetCgpa),
    }),
    [currentCgpa, currentUnits, targetCgpa],
  );

  const legacyDaysRaw = saved?.daysRemaining || (plan ? String(plan.daysRemaining) : "");
  const legacyDays = Number(legacyDaysRaw);
  const hasLegacyCountdown = !examDate && legacyDaysRaw !== "" && Number.isFinite(legacyDays);
  const inputDaysLeft = examDate && isDateISO(examDate) ? daysUntil(examDate) : null;

  const feasibility = useMemo<Feasibility | null>(() => {
    if (
      !currentCgpa.trim() ||
      !currentUnits.trim() ||
      !targetCgpa.trim() ||
      !Number.isFinite(parsed.cgpa) ||
      parsed.cgpa < 0 ||
      parsed.cgpa > MAX_CGPA ||
      !Number.isFinite(parsed.completedUnits) ||
      parsed.completedUnits < 0 ||
      !Number.isFinite(parsed.target) ||
      parsed.target <= 0 ||
      parsed.target > MAX_CGPA ||
      rows.length === 0
    ) {
      return null;
    }
    const selectedUnits = rows.map((course) => {
      const code = canonicalCourseCode(course.code);
      return units[code] ?? units[course.code] ?? 3;
    });
    if (selectedUnits.some((value) => !Number.isFinite(value) || value < 1 || value > 6)) {
      return null;
    }
    const semesterUnits = selectedUnits.reduce((sum, value) => sum + value, 0);
    if (semesterUnits <= 0) return null;
    const totalUnits = parsed.completedUnits + semesterUnits;
    const needed =
      (parsed.target * totalUnits - parsed.cgpa * parsed.completedUnits) / semesterUnits;
    return {
      requiredSemesterGpa: needed,
      maxAchievableCgpa: maxAchievableCgpa(parsed.cgpa, parsed.completedUnits, semesterUnits),
      alreadyThere: needed <= 0,
      reachable: needed <= MAX_CGPA,
    };
  }, [currentCgpa, currentUnits, parsed, rows, targetCgpa, units]);

  const commitPlan = async (draft: PendingPlan) => {
    setSavingPlan(true);
    setHistoryNotice(null);
    try {
      if (draft.previousPlan) {
        try {
          await pushPlanHistory(draft.previousPlan);
        } catch (historyError) {
          console.error("[cgpa-goal-setter] previous plan history save failed", historyError);
          setHistoryNotice(
            "We couldn't save the previous plan to history, but your new plan has been saved.",
          );
        }
      }
      update({ cgpaInputs: draft.inputs, cgpaPlan: draft.plan });
      setPendingPlan(null);
    } finally {
      setSavingPlan(false);
    }
  };

  const calculate = () => {
    if (
      !currentCgpa.trim() ||
      !Number.isFinite(parsed.cgpa) ||
      parsed.cgpa < 0 ||
      parsed.cgpa > 5
    ) {
      setError("Enter your current CGPA on the 0.00 to 5.00 scale.");
      return;
    }
    if (
      !currentUnits.trim() ||
      !Number.isFinite(parsed.completedUnits) ||
      parsed.completedUnits < 0
    ) {
      setError(
        "Enter the total credit units you have taken so far (0 if this is your first semester).",
      );
      return;
    }
    if (
      !targetCgpa.trim() ||
      !Number.isFinite(parsed.target) ||
      parsed.target <= 0 ||
      parsed.target > 5
    ) {
      setError("Enter a target CGPA between 0.01 and 5.00.");
      return;
    }
    if (!examDate || !isDateISO(examDate)) {
      setError(
        "Pick your exam date before recalculating. A saved day count cannot be used to guess a date.",
      );
      return;
    }
    if (rows.length === 0) {
      setError("Choose at least one course for this plan.");
      return;
    }
    const bad = rows.find((course) => {
      const code = canonicalCourseCode(course.code);
      const value = units[code] ?? units[course.code] ?? 3;
      return !Number.isFinite(value) || value < 1 || value > 6;
    });
    if (bad) {
      setError(`Set a credit unit between 1 and 6 for ${bad.code}.`);
      return;
    }
    setError(null);

    const daysRemaining = daysUntil(examDate);
    const built = buildCgpaPlan({
      currentCgpa: parsed.cgpa,
      currentUnits: parsed.completedUnits,
      targetCgpa: parsed.target,
      daysRemaining,
      courses: rows.map((course) => {
        const code = canonicalCourseCode(course.code);
        return {
          code: course.code,
          name: course.name,
          units: units[code] ?? units[course.code] ?? 3,
          currentAveragePercent: averageForCourse(profile, course.code),
        };
      }),
    });
    const nextPlan: CgpaPlan = {
      ...built,
      examDate,
      lockedAt: Date.now(),
      courses: built.courses.map((course) => ({
        ...course,
        leverageIndex: leverageIndex(course.units, averageForCourse(profile, course.code)),
      })),
    };
    const normalizedUnits = Object.fromEntries(
      Object.entries(units).map(([code, value]) => [canonicalCourseCode(code), value]),
    );
    const nextInputs: CgpaInputs = {
      currentCgpa,
      currentUnits,
      targetCgpa,
      daysRemaining: String(daysRemaining),
      examDate,
      units: normalizedUnits,
    };
    const draft: PendingPlan = {
      plan: nextPlan,
      inputs: nextInputs,
      previousPlan: plan,
    };

    if (plan) {
      setPendingPlan(draft);
    } else {
      void commitPlan(draft);
    }
  };

  return (
    <div data-cgpa-form="goal-setter" className="study-utility-page min-h-screen">
      <div data-cgpa-scroll className="mx-auto max-w-md px-5 pb-32 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <button
            onClick={() => navigate("account")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Account
          </button>
        </div>

        <h1 className="font-display text-3xl font-semibold text-navy">CGPA goal setter</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a target CGPA, see the grades it needs this semester, then get a daily study plan
          built around them.
        </p>

        {actual ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Prefilled from your CGPA calculator run on{" "}
            {new Date(actual.calculatedAt).toLocaleDateString()}. Edit anything that looks off.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => navigate("cgpa")}
            className="mt-3 text-left text-[11px] font-medium text-accent underline-offset-4 hover:underline"
          >
            Not sure of your current CGPA? Work it out in the CGPA calculator first.
          </button>
        )}

        <h2 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your inputs
        </h2>
        <div className="space-y-3 rounded-2xl border border-border bg-sand p-4 shadow-sm">
          <Field label="Current CGPA (0.00 to 5.00)">
            <Input
              inputMode="decimal"
              enterKeyHint="next"
              data-cgpa-numeric="true"
              onKeyDown={moveToNextNumericField}
              placeholder="e.g. 3.42"
              value={currentCgpa}
              onChange={(event) => setCurrentCgpa(event.target.value)}
            />
          </Field>
          <Field label="Completed credit units">
            <Input
              inputMode="numeric"
              enterKeyHint="next"
              data-cgpa-numeric="true"
              onKeyDown={moveToNextNumericField}
              placeholder="e.g. 48"
              value={currentUnits}
              onChange={(event) => setCurrentUnits(event.target.value)}
            />
          </Field>
          <Field label="Target CGPA">
            <Input
              inputMode="decimal"
              enterKeyHint={rows.length ? "next" : "done"}
              data-cgpa-numeric="true"
              onKeyDown={moveToNextNumericField}
              placeholder="e.g. 4.50"
              value={targetCgpa}
              onChange={(event) => setTargetCgpa(event.target.value)}
            />
          </Field>
          <Field label="Exam date">
            <Input
              ref={examDateInput}
              type="date"
              value={examDate}
              onChange={(event) => setExamDate(event.target.value)}
              aria-label="Exam date"
            />
          </Field>
          {inputDaysLeft !== null ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-navy">
              <CalendarDays className="h-3.5 w-3.5 text-accent" />
              {inputDaysLeft} {inputDaysLeft === 1 ? "day" : "days"} until exams
            </p>
          ) : null}
          {hasLegacyCountdown ? (
            <div className="rounded-xl border border-border bg-card/80 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <p>{legacyDays} days remaining in your saved countdown.</p>
              <p className="mt-1">Pick your exam date so this plan counts down automatically.</p>
              <p>A date is required the next time you recalculate; no date has been guessed.</p>
            </div>
          ) : null}
        </div>

        {feasibility ? (
          feasibility.reachable ? (
            <div className="mt-3 rounded-2xl border border-secondary bg-secondary/60 p-3.5 text-xs text-foreground">
              {feasibility.alreadyThere ? (
                <span>Target already met. A steady semester can help maintain it.</span>
              ) : (
                <span>
                  Target feasible: needs {Math.max(0, feasibility.requiredSemesterGpa).toFixed(2)}
                  semester GPA.
                </span>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-accent/45 bg-accent/10 p-3.5 text-xs text-navy">
              Highest possible CGPA this semester is {feasibility.maxAchievableCgpa.toFixed(2)}.
              Your plan aims for that.
            </div>
          )
        ) : null}

        {parsed.cgpa > 0 && parsed.cgpa < PROBATION_THRESHOLD ? (
          <div className="mt-3 rounded-2xl border border-border bg-secondary/60 p-3.5 text-xs text-foreground">
            A CGPA below {PROBATION_THRESHOLD.toFixed(2)} sits under the academic probation
            threshold at UI. It is recoverable, and the plan below is built to lift it.
          </div>
        ) : null}

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          This semester’s courses
        </h2>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Pick the courses this plan should cover, then adjust the credit units to match your course
          forms.
        </p>
        <CgpaCoursePicker
          field="cgpaGoalCourses"
          helper="Search and add the courses you want in this plan, or remove any you don't."
        />
        <div className="mt-3" />
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
            No courses chosen yet. Use “Choose courses” above to add them.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((course, index) => {
              const code = canonicalCourseCode(course.code);
              const value = units[code] ?? units[course.code] ?? 3;
              return (
                <div
                  key={course.code}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-navy">{code}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{course.name}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      className="h-9 w-16 text-center"
                      inputMode="numeric"
                      enterKeyHint={index === rows.length - 1 ? "done" : "next"}
                      data-cgpa-numeric="true"
                      onKeyDown={moveToNextNumericField}
                      min={1}
                      max={6}
                      value={value}
                      onChange={(event) =>
                        setUnits((current) => ({
                          ...current,
                          [code]: Number(event.target.value) || 0,
                        }))
                      }
                      aria-label={`Credit units for ${course.code}`}
                    />
                    <span className="text-[11px] text-muted-foreground">units</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span>{error}</span>
          </div>
        ) : null}

        <GradeScaleCard />
        {historyNotice ? (
          <div className="mt-4 rounded-xl border border-border bg-secondary/60 p-3 text-[11px] text-foreground">
            {historyNotice}
          </div>
        ) : null}
        {plan ? (
          <PlanOutput
            plan={plan}
            profile={profile}
            onChooseNewDate={() => examDateInput.current?.focus()}
          />
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background/95 px-4 pt-3 shadow-lg backdrop-blur md:bottom-0">
        <div className="mx-auto w-full max-w-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            size="lg"
            className="w-full bg-accent text-navy shadow-sm hover:bg-accent/90"
            onClick={calculate}
            disabled={savingPlan}
          >
            <Calculator className="mr-1.5 h-4 w-4" />
            {savingPlan ? "Saving plan…" : plan ? "Recalculate plan" : "Lock plan and begin Day 1"}
          </Button>
        </div>
      </div>

      <AlertDialog
        open={Boolean(pendingPlan)}
        onOpenChange={(open) => {
          if (!open && !savingPlan) setPendingPlan(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your current plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Your previous plan is kept in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingPlan}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-accent text-navy hover:bg-accent/90"
              disabled={savingPlan || !pendingPlan}
              onClick={(event) => {
                event.preventDefault();
                if (pendingPlan) void commitPlan(pendingPlan);
              }}
            >
              {savingPlan ? "Saving…" : "Replace plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-navy/65">
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
        {GRADE_SCALE.map((grade) => (
          <div key={grade.grade} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{grade.percent}</span>
            <span className="font-semibold text-navy">
              {grade.grade} · {grade.points.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        CGPA uses total quality points divided by total credit units, so a 6-unit course moves your
        CGPA more than a 1-unit one.
      </p>
    </div>
  );
}

function PlanOutput({
  plan,
  profile,
  onChooseNewDate,
}: {
  plan: CgpaPlan;
  profile: Profile;
  onChooseNewDate: () => void;
}) {
  const { navigate, update } = useProfile();
  const courses = Array.isArray(plan.courses) ? plan.courses : [];
  const sortedCourses = [...courses].sort((left, right) => {
    const leftLeverage =
      left.leverageIndex ?? leverageIndex(left.units, averageForCourse(profile, left.code));
    const rightLeverage =
      right.leverageIndex ?? leverageIndex(right.units, averageForCourse(profile, right.code));
    return (
      rightLeverage - leftLeverage ||
      right.units - left.units ||
      left.code.localeCompare(right.code)
    );
  });
  const daysLeft = plan.examDate
    ? daysUntil(plan.examDate)
    : Math.max(0, Math.floor(Number.isFinite(plan.daysRemaining) ? plan.daysRemaining : 0));
  const examDatePassed = plan.examDate ? plan.examDate < localDateISO() : false;
  const schedule = daysInSchedulePhases(daysLeft);
  const topTwo = sortedCourses.slice(0, 2);
  const topCourse = sortedCourses[0];
  const gradeCounts = GRADE_SCALE.map((grade) => ({
    grade,
    count: courses.filter((course) => course.requiredGrade === grade.grade).length,
  })).filter((item) => item.count > 0);
  const maxAchievable = maxAchievableCgpa(plan.currentCgpa, plan.currentUnits, plan.semesterUnits);
  const createdTimestamp = plan.lockedAt ?? plan.createdAt;
  const createdLabel = Number.isFinite(createdTimestamp)
    ? new Date(createdTimestamp).toLocaleString()
    : "a previous session";

  const startPractice = (courseCode: string) => {
    const existing =
      profile.courseTestSettings[courseCode] ??
      profile.courseTestSettings[canonicalCourseCode(courseCode)];
    const nextSettings: CourseTestSettings = {
      questionCount: existing?.questionCount ?? MIN_QUESTIONS,
      minutes: existing?.minutes ?? defaultMinutesForCount(MIN_QUESTIONS),
      difficulty: existing?.difficulty ?? "balanced",
      topicFocus: weakestTopicsForCourse(profile, courseCode),
    };
    update({
      courseTestSettings: {
        ...profile.courseTestSettings,
        [courseCode]: nextSettings,
      },
    });
    navigate("mock-config", { courseCode });
  };

  const volumeDaysStart = daysLeft;
  const simulationDaysStart = volumeDaysStart - schedule.volumeDays;
  const finalDaysStart = simulationDaysStart - schedule.simulationDays;
  const weakestFocus = topTwo
    .map((course) => {
      const topic = weakestTopicsForCourse(profile, course.code)[0];
      return topic ? `${course.code} · ${topic}` : course.code;
    })
    .join(" and ");

  return (
    <div className="mt-7">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Your plan
      </h2>

      <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/70">
          <Target className="h-3.5 w-3.5" /> {classify(plan.targetCgpa)}
        </div>
        <div className="mt-2 font-display text-2xl font-semibold leading-tight">
          Target semester GPA: {plan.requiredSemesterGpa.toFixed(2)}
        </div>
        <div className="mt-1 text-xs text-primary-foreground/80">
          From {plan.currentCgpa.toFixed(2)} to {plan.targetCgpa.toFixed(2)} across{" "}
          {plan.semesterUnits} new units · {daysLeft} {daysLeft === 1 ? "day" : "days"}{" "}
          {plan.examDate ? "until exam" : "remaining in saved plan"}.
        </div>
        {gradeCounts.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {gradeCounts.map(({ grade, count }) => (
              <span
                key={grade.grade}
                className="rounded-full border border-accent/35 bg-accent/20 px-2.5 py-1 text-[10px] font-semibold text-primary-foreground"
              >
                {count} {count === 1 ? "course" : "courses"} at Grade {grade.grade} (
                {grade.grade === "F" ? "below 40%" : `${grade.min}%+`})
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/10 p-3.5 text-xs text-navy">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Fixed plan: built for your {daysLeft}-day exam window. It stays the same to anchor your
          routine. Recalculate anytime if your numbers change.
        </p>
      </div>

      {daysLeft === 0 || examDatePassed ? (
        <div className="mt-3 rounded-2xl border border-border bg-secondary/60 p-3.5 text-xs text-foreground">
          <p>
            Your exam date is here or has passed. This plan can still help you reset; choose a new
            date whenever you’re ready.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 border-accent/50 text-navy"
            onClick={onChooseNewDate}
          >
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Set a new exam date
          </Button>
        </div>
      ) : null}

      {!plan.reachable ? (
        <div className="mt-3 rounded-2xl border border-accent/50 bg-accent/10 p-3.5 text-xs text-navy">
          Highest possible CGPA this semester is {maxAchievable.toFixed(2)}. Your plan aims for that
          best available outcome.
        </div>
      ) : plan.alreadyThere ? (
        <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/10 p-3.5 text-xs text-navy">
          You are already at or above {plan.targetCgpa.toFixed(2)}. A steady pass through your
          courses can help maintain it.
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-border bg-card p-3.5 text-xs text-foreground shadow-sm">
          You need a semester GPA of{" "}
          <span className="font-semibold">{plan.requiredSemesterGpa.toFixed(2)}</span> across{" "}
          {plan.semesterUnits} units to reach {plan.targetCgpa.toFixed(2)}.
        </div>
      )}

      <h3 className="mb-2 mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <ListChecks className="h-3.5 w-3.5" /> Daily execution schedule
      </h3>
      {daysLeft > 0 ? (
        <div className="relative space-y-4 border-l border-accent/45 pl-5">
          <SchedulePhase
            title="Volume and weak-topic mastery"
            daysLabel={dayRangeLabel(volumeDaysStart, schedule.volumeDays)}
            days={schedule.volumeDays}
            description={
              topTwo.length
                ? `Two practice sets per day on the top leverage courses: ${weakestFocus}.`
                : "Two practice sets per day on the highest-leverage courses and their weakest topics."
            }
            target={`Target: ${2 * schedule.volumeDays} total mock sets.`}
            ifThen={
              topCourse
                ? `If it is evening, do two practice sets on ${topCourse.code} weak topics.`
                : "If it is evening, do two practice sets on the highest-leverage course’s weak topics."
            }
          />
          <SchedulePhase
            title="Exam simulation"
            daysLabel={dayRangeLabel(simulationDaysStart, schedule.simulationDays)}
            days={schedule.simulationDays}
            description="One full timed mock per day. Aim for an average at or above each course’s required percent from the plan."
            target={`${schedule.simulationDays} timed ${schedule.simulationDays === 1 ? "mock" : "mocks"}.`}
            ifThen="If it is your study block, sit one timed mock on the next high-leverage course."
          />
          <SchedulePhase
            title="Final revision"
            daysLabel={dayRangeLabel(finalDaysStart, schedule.finalRevisionDays)}
            days={schedule.finalRevisionDays}
            description="Review weak-topic flashcards only. Keep the final stretch calm and focused."
            target={`${schedule.finalRevisionDays} ${schedule.finalRevisionDays === 1 ? "day" : "days"} of focused review.`}
            ifThen="If it is the day before the exam, review only the flashcards for topics you still miss."
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 border-accent/50 text-navy"
              onClick={() => navigate("flashcards")}
            >
              <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Review weak-topic flashcards
            </Button>
          </SchedulePhase>
        </div>
      ) : (
        <p className="rounded-xl border border-border bg-secondary/60 p-3 text-xs text-muted-foreground">
          Set a new exam date to build a fresh daily schedule.
        </p>
      )}

      <h3 className="mb-2 mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <ListChecks className="h-3.5 w-3.5" /> Required performance by course
      </h3>
      {sortedCourses.length > 0 ? (
        <div className="space-y-2">
          {sortedCourses.map((course, index) => {
            const accuracy = averageForCourse(profile, course.code);
            const gradeBand =
              GRADE_SCALE.find((grade) => grade.grade === course.requiredGrade) ?? GRADE_SCALE[0];
            const gap = Math.max(0, gradeBand.min - (accuracy ?? 0));
            const maintenance = accuracy !== null && accuracy >= gradeBand.min;
            const isHighestLeverage = index === 0;
            return (
              <div
                key={course.code}
                className={cn(
                  "rounded-2xl border bg-card p-4 shadow-sm",
                  isHighestLeverage ? "border-accent" : "border-border",
                )}
                style={
                  isHighestLeverage
                    ? { backgroundColor: "#FFF8E7", borderWidth: "1.5px" }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {isHighestLeverage ? (
                      <span className="mb-2 inline-flex rounded-full border border-accent/45 bg-accent/20 px-2.5 py-1 text-[9px] font-bold tracking-wide text-navy">
                        HIGH LEVERAGE • {course.units} CREDIT UNITS
                      </span>
                    ) : null}
                    <div className="text-sm font-semibold text-navy">{course.code}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{course.name}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent/20 px-2.5 py-1 text-[10px] font-bold text-navy">
                    Grade {course.requiredGrade}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{course.units} units</span>
                  <span>·</span>
                  <span>{course.requiredPercent}</span>
                  <span>·</span>
                  <span>{course.requiredPoints.toFixed(2)} GP</span>
                </div>

                <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Current practice accuracy</span>
                    <span className="font-semibold text-navy">
                      {accuracy === null ? "No practice yet" : `${accuracy.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-navy">
                    {maintenance
                      ? "Maintenance mode"
                      : `Target gap: ${gap.toFixed(1)} percentage points`}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-card/80 p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <Timer className="h-3 w-3" /> Reading
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-navy">
                      {course.dailyReadingMinutes} min/day
                    </div>
                  </div>
                  <div className="rounded-xl bg-card/80 p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <BookOpen className="h-3 w-3" /> Mock quota
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-navy">
                      {course.dailyMockQuestions} questions/day
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full border-accent/50 text-navy"
                  onClick={() => startPractice(course.code)}
                >
                  <Zap className="mr-1.5 h-3.5 w-3.5" /> Start {course.code} weak-topic practice
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          This saved plan has no course breakdown. Choose courses and recalculate to build one.
        </p>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-card p-3.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>
          Plan targets and course priorities are fixed at calculation time. Practice accuracy shown
          here can update, but it does not change this plan.
        </p>
      </div>

      <p className="mt-4 text-center text-[10px] text-muted-foreground">
        Locked {createdLabel}. Recalculate to replace this plan.
      </p>
    </div>
  );
}

function SchedulePhase({
  title,
  daysLabel,
  days,
  description,
  target,
  ifThen,
  children,
}: {
  title: string;
  daysLabel: string;
  days: number;
  description: string;
  target: string;
  ifThen: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-3.5 shadow-sm">
      <span className="absolute -left-[1.56rem] top-4 h-3 w-3 rounded-full border-2 border-accent bg-card" />
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-navy">{title}</h4>
        <span className="shrink-0 rounded-full bg-sand px-2 py-1 text-[10px] font-semibold text-navy">
          {daysLabel}
        </span>
      </div>
      {days > 0 ? (
        <>
          <p className="mt-2 text-xs leading-relaxed text-foreground">{description}</p>
          <p className="mt-1 text-[11px] font-semibold text-navy">{target}</p>
          <p className="mt-2 border-t border-border pt-2 text-[11px] italic text-muted-foreground">
            {ifThen}
          </p>
          {children}
        </>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">
          No days are allocated to this phase.
        </p>
      )}
    </div>
  );
}
