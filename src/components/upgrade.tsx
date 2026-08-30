/**
 * Upgrade screen. Presentation only: it explains the founding price and the
 * standard price. There is no checkout here, and no payment success state.
 */
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { HeaderLogo } from "@/components/brand";
import { NOT_SECOND_PRODUCT, NO_PAYMENT_YET, PRICE_LINE, TRIAL_LINE } from "@/lib/pricing-copy";
import { FREE_MAX_QUESTIONS, PAID_MAX_QUESTIONS, formatNaira, STANDARD_PRICE_NAIRA, FOUNDING_PRICE_NAIRA, FOUNDING_USER_LIMIT } from "@/lib/entitlements";

const INCLUDED = [
  `Up to ${PAID_MAX_QUESTIONS} questions a set, instead of ${FREE_MAX_QUESTIONS}`,
  "Unlimited mock tests, no daily cap",
  "The WHY behind every answer in review",
  "Uploads to your Library",
];

export function UpgradeScreen() {
  const { navigate } = useProfile();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("account")}
            aria-label="Back to Account"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <HeaderLogo />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Premium
          </span>
        </div>

        <h1 className="font-display text-3xl font-semibold text-foreground">Full access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything in TrueFluency Pro, for one semester. {NOT_SECOND_PRODUCT}
        </p>

        <div className="mt-5 rounded-2xl border-2 border-accent bg-accent/10 p-5 shadow-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
            <Sparkles className="h-3 w-3" /> Founding price
          </span>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-display text-4xl font-semibold text-foreground">
              {formatNaira(FOUNDING_PRICE_NAIRA)}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">/semester</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            For the first {FOUNDING_USER_LIMIT} paying students.
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold text-muted-foreground line-through">
              {formatNaira(STANDARD_PRICE_NAIRA)}
            </span>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              after {FOUNDING_USER_LIMIT} seats
            </span>
          </div>
          <p className="mt-3 text-xs font-medium text-foreground">{PRICE_LINE}</p>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">What full access includes</h2>
          <ul className="mt-3 space-y-2">
            {INCLUDED.map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Every account starts with a {TRIAL_LINE}. {NO_PAYMENT_YET} No auto-renewal.
          </p>
        </div>

        <Button
          variant="outline"
          className="mt-5 h-12 w-full"
          onClick={() => navigate("support")}
        >
          Ask us about payment
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Checkout is not live yet, so nothing on this screen charges you.
        </p>
      </div>
    </div>
  );
}
