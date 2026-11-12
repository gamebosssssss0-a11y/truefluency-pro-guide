import { useMemo, useState, type KeyboardEvent } from "react";
import { useProfile, type CgpaActual, type CgpaSemester, type CgpaCalculation } from "@/lib/profile-store";
import { CLASSIFICATION_BANDS, GRADE_SCALE, classify, PROBATION_THRESHOLD } from "@/lib/cgpa";
import { HeaderLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Calculator, AlertCircle, Target, Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { CgpaCoursePicker, useCgpaCourseSelection } from "@/components/cgpa-course-picker";
import { canonicalCourseCode } from "@/lib/course-code";

/**
 * The real CGPA Calculator: the student enters what they actually scored, and
 * this works out semester GPA and the new cumulative CGPA. No prediction, no
 * targets. Targets live in the CGPA Goal Setter.
 */

type Mode = "percent" | "letter";
type Scale = "ui-5" | "four-point";

const FOUR_POINT_SCALE = [
  { grade: "A", points: 4, percent: "90 to 100%", min: 90 },
  { grade: "B", points: 3, percent: "80 to 89.99%", min: 80 },
  { grade: "C", points: 2, percent: "70 to 79.99%", min: 70 },
  { grade: "D", points: 1, percent: "60 to 69.99%", min: 60 },
  { grade: "F", points: 0, percent: "Below 60%", min: 0 },
];
const scaleBands = (scale: Scale) => scale === "ui-5" ? GRADE_SCALE : FOUR_POINT_SCALE;

const LETTERS = (scale: Scale) => scaleBands(scale).map((g) => g.grade);

function pointsForPercent(percent: number, scale: Scale): number {
  const band = scaleBands(scale).find((g) => percent >= g.min);
  return band ? band.points : 0;
}

function gradeForPercent(percent: number, scale: Scale): string {
  const band = scaleBands(scale).find((g) => percent >= g.min);
  return band ? band.grade : "F";
}

function pointsForLetter(letter: string, scale: Scale): number {
  return scaleBands(scale).find((g) => g.grade === letter)?.points ?? 0;
}

/** Mid-band percentage used when the student only knows their letter grade. */
function percentForLetter(letter: string, scale: Scale): number {
  if (scale === "four-point") {
    switch (letter) {
      case "A": return 95;
      case "B": return 85;
      case "C": return 75;
      case "D": return 65;
      default: return 30;
    }
  }
  switch (letter) {
    case "A":
      return 85;
    case "B":
      return 65;
    case "C":
      return 55;
    case "D":
      return 47;
    case "E":
      return 42;
    default:
      return 30;
  }
}

type LiveCgpaResult = {
  semesterGpa: number;
  cumulativeCgpa: number;
  semesterUnits: number;
  totalUnits: number;
  validCourseCount: number;
  selectedCourseCount: number;
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

export function CgpaCalculatorScreen() {
  const { profile, navigate, update } = useProfile();
  const saved = profile.cgpaActual;

  const [scale, setScale] = useState<Scale>(saved?.scale ?? "ui-5");
  const [mode, setMode] = useState<Mode>("percent");
  const [priorCgpa, setPriorCgpa] = useState(saved ? String(saved.priorCgpa) : "");
  const [priorUnits, setPriorUnits] = useState(saved ? String(saved.priorUnits) : "");
  const [percents, setPercents] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    profile.courses.forEach((c) => {
      const code = canonicalCourseCode(c.code);
      const score = saved?.scores?.[code] ?? saved?.scores?.[c.code];
      base[code] = score !== undefined ? String(score) : "";
    });
    return base;
  });
  const [letters, setLetters] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    profile.courses.forEach((c) => {
      const code = canonicalCourseCode(c.code);
      const score = saved?.scores?.[code] ?? saved?.scores?.[c.code];
      base[code] = score !== undefined ? gradeForPercent(score, saved?.scale ?? "ui-5") : "";
    });
    return base;
  });
  const [units, setUnits] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    profile.courses.forEach((c) => {
      const code = canonicalCourseCode(c.code);
      base[code] =
        saved?.units?.[code] ??
        saved?.units?.[c.code] ??
        profile.cgpaInputs?.units?.[code] ??
        profile.cgpaInputs?.units?.[c.code] ??
        3;
    });
    return base;
  });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CgpaActual | null>(null);
  const [calculatedKey, setCalculatedKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calculationLabel, setCalculationLabel] = useState("");
  const [session, setSession] = useState("");
  const [term, setTerm] = useState<"1st" | "2nd">("1st");

  const { selected: rows } = useCgpaCourseSelection("cgpaCalcCourses");

  const perCourse = useMemo(() => {
    return rows.map((c) => {
      const code = canonicalCourseCode(c.code);
      const u = units[code] ?? 3;
      let percent: number | null = null;
      if (mode === "percent") {
        const raw = percents[code];
        percent = raw === "" || raw === undefined ? null : Number(raw);
      } else {
        const letter = letters[code];
        percent = letter ? percentForLetter(letter, scale) : null;
      }
      const points =
        percent === null
          ? null
          : mode === "letter"
            ? pointsForLetter(letters[code], scale)
            : pointsForPercent(percent, scale);
      return { course: c, units: u, percent, points };
    });
  }, [rows, units, percents, letters, mode, scale]);

  const semesters = useMemo(
    () => profile.cgpaActual?.scale === scale || (!profile.cgpaActual?.scale && scale === "ui-5")
      ? profile.cgpaActual?.semesters ?? []
      : [],
    [profile.cgpaActual?.semesters, profile.cgpaActual?.scale, scale],
  );

  const liveResult = useMemo<LiveCgpaResult | null>(() => {
    const prior = priorCgpa === "" ? 0 : Number(priorCgpa);
    const priorU = priorUnits === "" ? 0 : Number(priorUnits);
    if (
      !Number.isFinite(prior) ||
      prior < 0 ||
      prior > (scale === "ui-5" ? 5 : 4) ||
      !Number.isFinite(priorU) ||
      priorU < 0
    ) {
      return null;
    }
    const validRows = perCourse.filter(
      (row) =>
        row.points !== null &&
        row.percent !== null &&
        Number.isFinite(row.percent) &&
        row.percent >= 0 &&
        row.percent <= 100 &&
        row.units >= 1 &&
        row.units <= 6,
    );
    if (validRows.length === 0) return null;
    const semesterUnits = validRows.reduce((sum, row) => sum + row.units, 0);
    const semesterQualityPoints = validRows.reduce(
      (sum, row) => sum + (row.points ?? 0) * row.units,
      0,
    );
    const totalUnits = priorU + semesterUnits;
    return {
      semesterGpa: semesterQualityPoints / semesterUnits,
      cumulativeCgpa: totalUnits > 0 ? (prior * priorU + semesterQualityPoints) / totalUnits : 0,
      semesterUnits,
      totalUnits,
      validCourseCount: validRows.length,
      selectedCourseCount: rows.length,
    };
  }, [perCourse, priorCgpa, priorUnits, rows.length, scale]);

  const savedPreviewMatches = Boolean(
    result &&
    liveResult &&
    Math.abs(result.semesterGpa - liveResult.semesterGpa) < 0.000001 &&
    Math.abs(result.cumulativeCgpa - liveResult.cumulativeCgpa) < 0.000001 &&
    result.totalUnits === liveResult.totalUnits,
  );
  const currentCalculationKey = JSON.stringify({ scale, mode, priorCgpa, priorUnits, rows: perCourse.map((row) => [canonicalCourseCode(row.course.code), row.percent, row.points, row.units]) });

  const calculate = () => {
    if (rows.length === 0) {
      setError("Add at least one course to your profile first.");
      return;
    }
    const prior = priorCgpa === "" ? 0 : Number(priorCgpa);
    const priorU = priorUnits === "" ? 0 : Number(priorUnits);
    const maxPoints = scale === "ui-5" ? 5 : 4;
    if (!Number.isFinite(prior) || prior < 0 || prior > maxPoints) {
      setError(
        `Previous CGPA must be between 0.00 and ${maxPoints.toFixed(2)}. Leave it blank if this is your first semester.`,
      );
      return;
    }
    if (!Number.isFinite(priorU) || priorU < 0) {
      setError("Previous credit units cannot be negative.");
      return;
    }
    for (const row of perCourse) {
      if (!Number.isFinite(row.units) || row.units < 1 || row.units > 6) {
        setError(`Set a credit unit between 1 and 6 for ${row.course.code}.`);
        return;
      }
      if (row.percent === null) {
        setError(
          mode === "percent"
            ? `Enter the percentage you scored in ${row.course.code}.`
            : `Pick the letter grade you got in ${row.course.code}.`,
        );
        return;
      }
      if (
        mode === "percent" &&
        (!Number.isFinite(row.percent) || row.percent < 0 || row.percent > 100)
      ) {
        setError(`${row.course.code} percentage must be between 0 and 100.`);
        return;
      }
    }
    setError(null);

    const semesterUnits = perCourse.reduce((s, r) => s + r.units, 0);
    const semesterQp = perCourse.reduce((s, r) => s + (r.points ?? 0) * r.units, 0);
    const semesterGpa = semesterUnits > 0 ? semesterQp / semesterUnits : 0;
    const totalUnits = semesterUnits + priorU;
    const cumulative = totalUnits > 0 ? (prior * priorU + semesterQp) / totalUnits : 0;

    const scores: Record<string, number> = {};
    const unitMap: Record<string, number> = {};
    perCourse.forEach((r) => {
      const code = canonicalCourseCode(r.course.code);
      scores[code] = r.percent ?? 0;
      unitMap[code] = r.units;
    });

    const next: CgpaActual = {
      calculatedAt: Date.now(),
      scores,
      units: unitMap,
      priorCgpa: prior,
      priorUnits: priorU,
      semesterUnits,
      semesterGpa,
      cumulativeCgpa: cumulative,
      totalUnits,
      classification: scale === "ui-5" ? classify(cumulative) : "Classification depends on your institution",
      scale,
    };
    setResult(next);
    setCalculatedKey(currentCalculationKey);
  };

  const saveCalculation = () => {
    if (!result || calculatedKey !== currentCalculationKey) return;
    const id = editingId ?? `cgpa-${Date.now()}`;
    const label = calculationLabel.trim() || result.label || `CGPA calculation ${new Date().toLocaleDateString()}`;
    const savedResult = { ...result, label };
    const entry: CgpaCalculation = { id, label, result: savedResult };
    const history = profile.cgpaCalculationHistory ?? [];
    update({
      ...(scale === "ui-5" ? { cgpaActual: { ...savedResult, semesters } } : {}),
      cgpaCalculationHistory: editingId
        ? history.map((item) => item.id === editingId ? entry : item)
        : [entry, ...history],
    });
    setResult(savedResult);
    setEditingId(id);
    setCalculationLabel(label);
  };

  const openCalculation = (entry: CgpaCalculation) => {
    const value = entry.result;
    const selectedScale = value.scale ?? "ui-5";
    setEditingId(entry.id);
    setCalculatedKey(null);
    setCalculationLabel(entry.label);
    setResult(value);
    setScale(selectedScale);
    setPriorCgpa(String(value.priorCgpa));
    setPriorUnits(String(value.priorUnits));
    setPercents(Object.fromEntries(Object.entries(value.scores).map(([code, score]) => [code, String(score)])));
    setLetters(Object.fromEntries(Object.entries(value.scores).map(([code, score]) => [code, gradeForPercent(score, selectedScale)])));
    setUnits(Object.fromEntries(Object.entries(value.units)));
    const selectedCodes = Object.keys(value.scores).map(canonicalCourseCode);
    update({ cgpaCalcCourses: [...new Set([...(profile.cgpaCalcCourses ?? profile.courses.map((course) => course.code)), ...selectedCodes].map(canonicalCourseCode))] });
  };

  /* ---------- Saved semesters (inside the existing cgpa_actual field) ---------- */

  const writeSemesters = (list: CgpaSemester[]) => {
    const base = profile.cgpaActual;
    if (!base) return;
    const next: CgpaActual = { ...base, semesters: list };
    setResult(next);
    update({ cgpaActual: next });
  };

  const saveSemester = () => {
    if (!result || session.trim() === "") return;
    const row: CgpaSemester = {
      id: `${session.trim()}-${term}`,
      session: session.trim(),
      term,
      courses: perCourse.map((r) => ({
        code: r.course.code,
        units: r.units,
        points: r.points ?? 0,
        percent: r.percent ?? 0,
      })),
      units: result.semesterUnits,
      gpa: result.semesterGpa,
    };
    writeSemesters([row, ...semesters.filter((s) => s.id !== row.id)]);
  };

  const openSemester = (s: CgpaSemester) => {
    const savedCodes = s.courses.map((course) => course.code);
    const currentCodes = profile.cgpaCalcCourses ?? profile.courses.map((course) => course.code);
    const mergedCodes = [
      ...new Map(
        [...currentCodes, ...savedCodes].map((code) => {
          const canonical = canonicalCourseCode(code);
          return [canonical, canonical] as const;
        }),
      ).values(),
    ];
    update({ cgpaCalcCourses: mergedCodes });
    setSession(s.session);
    setTerm(s.term);
    setUnits((u) => {
      const next = { ...u };
      s.courses.forEach((c) => {
        next[canonicalCourseCode(c.code)] = c.units;
      });
      return next;
    });
    setPercents((p) => {
      const next = { ...p };
      s.courses.forEach((c) => {
        next[canonicalCourseCode(c.code)] = String(c.percent);
      });
      return next;
    });
    setLetters((l) => {
      const next = { ...l };
      s.courses.forEach((c) => {
        next[canonicalCourseCode(c.code)] = gradeForPercent(c.percent, scale);
      });
      return next;
    });
  };

  /** Weighted merge: total quality points ÷ total credit units. Never an average of GPAs. */
  const weighted = (list: CgpaSemester[]) => {
    const units = list.reduce((s, r) => s + r.units, 0);
    const qp = list.reduce((s, r) => s + r.gpa * r.units, 0);
    return units > 0 ? { gpa: qp / units, units } : null;
  };

  const sessionMerges = useMemo(() => {
    const bySession = new Map<string, CgpaSemester[]>();
    semesters.forEach((s) => {
      bySession.set(s.session, [...(bySession.get(s.session) ?? []), s]);
    });
    return [...bySession.entries()]
      .filter(
        ([, list]) => list.some((s) => s.term === "1st") && list.some((s) => s.term === "2nd"),
      )
      .map(([sessionName, list]) => {
        const w = weighted(list)!;
        return { session: sessionName, gpa: w.gpa, units: w.units };
      });
  }, [semesters]);

  const allYears = weighted(semesters);

  return (
    <div data-cgpa-form="calculator" className="study-utility-page min-h-screen">
      <div data-cgpa-scroll className="mx-auto max-w-md px-5 pb-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <button
            onClick={() => navigate("account")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Account
          </button>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-accent/40 bg-sand px-2 py-1 text-[10px] font-medium text-navy">
            <ShieldCheck className="h-3 w-3" /> Select your grading scale
          </span>
        </div>

        <ResultBlock
          result={liveResult}
          scale={scale}
          hasSavedResult={Boolean(saved && (saved.scale ?? "ui-5") === "ui-5" && scale === "ui-5")}
          savedPreviewMatches={Boolean(saved && liveResult && Math.abs(saved.cumulativeCgpa - liveResult.cumulativeCgpa) < 0.000001 && saved.totalUnits === liveResult.totalUnits)}
        />

        <h1 className="font-display text-3xl font-semibold text-foreground">CGPA calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter what you actually scored and this works out your semester GPA and your new
          cumulative CGPA on the selected scale.
        </p>

        <label className="mt-4 block rounded-2xl border border-border bg-card p-3.5">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Grading scale</span>
          <select
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            value={scale}
            onChange={(event) => {
              const nextScale = event.target.value as Scale;
              setScale(nextScale);
              setResult(null);
              setCalculatedKey(null);
              setEditingId(null);
            }}
          >
            <option value="ui-5">University of Ibadan · 5.0</option>
            <option value="four-point">Generic 4.0 · confirm with your institution</option>
          </select>
          {scale === "four-point" ? <span className="mt-1 block text-[11px] text-muted-foreground">Generic 4.0 bands are estimates. Confirm your institution’s grade boundaries before relying on this result.</span> : null}
        </label>

        {/* Mode switch */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
          {(["percent", "letter"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold transition",
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "percent" ? "Percentage scores" : "Letter grades"}
            </button>
          ))}
        </div>

        {/* Prior standing */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Before this semester
        </h2>
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Previous CGPA
            </span>
            <Input
              inputMode="decimal"
              enterKeyHint="next"
              data-cgpa-numeric="true"
              onKeyDown={moveToNextNumericField}
              placeholder="e.g. 3.42"
              value={priorCgpa}
              onChange={(e) => setPriorCgpa(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Units completed
            </span>
            <Input
              inputMode="numeric"
              enterKeyHint={mode === "percent" && rows.length > 0 ? "next" : "done"}
              data-cgpa-numeric="true"
              onKeyDown={moveToNextNumericField}
              placeholder="e.g. 48"
              value={priorUnits}
              onChange={(e) => setPriorUnits(e.target.value)}
            />
          </label>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          First semester? Leave both blank and this becomes your first GPA.
        </p>

        {/* Scores */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          This semester's results
        </h2>
        <CgpaCoursePicker
          field="cgpaCalcCourses"
          helper="Search and add the courses you want in this calculation, or remove any you don't."
        />
        <div className="mt-3" />
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
            No courses chosen yet. Use “Choose courses” above to add them.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((c, rowIndex) => {
              const row = perCourse.find(
                (r) => canonicalCourseCode(r.course.code) === canonicalCourseCode(c.code),
              );
              return (
                <div
                  key={c.code}
                  className="rounded-2xl border border-border bg-card p-3.5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">
                        {canonicalCourseCode(c.code)}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">{c.name}</div>
                    </div>
                    <div
                      className="grid grid-cols-6 gap-0.5 rounded-xl bg-sand p-1"
                      role="group"
                      aria-label={`Credit units for ${c.code}`}
                    >
                      {[1, 2, 3, 4, 5, 6].map((unit) => {
                        const selected = (units[canonicalCourseCode(c.code)] ?? 3) === unit;
                        return (
                          <button
                            key={unit}
                            type="button"
                            onClick={() =>
                              setUnits((current) => ({
                                ...current,
                                [canonicalCourseCode(c.code)]: unit,
                              }))
                            }
                            className={cn(
                              "h-8 w-7 rounded-lg text-xs font-semibold transition-colors",
                              selected
                                ? "bg-navy text-white shadow-sm"
                                : "text-navy/65 hover:bg-card hover:text-navy",
                            )}
                            aria-label={`${unit} credit units`}
                            aria-pressed={selected}
                          >
                            {unit}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    {mode === "percent" ? (
                      <>
                        <Input
                          className="h-9 w-20 text-center"
                          inputMode="decimal"
                          enterKeyHint={rowIndex === rows.length - 1 ? "done" : "next"}
                          data-cgpa-numeric="true"
                          onKeyDown={moveToNextNumericField}
                          placeholder="score %"
                          value={percents[canonicalCourseCode(c.code)] ?? ""}
                          onChange={(e) =>
                            setPercents((p) => ({
                              ...p,
                              [canonicalCourseCode(c.code)]: e.target.value,
                            }))
                          }
                          aria-label={`Percentage score for ${c.code}`}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {row?.percent !== null &&
                          row?.percent !== undefined &&
                          !Number.isNaN(row.percent)
                            ? `${gradeForPercent(row.percent, scale)} · ${pointsForPercent(row.percent, scale).toFixed(2)} points`
                            : "0 to 100"}
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {LETTERS(scale).map((l) => {
                          const on = letters[canonicalCourseCode(c.code)] === l;
                          return (
                            <button
                              key={l}
                              type="button"
                              onClick={() =>
                                setLetters((s) => ({ ...s, [canonicalCourseCode(c.code)]: l }))
                              }
                              className={cn(
                                "h-8 w-8 rounded-lg border text-xs font-semibold transition",
                                on
                                  ? "border-accent bg-accent/15 text-accent"
                                  : "border-border bg-background text-muted-foreground hover:border-accent/50",
                              )}
                              aria-label={`Grade ${l} for ${c.code}`}
                              aria-pressed={on}
                            >
                              {l}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {row &&
                  row.points !== null &&
                  row.percent !== null &&
                  Number.isFinite(row.percent) &&
                  row.percent >= 0 &&
                  row.percent <= 100 ? (
                    <p className="mt-2 text-[10px] font-medium text-navy/70">
                      {mode === "percent"
                        ? `Entering ${row.percent}% → Grade ${gradeForPercent(row.percent, scale)} (${row.points.toFixed(1)} GP)`
                        : `Grade ${letters[canonicalCourseCode(c.code)]} (${row.points.toFixed(1)} GP)`}
                    </p>
                  ) : null}
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

        <Button size="lg" className="mt-4 w-full" onClick={calculate}>
          <Calculator className="mr-1.5 h-4 w-4" /> Calculate preview
        </Button>
        {result ? (
          <div className="mt-3 rounded-2xl border border-accent/40 bg-accent/10 p-4">
            <label className="block text-xs font-semibold text-foreground" htmlFor="cgpa-label">Optional semester or custom label</label>
            <Input id="cgpa-label" className="mt-2" placeholder="e.g. 2026/2027 · First semester" value={calculationLabel} onChange={(event) => setCalculationLabel(event.target.value)} />
            <Button size="lg" className="mt-2 w-full" disabled={calculatedKey !== currentCalculationKey} onClick={saveCalculation}>
              {editingId ? "Update saved calculation" : "Save calculation"}
            </Button>
          </div>
        ) : null}

        <div className="mb-2 mt-6 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved calculations</h2>
          {(result || editingId) ? (
            <Button size="sm" variant="ghost" onClick={() => { setResult(null); setEditingId(null); setCalculatedKey(null); setCalculationLabel(""); }}>
              New calculation
            </Button>
          ) : null}
        </div>
        {(profile.cgpaCalculationHistory ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">Calculations stay as previews until you save one.</div>
        ) : (
          <div className="space-y-2">
            {profile.cgpaCalculationHistory.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{entry.label}</div>
                  <div className="text-[11px] text-muted-foreground">CGPA {entry.result.cumulativeCgpa.toFixed(2)} · {entry.result.totalUnits} credits · {entry.result.scale === "four-point" ? "4.0" : "5.0"} scale</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openCalculation(entry)}>Edit</Button>
              </div>
            ))}
          </div>
        )}

        <Accordion
          type="single"
          collapsible
          className="mt-3 rounded-2xl border border-border bg-card px-4 shadow-sm"
        >
          <AccordionItem value="calculation" className="border-0">
            <AccordionTrigger className="py-3 text-xs font-semibold text-navy hover:no-underline">
              How this CGPA is calculated
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <p>
                Semester GPA = total quality points for the semester divided by semester credit
                units. Each course contributes its grade points multiplied by its credit units.
              </p>
              <p>
                Updated cumulative CGPA = (previous CGPA × previous units + this semester’s quality
                points) ÷ (previous units + this semester’s units).
              </p>
              <p>
                Combined session GPA = (1st semester GPA × its units + 2nd semester GPA × its units)
                ÷ the total units across both semesters. Each semester is weighted by its credit
                load, not averaged evenly.
              </p>
              <p>Results are shown to two decimal places. Letter-grade percentages use the midpoint of each displayed band; grade points come directly from the selected scale.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {mode === "letter" ? (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-accent/40 bg-accent/10 p-3 text-xs text-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p>
              Letter grades map to exact grade points, so your GPA is precise. The percentage shown
              per course is the middle of the band, used only for display.
            </p>
          </div>
        ) : null}

        {/* Save this semester + saved history */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Save this semester
        </h2>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Session
              </span>
              <Input
                placeholder="e.g. 2024/2025"
                value={session}
                onChange={(e) => setSession(e.target.value)}
              />
            </label>
            <div>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Semester
              </span>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-border p-1">
                {(["1st", "2nd"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTerm(t)}
                    className={cn(
                      "rounded-lg px-2 py-1.5 text-xs font-semibold transition",
                      term === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button
            className="mt-3 w-full"
            size="lg"
            variant="outline"
            disabled={!result || result.scale !== "ui-5" || calculatedKey !== currentCalculationKey || (profile.cgpaActual?.scale ?? "ui-5") !== "ui-5" || session.trim() === ""}
            onClick={saveSemester}
          >
            Save {term} semester
          </Button>
          {!profile.cgpaActual ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Save a calculation first, then save this semester to your history.
            </p>
          ) : null}
        </div>

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Saved semesters
        </h2>
        {semesters.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
            No semester saved yet.
          </div>
        ) : (
          <div className="space-y-2">
            {semesters.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">
                      {s.session} · {s.term} semester
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      GPA {s.gpa.toFixed(2)} · {s.units} credits
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openSemester(s)}>
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-wine"
                    onClick={() => writeSemesters(semesters.filter((x) => x.id !== s.id))}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}

            {sessionMerges.map((m) => (
              <div key={m.session} className="rounded-2xl border border-border bg-sand p-3.5">
                <div className="text-sm font-semibold text-navy">
                  {m.session} combined GPA {m.gpa.toFixed(2)}
                </div>
                <div className="text-[11px] text-navy/70">
                  Both semesters weighted by credits · {m.units} credits
                </div>
              </div>
            ))}

            {allYears ? (
              <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                <div className="text-sm font-semibold text-navy">
                  All saved semesters: {allYears.gpa.toFixed(2)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {allYears.units} credits · {classify(allYears.gpa)}
                </div>
              </div>
            ) : null}
            {sessionMerges.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                A combined session GPA appears once both 1st and 2nd semester are saved for that
                session.
              </p>
            ) : null}
          </div>
        )}

        {/* Grade scale reference */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {scale === "ui-5" ? "UI 5.0 grade scale" : "Generic 4.0 grade scale"}
          </div>
          <div className="space-y-1">
            {scaleBands(scale).map((g) => (
              <div key={g.grade} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{g.percent}</span>
                <span className="font-semibold text-foreground">
                  {g.grade} · {g.points.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultBlock({
  result,
  scale,
  hasSavedResult,
  savedPreviewMatches,
}: {
  result: LiveCgpaResult | null;
  scale: Scale;
  hasSavedResult: boolean;
  savedPreviewMatches: boolean;
}) {
  const { navigate } = useProfile();
  const maxScale = scale === "ui-5" ? CLASSIFICATION_BANDS[CLASSIFICATION_BANDS.length - 1].max : 4;
  const position = result
    ? Math.max(0, Math.min(100, (result.cumulativeCgpa / maxScale) * 100))
    : 0;
  const nextBand = result && scale === "ui-5"
    ? CLASSIFICATION_BANDS.find((band) => band.min > result.cumulativeCgpa)
    : undefined;

  return (
    <>
      <section
        aria-live="polite"
        className="relative z-10 rounded-2xl border border-slate-300 bg-slate-900 p-4 text-white shadow-md dark:border-slate-600 dark:bg-slate-800"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/70">
              Estimated semester GPA
            </div>
            <div className="mt-1 font-display text-3xl font-semibold leading-none">
              <span
                key={result?.semesterGpa.toFixed(2) ?? "semester-empty"}
                className="inline-block animate-in fade-in slide-in-from-bottom-1 duration-200"
              >
                {result ? result.semesterGpa.toFixed(2) : "—"}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-primary-foreground/60">
              {result ? `${result.semesterUnits} units included` : "Add valid course results"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/70">
              Updated cumulative CGPA
            </div>
            <div className="mt-1 font-display text-3xl font-semibold leading-none">
              <span
                key={result?.cumulativeCgpa.toFixed(2) ?? "cumulative-empty"}
                className="inline-block animate-in fade-in slide-in-from-bottom-1 duration-200"
              >
                {result ? result.cumulativeCgpa.toFixed(2) : "—"}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-primary-foreground/60">
              {result ? `${result.totalUnits} total units` : "Live preview"}
            </div>
          </div>
        </div>

        {result ? (
          <div className="mt-3 border-t border-primary-foreground/15 pt-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold">{scale === "ui-5" ? classify(result.cumulativeCgpa) : "Classification varies by institution"}</span>
              {scale !== "ui-5" ? (
                <span className="text-right text-primary-foreground/75">CGPA on a 4.00 scale</span>
              ) : nextBand ? (
                <span className="text-right text-primary-foreground/75">
                  {(nextBand.min - result.cumulativeCgpa).toFixed(2)} points to {nextBand.label} (
                  {nextBand.min.toFixed(2)})
                </span>
              ) : (
                <span className="text-right text-primary-foreground/75">
                  Within First Class ({CLASSIFICATION_BANDS.at(-1)?.min.toFixed(2)}–
                  {maxScale.toFixed(2)})
                </span>
              )}
            </div>
            {scale === "ui-5" ? <div
              role="meter"
              aria-label="Classification progress"
              aria-valuemin={0}
              aria-valuemax={maxScale}
              aria-valuenow={result.cumulativeCgpa}
              className="relative mt-2 h-2.5 overflow-hidden rounded-full"
            >
              <div className="absolute inset-0 flex">
                {CLASSIFICATION_BANDS.map((band, index) => (
                  <span
                    key={band.label}
                    className={
                      [
                        "h-full border-r border-primary-foreground/35 last:border-r-0",
                        "bg-primary-foreground/15",
                        "bg-primary-foreground/25",
                        "bg-primary-foreground/35",
                        "bg-accent/55",
                        "bg-accent/75",
                        "bg-accent",
                      ][index]
                    }
                    style={{ width: `${((band.max - band.min) / maxScale) * 100}%` }}
                  />
                ))}
              </div>
              <span
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-white shadow"
                style={{ left: `${position}%` }}
              />
            </div> : null}
            {result.validCourseCount < result.selectedCourseCount ? (
              <p className="mt-2 text-[10px] text-primary-foreground/65">
                Preview uses {result.validCourseCount} of {result.selectedCourseCount} selected
                courses with complete values.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 border-t border-primary-foreground/15 pt-3 text-xs text-primary-foreground/70">
            Enter a valid result to see your classification and live preview.
          </p>
        )}
      </section>

      {scale === "ui-5" && result && result.cumulativeCgpa > 0 && result.cumulativeCgpa < PROBATION_THRESHOLD ? (
        <div className="mt-3 rounded-2xl border border-border bg-secondary/60 p-3.5 text-xs text-foreground">
          A CGPA below {PROBATION_THRESHOLD.toFixed(2)} sits under the academic probation threshold
          at UI. It is recoverable, and the goal setter can build a plan to lift it.
        </div>
      ) : null}

      {hasSavedResult ? (
        <>
          <Button className="mt-3 w-full" size="lg" onClick={() => navigate("cgpa-goal")}>
            <Target className="mr-1.5 h-4 w-4" /> Set a target from this
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {savedPreviewMatches
              ? "Your CGPA and units carry into the goal setter."
              : "The goal setter uses your last saved result. Save this preview first to carry updated numbers across."}
          </p>
        </>
      ) : null}
    </>
  );
}
