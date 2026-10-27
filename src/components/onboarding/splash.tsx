import { useCallback, useEffect, useRef } from "react";
import { useProfile } from "@/lib/profile-store";
import { SonicUnfurlLoader } from "@/components/loading-splash";

/** Plays on every app entry; the animation completes unless the user skips it. */
export function SplashScreen() {
  const { go, profile } = useProfile();
  const advanced = useRef(false);

  const advance = useCallback(() => {
    if (advanced.current) return;
    advanced.current = true;
    // Returning users land back in the app; new users continue onboarding.
    go(profile.setupComplete ? "dashboard" : "landing");
  }, [go, profile.setupComplete]);

  useEffect(() => {
    const onPointer = () => advance();
    const onKey = () => advance();
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);

    return () => {
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
