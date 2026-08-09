import { useCallback, useEffect, useRef, useState } from "react";
import { useProfile } from "@/lib/profile-store";
import { SonicUnfurlLoader } from "@/components/loading-splash";

const SPLASH_HOLD_MS = 5000;

/** Plays on every app open for 5 seconds. Skippable with a tap or key press. */
export function SplashScreen() {
  const { go, profile } = useProfile();
  const advanced = useRef(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const advance = useCallback(() => {
    if (advanced.current) return;
    advanced.current = true;
    // Returning users land back in the app; new users continue onboarding.
    go(profile.setupComplete ? "dashboard" : "disclaimer");
  }, [go, profile.setupComplete]);

  useEffect(() => {
    // 5-second minimum hold before auto-advancing.
    const holdTimer = window.setTimeout(() => advance(), SPLASH_HOLD_MS);

    const interval = window.setInterval(() => {
      setElapsedSeconds((s) => {
        if (s >= 4) {
          window.clearInterval(interval);
          return 5;
        }
        return s + 1;
      });
    }, 1000);

    // Skippable: any tap or key press jumps straight ahead.
    const onPointer = () => advance();
    const onKey = () => advance();
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(holdTimer);
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [advance]);

  return (
    <>
      <h1 className="sr-only">TrueFluency Pro: AI Exam Prep for UI Students</h1>
      <SonicUnfurlLoader
        onDone={() => {
          // Animation is shorter than the 5s hold; the hold timer handles auto-advance.
        }}
        busy
        caption="Smarter prep. For UI students."
        tapHint={`Tap to skip \u00b7 ${5 - elapsedSeconds}s`}
      />
    </>
  );
}

