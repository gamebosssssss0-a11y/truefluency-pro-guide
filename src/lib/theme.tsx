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
  // The product's primary presentation is the navy-and-gold reference screen.
  // Keep the initial state dark so the app never flashes a light background on startup.
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  // Apply the reference presentation on every app open. Users can still switch
  // manually from Settings for accessibility, but a saved light preference does
  // not override the requested navy startup background.
  useEffect(() => {
    setThemeState("dark");
    applyTheme("dark");
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
