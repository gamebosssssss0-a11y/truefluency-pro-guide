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
  // The browser/OS color scheme is the source of truth. Do not persist or force
  // a theme across app entries; also follow system changes while the app is open.
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );

  useEffect(() => {
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

  // Keep existing settings consumers compatible, but the system preference is
  // authoritative instead of storing a conflicting manual theme override.
  const setTheme = (_t: ThemeMode) => {
    const next: ThemeMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setThemeState(next);
    applyTheme(next);
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
