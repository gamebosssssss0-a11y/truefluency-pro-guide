import { Info } from "lucide-react";

/**
 * "AI-generated — verify against your material" label — muted text intended to sit
 * at the bottom of relevant cards on the Course Detail / Mock Test screens.
 * (Referenced by spec Part 0.)
 */
export function AiGeneratedLabel({ className }: { className?: string }) {
  return (
    <p
      className={
        "flex items-center gap-1.5 text-[11px] italic leading-relaxed text-muted-foreground " +
        (className ?? "")
      }
    >
      <Info className="h-3 w-3" />
      AI-generated. Verify against your material.
    </p>
  );
}

/**
 * Red-to-green weak/strong topic pill. `strength` is 0..1 (0 = weakest).
 */
export function TopicPill({ label, strength, big }: { label: string; strength: number; big?: boolean }) {
  const hue = Math.round(Math.max(0, Math.min(1, strength)) * 130);
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border font-medium " +
        (big ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]")
      }
      style={{
        borderColor: `hsl(${hue} 70% 55% / 0.35)`,
        backgroundColor: `hsl(${hue} 70% 55% / 0.12)`,
        color: `hsl(${hue} 60% 30%)`,
      }}
    >
      <span
        className={big ? "h-2 w-2 rounded-full" : "h-1.5 w-1.5 rounded-full"}
        style={{ backgroundColor: `hsl(${hue} 65% 45%)` }}
      />
      {label}
    </span>
  );
}

export function scoreToStrength(pct: number) {
  return Math.max(0, Math.min(1, pct / 100));
}
