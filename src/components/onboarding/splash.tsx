import { useCallback, useEffect, useRef } from "react";
import { useProfile } from "@/lib/profile-store";
import { LogoMark, LOGO_BG } from "@/components/logo-mark";
import { Wordmark } from "@/components/brand";

/** Plays on every app entry; the branded screen advances unless the user skips it. */
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
    const timer = window.setTimeout(advance, 1900);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [advance]);

  return (
    <>
      <h1 className="sr-only">TrueFluency Pro: AI Exam Prep for UI Students</h1>
      <div
        className="relative grid min-h-screen w-full place-items-center px-6"
        style={{ backgroundColor: LOGO_BG }}
      >
        <div className="flex flex-col items-center">
          <LogoMark className="h-[120px] w-[120px] shadow-2xl" />
          <Wordmark size="lg" onDark className="mt-4" />
          <p className="mt-3 text-center text-sm" style={{ color: "var(--tf-color-e0b458)" }}>
            Smarter prep. For UI students.
          </p>
          <p className="mt-6 text-xs" style={{ color: "var(--tf-color-f7f3ea)" }}>
            Tap to skip
          </p>
        </div>
      </div>
    </>
  );
}
