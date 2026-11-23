/** Short Privacy, Refund and Cookie policies in one tabbed popup. */
import { useState, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DialogPod } from "@/components/ui/dialog-pod";
import { SUPPORT_RESPONSE_HOURS } from "@/lib/support-policy";
import { cn } from "@/lib/utils";

export type PolicyTab = "privacy" | "refund" | "cookies";

const TITLES: Record<PolicyTab, string> = { privacy: "Privacy Policy", refund: "Refund Policy", cookies: "Cookie Notice" };

const BODY: Record<PolicyTab, ReactNode> = {
  privacy: (
    <>
      <p>Your handouts, slides and notes are stored privately and tied to your account. Other students only see a file if you choose to publish it to a course shelf, and you can unpublish it at any time.</p>
      <p>We use your files and answers only to give you study features: summaries, mock questions, Study Chat and progress. We do not sell your data.</p>
      <p>You can delete any single file, or wipe your whole account from Account → Danger zone.</p>
    </>
  ),
  refund: (
    <>
      <p>Payments are processed securely by Squad (GTCO). Your plan starts only after Squad confirms the payment.</p>
      <p>If you were charged twice, underpaid, or your plan did not activate, report it from Support with your payment reference. We reply within {SUPPORT_RESPONSE_HOURS} hours and review every case by hand.</p>
      <p>Sending a report never cancels your active study access. Auto-renew can be turned off any time before renewal, and access continues through the paid period.</p>
    </>
  ),
  cookies: (
    <>
      <p>TrueFluency only uses cookies and device storage that the app needs to work: keeping you signed in, remembering light or dark mode, and saving an unfinished mock test on your phone.</p>
      <p>We do not use advertising trackers.</p>
    </>
  ),
};

export function LegalPoliciesDialog({ open, onOpenChange, initialTab = "privacy" }: { open: boolean; onOpenChange: (open: boolean) => void; initialTab?: PolicyTab }) {
  const [tab, setTab] = useState<PolicyTab>(initialTab);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) setTab(initialTab); onOpenChange(o); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogPod icon={ShieldCheck} eyebrow="Trust & policies" />
          <DialogTitle className="font-display">{TITLES[tab]}</DialogTitle>
          <DialogDescription>Plain-language summary for TrueFluency Pro.</DialogDescription>
        </DialogHeader>
        <div role="tablist" aria-label="Policies" className="grid grid-cols-3 gap-1 rounded-full border border-border bg-muted p-1">
          {(Object.keys(TITLES) as PolicyTab[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn("min-h-11 rounded-full px-2 text-xs font-semibold transition-colors", tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {TITLES[key].replace(" Policy", "").replace(" Notice", "")}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="space-y-3 text-sm leading-relaxed text-foreground">{BODY[tab]}</div>
      </DialogContent>
    </Dialog>
  );
}

/** A quiet inline link that opens one policy. */
export function PolicyLinks({ tabs = ["privacy", "refund", "cookies"], className }: { tabs?: PolicyTab[]; className?: string }) {
  const [open, setOpen] = useState<PolicyTab | null>(null);
  return (
    <span className={className}>
      {tabs.map((t, n) => (
        <span key={t}>
          {n > 0 ? <span aria-hidden="true"> · </span> : null}
          <button type="button" onClick={() => setOpen(t)} className="font-medium text-foreground underline underline-offset-2 hover:text-accent-ink">
            {TITLES[t]}
          </button>
        </span>
      ))}
      <LegalPoliciesDialog open={open !== null} onOpenChange={(o) => { if (!o) setOpen(null); }} initialTab={open ?? "privacy"} />
    </span>
  );
}
