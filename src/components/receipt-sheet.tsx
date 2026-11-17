/**
 * One receipt. Fetched from the server (only the student who paid can read it). It shows what was bought, for how much, for which
 * dates, and what the student agreed to. It never shows card details: none are stored here. It can be printed or saved as a PDF.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { chargeTiming, getReceipt, type Receipt } from "@/lib/billing-api";
import { BUSINESS_NAME, BUSINESS_STATUS_NOTE, SUPPORT_EMAIL, whatsappLink } from "@/lib/business-info";
import { formatNaira } from "@/lib/entitlements";

function dt(iso?: string | null, withTime = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-NG", { day: "numeric", month: "long", year: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}), timeZone: "Africa/Lagos" });
}

export function ReceiptSheet({ refCode, onOpenChange, onReport }: { refCode: string | null; onOpenChange: (open: boolean) => void; onReport?: (ref: string) => void }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReceipt(null);
    setError(null);
    if (!refCode) return;
    let alive = true;
    getReceipt(refCode).then((r) => { if (alive) setReceipt(r); }).catch((e: Error) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [refCode]);

  const wa = whatsappLink(receipt ? `TrueFluency receipt ${receipt.receipt_no ?? receipt.reference}` : "TrueFluency receipt question");

  return (
    <Sheet open={Boolean(refCode)} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-md overflow-y-auto rounded-t-3xl px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="pr-6 text-left print:hidden">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Receipt</p>
          <SheetTitle>{receipt?.receipt_no ?? "Your receipt"}</SheetTitle>
          <SheetDescription>{receipt?.sandbox ? "TEST RECEIPT: Squad sandbox, fake money. This is not a real payment." : "Keep this for your records."}</SheetDescription>
        </SheetHeader>
        {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
        {!receipt && !error ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p> : null}
        {receipt ? (
          <>
            <article className="tf-receipt-print mt-4 rounded-2xl border border-border bg-card p-4 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">{BUSINESS_NAME}</h2>
                <span className="font-mono text-xs font-semibold">{receipt.receipt_no ?? receipt.reference}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{receipt.business.status_note || BUSINESS_STATUS_NOTE}</p>
              <dl className="mt-3 divide-y divide-border">
                <Row k="Paid on" v={dt(receipt.paid_at, true)} />
                <Row k="Plan" v={`${receipt.plan === "exam" ? "Exam" : "Core"} · 30 days`} />
                <Row k="Access from" v={dt(receipt.period_start)} />
                <Row k="Access until" v={dt(receipt.period_end)} />
                <Row k="Amount paid" v={formatNaira(receipt.amount_naira)} strong />
                {receipt.introductory ? <Row k="Pricing" v={`Introductory price for the first 30 days. The standard price is ${formatNaira(receipt.standard_price_naira ?? receipt.amount_naira)}.`} /> : null}
                <Row k="Next charge" v={receipt.renews_at_naira ? `${formatNaira(receipt.renews_at_naira)}${receipt.next_renewal_label ? ` on ${receipt.next_renewal_label}` : ""}, ${chargeTiming(receipt.renewal_lead_days)}, unless you cancel` : "None. This purchase does not renew."} />
                <Row k="Reference" v={receipt.reference} mono />
                {receipt.provider_reference ? <Row k="Payment provider ref." v={receipt.provider_reference} mono /> : null}
                <Row k="Paid through" v="Squad by GTCO (card details are never stored by TrueFluency)" />
              </dl>
              {receipt.agreed ? (
                <p className="mt-3 rounded-lg bg-secondary p-2.5 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">What you agreed to ({dt(receipt.agreed.at)}):</span> {receipt.agreed.text}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-muted-foreground">
                Questions about this payment: {wa ? "WhatsApp support from the Help screen" : "use the Help screen"}{receipt.business.support_email ?? SUPPORT_EMAIL ? `, or ${receipt.business.support_email ?? SUPPORT_EMAIL}` : ""}.
              </p>
            </article>
            <div className="mt-3 flex flex-wrap gap-2 print:hidden">
              <Button type="button" variant="outline" onClick={() => window.print()}>Print or save as PDF</Button>
              {onReport && !receipt.sandbox ? <Button type="button" variant="outline" onClick={() => onReport(receipt.reference)}>Report a problem with this payment</Button> : null}
              {wa ? <Button asChild variant="ghost"><a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp support</a></Button> : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Row({ k, v, strong, mono }: { k: string; v: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="shrink-0 text-muted-foreground">{k}</dt>
      <dd className={`min-w-0 break-words text-right ${strong ? "font-semibold text-foreground" : "text-foreground"} ${mono ? "font-mono text-xs" : ""}`}>{v}</dd>
    </div>
  );
}
