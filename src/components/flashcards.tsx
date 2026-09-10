/**
 * Flashcards — UI ONLY. No FSRS, no AI, no deck generation, no
 * flashcard_decks increment. The only data read is the entitlement cap the
 * app already fetches for Home (useEntitlement).
 */
import { useState } from "react";
import { ArrowLeft, Layers } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { useEntitlement } from "@/hooks/use-entitlement";
import { HeaderLogo } from "@/components/brand";

function displayCode(code: string) {
  return code.replace(/^C-/, "");
}

/* One demo card only — layout reference, not real generated content. */
const DEMO_CARD = {
  front: "What is a rectangular hyperbola?",
  back: "A rectangular hyperbola is a hyperbola whose asymptotes meet at right angles.",
};

export function FlashcardsScreen() {
  const { profile, activeCourseCode, navigate } = useProfile();
  const { access } = useEntitlement();
  const [selected, setSelected] = useState<"all" | string>(activeCourseCode ?? "all");
  const [notice, setNotice] = useState(false);

  const courseOptions = [
    "all" as const,
    ...profile.courses.map((c) => c.code).filter((code, i, arr) => arr.indexOf(code) === i),
  ];

  const capText = (() => {
    if (!access) return null;
    if (access.fullAccess) return "Full access";
    const used = access.usageToday.flashcard_decks ?? 0;
    const limit = access.dailyLimits.flashcard_decks ?? 2;
    return `${used} of ${limit} decks today`;
  })();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-24 pt-6 md:pb-8">
        <button
          onClick={() => navigate("home")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back: Home
        </button>

        {/* Header card: white, cream border, navy left edge */}
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border border-l-4 border-l-navy bg-card p-4">
          <HeaderLogo className="shrink-0 rounded-lg bg-navy p-1.5 shadow-none hover:opacity-90" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-semibold leading-tight text-navy">
              Flashcards
            </h1>
            <p className="text-xs text-muted-foreground">
              Cards from your upload only. Not a generic bank.
            </p>
          </div>
          {capText ? (
            <span className="shrink-0 rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-navy">
              {capText}
            </span>
          ) : null}
        </div>

        {/* Optional course scope chips */}
        <div className="mb-10 flex flex-wrap gap-2">
          {courseOptions.map((code) => {
            const isAll = code === "all";
            const active = selected === code;
            const label = isAll ? "All my notes" : displayCode(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSelected(code)}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition " +
                  (active
                    ? "border-amber bg-sand text-amber"
                    : "border-border bg-card text-navy hover:border-navy/30")
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-sand">
            <Layers className="h-9 w-9 text-navy" />
          </div>
          <p className="mb-5 font-display text-2xl font-semibold text-navy">No deck yet</p>

          <button
            type="button"
            onClick={() => setNotice(true)}
            className="h-12 w-full max-w-xs rounded-full bg-amber text-sm font-semibold text-cream transition hover:bg-amber/90"
          >
            Make a 15-card deck
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Uses one of today's two free decks when live.
          </p>

          {notice ? (
            <div className="mt-6 w-full max-w-xs rounded-2xl border border-border bg-sand/40 p-4">
              <p className="font-display text-base font-semibold text-navy">
                Flashcards aren't live yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                This did not use a deck.
              </p>
              <button
                type="button"
                onClick={() => navigate("flashcards-review")}
                className="mt-3 text-xs font-semibold text-amber hover:underline"
              >
                Preview the card layout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function FlashcardsReviewScreen() {
  const { activeCourseCode, navigate } = useProfile();
  const [flipped, setFlipped] = useState(false);

  const code = activeCourseCode ? displayCode(activeCourseCode) : "Notes";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("home")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back Home
          </button>
          <span className="text-sm font-semibold text-navy">{code} · 1 of 1</span>
        </div>

        {/* One huge card; tap flips front → navy back */}
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className={
            "flex min-h-[22rem] w-full flex-col items-center justify-between rounded-3xl border p-8 text-center transition " +
            (flipped ? "border-navy bg-navy" : "border-border bg-card")
          }
        >
          <span className="flex-1" />
          {flipped ? (
            <p className="font-display text-xl font-semibold leading-relaxed text-cream">
              {DEMO_CARD.back}
            </p>
          ) : (
            <p className="font-display text-2xl font-semibold leading-snug text-navy">
              {DEMO_CARD.front}
            </p>
          )}
          <span className="flex-1" />
          <span className={"text-xs " + (flipped ? "text-cream/60" : "text-muted-foreground")}>
            {flipped ? "From your upload, not an official mark scheme." : "Tap to flip"}
          </span>
        </button>

        {/* Grade buttons — layout only, no grades are saved */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFlipped(false)}
            className="h-12 rounded-full border-2 border-wine text-sm font-semibold text-wine transition hover:bg-wine/5"
          >
            Didn't know
          </button>
          <button
            type="button"
            onClick={() => setFlipped(false)}
            className="h-12 rounded-full bg-amber text-sm font-semibold text-cream transition hover:bg-amber/90"
          >
            Knew it
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Tap card to see the answer.
        </p>
      </div>
    </div>
  );
}
