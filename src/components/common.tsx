import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
/**
 * Plain-language framing for a topic's prominence in the uploaded material.
 * These are NOT exam probabilities.
 */
export function strengthLabel(strength: number): string {
  const s = Math.max(0, Math.min(1, strength));
  if (s >= 0.66) return "Strong in this upload";
  if (s >= 0.33) return "Appears moderately";
  return "Mentioned briefly";
}

export function TopicPill({
  label,
  strength,
  big,
  showPercent,
}: {
  label: string;
  strength: number;
  big?: boolean;
  showPercent?: boolean;
}) {
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
        color: `hsl(${hue} 60% var(--pill-text-l, 30%))`,
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
 * The toggle only appears when the text is actually clamped, so short
 * descriptions (most course names) don't show a control that does nothing.
 */
export function CourseDescription({ text, className }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLParagraphElement | null>(null);

  const measure = () => {
    const el = textRef.current;
    if (!el) return;
    // Measure against the clamped box: expanded text never overflows.
    if (expanded) return;
    setOverflows(el.scrollHeight - el.clientHeight > 1);
  };

  useLayoutEffect(measure, [text, expanded]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, expanded]);

  return (
    <div className={className}>
      <p
        ref={textRef}
        className={"text-xs text-muted-foreground " + (expanded ? "" : "line-clamp-2")}
      >
        {text}
      </p>
      {overflows ? (
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
      ) : null}
    </div>
  );
}
