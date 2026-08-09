import { useCallback, useEffect, useRef } from "react";
import { useProfile } from "@/lib/profile-store";
import { SonicUnfurlLoader } from "@/components/loading-splash";

/** Plays on every app open. Skippable with a tap or key press. */
export function SplashScreen() {
  const { go } = useProfile();
  const advanced = useRef(false);

  const advance = useCallback(() => {
    if (advanced.current) return;
    advanced.current = true;
    go("disclaimer");
  }, [go]);

  useEffect(() => {
    // Skippable: any tap or key press jumps straight ahead.
    window.addEventListener("pointerdown", advance);
    window.addEventListener("keydown", advance);
    return () => {
      window.removeEventListener("pointerdown", advance);
      window.removeEventListener("keydown", advance);
    };
  }, [advance]);

  return (
    <SonicUnfurlLoader
      onDone={advance}
      caption="Smarter prep. For UI students."
      tapHint="Tap to continue"
    />
  );
}
