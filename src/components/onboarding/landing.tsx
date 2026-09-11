import { useRef } from "react";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { BrainCircuit, Calculator, FileText, LineChart, Sparkles } from "lucide-react";
import { PRICE_LINE, TRIAL_LINE } from "@/lib/pricing-copy";
import productPreview from "@/assets/product-preview.png.asset.json";

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
  const insideRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="min-h-screen bg-[#F7F3EA]">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col px-5 pb-10 pt-6">
        <header className="mb-8 flex items-center gap-2">
          <LogoMark className="h-8 w-8" />
          <span className="font-display text-base font-semibold tracking-tight text-[#1B2A4A]">
            TrueFluency <span className="text-[#B86E0A]">Pro</span>
          </span>
          <button
            type="button"
            onClick={() => go("identity")}
            className="ml-auto text-xs text-muted-foreground underline underline-offset-2 hover:text-[#1B2A4A]"
          >
            Already have an account? Log in
          </button>
        </header>

        <section>
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#E4DCC8] bg-white px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-[#B86E0A]" />
            Every faculty, every department, 100L to final year
          </div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight text-[#1B2A4A]">
            Turn your UI slides and notes into practice exams.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Upload a PDF, slides or photos of your notes, and get study topics
            and mock tests built from your own lecturer's material.
          </p>

          <div className="mt-6 space-y-3">
            <Button
              size="lg"
              className="h-12 min-h-[48px] w-full bg-[#B86E0A] text-[#FFFFFF] hover:bg-[#a4620a]"
              onClick={() => go("disclaimer")}
            >
              Start 7-day free trial
            </Button>
            <div className="space-y-1 text-center text-xs leading-relaxed text-muted-foreground">
              <p>{TRIAL_LINE}</p>
              <p>{PRICE_LINE}</p>
              <p>No card required up front.</p>
              <p>No automatic debit. Trial runs 7 days. Pay when you upgrade.</p>
            </div>
            <Button
              size="lg"
              variant="outline"
              className="w-full border-[#E4DCC8] bg-white text-[#1B2A4A]"
              onClick={() =>
                insideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              See what's inside
            </Button>
          </div>
        </section>

        {/* Hero: one static frame of the real app, drawn in the page itself so
            it paints with the first render (no image request, no layout shift). */}
        <div
          className="mt-9 overflow-hidden rounded-2xl border border-[#E4DCC8] bg-white p-4 shadow-sm"
          style={{ aspectRatio: "4 / 5" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-lg font-semibold text-[#1B2A4A]">CHE 105</div>
              <div className="text-[11px] text-muted-foreground">
                Introductory Physical Chemistry
              </div>
            </div>
            <span className="rounded-md bg-[#8B2E2E] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              PDF
            </span>
          </div>

          <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Topics in this upload
          </div>
          <div className="mt-2 space-y-2">
            <TopicRow topic="Chemical equilibrium" pill="Strong in this upload" tone="strong" />
            <TopicRow topic="Thermodynamics" pill="Appears moderately" tone="moderate" />
            <TopicRow topic="Reaction kinetics" pill="Mentioned briefly" tone="brief" />
          </div>

          <div className="mt-4 rounded-xl border border-[#E4DCC8] bg-[#F7F3EA] p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Mock test
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#1B2A4A]">
              Which change shifts an exothermic equilibrium towards the
              reactants?
            </p>
            <div className="mt-2 space-y-1.5">
              {["Raising the temperature", "Adding a catalyst", "Reducing the volume"].map((o) => (
                <div
                  key={o}
                  className="rounded-lg border border-[#E4DCC8] bg-white px-2.5 py-1.5 text-[11px] text-[#1B2A4A]"
                >
                  {o}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-[#B86E0A] px-3 py-2 text-center text-xs font-semibold text-white">
            Take a mock
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Topics and mock tests, generated from your own courses.
        </p>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Built for University of Ibadan students across {FACULTIES}.
        </p>

        <div ref={insideRef} className="mt-10 scroll-mt-4">
          <h2 className="font-display text-xl font-semibold text-[#1B2A4A]">What's inside</h2>
          <figure className="mt-4">
            <img
              src={productPreview.url}
              alt="TrueFluency Pro Home from your own upload, not exam percentages"
              className="w-full rounded-2xl border border-[#E4DCC8]"
              loading="lazy"
            />
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">
              The Home screen after you upload a file.
            </figcaption>
          </figure>
          <div className="mt-4 space-y-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-[#E4DCC8] bg-white p-4 shadow-sm">
                <div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-[#B86E0A]/10 text-[#B86E0A]">
                  <f.icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#1B2A4A]">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-[#E4DCC8] bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-[#1B2A4A]">
            Built for UI, across every faculty and department
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Most Nigerian exam prep tools cover one level or one department and
            stop there. TrueFluency Pro was built by a UI student to work across
            Science, Clinical, Arts, Law, Technology and Social Sciences, so it
            still fits when you move from 100L to 200L and beyond.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            To be clear with you: this is a study aid, not a replacement for
            lectures. It shows you what your own material leans on, and it never
            promises which questions will appear.
          </p>
        </div>

        <div className="mt-8">
          <Button
            size="lg"
            className="h-12 min-h-[48px] w-full bg-[#B86E0A] text-[#FFFFFF] hover:bg-[#a4620a]"
            onClick={() => go("disclaimer")}
          >
            Start 7-day free trial
          </Button>
          <div className="mt-3 space-y-1 text-center text-xs leading-relaxed text-muted-foreground">
            <p>{TRIAL_LINE}</p>
            <p>{PRICE_LINE}</p>
            <p>No automatic debit. Trial runs 7 days. Pay when you upgrade.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopicRow({
  topic,
  pill,
  tone,
}: {
  topic: string;
  pill: string;
  tone: "strong" | "moderate" | "brief";
}) {
  const pillClass =
    tone === "strong"
      ? "bg-[#B86E0A] text-white"
      : tone === "moderate"
        ? "bg-[#F3E6C8] text-[#1B2A4A]"
        : "bg-[#F7F3EA] text-muted-foreground border border-[#E4DCC8]";
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E4DCC8] bg-white px-3 py-2">
      <span className="truncate text-xs font-medium text-[#1B2A4A]">{topic}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pillClass}`}>
        {pill}
      </span>
    </div>
  );
}
