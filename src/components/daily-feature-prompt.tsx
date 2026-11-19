import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useEntitlement } from "@/hooks/use-entitlement";
import { useProfile } from "@/lib/profile-store";

const KEY = "truefluency-daily-reminder";
const MAX_PER_DAY = 2;

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Free-tier only. Shows at most twice per calendar day, on Home. */
export function DailyFeaturePrompt() {
  const { loading, access, explanationsUnlocked, isAdmin } = useEntitlement();
  const { navigate } = useProfile();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || !access || explanationsUnlocked || isAdmin) return;
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null") as { date: string; count: number } | null;
      const count = raw?.date === today() ? raw.count : 0;
      if (count >= MAX_PER_DAY) return;
      localStorage.setItem(KEY, JSON.stringify({ date: today(), count: count + 1 }));
      const t = window.setTimeout(() => setOpen(true), 1200);
      return () => window.clearTimeout(t);
    } catch { /* storage is optional */ }
  }, [loading, access, explanationsUnlocked, isAdmin]);

  if (!open) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300 md:bottom-6">
      <div className="flex items-start gap-3 rounded-2xl border border-accent/50 bg-card p-4 shadow-lg">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Get more from today's study</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Upgrade for full WHY explanations and bigger daily mock limits.</p>
          <button type="button" onClick={() => { setOpen(false); navigate("upgrade"); }} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent">
            See plans
          </button>
        </div>
        <button type="button" aria-label="Dismiss" onClick={() => setOpen(false)} className="-m-2 grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
