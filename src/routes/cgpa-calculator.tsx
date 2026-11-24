import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { GRADE_SCALE } from "@/lib/cgpa";
import { CgpaCalculatorScreen } from "@/components/cgpa-calculator";
import { StandaloneProfileProvider } from "@/lib/profile-store";

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

function CgpaCalculatorPage() {
  const routerNavigate = useNavigate();
  const goHome = useCallback(() => { void routerNavigate({ to: "/" }); }, [routerNavigate]);
  return (
    <main className="min-h-screen bg-background text-foreground">
      <h1 className="sr-only">Free UI CGPA Calculator (5.0 scale)</h1>
      <StandaloneProfileProvider onExit={goHome}>
        <CgpaCalculatorScreen onBack={goHome} backLabel="TrueFluency Home" />
      </StandaloneProfileProvider>
      <div className="mx-auto max-w-md px-5 pb-12">
        <section className="mt-4">
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
