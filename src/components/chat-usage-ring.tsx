/**
 * The small ring under the Study Chat box: how much of today's chat allowance is used. Study Chat is a usage plan now
 * (a daily token allowance that refreshes at midnight Lagos time) instead of "10 / 30 / 60 messages".
 * It shows a percentage only: the student never needs to see token counts.
 */
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ChatUsage } from "@/lib/chat-api";

const SIZE = 22;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const PLAN_NAME: Record<string, string> = { free: "Free", trial: "Trial", core: "Core", exam: "Exam" };

function resetText(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "midnight (Lagos time)";
  return `midnight (${d.toLocaleDateString("en-NG", { weekday: "short", timeZone: "Africa/Lagos" })}, Lagos time)`;
}

export function ChatUsageRing({ usage, className }: { usage: ChatUsage | null; className?: string }) {
  if (!usage) return null;
  const pct = Math.max(0, Math.min(100, usage.percent));
  const tone = pct >= 100 ? "stroke-destructive" : pct >= 80 ? "stroke-[#B86E0A]" : "stroke-accent";
  const left = usage.approx_replies_left;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Study Chat allowance: ${pct}% used today. Tap for details.`}
          className={`inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 text-[11px] text-[#F3E6C8]/85 mix-blend-difference transition hover:opacity-80 ${className ?? ""}`}
        >
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" className="-rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-current opacity-25" />
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - pct / 100)}
              className={`${tone} transition-[stroke-dashoffset] duration-500`}
            />
          </svg>
          <span>{pct}% used today</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-64 text-sm">
        <div className="font-semibold text-foreground">Study Chat allowance</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {PLAN_NAME[usage.plan] ?? "Your"} plan · {pct}% of today's allowance used.
          {pct >= 100
            ? ` You're out for today. It refreshes at ${resetText(usage.resets_at)}.`
            : ` About ${left} more ${left === 1 ? "reply" : "replies"} like your recent ones. It refreshes at ${resetText(usage.resets_at)}.`}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Long answers and long conversations use more. Starting a new chat for a new topic keeps it going further.
          {usage.plan === "free" ? " Core gives you twice as much." : usage.plan === "core" || usage.plan === "trial" ? " Exam gives you twice as much again." : ""}
        </p>
      </PopoverContent>
    </Popover>
  );
}
