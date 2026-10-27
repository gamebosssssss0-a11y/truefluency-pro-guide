import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { Upload, ClipboardList, Layers, User, X } from "lucide-react";

type Step = { icon: typeof Upload; title: string; line: string };

const STEPS: Step[] = [
  {
    icon: Upload,
    title: "1. Add your own material",
    line: "Open My Files, pick a course and upload a past paper or your lecture notes.",
  },
  {
    icon: ClipboardList,
    title: "2. Practise on it",
    line: "Tap Practice to sit a mock test built from the file you just added.",
  },
  {
    icon: Layers,
    title: "3. Revise the hard bits",
    line: "Flashcards on Home turn the same file into quick cards you can flip, and Study Chat answers questions on it.",
  },
  {
    icon: User,
    title: "4. Everything else lives in Account",
    line: "Your photo, your courses, your CGPA tools and help are all in Account.",
  },
];

/**
 * A four-step walkthrough shown the first time someone lands on Home, and
 * replayable from Account. It only explains the app; it changes nothing.
 */
export function FirstRunTour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;

  return (
    <div data-tour-overlay className="fixed inset-0 z-45 grid place-items-end overflow-y-auto bg-foreground/60 p-4 sm:place-items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="on-sand grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
            <step.icon className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            Skip tour <X className="ml-0.5 inline h-3 w-3" />
          </button>
        </div>

        <h2 className="font-display text-xl font-semibold text-foreground">{step.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.line}</p>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex flex-1 items-center gap-1.5">
            {STEPS.map((_, n) => (
              <span
                key={n}
                className={
                  n === i
                    ? "h-1.5 w-6 rounded-full bg-accent"
                    : "h-1.5 w-1.5 rounded-full bg-border"
                }
              />
            ))}
          </div>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => (last ? onClose() : setI(i + 1))}
          >
            {last ? "Got it" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * The tour is optional and opens only when the student asks for it from
 * Account. The request is session-scoped; tour completion remains in the
 * existing persisted profile flag.
 */
export function FirstRunTourHost() {
  const { profile, update, view } = useProfile();
  const onboardingDone = profile.setupComplete && profile.courses.length > 0;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (view !== "home" || !onboardingDone || profile.tourSeen) return;
    try {
      if (window.sessionStorage.getItem("truefluency-show-tour-on-home") === "1") setOpen(true);
    } catch {
      /* the optional tour is unavailable when session storage is blocked */
    }
  }, [view, onboardingDone, profile.tourSeen]);
  if (!open || !onboardingDone || profile.tourSeen) return null;
  return (
    <FirstRunTour
      onClose={() => {
        setOpen(false);
        try { window.sessionStorage.removeItem("truefluency-show-tour-on-home"); }
        catch { /* the tour is still closed for this render */ }
        update({ tourSeen: true });
      }}
    />
  );
}
