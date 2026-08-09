import { useCallback, useEffect, useRef } from "react";
import { useProfile } from "@/lib/profile-store";
import { SonicUnfurlLoader } from "@/components/loading-splash";

/** Shown once per browser session; later app opens in the same tab skip it. */
const SESSION_KEY = "truefluency-splash-seen";

export function SplashScreen() {
  const { go } = useProfile();
  const advanced = useRef(false);

  const advance = useCallback(() => {
    if (advanced.current) return;
    advanced.current = true;
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
    go("disclaimer");
  }, [go]);

  useEffect(() => {
    let alreadySeen = false;
    try { alreadySeen = sessionStorage.getItem(SESSION_KEY) === "1"; } catch { /* ignore */ }
    if (alreadySeen) {
      advance();
      return;
    }
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
