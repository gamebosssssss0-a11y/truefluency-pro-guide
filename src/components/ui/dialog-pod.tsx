import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "accent" | "danger" | "neutral" | "warn";

const POD: Record<Tone, string> = {
  accent: "border-accent/30 bg-accent/15 text-accent shadow-[0_0_24px_color-mix(in_srgb,var(--tf-gold-bright)_28%,transparent)]",
  danger: "border-destructive/30 bg-destructive/15 text-destructive shadow-[0_0_24px_color-mix(in_srgb,var(--destructive)_25%,transparent)]",
  neutral: "border-border bg-muted text-foreground shadow-[0_0_20px_color-mix(in_srgb,var(--tf-navy)_14%,transparent)]",
  warn: "border-warn/30 bg-warn/15 text-warn shadow-[0_0_24px_color-mix(in_srgb,var(--warn)_25%,transparent)]",
};
const PILL: Record<Tone, string> = {
  accent: "border-accent/35 bg-accent/10 text-accent",
  danger: "border-destructive/35 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted text-muted-foreground",
  warn: "border-warn/35 bg-warn/10 text-warn",
};

/** Glowing icon pod + eyebrow pill that anchors the top of every popup. */
export function DialogPod({ icon: Icon, eyebrow, tone = "accent" }: { icon: LucideIcon; eyebrow?: string; tone?: Tone }) {
  return (
    <div className="flex flex-col items-center gap-3 sm:items-start">
      <div className={cn("grid h-[52px] w-[52px] place-items-center rounded-2xl border", POD[tone])}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      {eyebrow ? (
        <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider", PILL[tone])}>
          {eyebrow}
        </span>
      ) : null}
    </div>
  );
}
