/**
 * Flashcards — wired to the /flashcards/* backend endpoints (flashcard.py on
 * Render), which already implement grounded generation + FSRS scheduling.
 * This file used to be UI-only (no AI, no persistence); it now generates
 * real decks from the student's uploaded material and reviews real cards.
 */
import { useEffect, useState } from "react";
import { ArrowLeft, Layers } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { useEntitlement } from "@/hooks/use-entitlement";
import { HeaderLogo } from "@/components/brand";
import { listMaterialsForCourse, pickAnalyzableMaterial } from "@/lib/course-materials";
import { getMyAccess } from "@/lib/entitlements.functions";
import { PRICE_LINE } from "@/lib/pricing-copy";
import {
  generateFlashcards,
  getDeckCards,
  listDecks,
  reviewCard,
  type Flashcard,
  type FlashcardDeck,
} from "@/lib/flashcard-api";

const ALL_SCOPE = "all";

function displayCode(code: string) {
  return code.replace(/^C-/, "");
}

/**
 * One row per deck id, and one row per (course, card_count) burst: the backend
 * can return two decks for one long upload, which used to show as duplicates.
 */
function dedupeDecks(list: FlashcardDeck[]): FlashcardDeck[] {
  const byId = new Map<string, FlashcardDeck>();
  for (const d of list) if (!byId.has(d.id)) byId.set(d.id, d);
  const seenBurst = new Set<string>();
  const out: FlashcardDeck[] = [];
  for (const d of byId.values()) {
    const burst = `${d.course_code}|${d.card_count}|${(d.created_at ?? "").slice(0, 16)}`;
    if (seenBurst.has(burst)) continue;
    seenBurst.add(burst);
    out.push(d);
  }
  return out;
}

/** Course code + a short name — never three lines of a long course title. */
function deckLabel(deck: FlashcardDeck): string {
  const code = displayCode(deck.course_code);
  const raw = (deck.title ?? "").replace(new RegExp(`^${code}\\s*[·-]?\\s*`, "i"), "").trim();
  const short = raw.split(/\s+/).slice(0, 3).join(" ");
  return short ? `${code} · ${short}` : code;
}

export function FlashcardsScreen() {
  const { profile, activeCourseCode, navigate } = useProfile();
  const { access } = useEntitlement();
  const [selected, setSelected] = useState<string>(activeCourseCode ?? ALL_SCOPE);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const courseOptions = [
    ALL_SCOPE,
    ...profile.courses.map((c) => c.code).filter((code, i, arr) => arr.indexOf(code) === i),
  ];

  const loadDecks = async () => {
    setIsLoadingDecks(true);
    try {
      const all = await listDecks();
      const scoped = selected === ALL_SCOPE ? all : all.filter((d) => d.course_code === selected);
      setDecks(dedupeDecks(scoped));
    } catch (e) {
      setError((e as Error)?.message || "Couldn't load your decks.");
    } finally {
      setIsLoadingDecks(false);
    }
  };

  useEffect(() => {
    setError(null);
    loadDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const capText = (() => {
    if (!access) return null;
    if (access.fullAccess) return "Full access";
    const used = access.usageToday.flashcard_decks ?? 0;
    const limit = access.dailyLimits.flashcard_decks ?? 2;
    return `${used} of ${limit} decks today`;
  })();

  // Free students get two decks a day. Read the real entitlement before any
  // generate call so a blocked student never hits the backend or inserts a row.
  const deckLimit = access?.dailyLimits.flashcard_decks ?? 2;
  const decksUsed = access?.usageToday.flashcard_decks ?? 0;
  const deckCapReached = !!access && !access.fullAccess && decksUsed >= deckLimit;

  const generate = async () => {
    if (selected === ALL_SCOPE) {
      setError(
        'Pick a course above to generate a deck from — "All my notes" is for browsing existing decks.',
      );
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const fresh = await getMyAccess();
      if (fresh && !fresh.fullAccess) {
        const used = fresh.usageToday.flashcard_decks ?? 0;
        const limit = fresh.dailyLimits.flashcard_decks ?? 2;
        if (used >= limit) {
          setError(PRICE_LINE);
          return;
        }
      }
      const materials = await listMaterialsForCourse(selected);
      const ready = pickAnalyzableMaterial(materials);
      if (!ready) {
        setError("No extracted material found for this course. Please upload a PDF or DOCX first.");
        return;
      }
      const course = profile.courses.find((c) => c.code === selected);
      await generateFlashcards({
        materialId: ready.id,
        courseCode: selected,
        courseName: course?.name,
      });
      await loadDecks();
    } catch (e) {
      setError((e as Error)?.message || "Couldn't generate flashcards. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

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
        <div className="mb-8 flex flex-wrap gap-2">
          {courseOptions.map((code) => {
            const isAll = code === ALL_SCOPE;
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

        {isLoadingDecks ? (
          <p className="text-center text-sm text-muted-foreground">Loading your decks…</p>
        ) : decks.length > 0 ? (
          <div className="space-y-3">
            {decks.map((deck) => (
              <button
                key={deck.id}
                type="button"
                onClick={() =>
                  navigate("flashcards-review", { courseCode: deck.course_code, deckId: deck.id })
                }
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left transition hover:border-navy/30"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold text-navy">
                    {deck.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{deck.card_count} cards</p>
                </div>
                <span className="shrink-0 rounded-full bg-sand px-3 py-1 text-xs font-medium text-amber">
                  Review
                </span>
              </button>
            ))}

            {selected !== ALL_SCOPE ? (
              <button
                type="button"
                onClick={generate}
                disabled={isGenerating}
                className="mt-2 h-12 w-full rounded-full border-2 border-navy text-sm font-semibold text-navy transition hover:bg-navy/5 disabled:opacity-60"
              >
                {isGenerating ? "Generating…" : "Make another 15-card deck"}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-sand">
              <Layers className="h-9 w-9 text-navy" />
            </div>
            <p className="mb-5 font-display text-2xl font-semibold text-navy">No deck yet</p>

            <button
              type="button"
              onClick={generate}
              disabled={isGenerating}
              className="h-12 w-full max-w-xs rounded-full bg-amber text-sm font-semibold text-cream transition hover:bg-amber/90 disabled:opacity-60"
            >
              {isGenerating ? "Generating…" : "Make a 15-card deck"}
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              Uses one of today's two free decks.
            </p>
          </div>
        )}

        {error ? (
          <div className="mt-6 w-full rounded-2xl border border-border bg-sand/40 p-4">
            <p className="font-display text-base font-semibold text-navy">Couldn't do that</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FlashcardsReviewScreen() {
  const { activeCourseCode, activeDeckId, navigate } = useProfile();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const code = activeCourseCode ? displayCode(activeCourseCode) : "Notes";
  const current = cards[index];

  useEffect(() => {
    if (!activeDeckId) {
      setError("No deck selected.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getDeckCards(activeDeckId, { dueOnly: true })
      .then(async (due) => {
        // A freshly generated deck has every card due immediately, so this
        // is the normal path. Fall back to the full deck only if nothing is
        // due (e.g. reopening a deck already reviewed today).
        const list = due.length > 0 ? due : await getDeckCards(activeDeckId);
        setCards(list);
      })
      .catch((e) => setError((e as Error)?.message || "Couldn't load this deck."))
      .finally(() => setIsLoading(false));
  }, [activeDeckId]);

  const grade = async (recalled: boolean) => {
    if (!current || isGrading) return;
    setIsGrading(true);
    try {
      await reviewCard({ cardId: current.id, recalled });
    } catch (e) {
      console.error("[flashcards] review failed to save", e);
    } finally {
      setIsGrading(false);
      setFlipped(false);
      setIndex((i) => i + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("flashcards")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {cards.length > 0 ? (
            <span className="text-sm font-semibold text-navy">
              {code} · {Math.min(index + 1, cards.length)} of {cards.length}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground">Loading cards…</p>
        ) : error ? (
          <div className="rounded-2xl border border-border bg-sand/40 p-4 text-center">
            <p className="font-display text-base font-semibold text-navy">
              Couldn't load this deck
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : !current ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="font-display text-xl font-semibold text-navy">All caught up</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing due in this deck right now — come back later.
            </p>
          </div>
        ) : (
          <>
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
                  {current.back}
                </p>
              ) : (
                <p className="font-display text-2xl font-semibold leading-snug text-navy">
                  {current.front}
                </p>
              )}
              <span className="flex-1" />
              <span className={"text-xs " + (flipped ? "text-cream/60" : "text-muted-foreground")}>
                {flipped ? "From your upload, not an official mark scheme." : "Tap to flip"}
              </span>
            </button>

            {/* Grade buttons — swipe-equivalent taps, saved via FSRS */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => grade(false)}
                disabled={isGrading}
                className="h-12 rounded-full border-2 border-wine text-sm font-semibold text-wine transition hover:bg-wine/5 disabled:opacity-60"
              >
                Didn't know
              </button>
              <button
                type="button"
                onClick={() => grade(true)}
                disabled={isGrading}
                className="h-12 rounded-full bg-amber text-sm font-semibold text-cream transition hover:bg-amber/90 disabled:opacity-60"
              >
                Knew it
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Tap card to see the answer.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
