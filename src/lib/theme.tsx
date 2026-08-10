import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";

const KEY = "truefluency-theme";

type Ctx = { theme: ThemeMode; setTheme: (t: ThemeMode) => void; toggle: () => void };

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

  // Read after mount so server render and hydration always agree.
  useEffect(() => {
    let initial: ThemeMode | null = null;
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark") initial = saved;
    } catch { /* ignore */ }
    if (!initial) {
      initial = typeof window !== "undefined"
        && window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    applyTheme(t);
    try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  };

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
