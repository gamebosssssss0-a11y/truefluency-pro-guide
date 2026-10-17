/**
 * Upgrade preview flow. All payment steps are visual only; no charge or entitlement change occurs.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { HeaderLogo } from "@/components/brand";
import { NO_PAYMENT_YET } from "@/lib/pricing-copy";
import { useEntitlement } from "@/hooks/use-entitlement";
import {
  CORE_DAILY_LIMITS,
  CORE_MAX_QUESTIONS,
  EXAM_DAILY_LIMITS,
  EXAM_MAX_QUESTIONS,
  EXAM_PRICE_NAIRA,
  FREE_DAILY_LIMITS,
  FREE_MAX_QUESTIONS,
  formatNaira,
  STANDARD_PRICE_NAIRA,
  FOUNDING_PRICE_NAIRA,
  FOUNDING_USER_LIMIT,
} from "@/lib/entitlements";

type Step = "offer" | "plans" | "review" | "processing" | "success" | "failed";
type PaidPlan = "core" | "exam";

const PLAN_FEATURES: Record<PaidPlan, string[]> = {
  core: [
    `${CORE_DAILY_LIMITS.mock_sets} mock sets daily · up to ${CORE_MAX_QUESTIONS} questions per set`,
    "More challenging practice, matched to your goals",
    "Clear “why” explanations and peer-save",
    "Save useful questions to revisit later",
    `${CORE_DAILY_LIMITS.chatbot_messages} Study Chat messages daily`,
    `${CORE_DAILY_LIMITS.flashcard_decks} flashcard decks daily`,
  ],
  exam: [
    `${EXAM_DAILY_LIMITS.mock_sets} mock sets daily · up to ${EXAM_MAX_QUESTIONS} questions per set`,
    "Exam-level difficulty by default",
    "Clear “why” explanations and peer-save",
    "Save useful questions to revisit later",
    `${EXAM_DAILY_LIMITS.chatbot_messages} Study Chat messages daily`,
    `${EXAM_DAILY_LIMITS.flashcard_decks} flashcard decks daily`,
  ],
};

export function UpgradeScreen() {
  const { navigate } = useProfile();
  const { access } = useEntitlement();
  const [step, setStep] = useState<Step>("offer");
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>("core");
  const corePrice = access?.foundingPriceAvailable === false
    ? STANDARD_PRICE_NAIRA
    : FOUNDING_PRICE_NAIRA;
  const currentPlan = access?.tier === "trial" ? "core" : access?.tier ?? null;
  useEffect(() => {
    if (step !== "processing") return;
    const timer = window.setTimeout(() => setStep("success"), 1400);
    return () => window.clearTimeout(timer);
  }, [step]);

  const back = () => {
    if (step === "plans") setStep("offer");
    else if (step === "review") setStep("plans");
    else navigate("account");
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <div className="mx-auto max-w-md px-5 pb-8 pt-6">
        <div className="mb-5 flex items-center gap-2">
          <button type="button" onClick={back} aria-label="Go back" className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <HeaderLogo />
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">Premium</span>
        </div>

        {step === "offer" ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">A calmer way to prepare</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-[#F7F3EA] mix-blend-difference">Full access to your next level.</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#F7F3EA] mix-blend-difference">Make every study session count with a little more room to practise.</p>
            <div className="mt-5 rounded-2xl border-2 border-accent bg-accent/10 p-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground"><Sparkles className="h-3 w-3" /> Founding price</span>
              <div className="mt-3 flex items-end gap-2"><span className="font-display text-4xl font-semibold">{formatNaira(FOUNDING_PRICE_NAIRA)}</span><span className="pb-1 text-sm text-muted-foreground">/ month</span></div>
              <p className="mt-1 text-xs text-muted-foreground">For the first {FOUNDING_USER_LIMIT} paying students · cancel any time</p>
              <div className="mt-3 flex items-baseline gap-2"><span className="font-display text-lg font-semibold text-muted-foreground line-through">{formatNaira(STANDARD_PRICE_NAIRA)}</span><span className="text-[11px] uppercase tracking-wider text-muted-foreground">after this</span></div>
            </div>
            <section className="mt-4 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold">Your studies, with more support</h2>
              <ul className="mt-3 space-y-3">{PLAN_FEATURES.core.map((line) => <li key={line} className="flex items-start gap-2 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" /><span>{line}</span></li>)}</ul>
            </section>
            <Button className="mt-5 h-12 w-full bg-[#B86E0A] text-[#080D19] hover:bg-[#B86E0A]" onClick={() => setStep("plans")}>Choose a plan</Button>
            <Button variant="outline" className="mt-3 h-12 w-full" onClick={() => navigate("support")}>Ask us about payment</Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setStep("plans")}>Compare plans</Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Payments aren’t live yet. Nothing will be charged automatically.</p>
          </>
        ) : null}

        {step === "plans" ? (
          <>
            <h1 className="font-display text-3xl font-bold text-[#F7F3EA] mix-blend-difference">Choose what works for you.</h1>
            <p className="mt-2 text-sm text-[#F7F3EA] mix-blend-difference">Start where you are. You can change your plan later. Your current plan is highlighted.</p>
            <div className="mt-5 space-y-3">
              <article className={`rounded-2xl border p-4 ${currentPlan === "free" ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-semibold">Free</h2>
                  {currentPlan === "free" ? <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase">Current plan</span> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">₦0 / always</p>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <li>{FREE_DAILY_LIMITS.mock_sets} mock sets / day</li>
                  <li>{FREE_MAX_QUESTIONS} questions / set</li>
                  <li>Balanced difficulty</li>
                  <li>No WHY explanations</li>
                  <li>No peer-save</li>
                  <li>{FREE_DAILY_LIMITS.chatbot_messages} chat · {FREE_DAILY_LIMITS.flashcard_decks} decks / day</li>
                </ul>
              </article>
              <button type="button" aria-pressed={selectedPlan === "core"} onClick={() => { setSelectedPlan("core"); setStep("review"); }} className={`w-full rounded-2xl border p-4 text-left transition hover:bg-accent/10 ${currentPlan === "core" ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-semibold">Core</h2>
                  <span className="text-sm font-semibold">{formatNaira(corePrice)} / month</span>
                </div>
                {currentPlan === "core" ? <p className="mt-1 text-xs font-semibold text-accent">Current plan</p> : <p className="mt-1 text-xs text-muted-foreground">{access?.foundingPriceAvailable === false ? "Standard price" : `Founding price for the first ${FOUNDING_USER_LIMIT} paying students`}</p>}
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{PLAN_FEATURES.core.map((line) => <li key={line}>✓ {line}</li>)}</ul>
                <span className="mt-3 inline-flex text-xs font-semibold text-accent">{currentPlan === "core" ? "Review Core" : "Select Core"}</span>
              </button>
              <button type="button" aria-pressed={selectedPlan === "exam"} onClick={() => { setSelectedPlan("exam"); setStep("review"); }} className={`w-full rounded-2xl border p-4 text-left transition hover:bg-accent/10 ${currentPlan === "exam" ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-semibold">Exam</h2>
                  <span className="text-sm font-semibold">{formatNaira(EXAM_PRICE_NAIRA)} / month</span>
                </div>
                {currentPlan === "exam" ? <p className="mt-1 text-xs font-semibold text-accent">Current plan</p> : <p className="mt-1 text-xs text-muted-foreground">Available plan</p>}
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{PLAN_FEATURES.exam.map((line) => <li key={line}>✓ {line}</li>)}</ul>
                <span className="mt-3 inline-flex text-xs font-semibold text-accent">{currentPlan === "exam" ? "Review Exam" : "Select Exam"}</span>
              </button>
            </div>
          </>
        ) : null}

        {step === "review" ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Review</p>
            <h1 className="mt-2 font-display text-3xl font-bold">{selectedPlan === "core" ? "Core plan" : "Exam plan"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Review the plan details. Checkout is a preview only.</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {selectedPlan === "core" ? formatNaira(corePrice) : formatNaira(EXAM_PRICE_NAIRA)} per month
              {selectedPlan === "core" && access?.foundingPriceAvailable !== false ? ` · founding price for the first ${FOUNDING_USER_LIMIT} paying students` : ""}
            </p>
            <ul className="mt-5 space-y-3">{PLAN_FEATURES[selectedPlan].map((line) => <li key={line} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /><span>{line}</span></li>)}</ul>
            <p className="mt-5 rounded-xl bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">{NO_PAYMENT_YET} This preview does not change your plan or entitlements.</p>
            <Button className="mt-4 w-full bg-[#B86E0A] text-[#080D19] hover:bg-[#B86E0A]" onClick={() => setStep("processing")}>Preview checkout</Button>
            <Button variant="outline" className="mt-2 w-full" onClick={() => setStep("plans")}>Back to plans</Button>
          </section>
        ) : null}

        {step === "processing" ? <div className="py-16 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-accent/20 border-t-accent" /><h1 className="mt-5 font-display text-2xl font-semibold">Setting things up.</h1><p className="mt-2 text-sm text-muted-foreground">This preview does not process a payment. No payment is processed and no entitlement changes.</p></div> : null}

        {step === "success" ? <section className="py-10 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success"><Check className="h-8 w-8" /></div><h1 className="mt-5 font-display text-3xl font-bold">Preview complete</h1><p className="mt-2 text-sm text-muted-foreground">No payment completed. Your plan and access are unchanged.</p><Button className="mt-6 w-full" onClick={() => navigate("home")}>Back to Home</Button></section> : null}

        {step === "failed" ? <section className="py-10 text-center"><h1 className="font-display text-3xl font-bold">Payment not completed</h1><p className="mt-2 text-sm text-muted-foreground">No charge was made. You can try again when checkout is available.</p><Button className="mt-6 w-full" onClick={() => setStep("review")}>Try again</Button><Button variant="outline" className="mt-2 w-full" onClick={() => navigate("support")}>Ask us about payment</Button></section> : null}
      </div>

    </div>
  );
}

export function UpgradeReminderSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { navigate } = useProfile();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
        <SheetHeader className="pr-6 text-left"><p className="text-xs font-semibold uppercase tracking-wider text-accent">A gentle reminder</p><SheetTitle>A little more room to practise?</SheetTitle><SheetDescription>Core gives you more daily mock sets and clearer answer explanations, whenever you’re ready.</SheetDescription></SheetHeader>
        <SheetFooter className="mt-5 flex-col gap-2 sm:flex-col sm:space-x-0"><Button className="w-full bg-[#B86E0A] text-[#080D19] hover:bg-[#B86E0A]" onClick={() => { onOpenChange(false); navigate("upgrade"); }}>See plans</Button><Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Not now</Button></SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
