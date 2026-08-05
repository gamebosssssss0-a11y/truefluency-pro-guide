import { useEffect, useRef, useState } from "react";
import { GraduationCap } from "lucide-react";
import { useProfile } from "@/lib/profile-store";

/** Shown once per browser session; later app opens in the same tab skip it. */
const SESSION_KEY = "truefluency-splash-seen";
const DURATION_MS = 1900;

export function SplashScreen() {
  const { go } = useProfile();
  const [reduceMotion, setReduceMotion] = useState(false);
  const advanced = useRef(false);

  useEffect(() => {
    const advance = () => {
      if (advanced.current) return;
      advanced.current = true;
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
      go("disclaimer");
    };

    let alreadySeen = false;
    try { alreadySeen = sessionStorage.getItem(SESSION_KEY) === "1"; } catch { /* ignore */ }

    let prefersReduced = false;
    try {
      prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch { /* ignore */ }
    setReduceMotion(prefersReduced);

    if (alreadySeen) {
      advance();
      return;
    }

    const timer = setTimeout(advance, prefersReduced ? 400 : DURATION_MS);

    // Skippable: any tap or key press jumps straight ahead.
    window.addEventListener("pointerdown", advance);
    window.addEventListener("keydown", advance);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", advance);
      window.removeEventListener("keydown", advance);
    };
  }, [go]);

  return (
    <div className="grid min-h-screen place-items-center bg-primary px-6 text-primary-foreground">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          {!reduceMotion ? (
            <span
              className="splash-glow pointer-events-none absolute inset-0 rounded-2xl"
              aria-hidden="true"
            />
          ) : null}
          <div
            className={
              reduceMotion
                ? "relative grid h-20 w-20 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-lg"
                : "splash-logo relative grid h-20 w-20 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-lg"
            }
          >
            <GraduationCap className="h-10 w-10" />
          </div>
        </div>
        <div className={reduceMotion ? "text-center" : "text-center animate-in fade-in slide-in-from-bottom-2 duration-700"}>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            TrueFluency <span className="text-accent">Pro</span>
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/70">
            Smarter prep. For UI students.
          </p>
        </div>
        <div className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-primary-foreground/15">
          <div
            className="h-full w-full origin-left bg-accent"
            style={reduceMotion ? { transform: "scaleX(1)" } : { animation: `splash ${DURATION_MS}ms ease-in-out forwards` }}
          />
        </div>
        <p className="text-[11px] text-primary-foreground/40">Tap to continue</p>
      </div>
      <style>{`@keyframes splash { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
    </div>
  );
}
