import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { BookOpen, MessageCircle, ClipboardList, X } from "lucide-react";

type Step = { icon: typeof BookOpen; title: string; line: string };

const STEPS: Step[] = [
  {
    icon: BookOpen,
    title: "1. Your course packs",
    line: "Your registered courses live on Home. Use Add course or Upload notes to bring in lecture handouts and past questions.",
  },
  {
    icon: MessageCircle,
    title: "2. Ask Verilo",
    line: "The round Verilo button at the bottom right opens Study Chat. Ask anything about your notes.",
  },
  {
    icon: ClipboardList,
    title: "3. Mock tests and CGPA",
    line: "Practice builds timed mock exams from your files. Account holds your progress and CGPA tools.",
  },
];

/**
 * A three-step walkthrough shown the first time someone lands on Home, and
 * replayable from Account. It only explains the app; it changes nothing.
 */
export function FirstRunTour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;

  return (
    <div data-tour-overlay className="fixed inset-0 z-40 grid place-items-end overflow-y-auto bg-foreground/60 p-4 sm:place-items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="on-sand grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
            <step.icon className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
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
 * Opens once automatically on a first Home visit (after 2 seconds) and again
 * whenever the student replays it from Account.
 */
export function FirstRunTourHost() {
  const { profile, update, view } = useProfile();
  const onboardingDone = profile.setupComplete && profile.courses.length > 0;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (view !== "home" || !onboardingDone || profile.tourSeen) return;
    let requested = false;
    let completed = false;
    try {
      requested = window.sessionStorage.getItem("truefluency-show-tour-on-home") === "1";
      completed = window.localStorage.getItem("truefluency-tour-completed") !== null;
    } catch {
      return; /* the optional tour is unavailable when storage is blocked */
    }
    if (requested) { setOpen(true); return; }
    if (completed) return;
    // First visit to Home on this device: start the walkthrough after a short pause.
    const t = window.setTimeout(() => setOpen(true), 2000);
    return () => window.clearTimeout(t);
  }, [view, onboardingDone, profile.tourSeen]);
  if (!open || !onboardingDone || profile.tourSeen) return null;
  return (
    <FirstRunTour
      onClose={() => {
        setOpen(false);
        try {
          window.sessionStorage.removeItem("truefluency-show-tour-on-home");
          window.localStorage.setItem("truefluency-tour-completed", String(Date.now()));
        }
        catch { /* the tour is still closed for this render */ }
        update({ tourSeen: true });
      }}
    />
  );
}
