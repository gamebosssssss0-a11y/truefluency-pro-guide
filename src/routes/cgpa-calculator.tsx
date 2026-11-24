import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GRADE_SCALE, MAX_POINTS, classify } from "@/lib/cgpa";

const TITLE = "Free UI CGPA Calculator (5.0 Scale) | TrueFluency Pro";
const DESC =
  "Calculate your University of Ibadan CGPA on the 5.0 scale for free. Add your courses, units and grades, then see your class of degree instantly.";
const URL = "https://truefluency.app/cgpa-calculator";

export const Route = createFileRoute("/cgpa-calculator")({
  component: CgpaCalculatorPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
});

type Row = { id: number; name: string; units: string; grade: string };
let nextId = 4;

function CgpaCalculatorPage() {
  const [rows, setRows] = useState<Row[]>([
    { id: 1, name: "", units: "3", grade: "A" },
    { id: 2, name: "", units: "2", grade: "B" },
    { id: 3, name: "", units: "3", grade: "C" },
  ]);

  const result = useMemo(() => {
    let units = 0;
    let points = 0;
    for (const r of rows) {
      const u = Number(r.units);
      const band = GRADE_SCALE.find((g) => g.grade === r.grade);
      if (!band || !Number.isFinite(u) || u <= 0) continue;
      units += u;
      points += u * band.points;
    }
    return { units, points, cgpa: units > 0 ? points / units : null };
  }, [rows]);

  const update = (id: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const field =
    "h-11 rounded-lg border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link to="/" className="text-sm font-semibold text-primary">TrueFluency Pro</Link>
        <h1 className="mt-4 text-3xl font-bold leading-tight">Free UI CGPA Calculator (5.0 scale)</h1>
        <p className="mt-3 text-muted-foreground">
          Work out your University of Ibadan CGPA in seconds. Add each course, its credit units and your grade.
        </p>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm" aria-label="Calculator">
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={r.id} className="grid grid-cols-[1fr_5rem_5rem_2.75rem] gap-2">
                <input aria-label={`Course ${i + 1} name`} placeholder={`Course ${i + 1}`} className={field}
                  value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} />
                <input aria-label={`Course ${i + 1} units`} inputMode="numeric" type="number" min={1} max={12}
                  className={field} value={r.units} onChange={(e) => update(r.id, { units: e.target.value })} />
                <select aria-label={`Course ${i + 1} grade`} className={field} value={r.grade}
                  onChange={(e) => update(r.id, { grade: e.target.value })}>
                  {GRADE_SCALE.map((g) => <option key={g.grade} value={g.grade}>{g.grade}</option>)}
                </select>
                <button type="button" aria-label={`Remove course ${i + 1}`}
                  className="h-11 rounded-lg border border-border text-muted-foreground hover:text-foreground"
                  onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="mt-4 h-11 rounded-lg border border-border px-4 font-medium"
            onClick={() => setRows((rs) => [...rs, { id: nextId++, name: "", units: "3", grade: "A" }])}>
            + Add course
          </button>

          <div className="mt-6 rounded-xl bg-secondary p-4 text-secondary-foreground" aria-live="polite">
            <p className="text-sm">Your CGPA</p>
            <p className="text-4xl font-bold tabular-nums">
              {result.cgpa === null ? "–" : result.cgpa.toFixed(2)}
              <span className="text-lg font-medium"> / {MAX_POINTS.toFixed(2)}</span>
            </p>
            <p className="mt-1 text-sm">
              {result.cgpa === null ? "Add a course to begin." :
                `${classify(result.cgpa)} · ${result.points} quality points from ${result.units} units`}
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold">How to calculate your CGPA</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Turn each course score into a grade point using the table below.</li>
            <li>Multiply each grade point by the course's credit units. This gives quality points.</li>
            <li>Add up all quality points, and add up all credit units.</li>
            <li>Divide total quality points by total credit units. That number is your CGPA.</li>
          </ol>
          <p className="mt-4 text-muted-foreground">
            Example: A in a 3-unit course (15) + B in a 2-unit course (8) = 23 points ÷ 5 units = 4.60.
          </p>
          <table className="mt-6 w-full text-left text-sm">
            <thead><tr className="border-b border-border"><th className="py-2">Grade</th><th>Score</th><th>Points</th></tr></thead>
            <tbody>
              {GRADE_SCALE.map((g) => (
                <tr key={g.grade} className="border-b border-border">
                  <td className="py-2 font-semibold">{g.grade}</td><td>{g.percent}</td><td>{g.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">Always confirm your official result with your department.</p>
        </section>

        <section className="mt-10 rounded-2xl bg-primary p-6 text-primary-foreground">
          <h2 className="text-xl font-bold">Want to raise your CGPA?</h2>
          <p className="mt-2 opacity-90">
            TrueFluency Pro turns your course notes into mock tests, flashcards and a study plan for your next exams.
          </p>
          <Link to="/" className="mt-4 inline-flex h-11 items-center rounded-lg bg-background px-5 font-semibold text-foreground">
            Try TrueFluency free
          </Link>
        </section>
      </div>
    </main>
  );
}
