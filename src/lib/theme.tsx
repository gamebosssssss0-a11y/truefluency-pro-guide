import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { themeRevealGeometry } from "@/lib/theme-reveal";

export type ThemeMode = "light" | "dark";

type Ctx = { theme: ThemeMode; setTheme: (t: ThemeMode, event?: MouseEvent<HTMLElement>) => void; toggle: (event?: MouseEvent<HTMLElement>) => void };

const ThemeCtx = createContext<Ctx | null>(null);

function applyTheme(t: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", t === "dark");
  root.style.colorScheme = t;
}

/**
 * Theme is a device preference, kept in localStorage rather than the synced
 * profile so it applies before any session exists and never fights cloud sync.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const themeRef = useRef<ThemeMode>("light");
  const transitionRef = useRef<{ skipTransition: () => void } | null>(null);

  useEffect(() => {
    let saved: ThemeMode = "light";
    try { if (localStorage.getItem("truefluency-theme") === "dark") saved = "dark"; } catch { /* optional */ }
    themeRef.current = saved;
    setThemeState(saved);
    applyTheme(saved);
    return () => transitionRef.current?.skipTransition();
  }, []);

  const setTheme = (next: ThemeMode, event?: MouseEvent<HTMLElement>) => {
    if (next === themeRef.current) return;
    themeRef.current = next;
    const commit = () => {
      flushSync(() => setThemeState(next));
      applyTheme(next);
      try { localStorage.setItem("truefluency-theme", next); } catch { /* optional */ }
    };
    const doc = document as Document & { startViewTransition?: (update: () => void) => {
      ready: Promise<void>; finished: Promise<void>; skipTransition: () => void;
    } };
    transitionRef.current?.skipTransition();
    if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      transitionRef.current = null;
      document.documentElement.removeAttribute("data-radial-theme");
      commit();
      return;
    }
    // Read the initiating control before React updates it. Keyboard activation
    // has clientX/clientY=0, so use the actual control centre in that case.
    const rect = event?.currentTarget.getBoundingClientRect();
    const origin = event && event.detail > 0 ? { x: event.clientX, y: event.clientY }
      : rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const { x, y, radius } = themeRevealGeometry(window.innerWidth, window.innerHeight, origin);
    document.documentElement.setAttribute("data-radial-theme", "");
    try {
      const transition = doc.startViewTransition(commit);
      transitionRef.current = transition;
      void transition.ready.then(() => {
        if (transitionRef.current !== transition) return;
        return document.documentElement.animate({ clipPath: [
          `circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`,
        ] }, { duration: 380, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)", fill: "both" }).finished;
      }).catch(() => { /* skipped/unavailable snapshot: theme is still applied */ });
      void transition.finished.catch(() => {}).finally(() => {
        if (transitionRef.current !== transition) return;
        transitionRef.current = null;
        document.documentElement.removeAttribute("data-radial-theme");
      });
    } catch {
      document.documentElement.removeAttribute("data-radial-theme");
      commit();
    }
  };

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, toggle: (event) => setTheme(themeRef.current === "dark" ? "light" : "dark", event) }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
