/**
 * Friendly paywall notice. Shown in place of a hard error when a free account
 * runs into one of the daily limits or the question cap.
 */
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira, paywallCopy, type GatedFeature, type QuotaVerdict } from "@/lib/entitlements";

export function PaywallNotice({
  feature,
  verdict,
  onDismiss,
  dismissLabel = "Got it",
  className,
}: {
  feature: GatedFeature;
  verdict: QuotaVerdict;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}) {
  const copy = paywallCopy(feature, verdict);
  return (
    <div className={className}>
      <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <div className="min-w-0">
            <div className="font-display text-base font-semibold text-foreground">{copy.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {NO_PAYMENT_YET} {PRICE_LINE} No auto-renewal.
            </p>

          </div>
        </div>
        {onDismiss ? (
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onDismiss}>
            {dismissLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Placeholder shown where a paid-only explanation would appear. */
export function LockedExplanation({ priceNaira }: { priceNaira: number }) {
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        The WHY behind each answer is part of full access ({formatNaira(priceNaira)} a semester).
        Your score and the correct answers stay free.
      </span>
    </div>
  );
}
