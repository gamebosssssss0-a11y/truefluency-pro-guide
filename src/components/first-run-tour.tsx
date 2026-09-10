import { useState } from "react";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { Upload, ClipboardList, Layers, User, X } from "lucide-react";

type Step = { icon: typeof Upload; title: string; line: string };

const STEPS: Step[] = [
  {
    icon: Upload,
    title: "1. Add your own material",
    line: "Open Library, pick a course and upload a past paper or your lecture notes.",
  },
  {
    icon: ClipboardList,
    title: "2. Practise on it",
    line: "Tap Practice to sit a mock test built from the file you just added.",
  },
  {
    icon: Layers,
    title: "3. Revise the hard bits",
    line: "Flashcards on Home turn the same file into quick cards you can flip.",
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
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#1B2A4A]/60 p-4 sm:place-items-center">
      <div className="w-full max-w-md rounded-3xl border border-[#E4DCC8] bg-card p-5 shadow-lg">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F3E6C8] text-[#1B2A4A]">
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
                    ? "h-1.5 w-6 rounded-full bg-[#B86E0A]"
                    : "h-1.5 w-1.5 rounded-full bg-[#E4DCC8]"
                }
              />
            ))}
          </div>
          <Button
            className="bg-[#B86E0A] text-white hover:bg-[#B86E0A]/90"
            onClick={() => (last ? onClose() : setI(i + 1))}
          >
            {last ? "Got it" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Home-only host: shows the tour once, then remembers it was seen. */
export function FirstRunTourHost() {
  const { profile, update } = useProfile();
  const [open, setOpen] = useState(!profile.tourSeen);
  if (!open) return null;
  return (
    <FirstRunTour
      onClose={() => {
        setOpen(false);
        update({ tourSeen: true });
      }}
    />
  );
}
