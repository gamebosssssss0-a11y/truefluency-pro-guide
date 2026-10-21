/**
 * The small ring inside the Study Chat message box: how much of today's chat allowance is used. Study Chat is a usage
 * plan (a daily token allowance that refreshes at midnight Lagos time) instead of "10 / 30 / 60 messages".
 * It shows a percentage only: the student never needs to read token counts. The number is exact: the backend adds up
 * the AI provider's own token count for every reply (and for the background summary that keeps long chats in memory).
 * If the backend can't record usage right now it says so (metering: false) and the ring hides instead of showing a wrong figure.
 */
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ChatUsage } from "@/lib/chat-api";

const SIZE = 20;
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
  if (!usage || usage.metering === false) return null;
  const pct = Math.max(0, Math.min(100, usage.percent));
  const tone = pct >= 100 ? "stroke-destructive" : pct >= 80 ? "stroke-[#B8480A]" : "stroke-[#B86E0A]";
  const left = usage.approx_replies_left;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Study Chat allowance: ${pct}% used today. Tap for details.`}
          className={`inline-flex h-7 items-center gap-1 rounded-full px-1.5 text-[11px] font-medium text-[#878170] transition hover:bg-secondary ${className ?? ""}`}
        >
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" className="-rotate-90">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-[#E4DCC8]" />
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - pct / 100)}
              className={`${tone} transition-[stroke-dashoffset] duration-500`}
            />
          </svg>
          <span className="tabular-nums">{pct}%</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-64 text-sm">
        <div className="font-semibold text-foreground">Study Chat allowance</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {PLAN_NAME[usage.plan] ?? "Your"} plan · {pct}% of today's allowance used.
          {pct >= 100
            ? ` You're out for today. It refreshes at ${resetText(usage.resets_at)}.`
            : ` About ${left} more ${left === 1 ? "reply" : "replies"} at your pace today. It refreshes at ${resetText(usage.resets_at)}.`}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          The longer a conversation runs, the more each reply uses, because the assistant re-reads what you've discussed to stay on track.
          Starting a new chat for a new topic keeps your allowance going further.
          {usage.plan === "free" ? " Core gives you twice as much." : usage.plan === "core" || usage.plan === "trial" ? " Exam gives you twice as much again." : ""}
        </p>
      </PopoverContent>
    </Popover>
  );
}
