/**
 * Plans and payment. Paying goes through Squad's own page (card details never touch this site); the backend then asks
 * Squad whether the payment really happened before any plan is switched on. Nothing here changes a plan by itself.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { HeaderLogo } from "@/components/brand";
import { useEntitlement } from "@/hooks/use-entitlement";
import {
  CORE_DAILY_LIMITS,
  CORE_MAX_QUESTIONS,
  EXAM_DAILY_LIMITS,
  EXAM_MAX_QUESTIONS,
  EXAM_PRICE_NAIRA,
  FREE_DAILY_LIMITS,
  FREE_MAX_QUESTIONS,
  MOCK_SOURCE_LIMITS,
  formatNaira,
  STANDARD_PRICE_NAIRA,
  FOUNDING_PRICE_NAIRA,
  FOUNDING_USER_LIMIT,
} from "@/lib/entitlements";
import {
  cancelAutoRenew, clearPaymentReturn, getBillingStatus, readPaymentReturn, rememberCheckout,
  startCheckout, verifyPayment, type BillingPlan, type BillingStatus,
} from "@/lib/billing-api";

type Step = "offer" | "plans" | "review" | "redirecting" | "verifying" | "success" | "pending" | "failed";

// Study Chat is sold by usage, not by a number of replies: Free has a daily usage, Core 2x that, Exam 4x.
const CHAT_USAGE_LINE: Record<"free" | BillingPlan, string> = {
  free: "Study Chat: daily usage",
  core: "Study Chat: 2x the free daily usage",
  exam: "Study Chat: 4x the free daily usage",
};

const filesLine = (plan: "free" | BillingPlan) => {
  const n = MOCK_SOURCE_LIMITS[plan];
  return n === 1 ? "1 file at a time for mock tests, topics and flashcards" : `Use up to ${n} files together for mock tests, topics and flashcards`;
};

const PLAN_FEATURES: Record<BillingPlan, string[]> = {
  core: [
    `${CORE_DAILY_LIMITS.mock_sets} mock sets daily · up to ${CORE_MAX_QUESTIONS} questions per set`,
    filesLine("core"),
    "More challenging practice, matched to your goals",
    "Clear “why” explanations and peer-save",
    "Save useful questions to revisit later",
    CHAT_USAGE_LINE.core,
    `${CORE_DAILY_LIMITS.flashcard_decks} flashcard decks daily`,
  ],
  exam: [
    `${EXAM_DAILY_LIMITS.mock_sets} mock sets daily · up to ${EXAM_MAX_QUESTIONS} questions per set`,
    filesLine("exam"),
    "Exam-level difficulty by default",
    "Clear “why” explanations and peer-save",
    "Save useful questions to revisit later",
    CHAT_USAGE_LINE.exam,
    `${EXAM_DAILY_LIMITS.flashcard_decks} flashcard decks daily`,
  ],
};

const EVERY_PLAN_LINE = "Every plan: unlimited uploads, ask the chat about any page (scanned pages too), send photos, and report any question.";

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
}

const planName = (p?: string | null) => (p === "exam" ? "Exam" : p === "core" ? "Core" : "Free");

export function UpgradeScreen() {
  const { navigate } = useProfile();
  const { access, refresh: refreshAccess } = useEntitlement();
  const [step, setStep] = useState<Step>(() => (readPaymentReturn() ? "verifying" : "offer"));
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>("core");
  const [autoRenew, setAutoRenew] = useState(true);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stopOpen, setStopOpen] = useState(false);
  const [done, setDone] = useState<{ plan?: BillingPlan; periodEnd?: string | null; autoRenew?: boolean | null } | null>(null);
  const returned = useRef<string | null>(readPaymentReturn());

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await getBillingStatus());
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  // Coming back from Squad: ask the backend (which asks Squad) whether the payment went through.
  const check = useCallback(async (ref: string, attempts: number) => {
    for (let i = 0; i < attempts; i += 1) {
      try {
        const out = await verifyPayment(ref);
        if (out.state === "success") {
          clearPaymentReturn();
          setDone({ plan: out.plan, periodEnd: out.period_end, autoRenew: out.auto_renew });
          setStep("success");
          void refreshAccess().catch(() => undefined);
          void loadStatus();
          return;
        }
        if (out.state === "failed" || out.state === "abandoned") {
          clearPaymentReturn();
          setStep("failed");
          return;
        }
        if (["needs_review", "underpaid", "refund_due", "unknown_ref"].includes(out.state)) {
          setStep("pending");
          return;
        }
      } catch (e) {
        setError((e as Error).message);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    setStep("pending");
  }, [loadStatus, refreshAccess]);

  useEffect(() => {
    const ref = returned.current;
    if (ref) void check(ref, 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seatsLeft = status?.founding_seats_left ?? access?.foundingSeatsLeft ?? null;
  const foundingOpen = status?.quote?.core.founding ?? (access?.foundingPriceAvailable !== false);
  const corePrice = status?.quote?.core.amount_naira ?? (foundingOpen ? FOUNDING_PRICE_NAIRA : STANDARD_PRICE_NAIRA);
  const examPrice = status?.quote?.exam.amount_naira ?? EXAM_PRICE_NAIRA;
  const price = selectedPlan === "core" ? corePrice : examPrice;
  const live = status?.enabled === true;
  const activePlan = status?.plan && status.period_end && new Date(status.period_end).getTime() > Date.now() ? status.plan : null;
  const currentPlan = activePlan ?? (access?.tier === "trial" ? "core" : access?.tier ?? null);

  const back = () => {
    if (step === "plans") setStep("offer");
    else if (step === "review") setStep("plans");
    else navigate("account");
  };

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const out = await startCheckout(selectedPlan, autoRenew);
      if (new URL(out.checkout_url).protocol !== "https:") throw new Error("The payment page address looked wrong, so we stopped. Nothing was charged.");
      rememberCheckout(out.ref);
      setStep("redirecting");
      window.location.assign(out.checkout_url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const stopRenewal = async () => {
    setBusy(true);
    try {
      await cancelAutoRenew();
      toast.success("Auto-renew is off", { description: "You keep everything until your paid time ends. You won't be charged again." });
      await loadStatus();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setStopOpen(false);
    }
  };

  const manage = activePlan ? (
    <section className="mt-5 rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">Your plan</p>
      <h2 className="mt-1 font-display text-xl font-semibold">{planName(activePlan)} · valid until {formatDate(status?.period_end)}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {status?.auto_renew
          ? `Renews automatically on that date for ${formatNaira(status.renewal_price_naira ?? corePrice)}. Cancel any time.`
          : "It won't renew by itself. Pick a plan below before it ends to keep going."}
        {status?.founding ? " You hold one of the founding places." : ""}
      </p>
      {status?.auto_renew ? (
        <Button variant="outline" className="mt-3 w-full" disabled={busy} onClick={() => setStopOpen(true)}>Stop auto-renew</Button>
      ) : null}
      {status?.receipts?.length ? (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground">Receipts</p>
          <ul className="mt-2 space-y-1.5">
            {status.receipts.map((r) => (
              <li key={r.ref} className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                <span>{formatDate(r.paid_at)} · {planName(r.plan)} · {formatNaira(r.amount_naira)}</span>
                <span className="font-mono text-[10px]">{r.ref}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  ) : null;

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
            <h1 className="mt-2 font-display text-3xl font-bold text-foreground">Full access to your next level.</h1>
            <p className="mt-2 text-sm leading-relaxed text-foreground">Make every study session count with a little more room to practise.</p>
            <div className="mt-5 rounded-2xl border-2 border-accent bg-accent/10 p-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground"><Sparkles className="h-3 w-3" /> {foundingOpen ? "Founding price" : "Core"}</span>
              <div className="mt-3 flex items-end gap-2"><span className="font-display text-4xl font-semibold">{formatNaira(corePrice)}</span><span className="pb-1 text-sm text-muted-foreground">/ month</span></div>
              {foundingOpen ? (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Founding offer for the first {FOUNDING_USER_LIMIT} paying students{seatsLeft !== null ? ` · ${seatsLeft} of ${FOUNDING_USER_LIMIT} places remain` : ""} · cancel any time
                  </p>
                  <div className="mt-3 flex items-baseline gap-2"><span className="font-display text-lg font-semibold text-muted-foreground line-through">{formatNaira(STANDARD_PRICE_NAIRA)}</span><span className="text-[11px] uppercase tracking-wider text-muted-foreground">standard price after the offer ends</span></div>
                </>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">The founding places have all been taken · cancel any time</p>
              )}
            </div>
            {manage}
            <section className="mt-4 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold">Your studies, with more support</h2>
              <ul className="mt-3 space-y-3">{PLAN_FEATURES.core.map((line) => <li key={line} className="flex items-start gap-2 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" /><span>{line}</span></li>)}</ul>
            </section>
            <Button className="mt-5 h-12 w-full bg-[#B86E0A] text-[#080D19] hover:bg-[#B86E0A]" onClick={() => setStep("plans")}>{activePlan ? "Change or renew plan" : "Choose a plan"}</Button>
            <Button variant="outline" className="mt-3 h-12 w-full" onClick={() => navigate("support")}>Ask us about payment</Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setStep("plans")}>Compare plans</Button>
            {status && !live ? <p className="mt-2 text-center text-[11px] text-muted-foreground">Payments aren’t live yet. Nothing will be charged.</p> : null}
          </>
        ) : null}

        {step === "plans" ? (
          <>
            <h1 className="font-display text-3xl font-bold text-foreground">Choose what works for you.</h1>
            <p className="mt-2 text-sm text-foreground">Start where you are. You can change your plan later. Your current plan is highlighted.</p>
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
                  <li>{filesLine("free")}</li>
                  <li>{CHAT_USAGE_LINE.free}</li>
                  <li>{FREE_DAILY_LIMITS.flashcard_decks} flashcard decks / day</li>
                </ul>
              </article>
              {(["core", "exam"] as BillingPlan[]).map((plan) => (
                <button key={plan} type="button" aria-pressed={selectedPlan === plan} onClick={() => { setSelectedPlan(plan); setStep("review"); }} className={`w-full rounded-2xl border p-4 text-left transition hover:bg-accent/10 ${currentPlan === plan ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-xl font-semibold">{planName(plan)}</h2>
                    <span className="text-sm font-semibold">{formatNaira(plan === "core" ? corePrice : examPrice)} / month</span>
                  </div>
                  {currentPlan === plan ? <p className="mt-1 text-xs font-semibold text-accent">Current plan</p> : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan === "core" ? (foundingOpen ? `Founding price for the first ${FOUNDING_USER_LIMIT} paying students${seatsLeft !== null ? ` · ${seatsLeft} left` : ""}` : "Standard price") : "Available plan"}
                    </p>
                  )}
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{PLAN_FEATURES[plan].map((line) => <li key={line}>✓ {line}</li>)}</ul>
                  <span className="mt-3 inline-flex text-xs font-semibold text-accent">{currentPlan === plan ? `Renew ${planName(plan)}` : `Select ${planName(plan)}`}</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">{EVERY_PLAN_LINE}</p>
          </>
        ) : null}

        {step === "review" ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Review</p>
            <h1 className="mt-2 font-display text-3xl font-bold">{planName(selectedPlan)} plan</h1>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {formatNaira(price)} for 30 days
              {selectedPlan === "core" && foundingOpen ? ` · founding price${seatsLeft !== null ? ` · ${seatsLeft} places remain` : ""}` : ""}
            </p>
            <ul className="mt-5 space-y-3">{PLAN_FEATURES[selectedPlan].map((line) => <li key={line} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /><span>{line}</span></li>)}</ul>

            <fieldset className="mt-5 space-y-2" aria-label="How do you want to pay?">
              {[
                { value: true, title: "Renew automatically every 30 days", body: `${formatNaira(price)} is charged to the same card each month until you cancel. You can stop it here at any time.` },
                { value: false, title: "Just this month", body: "Pay once for 30 days. Nothing is saved and nothing renews. Bank transfer and USSD always work this way." },
              ].map((o) => (
                <button key={String(o.value)} type="button" role="radio" aria-checked={autoRenew === o.value} onClick={() => setAutoRenew(o.value)} className={`w-full rounded-xl border p-3 text-left text-sm transition ${autoRenew === o.value ? "border-accent bg-accent/10" : "border-border hover:bg-secondary"}`}>
                  <span className="font-medium">{o.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{o.body}</span>
                </button>
              ))}
            </fieldset>

            <p className="mt-4 rounded-xl bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
              You pay on Squad’s secure page; we never see your card number. Your plan starts only after Squad confirms the payment.
              {autoRenew ? " If you delete your account, your plan is cancelled and your saved card is removed, so you are never charged again." : ""}
            </p>
            {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
            <Button disabled={busy || (status !== null && !live)} className="mt-4 w-full bg-[#B86E0A] text-[#080D19] hover:bg-[#B86E0A]" onClick={() => void pay()}>
              {busy ? "Opening Squad…" : status !== null && !live ? "Payments aren’t live yet" : `Pay ${formatNaira(price)} with Squad`}
            </Button>
            <Button variant="outline" className="mt-2 w-full" disabled={busy} onClick={() => setStep("plans")}>Back to plans</Button>
          </section>
        ) : null}

        {step === "redirecting" ? <div className="py-16 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-accent/20 border-t-accent" /><h1 className="mt-5 font-display text-2xl font-semibold">Taking you to Squad.</h1><p className="mt-2 text-sm text-muted-foreground">Complete the payment there. You’ll come straight back here.</p></div> : null}

        {step === "verifying" ? <div className="py-16 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-accent/20 border-t-accent" /><h1 className="mt-5 font-display text-2xl font-semibold">Confirming your payment.</h1><p className="mt-2 text-sm text-muted-foreground">We’re asking the bank. This usually takes a few seconds. Please don’t pay again.</p></div> : null}

        {step === "success" ? (
          <section className="py-10 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success"><Check className="h-8 w-8" /></div>
            <h1 className="mt-5 font-display text-3xl font-bold">You’re on {planName(done?.plan)}.</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {done?.periodEnd ? `Valid until ${formatDate(done.periodEnd)}. ` : ""}
              {done?.autoRenew ? "It renews automatically, and you can stop that here whenever you like." : "It won’t renew by itself."}
            </p>
            {status?.receipts?.[0] ? <p className="mt-3 text-xs text-muted-foreground">Receipt · {formatNaira(status.receipts[0].amount_naira)} · {status.receipts[0].ref}</p> : null}
            <Button className="mt-6 w-full" onClick={() => navigate("home")}>Back to Home</Button>
          </section>
        ) : null}

        {step === "pending" ? (
          <section className="py-10 text-center">
            <h1 className="font-display text-3xl font-bold">Payment pending bank confirmation.</h1>
            <p className="mt-2 text-sm text-muted-foreground">Some banks take a few minutes. Please don’t pay again: your plan starts as soon as the payment is confirmed, and we keep checking.</p>
            {error ? <p className="mt-2 text-xs text-muted-foreground">{error}</p> : null}
            <Button className="mt-6 w-full" onClick={() => { const ref = returned.current; if (ref) { setStep("verifying"); void check(ref, 10); } else { void loadStatus(); setStep("offer"); } }}>Check again</Button>
            <Button variant="outline" className="mt-2 w-full" onClick={() => navigate("support")}>Ask us about this payment</Button>
          </section>
        ) : null}

        {step === "failed" ? <section className="py-10 text-center"><h1 className="font-display text-3xl font-bold">Payment not completed</h1><p className="mt-2 text-sm text-muted-foreground">No charge was made, or it was reversed by your bank. You can try again.</p><Button className="mt-6 w-full" onClick={() => setStep("review")}>Try again</Button><Button variant="outline" className="mt-2 w-full" onClick={() => navigate("support")}>Ask us about payment</Button></section> : null}
      </div>

      <AlertDialog open={stopOpen} onOpenChange={(o) => { if (!busy) setStopOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop automatic renewal?</AlertDialogTitle>
            <AlertDialogDescription>You keep your plan until {formatDate(status?.period_end)}. After that it ends and you won’t be charged again.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep auto-renew</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void stopRenewal(); }}>Stop auto-renew</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
