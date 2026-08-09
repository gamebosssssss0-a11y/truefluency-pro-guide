import { useMemo, useState } from "react";
import { useProfile, type CgpaActual } from "@/lib/profile-store";
import { GRADE_SCALE, classify, PROBATION_THRESHOLD } from "@/lib/cgpa";
import { HeaderLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calculator, AlertCircle, Target, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The real CGPA Calculator: the student enters what they actually scored, and
 * this works out semester GPA and the new cumulative CGPA. No prediction, no
 * targets. Targets live in the CGPA Goal Setter.
 */

type Mode = "percent" | "letter";

const LETTERS = GRADE_SCALE.map((g) => g.grade);

function pointsForPercent(percent: number): number {
  const band = GRADE_SCALE.find((g) => percent >= g.min);
  return band ? band.points : 0;
}

function gradeForPercent(percent: number): string {
  const band = GRADE_SCALE.find((g) => percent >= g.min);
  return band ? band.grade : "F";
}

function pointsForLetter(letter: string): number {
  return GRADE_SCALE.find((g) => g.grade === letter)?.points ?? 0;
}

/** Mid-band percentage used when the student only knows their letter grade. */
function percentForLetter(letter: string): number {
  switch (letter) {
    case "A": return 85;
    case "B": return 65;
    case "C": return 55;
    case "D": return 47;
    case "E": return 42;
    default: return 30;
  }
}

export function CgpaCalculatorScreen() {
  const { profile, navigate, update } = useProfile();
  const saved = profile.cgpaActual;

  const [mode, setMode] = useState<Mode>("percent");
  const [priorCgpa, setPriorCgpa] = useState(saved ? String(saved.priorCgpa) : "");
  const [priorUnits, setPriorUnits] = useState(saved ? String(saved.priorUnits) : "");
  const [percents, setPercents] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    profile.courses.forEach((c) => {
      base[c.code] = saved?.scores?.[c.code] !== undefined ? String(saved.scores[c.code]) : "";
    });
    return base;
  });
  const [letters, setLetters] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    profile.courses.forEach((c) => {
      const score = saved?.scores?.[c.code];
      base[c.code] = score !== undefined ? gradeForPercent(score) : "";
    });
    return base;
  });
  const [units, setUnits] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    profile.courses.forEach((c) => {
      base[c.code] = saved?.units?.[c.code] ?? profile.cgpaInputs?.units?.[c.code] ?? 3;
    });
    return base;
  });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CgpaActual | null>(saved);

  const rows = profile.courses;

  const perCourse = useMemo(() => {
    return rows.map((c) => {
      const u = units[c.code] ?? 0;
      let percent: number | null = null;
      if (mode === "percent") {
        const raw = percents[c.code];
        percent = raw === "" || raw === undefined ? null : Number(raw);
      } else {
        const letter = letters[c.code];
        percent = letter ? percentForLetter(letter) : null;
      }
      const points =
        percent === null
          ? null
          : mode === "letter"
            ? pointsForLetter(letters[c.code])
            : pointsForPercent(percent);
      return { course: c, units: u, percent, points };
    });
  }, [rows, units, percents, letters, mode]);

  const calculate = () => {
    if (rows.length === 0) {
      setError("Add at least one course to your profile first.");
      return;
    }
    const prior = priorCgpa === "" ? 0 : Number(priorCgpa);
    const priorU = priorUnits === "" ? 0 : Number(priorUnits);
    if (Number.isNaN(prior) || prior < 0 || prior > 5) {
      setError("Previous CGPA must be between 0.00 and 5.00. Leave it blank if this is your first semester.");
      return;
    }
    if (Number.isNaN(priorU) || priorU < 0) {
      setError("Previous credit units cannot be negative.");
      return;
    }
    for (const row of perCourse) {
      if (!row.units || row.units < 1 || row.units > 6) {
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
      if (mode === "percent" && (Number.isNaN(row.percent) || row.percent < 0 || row.percent > 100)) {
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
      scores[r.course.code] = r.percent ?? 0;
      unitMap[r.course.code] = r.units;
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
      classification: classify(cumulative),
    };
    setResult(next);
    update({ cgpaActual: next });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <button
            onClick={() => navigate("account")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Account
          </button>
        </div>

        <h1 className="font-display text-3xl font-semibold text-foreground">CGPA calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter what you actually scored and this works out your semester GPA and your new
          cumulative CGPA on the 0.00 to 5.00 scale.
        </p>

        {/* Mode switch */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
          {(["percent", "letter"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold transition",
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
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
            <Input inputMode="decimal" placeholder="e.g. 3.42" value={priorCgpa} onChange={(e) => setPriorCgpa(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Units completed
            </span>
            <Input inputMode="numeric" placeholder="e.g. 48" value={priorUnits} onChange={(e) => setPriorUnits(e.target.value)} />
          </label>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          First semester? Leave both blank and this becomes your first GPA.
        </p>

        {/* Scores */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          This semester's results
        </h2>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
            No courses on your profile yet.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((c) => {
              const row = perCourse.find((r) => r.course.code === c.code);
              return (
                <div key={c.code} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">{c.code}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{c.name}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        className="h-9 w-14 text-center"
                        inputMode="numeric"
                        value={units[c.code] ?? 3}
                        onChange={(e) => setUnits((u) => ({ ...u, [c.code]: Number(e.target.value) || 0 }))}
                        aria-label={`Credit units for ${c.code}`}
                      />
                      <span className="text-[11px] text-muted-foreground">units</span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    {mode === "percent" ? (
                      <>
                        <Input
                          className="h-9 w-20 text-center"
                          inputMode="decimal"
                          placeholder="score %"
                          value={percents[c.code] ?? ""}
                          onChange={(e) => setPercents((p) => ({ ...p, [c.code]: e.target.value }))}
                          aria-label={`Percentage score for ${c.code}`}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {row?.percent !== null && row?.percent !== undefined && !Number.isNaN(row.percent)
                            ? `${gradeForPercent(row.percent)} · ${pointsForPercent(row.percent).toFixed(2)} points`
                            : "0 to 100"}
                        </span>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {LETTERS.map((l) => {
                          const on = letters[c.code] === l;
                          return (
                            <button
                              key={l}
                              type="button"
                              onClick={() => setLetters((s) => ({ ...s, [c.code]: l }))}
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
          <Calculator className="mr-1.5 h-4 w-4" /> {result ? "Recalculate" : "Calculate my CGPA"}
        </Button>

        {mode === "letter" ? (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-accent/40 bg-accent/10 p-3 text-xs text-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p>
              Letter grades map to exact grade points, so your GPA is precise. The percentage shown
              per course is the middle of the band, used only for display.
            </p>
          </div>
        ) : null}

        {result ? <ResultBlock result={result} /> : null}

        {/* Grade scale reference */}
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
        </div>
      </div>
    </div>
  );
}

function ResultBlock({ result }: { result: CgpaActual }) {
  const { navigate } = useProfile();
  const bands: { label: string; min: number }[] = [
    { label: "First Class", min: 4.5 },
    { label: "Second Class Upper", min: 3.5 },
    { label: "Second Class Lower", min: 2.4 },
    { label: "Third Class", min: 1.5 },
    { label: "Pass", min: 1.0 },
  ];

  return (
    <div className="mt-6">
      <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground shadow-sm">
        <div className="text-[11px] uppercase tracking-wider text-primary-foreground/70">Your result</div>
        <div className="mt-3 grid grid-cols-2 gap-4 border-t border-primary-foreground/15 pt-4">
          <div>
            <div className="font-display text-3xl font-semibold leading-none">
              {result.semesterGpa.toFixed(2)}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-primary-foreground/60">
              semester GPA · {result.semesterUnits} units
            </div>
          </div>
          <div>
            <div className="font-display text-3xl font-semibold leading-none">
              {result.cumulativeCgpa.toFixed(2)}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-primary-foreground/60">
              cumulative CGPA · {result.totalUnits} units
            </div>
          </div>
        </div>
        <div className="mt-3 text-sm font-semibold">{result.classification}</div>
      </div>

      {result.cumulativeCgpa > 0 && result.cumulativeCgpa < PROBATION_THRESHOLD ? (
        <div className="mt-3 rounded-2xl border border-border bg-secondary/60 p-3.5 text-xs text-foreground">
          A CGPA below 1.00 sits under the academic probation threshold at UI. It is recoverable,
          and the goal setter can build a plan to lift it.
        </div>
      ) : null}

      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Classification bands
      </h3>
      <div className="space-y-1 rounded-2xl border border-border bg-card p-4 shadow-sm">
        {bands.map((b) => {
          const on = result.classification === b.label;
          return (
            <div
              key={b.label}
              className={cn(
                "flex items-center justify-between rounded-lg px-2 py-1.5 text-xs",
                on ? "bg-accent/15 font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              <span>{b.label}</span>
              <span>{b.min.toFixed(2)} and above</span>
            </div>
          );
        })}
      </div>

      <Button className="mt-4 w-full" size="lg" onClick={() => navigate("cgpa-goal")}>
        <Target className="mr-1.5 h-4 w-4" /> Set a target from this
      </Button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Your {result.cumulativeCgpa.toFixed(2)} and {result.totalUnits} units carry straight into the
        goal setter.
      </p>
    </div>
  );
}
