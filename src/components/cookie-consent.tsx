import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { readChoice, saveChoices } from "@/lib/consent";

const KEY = "truefluency-cookie-consent";

/** Non-blocking storage notice. "Essential only" refuses analytics; the page stays usable behind it. */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
      if (gpc) return;
      if (!localStorage.getItem(KEY) && readChoice("analytics") === null) {
        // Subtle delay so it doesn't flicker on immediate render.
        const t = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(t);
      }
    } catch { /* storage disabled */ }
  }, []);

  useEffect(() => { if (visible) ref.current?.focus(); }, [visible]);

  const decide = (choice: "all" | "essential") => {
    try { localStorage.setItem(KEY, choice); } catch { /* storage disabled */ }
    saveChoices({ analytics: choice === "all" ? "granted" : "denied" });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label="Storage and privacy notice"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 mx-auto max-w-lg rounded-2xl border border-border/90 bg-card/95 p-4 shadow-2xl backdrop-blur-md focus:outline-none md:bottom-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-foreground">Privacy & Local Storage</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            We store session tokens, streak counts, and uploaded note caches on this device to keep you logged in and offline-ready.
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => decide("essential")} className="h-10 text-xs font-medium">
            Essential only
          </Button>
          <Button size="sm" onClick={() => decide("all")} className="h-10 bg-accent text-xs font-semibold text-accent-foreground hover:bg-accent/90">
            Accept all
          </Button>
        </div>
      </div>
    </aside>
  );
}
