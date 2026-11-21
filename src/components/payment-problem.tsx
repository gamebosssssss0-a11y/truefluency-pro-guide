/**
 * "Report a payment problem". A student describes what went wrong with a payment; the server ties the report to THEIR own payment
 * reference, gives it a tracking number, and a person reviews it. Opening a report never cancels a plan, refunds, or charges again.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  listPaymentProblems, reportPaymentProblem, PAYMENT_PROBLEM_LABELS, PAYMENT_PROBLEM_STATUS_LABELS,
  type BillingStatus, type PaymentProblem, type PaymentProblemCategory,
} from "@/lib/billing-api";
import { SUPPORT_EMAIL, whatsappLink } from "@/lib/business-info";
import { formatNaira } from "@/lib/entitlements";

const CATEGORIES = Object.keys(PAYMENT_PROBLEM_LABELS) as PaymentProblemCategory[];
const MIN = 10;
const MAX = 1500;

function when(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
}

export function PaymentProblemSheet({
  open, onOpenChange, receipts, presetRef, presetCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipts: NonNullable<BillingStatus["receipts"]>;
  presetRef?: string | null;
  presetCategory?: PaymentProblemCategory;
}) {
  const [category, setCategory] = useState<PaymentProblemCategory>(presetCategory ?? "double_debit");
  const [ref, setRef] = useState<string>(presetRef ?? "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ tracking: string; message: string } | null>(null);
  const [mine, setMine] = useState<PaymentProblem[]>([]);

  useEffect(() => {
    if (!open) return;
    setSent(null);
    setError(null);
    if (presetRef !== undefined) setRef(presetRef ?? "");
    if (presetCategory) setCategory(presetCategory);
    let alive = true;
    void listPaymentProblems().then((out) => { if (alive) setMine(out.reports); }).catch(() => undefined);
    return () => { alive = false; };
  }, [open, presetRef, presetCategory]);

  const trimmed = text.trim();
  const ready = trimmed.length >= MIN && trimmed.length <= MAX && !busy;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const out = await reportPaymentProblem({ category, ref: ref || null, description: trimmed });
      setSent({ tracking: out.tracking_no, message: out.message });
      setText("");
      void listPaymentProblems().then((o) => setMine(o.reports)).catch(() => undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const wa = whatsappLink(sent ? `TrueFluency payment problem ${sent.tracking}` : "Hello TrueFluency, I have a question about a payment.");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader className="pr-6 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-ink">Billing help</p>
          <SheetTitle>Report a payment problem</SheetTitle>
          <SheetDescription>
            Tell us what happened and we’ll give you a reference number. Sending a report does not cancel your plan, refund you or charge you again.
          </SheetDescription>
        </SheetHeader>

        {sent ? (
          <section className="mt-4 rounded-2xl border border-success/30 bg-success/10 p-4" role="status">
            <p className="text-xs font-semibold uppercase tracking-wider text-success">Report received</p>
            <p className="mt-1 font-mono text-xl font-semibold text-foreground">{sent.tracking}</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{sent.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { void navigator.clipboard?.writeText(sent.tracking).then(() => toast.success("Reference copied")).catch(() => undefined); }}>Copy reference</Button>
              {wa ? <Button asChild size="sm" variant="outline"><a href={wa} target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a></Button> : null}
              {SUPPORT_EMAIL ? <Button asChild size="sm" variant="outline"><a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Payment problem ${sent.tracking}`)}`}>Email us</a></Button> : null}
            </div>
          </section>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); if (ready) void submit(); }}>
            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">What went wrong?</legend>
              <div className="space-y-1.5" role="radiogroup">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={category === c} onClick={() => setCategory(c)}
                    className={`flex min-h-11 w-full items-center rounded-xl border px-3 text-left text-sm transition ${category === c ? "border-accent bg-accent/10 font-medium" : "border-border hover:bg-secondary"}`}>
                    {PAYMENT_PROBLEM_LABELS[c]}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="pp-ref" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Which payment? (optional)</label>
              <select id="pp-ref" value={ref} onChange={(e) => setRef(e.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">
                <option value="">Not sure / no particular payment</option>
                {receipts.map((r) => (
                  <option key={r.ref} value={r.ref}>{when(r.paid_at)} · {r.plan === "exam" ? "Exam" : "Core"} · {formatNaira(r.amount_naira)} · {r.ref}</option>
                ))}
                {presetRef && !receipts.some((r) => r.ref === presetRef) ? <option value={presetRef}>Payment {presetRef}</option> : null}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Only your own payments can be chosen.</p>
            </div>

            <div>
              <label htmlFor="pp-text" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tell us what happened</label>
              <Textarea id="pp-text" value={text} maxLength={MAX} rows={5} onChange={(e) => setText(e.target.value)}
                placeholder="For example: the date, the amount, and what you expected to see." className="min-h-28" />
              <p className="mt-1 text-xs text-muted-foreground">{trimmed.length < MIN ? `At least ${MIN} characters. ` : ""}{trimmed.length}/{MAX}</p>
            </div>

            <p className="rounded-xl bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
              Never write your card number, PIN, OTP or password here. We will never ask for them.
            </p>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={!ready} className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {busy ? "Sending…" : "Send report"}
            </Button>
          </form>
        )}

        {mine.length ? (
          <section className="mt-6 border-t border-border pt-4" aria-label="Your reports">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your reports</h3>
            <ul className="mt-2 space-y-2">
              {mine.map((r) => (
                <li key={r.tracking_no} className="rounded-xl border border-border bg-card p-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-xs font-semibold">{r.tracking_no}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{PAYMENT_PROBLEM_STATUS_LABELS[r.status]}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{PAYMENT_PROBLEM_LABELS[r.category]} · {when(r.created_at)}</p>
                  {r.public_note ? <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-foreground">{r.public_note}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
