import { cn } from "@/lib/utils";
import { MathText } from "@/components/math-text";
import { splitWrongPicks, toTeachingExplanation, type WrongPickNote } from "@/lib/why-blocks";

const LETTERS = "ABCD";

type Props = {
  explanation: string;
  /** The option the student actually chose (its position, 0 to 3). When it is wrong and the explanation has a note for it, that
   *  note is shown first, under "Why your answer was wrong", and the notes for the other options are tucked under one tap. */
  pickedIndex?: number | null;
  correctIndex?: number;
};

function OtherOptions({ items, label }: { items: WrongPickNote[]; label: string }) {
  if (!items.length) return null;
  return (
    <details className="group rounded-xl border border-border bg-muted/30 px-3 py-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
      </summary>
      <ul className="space-y-2 pb-2 pt-1">
        {items.map((item) => (
          <li key={item.letter} className="break-words text-sm leading-7 text-foreground">
            <span className="font-semibold">{item.letter}</span>
            {item.quote ? <span className="text-muted-foreground"> ({item.quote})</span> : null}
            <span>: </span>
            <MathText examMath>{item.note}</MathText>
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * One explanation, shown in the labelled blocks the backend writes (what it tests, rule, worked steps, why the options are wrong...).
 * With `pickedIndex` it also answers the question every student asks first: "why was MY answer wrong?". Nothing is generated or
 * guessed here; text that is not written in the expected shape is shown exactly as it always was.
 */
export function TeachingExplanationBlocks({ explanation, pickedIndex, correctIndex }: Props) {
  const content = toTeachingExplanation(explanation);
  const picks = splitWrongPicks(content.commonMistake);

  const pickedWrong = typeof pickedIndex === "number" && typeof correctIndex === "number" && pickedIndex !== correctIndex;
  const ownLetter = pickedWrong ? LETTERS[pickedIndex as number] : null;
  const own = ownLetter && picks ? picks.find((p) => p.letter === ownLetter) ?? null : null;
  // Split the wrong-option notes only when there is something better to do with them than show them as one paragraph.
  const split = picks && typeof pickedIndex === "number" ? picks : null;
  const others = split ? split.filter((p) => p !== own) : [];

  const sections = [
    { key: "what", label: "What it tests", body: content.whatItTests, tone: "border-primary/15 bg-primary/5" },
    { key: "plain", label: "Plain-English words", body: content.plainEnglish, tone: "border-primary/20 bg-primary/5 dark:border-accent/25 dark:bg-accent/5" },
    { key: "rule", label: "Minimum rule", body: content.minimumRule, tone: "border-accent/20 bg-accent/10" },
    { key: "example", label: "Easy example", body: content.easyExample, tone: "border-success/20 bg-success/10" },
    // Only when the notes are NOT split out below (no pick known, or older text): the one block, exactly as before.
    { key: "mistake", label: "Common mistake", body: split ? null : content.commonMistake, tone: "border-destructive/15 bg-destructive/5" },
    { key: "worked", label: "Worked solution / steps", body: content.workedSolution, tone: "border-border bg-muted/40" },
  ].filter((section) => Boolean(section.body));
  const recapItems = [
    { label: "The rule to remember", body: content.recap.rule },
    { label: "Apply it here", body: content.recap.application },
    { label: "Therefore", body: content.recap.therefore },
  ].filter((item) => Boolean(item.body));
  const hasRecap = recapItems.length > 0 || Boolean(content.recap.intro);

  if (sections.length === 0 && !content.finalAnswer && !hasRecap && !split) return null;

  return (
    <div className="space-y-2.5">
      {own ? (
        <section className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5">
          <h4 className="text-xs font-semibold text-foreground">Why your answer was wrong</h4>
          <div className="mt-1 break-words text-sm leading-7 text-foreground">
            <span className="font-semibold">You chose {own.letter}</span>
            {own.quote ? <span className="text-muted-foreground"> ({own.quote})</span> : null}
            <span>: </span>
            <MathText examMath>{own.note}</MathText>
          </div>
        </section>
      ) : null}
      {sections.map((section) => {
        const steps = section.key === "worked" ? splitSteps(section.body ?? "") : null;
        if (steps) return (
          <section key={section.key} className={cn("rounded-xl border px-3 py-2.5", section.tone)}>
            <h4 className="text-xs font-semibold text-foreground">{section.label}</h4>
            <ol className="mt-2 space-y-2">
              {steps.map((st, n) => (
                <li key={n} className="rounded-lg border border-border bg-card px-3 py-2">
                  <span className="inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-foreground">{st.badge}</span>
                  <div className="mt-1.5 break-words whitespace-pre-wrap text-sm leading-7 text-foreground"><MathText examMath>{st.text}</MathText></div>
                </li>
              ))}
            </ol>
          </section>
        );
        return (
        <section key={section.key} className={cn("rounded-xl border px-3 py-2.5", section.tone)}>
          <h4 className="text-xs font-semibold text-foreground">{section.label}</h4>
          <div className="mt-1 break-words whitespace-pre-wrap text-sm leading-7 text-foreground">
            <MathText examMath>{section.body}</MathText>
          </div>
        </section>
        );
      })}
      {others.length ? <OtherOptions items={others} label={own ? "Why the other options are wrong" : "Why each wrong option fails"} /> : null}
      {content.finalAnswer ? (
        <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-foreground">
          <h4 className="text-xs font-semibold">Final answer</h4>
          <div className="mt-1 break-words whitespace-pre-wrap text-base font-semibold leading-7">
            <MathText examMath>{content.finalAnswer}</MathText>
          </div>
        </div>
      ) : null}
      {hasRecap ? (
        <section className="rounded-xl border border-accent/25 bg-accent/10 p-3">
          <h4 className="text-xs font-semibold text-foreground">Short recap</h4>
          {content.recap.intro ? (
            <div className="mt-1 break-words whitespace-pre-wrap text-sm leading-7 text-foreground">
              <MathText examMath>{content.recap.intro}</MathText>
            </div>
          ) : null}
          {recapItems.length ? (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {recapItems.map((item) => (
                <div key={item.label} className="min-w-0 rounded-lg border border-accent/15 bg-card/70 p-2.5">
                  <h5 className="text-xs font-semibold text-foreground">{item.label}</h5>
                  <div className="mt-1 break-words whitespace-pre-wrap text-sm leading-6 text-foreground">
                    <MathText examMath>{item.body}</MathText>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}


/** Splits "Step 1: … Step 2: …", "1. … 2. …" or a trailing "Therefore:" into step cards. Null when not multi-step. */
export function splitSteps(body: string): { badge: string; text: string }[] | null {
  const re = /(?:^|\n|\s)(?=(?:Step\s*\d+\s*[:.)-])|(?:\d+[.)]\s)|(?:Therefore\s*[:,]))/i;
  const parts = body.split(new RegExp(re.source, "gi")).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  let n = 0;
  return parts.map((p) => {
    const m = p.match(/^(?:Step\s*(\d+)\s*[:.)-]|(\d+)[.)]\s|(Therefore)\s*[:,])\s*/i);
    if (m?.[3]) return { badge: "Therefore", text: p.slice(m[0].length) };
    if (m) { n = Number(m[1] ?? m[2]); return { badge: `Step ${n}`, text: p.slice(m[0].length) }; }
    n += 1;
    return { badge: n === 1 ? "Setup" : `Step ${n}`, text: p };
  });
}
