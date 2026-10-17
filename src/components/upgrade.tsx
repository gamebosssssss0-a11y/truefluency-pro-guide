/**
 * Upgrade preview flow. All payment steps are visual only; no charge or entitlement change occurs.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, Check, LockKeyhole, Sparkles } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { HeaderLogo } from "@/components/brand";
import { NO_PAYMENT_YET } from "@/lib/pricing-copy";
import { formatNaira, STANDARD_PRICE_NAIRA, FOUNDING_PRICE_NAIRA, FOUNDING_USER_LIMIT } from "@/lib/entitlements";

type Step = "offer" | "plans" | "review" | "processing" | "success" | "failed";
const INCLUDED = [
  "3 mock sets each day, with 45 questions per set",
  "More challenging practice, matched to your goals",
  "Clear “why” explanations for every answer",
  "Save useful questions to revisit later",
  "30 Study Chat messages and 4 flashcard decks daily",
];

export function UpgradeScreen() {
  const { navigate } = useProfile();
  const [step, setStep] = useState<Step>("offer");
  const [comingSoon, setComingSoon] = useState(false);
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
    <div className="min-h-screen bg-background text-foreground">
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
            <h1 className="mt-2 font-display text-3xl font-bold">Full access to your next level.</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Make every study session count with a little more room to practise.</p>
            <div className="mt-5 rounded-2xl border-2 border-accent bg-accent/10 p-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground"><Sparkles className="h-3 w-3" /> Founding price</span>
              <div className="mt-3 flex items-end gap-2"><span className="font-display text-4xl font-semibold">{formatNaira(FOUNDING_PRICE_NAIRA)}</span><span className="pb-1 text-sm text-muted-foreground">/ month</span></div>
              <p className="mt-1 text-xs text-muted-foreground">For the first {FOUNDING_USER_LIMIT} paying students · cancel any time</p>
              <div className="mt-3 flex items-baseline gap-2"><span className="font-display text-lg font-semibold text-muted-foreground line-through">{formatNaira(STANDARD_PRICE_NAIRA)}</span><span className="text-[11px] uppercase tracking-wider text-muted-foreground">after this</span></div>
            </div>
            <section className="mt-4 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold">Your studies, with more support</h2>
              <ul className="mt-3 space-y-3">{INCLUDED.map((line) => <li key={line} className="flex items-start gap-2 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" /><span>{line}</span></li>)}</ul>
            </section>
            <Button className="mt-5 h-12 w-full bg-[#B86E0A] text-[#080D19] hover:bg-[#B86E0A]" onClick={() => setComingSoon(true)}>Upgrade</Button>
            <Button variant="outline" className="mt-3 h-12 w-full" onClick={() => navigate("support")}>Ask us about payment</Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setStep("plans")}>Compare plans</Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Payments aren’t live yet. Nothing will be charged automatically.</p>
          </>
        ) : null}

        {step === "plans" ? (
          <>
            <h1 className="font-display text-3xl font-bold">Choose what works for you.</h1>
            <p className="mt-2 text-sm text-muted-foreground">Start where you are. You can change your plan later. Your current plan is highlighted.</p>
            <div className="mt-5 space-y-3">
              <article className="rounded-2xl border-2 border-accent bg-card p-4"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Free</h2><span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase">Current plan</span></div><p className="mt-1 text-sm text-muted-foreground">₦0 / always</p><ul className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><li>✓ 2 mock sets / day</li><li>✓ 30 questions / set</li><li>✓ Balanced difficulty</li><li>– No WHY explanations</li><li>– No peer-save</li><li>✓ 10 chat · 2 decks / day</li></ul></article>
              <button type="button" onClick={() => setStep("review")} className="w-full rounded-2xl border border-accent bg-accent/10 p-4 text-left transition hover:bg-accent/15"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Core</h2><span className="text-sm font-semibold">{formatNaira(FOUNDING_PRICE_NAIRA)}/month <s className="ml-1 text-muted-foreground">{formatNaira(STANDARD_PRICE_NAIRA)}</s></span></div><p className="mt-1 text-xs text-muted-foreground">Founding price</p><ul className="mt-3 space-y-1 text-xs text-muted-foreground"><li>3 mock sets daily · 45 questions per set</li><li>30 Study Chat messages daily</li><li>4 flashcard decks daily</li></ul><span className="mt-3 inline-flex text-xs font-semibold text-accent">Select Core</span></button>
              <article aria-disabled="true" className="rounded-2xl border border-border bg-muted/40 p-4 opacity-65"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Exam</h2><span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase text-muted-foreground"><LockKeyhole className="h-3 w-3" /> Coming later</span></div><p className="mt-1 text-sm text-muted-foreground">₦4,000 / month</p><p className="mt-3 text-xs text-muted-foreground">6 mock sets / day · 60 questions / set · Exam-level by default · WHY + peer-save · Expanded daily chat · 8 flashcard decks / day</p><p className="mt-2 text-xs text-muted-foreground">Not available yet</p><Button disabled className="mt-3 w-full">Coming later</Button></article>
            </div>
          </>
        ) : null}

        {step === "review" ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Review</p>
            <h1 className="mt-2 font-display text-3xl font-bold">One last look.</h1>
            <p className="mt-2 text-sm text-muted-foreground">Check your plan details before continuing to secure payment.</p>
            <p className="mt-2 text-sm text-muted-foreground">Founding price · {formatNaira(FOUNDING_PRICE_NAIRA)} per month</p>
            <ul className="mt-5 space-y-3">{INCLUDED.map((line) => <li key={line} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /><span>{line}</span></li>)}</ul>
            <p className="mt-5 rounded-xl bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">Preview only. No payment will be taken and your access will not change.</p>
            <Button className="mt-4 w-full bg-[#B86E0A] text-[#080D19] hover:bg-[#B86E0A]" onClick={() => setStep("processing")}>Continue to payment</Button>
            <Button variant="outline" className="mt-2 w-full" onClick={() => setStep("plans")}>Cancel</Button>
          </section>
        ) : null}

        {step === "processing" ? <div className="py-16 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-accent/20 border-t-accent" /><h1 className="mt-5 font-display text-2xl font-semibold">Setting things up.</h1><p className="mt-2 text-sm text-muted-foreground">This preview does not process a payment. Please don’t close this page.</p></div> : null}

        {step === "success" ? <section className="py-10 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success"><Check className="h-8 w-8" /></div><h1 className="mt-5 font-display text-3xl font-bold">Preview complete</h1><p className="mt-2 text-sm text-muted-foreground">No payment completed. Your plan and access are unchanged.</p><Button className="mt-6 w-full" onClick={() => navigate("home")}>Back to Home</Button></section> : null}

        {step === "failed" ? <section className="py-10 text-center"><h1 className="font-display text-3xl font-bold">Payment not completed</h1><p className="mt-2 text-sm text-muted-foreground">No charge was made. You can try again when checkout is available.</p><Button className="mt-6 w-full" onClick={() => setStep("review")}>Try again</Button><Button variant="outline" className="mt-2 w-full" onClick={() => navigate("support")}>Ask us about payment</Button></section> : null}
      </div>

      <Dialog open={comingSoon} onOpenChange={setComingSoon}>
        <DialogContent className="max-w-[340px]"><DialogHeader><DialogTitle>Payment status</DialogTitle><DialogDescription>{NO_PAYMENT_YET}</DialogDescription></DialogHeader><DialogFooter><Button className="w-full" onClick={() => setComingSoon(false)}>Okay</Button></DialogFooter></DialogContent>
      </Dialog>
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
