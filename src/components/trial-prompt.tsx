import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogPod } from "@/components/ui/dialog-pod";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEntitlement } from "@/hooks/use-entitlement";
import { startFreeTrialFn } from "@/lib/entitlements.functions";

export const TRIAL_PROMPT_KEY = "truefluency-trial-prompt-history";
const DAY_MS = 24 * 60 * 60 * 1000;
const IDLE_MS = 60_000;

/** At most two prompts in any rolling 24 hours. */
export function canShowTrialPrompt(history: number[], now = Date.now()): boolean {
  const recent = history.filter((t) => Number.isFinite(t) && now - t < DAY_MS);
  return recent.length < 2;
}

function readHistory(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TRIAL_PROMPT_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((n): n is number => typeof n === "number") : [];
  } catch { return []; }
}

/** Polite Home-only invitation to claim the one 7-day trial. Mounted only on Home. */
export function TrialPrompt() {
  const { access, refresh } = useEntitlement();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const eligible = access?.tier === "free" && access.trialClaimed === false;

  useEffect(() => {
    if (!eligible || !canShowTrialPrompt(readHistory())) return;
    const t = window.setTimeout(() => {
      // Never stack on another dialog, the tour, or a document viewer.
      if (document.querySelector('[role="alertdialog"],[role="dialog"],[data-tour-overlay]')) return;
      if (!canShowTrialPrompt(readHistory())) return;
      try { localStorage.setItem(TRIAL_PROMPT_KEY, JSON.stringify([...readHistory(), Date.now()].slice(-5))); } catch { /* storage disabled */ }
      setOpen(true);
    }, IDLE_MS);
    return () => window.clearTimeout(t);
  }, [eligible]);

  const claim = async () => {
    setBusy(true);
    try {
      await startFreeTrialFn();
      toast.success("Your 7-day Prep trial is active!");
      setOpen(false);
      await refresh().catch(() => undefined);
    } catch (e) {
      toast.error((e as Error).message || "Could not activate your trial.");
    } finally { setBusy(false); }
  };

  const benefits = [
    "45-question full mock exams with detailed answer breakdowns",
    "Verilo Tutor coaching with instant remediation on wrong answers",
    "Multi-file document chat across all your lecture handouts",
  ];

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-md border-border bg-card">
        <AlertDialogHeader>
          <DialogPod icon={Sparkles} eyebrow="Limited Opportunity" />
          <AlertDialogTitle className="text-xl font-bold text-foreground">Activate Your 7-Day Free Prep Trial</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2 text-sm text-muted-foreground">
              <p>Supercharge your exam preparation with complete, unconstrained study features:</p>
              <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 text-left">
                {benefits.map((b) => (
                  <div key={b} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
                    <span className="text-xs font-medium text-foreground">{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex-col gap-2 sm:flex-col">
          <Button onClick={() => void claim()} disabled={busy} className="h-12 w-full bg-accent font-semibold text-accent-foreground shadow-sm hover:bg-accent/90">
            Claim 7 Days Free Now
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} className="h-10 w-full text-xs font-medium text-muted-foreground hover:text-foreground">
            Remind me later
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
