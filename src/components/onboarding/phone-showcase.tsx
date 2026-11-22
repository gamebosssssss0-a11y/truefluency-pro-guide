import { BookOpen, CalendarDays, Check, ChevronDown, Lightbulb, Mic, Send, X } from "lucide-react";
import { MathText } from "@/components/math-text";
import { cn } from "@/lib/utils";

/** Code-rendered replicas of real study screens. Examples only — never live student data. */
function Phone({ label, caption, children }: { label: string; caption: string; children: React.ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-col">
      <div className="mx-auto w-full max-w-[19rem] rounded-[30px] border border-border bg-secondary p-2 shadow-[0_8px_30px_rgba(27,42,74,0.08)]">
        <div aria-label={label} role="img" className="h-[32rem] overflow-hidden rounded-[24px] border border-border bg-background p-3 text-left">
          <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
          <div aria-hidden="true">{children}</div>
        </div>
      </div>
      <figcaption className="mx-auto mt-3 max-w-[19rem] text-center text-xs leading-relaxed text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

function Option({ letter, text, state }: { letter: string; text: string; state?: "right" | "wrong" }) {
  return (
    <div className={cn(
      "flex min-h-11 items-center gap-3 rounded-xl border bg-card px-3 py-2 text-sm text-card-foreground",
      state === "right" ? "border-[var(--tf-success-muted)] bg-[color-mix(in_srgb,var(--tf-success-muted)_10%,var(--card))]" : state === "wrong" ? "border-foreground/60" : "border-border",
    )}>
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
        state === "right" ? "border-[var(--tf-success-muted)] text-[var(--tf-success-muted)]" : "border-border bg-secondary text-muted-foreground")}>
        {state === "right" ? <Check className="size-3.5" /> : state === "wrong" ? <X className="size-3.5" /> : letter}
      </span>
      <span className="min-w-0 flex-1"><MathText>{text}</MathText></span>
    </div>
  );
}

function MockHeader({ q, time, topic, pct }: { q: string; time: string; topic: string; pct: string }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0"><p className="text-[10px] text-muted-foreground">MTH103</p><p className="truncate text-xs font-semibold text-foreground">Elementary Mathematics III</p></div>
        <span className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">{time}</span>
      </div>
      <div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-border"><div className="h-full w-[12%] rounded-full bg-primary" /></div><span className="text-[10px] tabular-nums text-muted-foreground">{q}</span></div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium text-foreground">{topic}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{pct}</span>
      </div>
    </>
  );
}

export function PhoneShowcase() {
  return (
    <section aria-labelledby="phone-showcase-title" className="mx-auto mt-14 w-full max-w-6xl px-1">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tf-amber-strong)]">Inside the app</p>
        <h2 id="phone-showcase-title" className="mt-2 font-display text-[1.75rem] font-semibold leading-[1.15] text-foreground sm:text-[2.25rem]">From your lecture notes to exam-ready practice</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[0.9375rem]">Example screens, shown as they appear in TrueFluency Pro.</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Phone label="Example mock question on the tangent to a parabola" caption="Mock questions built from your own course slides.">
          <MockHeader q="Q 3 of 30" time="38:51" topic="Tangent to a parabola" pct="57% complete" />
          <p className="mt-3 text-sm font-semibold leading-snug text-foreground">For the parabola y² = 12x, what is the equation of the tangent at the point (3, 6)?</p>
          <div className="mt-3 space-y-2">
            <Option letter="A" text="$y = 2x + 3$" />
            <Option letter="B" text="$y = x + 3$" state="right" />
            <Option letter="C" text="$y = x - 3$" />
            <Option letter="D" text="$y = 2x$" />
          </div>
        </Phone>
        <Phone label="Example physics question in Tutor Mode" caption="Tutor Mode shows the fix the moment you slip.">
          <MockHeader q="Q 3 of 30" time="38:51" topic="Newton's Second Law" pct="10% complete" />
          <p className="mt-3 text-[13px] font-semibold leading-snug text-foreground">A body of mass 5 kg is acted upon by forces 3i + 2j N, −i + 4j N and 2i − 6j N. What is the magnitude of the acceleration?</p>
          <div className="mt-3 space-y-2">
            <Option letter="A" text="1.0 m/s²" state="wrong" />
            <Option letter="B" text="2.0 m/s²" />
            <Option letter="C" text="0.8 m/s²" state="right" />
            <Option letter="D" text="1.6 m/s²" />
          </div>
          <p className="mt-3 inline-flex rounded-full border border-[var(--tf-success-muted)]/50 px-2.5 py-1 text-[10px] font-medium text-[var(--tf-success-muted)]">3 answered · 27 left</p>
        </Phone>
        <Phone label="Example step-by-step explanation for a direction cosine" caption="Step-by-step working, plus why every other option is wrong.">
          <p className="text-sm font-semibold text-foreground">Step 3 — Find <MathText>{"$\\cos\\beta$"}</MathText></p>
          <p className="mt-2 text-xs leading-5 text-foreground">β is the angle with the y-axis, so we use the y-component, which is 3:</p>
          <div className="my-3 text-center text-foreground"><MathText>{"$$\\cos\\beta = \\frac{y}{|\\vec r|} = \\frac{3}{7}$$"}</MathText></div>
          <p className="text-xs font-semibold text-foreground">That's option B. <Check className="inline size-3.5 text-[var(--tf-success-muted)]" /></p>
          <div className="mt-3 rounded-xl border border-border bg-secondary/60 p-3 text-[11px] leading-5 text-foreground">
            <p className="font-semibold">Why the others are wrong:</p>
            <ul className="mt-1 space-y-1.5">
              <li><strong>A. 2/7</strong> — that's cos α, the x-axis component.</li>
              <li><strong>C. 6/7</strong> — that's cos γ, the z-axis component.</li>
              <li><strong>D. 1/7</strong> — 1/|r| has no axis component at all.</li>
            </ul>
          </div>
        </Phone>
        <Phone label="Example Verilo study chat for GST111" caption="Verilo answers from your uploaded course notes.">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Verilo</span> · GST111 <ChevronDown className="size-3" /></div>
          <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--tf-amber-strong)]">Verilo</p>
          <p className="mt-1 text-center text-base font-semibold text-foreground">Ask Verilo about GST111</p>
          <p className="mt-1 text-center text-[11px] leading-4 text-muted-foreground">Ask a question based on your uploaded GST111 notes, past questions, or slides.</p>
          <p className="mx-auto mt-2 flex w-fit items-center gap-1 rounded-full border border-[var(--tf-border-warm)]/40 bg-[var(--tf-sand-chip)]/15 px-2.5 py-1 text-[10px] text-foreground"><Check className="size-3 text-[var(--tf-sand-chip)]" />Grounded in course notes</p>
          <div className="mt-3 space-y-2">
            {[
              [BookOpen, "Make my notes make sense", "Explain the main ideas in my notes"],
              [CalendarDays, "Plan my next study session", "Find a useful focus for this week"],
              [Lightbulb, "Untangle a tricky topic", "Get a simpler explanation"],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof BookOpen;
              return (
                <div key={t as string} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-primary"><I className="size-3.5" /></span>
                  <span className="min-w-0"><span className="block text-[11px] font-semibold text-foreground">{t as string}</span><span className="block truncate text-[10px] text-muted-foreground">{d as string}</span></span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-1.5 rounded-2xl border border-[var(--tf-composer-border)] bg-card p-1.5">
            <span className="flex-1 truncate rounded-xl border-2 border-[var(--tf-amber-strong)] px-2 py-1.5 text-[11px] text-muted-foreground">Ask about GST111…</span>
            <Mic className="size-3.5 text-primary" />
            <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground"><Send className="size-3" /></span>
          </div>
        </Phone>
      </div>
    </section>
  );
}
