import { PolicyLinks } from "@/components/legal-policies-dialog";
import { useRef } from "react";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { BrainCircuit, Calculator, FileText, LineChart, Sparkles } from "lucide-react";
import { PRICE_LINE, TRIAL_LINE } from "@/lib/pricing-copy";
import { StudyShowcase } from "@/components/onboarding/study-showcase";
import { PhoneShowcase } from "@/components/onboarding/phone-showcase";

/**
 * Landing screen. Honesty contract: no exam-probability percentages and no
 * claims about guaranteed questions. Topic strength is only ever described
 * qualitatively ("Strong in this upload" / "Appears moderately" /
 * "Mentioned briefly"), exactly as the app itself labels it.
 */

const features = [
  {
    icon: BrainCircuit,
    title: "Topics that stand out in your own upload",
    body: "Upload a past paper or slides and see which topics your lecturer leans on, described in plain words, not fake percentages.",
  },
  {
    icon: FileText,
    title: "AI mock tests from your own material",
    body: "Practice questions built from your course content, with adjustable difficulty and length instead of a generic question bank.",
  },
  {
    icon: LineChart,
    title: "Test history and progress tracking",
    body: "Score trends across attempts, plus the topics that keep coming back as weak points so you know what to revisit.",
  },
  {
    icon: Calculator,
    title: "CGPA calculator and goal setter",
    body: "Enter your real scores for your true CGPA and classification, then set a target and see the grades and study plan needed.",
  },
];

const FACULTIES = "Science, Clinical, Arts, Law, Technology, Social Sciences";

export function LandingScreen() {
  const { go } = useProfile();
  const insideRef = useRef<HTMLDetailsElement | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-10 pt-6 md:py-12">
        <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex">
          <div className="flex min-w-0 items-center gap-2">
            <LogoMark className="h-8 w-8 shrink-0" />
            <span className="font-display text-base font-semibold text-foreground">
              TrueFluency <span className="text-accent-ink">Pro</span>
            </span>
          </div>
          <nav aria-label="Landing sections" className="ml-auto hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost">
              <a href="#study-examples">Study examples</a>
            </Button>
            <Button asChild variant="ghost">
              <a href="#inside">What's inside</a>
            </Button>
          </nav>
          <Button
            type="button"
            onClick={() => {
              try {
                sessionStorage.setItem("truefluency-open-identity-auth", "1");
              } catch {
                /* the identity screen still offers account access */
              }
              go("identity");
            }}
            variant="ghost"
            className="ml-auto h-auto min-h-11 max-w-32 whitespace-normal text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground sm:max-w-none"
          >
            Already have an account? Log in
          </Button>
        </header>

        <section className="mx-auto w-full max-w-2xl">
          <div className="mb-4 inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent-ink" />
            Every faculty, every department, 100L to final year
          </div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight text-foreground">
            Turn your UI slides and notes into practice exams.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Upload a PDF, slides or photos of your notes, and get study topics and mock tests built
            from your own lecturer's material.
          </p>

          <div className="mt-4 space-y-3">
            <Button
              size="lg"
              className="h-12 min-h-[48px] w-full bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => go("disclaimer")}
            >
              Start 7-day free trial
            </Button>
            <div className="space-y-1 text-center text-xs leading-relaxed text-muted-foreground">
              <p>No card required up front.</p>
              <p>No automatic debit.</p>
            </div>
            <Button
              size="lg"
              variant="outline"
              className="w-full border-border bg-surface text-foreground"
              onClick={() =>
                (() => {
                  if (!insideRef.current) return;
                  insideRef.current.open = true;
                  insideRef.current.scrollIntoView({
                    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                      ? "auto"
                      : "smooth",
                    block: "start",
                  });
                })()
              }
            >
              See what's inside
            </Button>
          </div>
        </section>

        <PhoneShowcase />

        <StudyShowcase />

        <div className="mx-auto mt-6 w-full max-w-2xl">
          <details className="rounded-xl border border-border bg-card p-3">
            <summary className="cursor-pointer text-center text-xs font-semibold text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              Trial and plan details
            </summary>
            <div className="mt-3 space-y-1 text-center text-xs leading-relaxed text-muted-foreground">
              <p>{TRIAL_LINE}</p>
              <p className="break-words">{PRICE_LINE}</p>
              <p>Trial runs 7 days. Pay when you upgrade.</p>
            </div>
          </details>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Built for University of Ibadan students across {FACULTIES}.
        </p>

        <details
          id="inside"
          ref={insideRef}
          className="mt-10 scroll-mt-4 rounded-2xl border border-border bg-card p-4"
        >
          <summary className="cursor-pointer list-none font-display text-xl font-semibold text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            What's inside
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-border bg-surface p-4 shadow-sm"
              >
                <div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent-ink">
                  <f.icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </details>

        <details className="mt-10 rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer font-semibold text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            Why TrueFluency is built for UI students
          </summary>
          <div className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Built for UI, across every faculty and department
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Most Nigerian exam prep tools cover one level or one department and stop there.
              TrueFluency Pro was built by a UI student to work across Science, Clinical, Arts, Law,
              Technology and Social Sciences, so it still fits when you move from 100L to 200L and
              beyond.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              To be clear with you: this is a study aid, not a replacement for lectures. It shows
              you what your own material leans on, and it never promises which questions will
              appear.
            </p>
          </div>
        </details>
        <footer className="mt-10 border-t border-border pt-6 text-center text-xs leading-relaxed text-muted-foreground">
          <p>TrueFluency Pro · Built for University of Ibadan students</p>
          <PolicyLinks className="mt-2 block" />
        </footer>
      </div>
    </div>
  );
}
