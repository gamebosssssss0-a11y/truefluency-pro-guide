import { useRef } from "react";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { BrainCircuit, Calculator, FileText, Sparkles } from "lucide-react";
import productPreview from "@/assets/product-preview.png";

const features = [
  {
    icon: FileText,
    title: "AI mock tests from your own materials",
    body: "Upload past papers, slides or notes and get practice questions generated from the real content of your courses.",
  },
  {
    icon: BrainCircuit,
    title: "Predicted topics, ranked by confidence",
    body: "Pattern analysis across your past papers highlights the topics most likely to show up, so revision time goes where it counts.",
  },
  {
    icon: Calculator,
    title: "CGPA planning tools",
    body: "Calculate your CGPA on the 5.00 scale and work backwards from the result you want to the grades you need.",
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
        </header>

        <section>
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Built for University of Ibadan students
          </div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight text-foreground">
            AI-powered exam prep, built for University of Ibadan students
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            TrueFluency Pro turns your own course materials into mock tests,
            predicted exam topics and a CGPA plan, so you walk into every paper
            knowing exactly what to revise.
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
            A study aid, not a substitute for your coursework. Predictions are
            statistical estimates from past papers.
          </p>
        </div>
      </div>
    </div>
  );
}
