import { useEffect } from "react";
import { GraduationCap } from "lucide-react";
import { useProfile } from "@/lib/profile-store";

export function SplashScreen() {
  const { go } = useProfile();
  useEffect(() => {
    const t = setTimeout(() => go("disclaimer"), 1600);
    return () => clearTimeout(t);
  }, [go]);

  return (
    <div className="grid min-h-screen place-items-center bg-primary px-6 text-primary-foreground">
      <div className="flex flex-col items-center gap-5">
        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-lg animate-in fade-in zoom-in duration-700">
          <GraduationCap className="h-10 w-10" />
        </div>
        <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            TrueFluency <span className="text-accent">Pro</span>
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/70">
            Smarter prep. For UI students.
          </p>
        </div>
        <div className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-primary-foreground/15">
          <div className="h-full w-full origin-left animate-[splash_1.6s_ease-in-out_forwards] bg-accent" />
        </div>
      </div>
      <style>{`@keyframes splash { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
    </div>
  );
}
