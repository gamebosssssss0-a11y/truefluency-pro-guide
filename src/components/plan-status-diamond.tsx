import { cn } from "@/lib/utils";

/** Presentation only: never grants access or changes a subscription. */
export function PlanStatusDiamond({ tier, className }: { tier?: string; className?: string }) {
  const plan = tier === "trial" ? "core" : tier;
  if (plan !== "core" && plan !== "exam") return null;
  return (
    <svg
      width="24" height="24" viewBox="0 0 24 24"
      role="img" aria-label={tier === "trial" ? "Prep trial" : plan === "core" ? "Prep plan" : "Mastery plan"}
      className={cn("tf-plan-diamond shrink-0", `tf-plan-diamond--${plan}`, className)}
    >
      <path d="M12 2.5 21.5 12 12 21.5 2.5 12Z" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
