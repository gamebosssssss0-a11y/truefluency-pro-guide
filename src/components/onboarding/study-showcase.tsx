import { useState } from "react";
import { BrainCircuit, Calculator, Check, MessageCircle, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/rich-text";
import { MathText } from "@/components/math-text";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/** Public, labelled examples. Never mount live account screens or make study API calls. */
export function StudyShowcase() {
  const [choice, setChoice] = useState<number | null>(0);
  return (
    <section
      id="study-examples"
      aria-label="TrueFluency Pro study examples"
      className="mt-8 min-w-0"
      data-swipe-lock
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Inside TrueFluency Pro
        </h2>
        <span className="shrink-0 text-xs text-muted-foreground">Example content</span>
      </div>
      <Tabs
        defaultValue="mock"
        className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      >
        <TabsList
          aria-label="Study examples"
          className="grid h-auto w-full grid-cols-3 rounded-none border-b border-border bg-muted p-1"
        >
          <TabsTrigger value="mock" className="min-h-11 min-w-0 gap-1 px-1 text-xs">
            <BrainCircuit className="size-4 shrink-0" />
            Mock & Tutor
          </TabsTrigger>
          <TabsTrigger value="chat" className="min-h-11 min-w-0 gap-1 px-1 text-xs">
            <MessageCircle className="size-4 shrink-0" />
            Verilo
          </TabsTrigger>
          <TabsTrigger value="cgpa" className="min-h-11 min-w-0 gap-1 px-1 text-xs">
            <Calculator className="size-4 shrink-0" />
            CGPA
          </TabsTrigger>
        </TabsList>
        <div className="min-h-[480px] p-4 sm:min-h-[440px] sm:p-6">
          <TabsContent
            value="mock"
            className="m-0 space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
          >
            <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-foreground">CHE 105 · Tutor mode</h3>
                <p className="text-xs text-muted-foreground">Introductory Physical Chemistry</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-2 text-xs tabular-nums text-foreground">
                <Clock3 className="size-3.5" />
                12:45
              </span>
            </header>
            <div className="flex items-center gap-3">
              <Progress value={25} className="h-1.5 min-w-0 flex-1" />
              <span className="shrink-0 text-xs text-muted-foreground">Q 1 of 4</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              At equilibrium, what is the relationship between standard Gibbs free energy and the
              equilibrium constant?
            </p>
            <div className="space-y-2">
              {[
                "\\Delta G^\\circ = -RT \\ln K",
                "\\Delta G^\\circ = RTK",
                "\\Delta G^\\circ = 0",
              ].map((formula, index) => (
                <Button
                  key={formula}
                  variant="outline"
                  aria-pressed={choice === index}
                  onClick={() => setChoice(index)}
                  className={`h-auto min-h-11 w-full justify-start gap-3 whitespace-normal px-3 py-2 text-left ${choice === index ? "border-accent bg-secondary text-foreground" : ""}`}
                >
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <MathText>{`\\(${formula}\\)`}</MathText>
                  {choice === index && <Check className="ml-auto shrink-0 text-accent" />}
                </Button>
              ))}
            </div>
            <div
              className="border-l-2 border-accent pl-3 text-sm text-foreground"
              aria-live="polite"
            >
              {choice === 0 ? (
                <RichText>
                  {
                    "**Why A is correct**\n\n1. Use the equilibrium relation: \\(\\Delta G^\\circ = -RT \\ln K\\).\n2. If \\(K > 1\\), then \\(\\ln K > 0\\), so \\(\\Delta G^\\circ < 0\\)."
                  }
                </RichText>
              ) : (
                <p className="leading-relaxed">Not quite. Try again before revealing the answer.</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Tutor mode is available on Core and Exam.
            </p>
          </TabsContent>
          <TabsContent
            value="chat"
            className="m-0 space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
          >
            <header>
              <h3 className="font-semibold text-foreground">Verilo Study Chat</h3>
              <p className="text-xs text-muted-foreground">CHE 105 · Example lecture excerpt</p>
            </header>
            <p className="ml-6 rounded-lg bg-secondary p-3 text-sm leading-relaxed text-secondary-foreground">
              Break down this past-paper question on chemical equilibrium.
            </p>
            <div className="text-sm leading-relaxed text-foreground">
              <RichText>
                {
                  "### Chemical equilibrium\n\nEquilibrium means the forward and reverse reactions proceed at equal rates. The concentrations stay constant; the reactions do not stop.\n\n**Worked example**\n\nFor an exothermic reaction, raising the temperature favours the reverse reaction and shifts equilibrium towards the reactants.\n\n---\n\n**Source in this example:** CHE 105 lecture excerpt · Chemical equilibrium."
                }
              </RichText>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                Chemical equilibrium
              </span>
              <span className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                Thermodynamics
              </span>
            </div>
          </TabsContent>
          <TabsContent
            value="cgpa"
            className="m-0 space-y-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
          >
            <header>
              <h3 className="font-semibold text-foreground">CGPA calculator and goal setter</h3>
              <p className="text-xs text-muted-foreground">UI 5.00 scale</p>
            </header>
            <div className="border-b border-border pb-5">
              <p className="text-xs text-muted-foreground">Updated cumulative CGPA</p>
              <p className="mt-2 font-display text-4xl font-semibold text-foreground">
                4.52 <span className="text-base text-muted-foreground">/ 5.00</span>
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">First Class</p>
              <Progress value={90.4} className="mt-3 h-2" />
            </div>
            <dl className="space-y-3 text-sm text-foreground">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Semester target</dt>
                <dd className="font-semibold">4.70 GPA</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Grade scale</dt>
                <dd className="font-semibold">A=5 · B=4 · C=3</dd>
              </div>
            </dl>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Enter your real scores for your true CGPA and classification, then set a target and
              see the grades and study plan needed.
            </p>
          </TabsContent>
        </div>
      </Tabs>
      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Your notes, your study shelf</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Example lecture excerpts · not student uploads
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Chemical equilibrium",
              text: "Forward and reverse reactions proceed at equal rates. Concentrations remain constant at equilibrium.",
              badge: "Shared by Adeola · CHE 105",
            },
            {
              title: "Thermodynamics",
              text: "Gibbs free energy relates the equilibrium constant to temperature and the gas constant.",
              badge: "My locker · CHE 105",
            },
          ].map((file) => (
            <div
              key={file.title}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div
                role="img"
                aria-label={`Example document excerpt: ${file.title}`}
                className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded border border-border bg-background p-2"
              >
                <p className="text-[7px] font-semibold leading-tight text-foreground">
                  {file.title}
                </p>
                <p className="mt-2 text-[6px] leading-relaxed text-muted-foreground">{file.text}</p>
                <span className="absolute bottom-1 right-1 grid size-5 place-items-center rounded-full border border-accent bg-card text-[9px] font-semibold text-foreground">
                  {file.badge.startsWith("Shared") ? "A" : "M"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{file.title}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{file.badge}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
