import { useRef } from "react";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import {
  BrainCircuit,
  Calculator,
  FileText,
  LineChart,
  Library,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import productPreview from "@/assets/product-preview.png";
import { PRICE_LINE, TRIAL_LINE } from "@/lib/pricing-copy";

const PRICING_LINE = `Free to start, no card required. ${TRIAL_LINE}. ${PRICE_LINE}`;


const features = [
  {
    icon: BrainCircuit,
    title: "AI predicted exam topics",
    body: "Upload a past paper and get a ranked list of likely topics with a confidence score, generated from that exact material rather than a static syllabus.",
  },
  {
    icon: FileText,
    title: "AI mock tests from your own material",
    body: "Realistic practice questions built from your course content, with adjustable difficulty and length instead of a generic question bank.",
  },
  {
    icon: LineChart,
    title: "Test history and progress tracking",
    body: "Score trends across attempts, plus the specific topics that keep coming back as weak points so you know what to revisit.",
  },
  {
    icon: Calculator,
    title: "CGPA calculator and goal setter",
    body: "Enter your real scores for your true CGPA and classification, then set a target and see the exact grades and study plan needed to reach it.",
  },
];

const upcoming = [
  {
    icon: Library,
    title: "Resource Library",
    body: "Students share past papers and notes by course, so the material pool grows with the community.",
  },
  {
    icon: MessagesSquare,
    title: "AI Study Chatbot",
    body: "Course specific Q&A alongside general study help.",
  },
];

export function LandingScreen() {
  const { go } = useProfile();
  const insideRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-6">
        <header className="mb-8 flex items-center gap-2">
          <LogoMark className="h-8 w-8" />
          <span className="font-display text-base font-semibold tracking-tight text-foreground">
            TrueFluency <span className="text-accent">Pro</span>
          </span>
          <button
            type="button"
            onClick={() => go("identity")}
            className="ml-auto text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Already have an account? Log in
          </button>
        </header>

        <section>
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Every faculty, every department, 100L to final year
          </div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight text-foreground">
            Study smarter using your own course material, not guesswork
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            TrueFluency Pro is an exam prep app built for University of Ibadan
            students. Upload your past papers and notes, and it ranks the topics
            that stand out in your own material, then generates mock tests from
            what you are actually being taught.
          </p>

          <div className="mt-6 space-y-3">
            <Button
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => go("disclaimer")}
            >
              Get Started, it's free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full border-border"
              onClick={() =>
                insideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              See what's inside
            </Button>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              {PRICING_LINE}
            </p>
          </div>
        </section>

        <div className="mt-9 overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm">
          <img
            src={productPreview}
            width={1024}
            height={1024}
            alt="TrueFluency Pro showing predicted exam topics with confidence scores and an AI generated mock test question"
            className="w-full"
          />
          <p className="px-1 pb-1 pt-2 text-center text-xs text-muted-foreground">
            Predicted topics and AI mock tests, generated from your courses.
          </p>
        </div>

        <div ref={insideRef} className="mt-10 scroll-mt-4">
          <h2 className="font-display text-xl font-semibold text-foreground">
            What's inside
          </h2>
          <div className="mt-4 space-y-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
                  <f.icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-8 font-display text-xl font-semibold text-foreground">
            Coming next
          </h2>
          <div className="mt-4 space-y-3">
            {upcoming.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-dashed border-border bg-card/60 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Built for UI, across every faculty and department
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Most Nigerian exam prep tools cover one level or one department and
            stop there. TrueFluency Pro was built by a UI student to work across
            Science, Arts, Technology, Social Sciences, Law, Medicine,
            Engineering and the rest, so it still fits when you move from 100L
            to 200L and beyond.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            To be straight with you: this is a study aid, not a replacement for
            lectures, and predictions are statistical estimates from past
            papers, not guarantees.
          </p>
        </div>

        <div className="mt-8">
          <Button
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => go("disclaimer")}
          >
            Get Started, it's free
          </Button>
          <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
            {PRICING_LINE} One time payment, no auto renewal.
          </p>
        </div>
      </div>
    </div>
  );
}
