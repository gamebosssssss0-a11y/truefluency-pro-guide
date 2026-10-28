import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";

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
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    typeof window === "undefined"
      ? "light"
      : (() => {
          try {
            const saved = localStorage.getItem("truefluency-theme");
            if (saved === "light" || saved === "dark") return saved;
          } catch { /* storage is optional */ }
          return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        })()
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    try {
      if (localStorage.getItem("truefluency-theme")) return;
    } catch { /* storage is optional */ }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      const next: ThemeMode = media.matches ? "dark" : "light";
      setThemeState(next);
      applyTheme(next);
    };
    syncTheme();
    media.addEventListener?.("change", syncTheme);
    return () => media.removeEventListener?.("change", syncTheme);
  }, []);

  const setTheme = (next: ThemeMode) => {
    setThemeState(next);
    applyTheme(next);
    try { localStorage.setItem("truefluency-theme", next); } catch { /* storage is optional */ }
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
