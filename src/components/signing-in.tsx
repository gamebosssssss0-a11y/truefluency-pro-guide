/**
 * Post-auth loading state. Shows only while a real sign-in is being confirmed
 * and the profile is syncing, between a successful sign-in and landing on Home.
 * This is NOT the app's first-open splash (see onboarding/splash.tsx).
 */
import { LogoMark } from "@/components/logo-mark";

export function SigningInScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F7F3EA] px-8">
      <div className="flex flex-col items-center">
        <LogoMark className="h-24 w-24" />
        <h1 className="mt-8 font-display text-3xl font-bold tracking-tight text-[#1B2A4A]">
          TrueFluency Pro
        </h1>
        <p className="mt-3 text-base text-[#5C5C70]">Signing you in...</p>
        <div className="mt-8 flex items-center gap-2.5" role="status" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 animate-pulse rounded-full"
              style={{ backgroundColor: "#B86E0A", animationDelay: `${i * 180}ms` }}
            />
          ))}
          <span className="sr-only">Signing you in</span>
        </div>
      </div>
    </div>
  );
}
