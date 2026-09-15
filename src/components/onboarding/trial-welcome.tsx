import { useProfile } from "@/lib/profile-store";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PRICE_LINE, TRIAL_LINE } from "@/lib/pricing-copy";
import { FREE_MAX_QUESTIONS, PAID_MAX_QUESTIONS } from "@/lib/entitlements";

/**
 * One-time, purely informational notice that the trial has started. It never
 * grants, extends or changes the trial: that logic lives entirely server-side
 * and is untouched here. Shown once, gated on profile.trialNoticeSeen.
 */
export function TrialWelcomeScreen() {
  const { go, navigate, update } = useProfile();

  const start = () => {
    update({ trialNoticeSeen: true });
    go("dashboard");
    navigate("home");
  };

  return (
    <AppShell
      title="Your 7-day full-access trial has started"
      subtitle={`Every account begins with a ${TRIAL_LINE}.`}
    >
      <div className="space-y-3 rounded-2xl border border-[#E4DCC8] bg-white p-4 text-sm leading-relaxed text-[#1B2A4A] shadow-sm">
        <p>
          For the next 7 days you have full access: unlimited mock tests of up to{" "}
          {PAID_MAX_QUESTIONS} questions, unlimited topic refreshes, and the WHY
          behind every answer.
        </p>
        <p>
          After the trial, a free account gets 2 mock sets a day and{" "}
          {FREE_MAX_QUESTIONS} questions per set.
        </p>
        <p className="text-xs text-muted-foreground">{PRICE_LINE}</p>
      </div>

      <Button
        size="lg"
        className="mt-6 h-12 w-full bg-[#B86E0A] text-[#FFFFFF] hover:bg-[#a4620a]"
        onClick={start}
      >
        Got it, let's start
      </Button>
    </AppShell>
  );
}
