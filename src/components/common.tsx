import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";

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

/**
 * Course description with a 2-line clamp and a "Read more / Read less" toggle.
 * Shared so every screen that lists courses renders the description the same way.
 */
export function CourseDescription({ text, className }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={className}>
      <p className={"text-xs text-muted-foreground " + (expanded ? "" : "line-clamp-2")}>{text}</p>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setExpanded((current) => !current);
        }}
        onKeyDown={(event) => event.stopPropagation()}
        className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-medium text-accent hover:text-accent/80"
        aria-expanded={expanded}
      >
        {expanded ? "Read less" : "Read more"}
        <ChevronDown className={"h-3 w-3 transition-transform " + (expanded ? "rotate-180" : "")} />
      </button>
    </div>
  );
}
