import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Course, Level } from "./uni-data";

export type OnboardingStep =
  | "splash"
  | "disclaimer"
  | "disclaimer-blocked"
  | "identity"
  | "faculty"
  | "department"
  | "level"
  | "courses"
  | "dashboard";

export type Profile = {
  identity: { kind: "email" | "guest"; name: string; email?: string } | null;
  disclaimerAccepted: boolean;
  faculty: string | null;
  department: string | null;
  level: Level | null;
  courses: Course[];
  setupComplete: boolean;
};

const emptyProfile: Profile = {
  identity: null,
  disclaimerAccepted: false,
  faculty: null,
  department: null,
  level: null,
  courses: [],
  setupComplete: false,
};

type Ctx = {
  profile: Profile;
  step: OnboardingStep;
  update: (p: Partial<Profile>) => void;
  go: (s: OnboardingStep) => void;
  resetSetup: () => void;
};

const StoreCtx = createContext<Ctx | null>(null);
const KEY = "truefluency-profile-v1";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [step, setStep] = useState<OnboardingStep>("splash");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Profile;
        setProfile(parsed);
        if (parsed.setupComplete) setStep("dashboard");
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* ignore */ }
    }
  }, [profile, hydrated]);

  const update = (p: Partial<Profile>) => setProfile((cur) => ({ ...cur, ...p }));
  const go = (s: OnboardingStep) => setStep(s);
  const resetSetup = () => {
    setProfile(emptyProfile);
    setStep("splash");
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  };

  return (
    <StoreCtx.Provider value={{ profile, step, update, go, resetSetup }}>
      {hydrated ? children : null}
    </StoreCtx.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}
