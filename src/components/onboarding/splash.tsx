import { useCallback, useEffect, useRef } from "react";
import { useProfile } from "@/lib/profile-store";
import { SonicUnfurlLoader } from "@/components/loading-splash";

const SPLASH_HOLD_MS = 1800;
const SESSION_KEY = "truefluency-splash-seen";

/** Plays once per browser session, under 2 seconds, skippable with a tap or key. */
export function SplashScreen() {
  const { go, profile } = useProfile();
  const advanced = useRef(false);

  const advance = useCallback(() => {
    if (advanced.current) return;
    advanced.current = true;
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* private mode: fail open, just don't remember */
    }
    // Returning users land back in the app; new users continue onboarding.
    go(profile.setupComplete ? "dashboard" : "landing");
  }, [go, profile.setupComplete]);

  useEffect(() => {
    // Already seen this session: skip instantly, no splash tax on refresh.
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      seen = false;
    }
    if (seen) {
      advance();
      return;
    }

    const holdTimer = window.setTimeout(() => advance(), SPLASH_HOLD_MS);
    const onPointer = () => advance();
    const onKey = () => advance();
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(holdTimer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [advance]);

  return (
    <>
      <h1 className="sr-only">TrueFluency Pro: AI Exam Prep for UI Students</h1>
      <SonicUnfurlLoader
        onDone={() => advance()}
        caption="Smarter prep. For UI students."
        tapHint="Tap to skip"
      />
    </>
  );
}
