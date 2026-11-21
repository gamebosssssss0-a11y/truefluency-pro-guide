/**
 * A small plan strip for the top of the main student screens.
 *   Free  : the current plan, an Upgrade button, and the real prices (introductory Core price shown honestly: first 30 days, then the standard price).
 *   Trial : how many trial days are left, and a button to see plans.
 *   Paid  : the plan the student actually has, until when, whether it renews and for how much, and a Manage plan button. No upsell.
 * It sits in the page flow (never fixed), so it cannot cover content, the tab bar, course cards or the Verilo composer.
 * Prices and benefits come from the same constants and the same billing status the Premium screen uses; nothing is typed in twice.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles } from "lucide-react";
import { useProfileData } from "@/lib/profile-store";
import { useEntitlement } from "@/hooks/use-entitlement";
import { getBillingStatus, type BillingStatus } from "@/lib/billing-api";
import {
  CORE_DAILY_LIMITS, CORE_MAX_QUESTIONS, EXAM_DAILY_LIMITS, EXAM_MAX_QUESTIONS, EXAM_PRICE_NAIRA, FOUNDING_PRICE_NAIRA, STANDARD_PRICE_NAIRA, formatNaira,
} from "@/lib/entitlements";

// One billing lookup shared by every banner on screen, refreshed at most once a minute.
let cached: { at: number; value: BillingStatus | null } | null = null;
let inflight: Promise<BillingStatus | null> | null = null;

function loadBilling(): Promise<BillingStatus | null> {
  if (cached && Date.now() - cached.at < 60_000) return Promise.resolve(cached.value);
  if (!inflight) {
    inflight = getBillingStatus()
      .then((v) => v, () => null)
      .then((v) => { cached = { at: Date.now(), value: v }; inflight = null; return v; });
  }
  return inflight;
}

function day(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
}

export function PlanBanner({ className = "" }: { className?: string }) {
  const { navigate } = useProfileData();
  const { access, isAdmin } = useEntitlement();
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  const paidTier = access?.tier === "core" || access?.tier === "exam";
  useEffect(() => {
    if (!paidTier) return;
    let alive = true;
    void loadBilling().then((v) => { if (alive) setBilling(v); });
    return () => { alive = false; };
  }, [paidTier]);

  if (!access) return null;                                              // nothing until we know: never flash the wrong plan

  const go = () => navigate("upgrade");
  const shell = "mb-5 flex w-full min-w-0 flex-col items-stretch gap-3 rounded-2xl border border-accent/40 bg-card px-4 py-3 text-foreground shadow-sm sm:flex-row sm:items-center";
  const cta = "min-h-11 w-full shrink-0 gap-1 whitespace-normal bg-primary px-4 text-xs font-semibold text-primary-foreground sm:w-auto";

  const Strip = ({ label, line, action, extra }: { label: string; line: string; action: string; extra?: React.ReactNode }) => (
    <section aria-label="Your plan" className={`${shell} ${className}`}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent-ink"><Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />{label}</p>
        <p className="mt-0.5 break-words text-xs leading-snug">{line}</p>
        {extra}
      </div>
      <Button type="button" onClick={go} className={cta}>{action}<ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></Button>
    </section>
  );

  if (isAdmin) return <Strip label="Admin" line="Unrestricted access on this account." action="Plans" />;

  if (access.tier === "trial" && access.trialEndsAt) {
    const left = new Date(access.trialEndsAt).getTime() - Date.now();
    if (left > 0) {
      const days = Math.max(1, Math.ceil(left / 86_400_000));
      return <Strip label={`Core trial · ${days} ${days === 1 ? "day" : "days"} left`}
        line={access.foundingPriceAvailable ? `Keep Core after your trial: ${formatNaira(FOUNDING_PRICE_NAIRA)} for your first 30 days, then ${formatNaira(STANDARD_PRICE_NAIRA)} every 30 days.` : `Keep Core after your trial for ${formatNaira(STANDARD_PRICE_NAIRA)} every 30 days.`}
        action="See plans" />;
    }
  }

  if (paidTier) {
    const plan = access.tier === "exam" ? "Exam" : "Core";
    const until = day(billing?.period_end ?? access.paidUntil);
    const renew = billing?.auto_renew
      ? `Renews automatically for ${formatNaira(billing.renewal_price_naira ?? (access.tier === "exam" ? EXAM_PRICE_NAIRA : STANDARD_PRICE_NAIRA))}.`
      : billing ? "Won’t renew by itself." : "";
    return <Strip label={`${plan} plan`} line={`${until ? `Active until ${until}. ` : "Active. "}${renew}`.trim()} action="Manage plan" />;
  }

  // Free
  const intro = access.foundingPriceAvailable;
  return (
    <Strip
      label="Free plan"
      line={intro
        ? `Core ${formatNaira(FOUNDING_PRICE_NAIRA)} for your first 30 days, then ${formatNaira(STANDARD_PRICE_NAIRA)}. Exam ${formatNaira(EXAM_PRICE_NAIRA)}.`
        : `Core ${formatNaira(STANDARD_PRICE_NAIRA)} every 30 days. Exam ${formatNaira(EXAM_PRICE_NAIRA)}.`}
      action="Upgrade"
      extra={
        <details className="group mt-1.5 text-xs">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 font-medium text-accent-ink [&::-webkit-details-marker]:hidden">
            What you get <span aria-hidden="true" className="transition-transform group-open:rotate-90">›</span>
          </summary>
          <ul className="space-y-0.5 pb-1">
            <li>Core: {CORE_DAILY_LIMITS.mock_sets} mock sets a day, up to {CORE_MAX_QUESTIONS} questions, “why” explanations</li>
            <li>Exam: {EXAM_DAILY_LIMITS.mock_sets} mock sets a day, up to {EXAM_MAX_QUESTIONS} questions, exam-level difficulty</li>
          </ul>
        </details>
      }
    />
  );
}
