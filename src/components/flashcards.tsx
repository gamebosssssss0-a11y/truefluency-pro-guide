/**
 * Flashcards — wired to the /flashcards/* backend endpoints (flashcard.py on
 * Render), which already implement grounded generation + FSRS scheduling.
 * This file used to be UI-only (no AI, no persistence); it now generates
 * real decks from the student's uploaded material and reviews real cards.
 */
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, Layers } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEntitlement } from "@/hooks/use-entitlement";
import { HeaderLogo } from "@/components/brand";
import { SourcePicker } from "@/components/source-picker";
import { apiSource, listCourseFiles, pickSource, pickedIds, readSourceChoice, readyFiles, whyNothingReady, type CourseFile, type Picked } from "@/lib/material-pick";
import { maxSourceFiles } from "@/lib/entitlements";
import { getMyAccess } from "@/lib/entitlements.functions";
import { PRICE_LINE } from "@/lib/pricing-copy";
import { canonicalCourseCode } from "@/lib/course-code";
import { RichText } from "@/components/rich-text";
import {
  generateFlashcards,
  getDeckCards,
  listDecks,
  reviewCard,
  type Flashcard,
  type FlashcardDeck,
} from "@/lib/flashcard-api";

const ALL_SCOPE = "all";
const FLASHCARDS_ORIGIN_KEY = "truefluency-flashcards-origin";
type FlashcardsOrigin = "home" | "mock-tests" | "account" | "course-detail";

function displayCode(code: string) {
  return canonicalCourseCode(code);
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
    const burst = `${d.course_code}|${d.title}|${d.card_count}|${(d.created_at ?? "").slice(0, 16)}`;
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
  const { access, refresh } = useEntitlement();
  const [selected, setSelected] = useState<string>(activeCourseCode ? canonicalCourseCode(activeCourseCode) : ALL_SCOPE);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dueCounts, setDueCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [deckSourceFileName, setDeckSourceFileName] = useState<string | null>(null);
  const loadDeckRequest = useRef(0);
  // The course's files, for the "Study from" picker (the choice itself is remembered per course).
  const [courseFiles, setCourseFiles] = useState<CourseFile[] | null>(null);
  useEffect(() => {
    if (selected === ALL_SCOPE) {
      setCourseFiles(null);
      return;
    }
    let cancelled = false;
    listCourseFiles(selected)
      .then((rows) => { if (!cancelled) setCourseFiles(rows); })
      .catch(() => { if (!cancelled) setCourseFiles(null); });
    return () => { cancelled = true; };
  }, [selected]);

  const returnToOrigin = () => {
    const stored = sessionStorage.getItem(FLASHCARDS_ORIGIN_KEY);
    sessionStorage.removeItem(FLASHCARDS_ORIGIN_KEY);
    const allowedOrigins: FlashcardsOrigin[] = ["home", "mock-tests", "account", "course-detail"];
    const origin: FlashcardsOrigin = allowedOrigins.includes(stored as FlashcardsOrigin)
      ? (stored as FlashcardsOrigin)
      : "mock-tests";
    navigate(
      origin,
      origin === "course-detail" && activeCourseCode
        ? { courseCode: activeCourseCode }
        : undefined,
    );
  };

  const courseOptions = [
    ALL_SCOPE,
    ...profile.courses
      .map((course) => canonicalCourseCode(course.code))
      .filter((code, index, all) => all.indexOf(code) === index),
  ];

  const loadDecks = async () => {
    const requestId = ++loadDeckRequest.current;
    setIsLoadingDecks(true);
    try {
      const all = await listDecks();
      const scoped = selected === ALL_SCOPE ? all : all.filter((d) => canonicalCourseCode(d.course_code) === canonicalCourseCode(selected));
      const rows = dedupeDecks(scoped);
      if (requestId !== loadDeckRequest.current) return;
      setDecks(rows);
      // Counts only, on the first few rows — never every card body.
      void Promise.all(
        rows.slice(0, 8).map(async (d) => {
          try {
            const due = await getDeckCards(d.id, { dueOnly: true });
            return [d.id, due.length] as const;
          } catch {
            return null;
          }
        }),
      ).then((pairs) => {
        if (requestId !== loadDeckRequest.current) return;
        const next: Record<string, number> = {};
        for (const p of pairs) if (p) next[p[0]] = p[1];
        setDueCounts(next);
      });
    } catch (e) {
      if (requestId === loadDeckRequest.current) {
        setError((e as Error)?.message || "Couldn't load your decks.");
      }
    } finally {
      if (requestId === loadDeckRequest.current) setIsLoadingDecks(false);
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
      const files = await listCourseFiles(selected);
      const ready = readyFiles(files);
      if (ready.length === 0) {
        setError(whyNothingReady(files, displayCode(selected)));
        return;
      }
      // "Study from": the files the student ticked (the newest readable file by default), within what their plan allows
      const chosen = pickSource(ready, readSourceChoice(selected), maxSourceFiles(access?.tier));
      const chosenIds = pickedIds(chosen);
      const queue: Array<Picked<CourseFile>> = chosen ? [chosen, ...ready.filter((f) => !chosenIds.includes(f.id))] : ready;
      const course = profile.courses.find((c) => canonicalCourseCode(c.code) === canonicalCourseCode(selected));
      // The newest readable file first. If it has too little text (a one-line pasted note, a cover page), the next one is
      // tried instead of giving up: nothing is charged for an attempt that fails.
      let failure: Error | null = null;
      for (const file of queue.slice(0, 3)) {
        try {
          await generateFlashcards({
            ...apiSource(file),                       // one file, or the stand-in id plus the files ticked under "Study from"
            courseCode: selected,
            courseName: course?.name,
          });
          failure = null;
          break;
        } catch (attempt) {
          failure = attempt as Error;
          if (!/insufficient readable text/i.test(failure.message)) break;
        }
      }
      if (failure) throw failure;
      await refresh();
      await loadDecks();
    } catch (e) {
      setError((e as Error)?.message || "Couldn't generate flashcards. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-md px-5 pb-24 pt-[max(1.5rem,env(safe-area-inset-top))] md:pb-8">
        <button
          onClick={returnToOrigin}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#F3E6C8]/80 hover:text-[#F7F3EA] dark:text-[#C4B8A0] dark:hover:text-[#F7F3EA]"
        >
          <ArrowLeft className="h-4 w-4" /> Back: Home
        </button>

        {/* Header card: white, cream border, navy left edge */}
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border border-l-4 border-l-navy bg-card p-4">
          <HeaderLogo className="shrink-0 rounded-lg bg-navy p-1.5 shadow-none hover:opacity-90" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-semibold leading-tight text-foreground">
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

        <div className="mb-8">
          <label htmlFor="flashcards-course-filter" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#F3E6C8]/80 dark:text-[#C4B8A0]">
            Course
          </label>
          <select
            id="flashcards-course-filter"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-medium text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            {courseOptions.map((code) => (
              <option key={code} value={code}>
                {code === ALL_SCOPE ? "All my notes" : displayCode(code)}
              </option>
            ))}
          </select>
          {selected !== ALL_SCOPE ? <SourcePicker courseCode={selected} files={courseFiles} showSingle tone="dark" className="mt-3" /> : null}
        </div>

        {isLoadingDecks ? (
          <div role="status" aria-live="polite" className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-col items-center justify-center py-4">
                <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-sand border-t-accent" />
                <p className="mt-2 text-xs text-muted-foreground">Loading your decks…</p>
              </div>
              <div aria-hidden="true" className="space-y-2">
                <div className="h-3 w-2/5 animate-pulse rounded bg-sand/60" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-sand/40" />
              </div>
            </div>
          </div>
        ) : decks.length > 0 ? (
          <div className="space-y-3">
            {decks.map((deck) => (
              <div key={deck.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold text-foreground">{deckLabel(deck)}</p>
                  <p className="text-xs text-muted-foreground">
                    {displayCode(deck.course_code)} · {deck.card_count} cards
                    {dueCounts[deck.id] !== undefined ? ` · ${dueCounts[deck.id]} due` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["due", "new", "cram"] as const).map((mode) => (
                    <button key={mode} type="button" onClick={() => {
                      sessionStorage.setItem("truefluency-flashcard-mode", mode);
                      navigate("flashcards-review", { courseCode: deck.course_code, deckId: deck.id });
                    }} className={mode === "due"
                      ? "rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                      : mode === "new"
                        ? "rounded-full border-2 border-accent px-3 py-1.5 text-xs font-semibold text-foreground"
                        : "rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground"}>
                      {mode === "due" ? "Due" : mode === "new" ? "New" : "Cram"}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {selected !== ALL_SCOPE && !deckCapReached ? (
              <button
                type="button"
                onClick={generate}
                disabled={isGenerating}
                className="mt-2 h-12 w-full rounded-full border-2 border-border text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
              >
                {isGenerating ? "Generating…" : "Make another 15-card deck"}
              </button>
            ) : null}
            {deckCapReached ? (
              <p className="mt-2 text-center text-xs text-muted-foreground">{PRICE_LINE}</p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-sand">
              <Layers className="h-9 w-9 text-navy" />
            </div>
            <p className="mb-5 font-display text-2xl font-semibold text-foreground">No deck yet</p>

            {deckCapReached ? (
              <p className="max-w-xs text-xs text-muted-foreground">{PRICE_LINE}</p>
            ) : (
              <>
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
              </>
            )}
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
  const [reviewedCount, setReviewedCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hasRevealedAnswer, setHasRevealedAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressCardClickRef = useRef(false);
  const [reviewMode] = useState<"due" | "new" | "cram">(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem("truefluency-flashcard-mode") : null;
    if (typeof window !== "undefined") sessionStorage.removeItem("truefluency-flashcard-mode");
    return stored === "new" || stored === "cram" ? stored : "due";
  });

  const code = activeCourseCode ? displayCode(activeCourseCode) : "Notes";
  const current = cards[0];
  const sessionKey = activeDeckId ? `truefluency-flashcard-session:${activeDeckId}:${reviewMode}` : null;
  const sessionComplete = totalCards > 0 && cards.length === 0;

  useEffect(() => {
    if (!activeDeckId) return;
    let cancelled = false;
    void listDecks().then(async (allDecks) => {
      const deck = allDecks.find((item) => item.id === activeDeckId);
      if (!deck?.material_id) return null;
      const files = await listCourseFiles(deck.course_code);
      return files.find((file) => file.id === deck.material_id)?.file_name ?? null;
    }).then((fileName) => { if (!cancelled) setDeckSourceFileName(fileName); })
      .catch(() => { if (!cancelled) setDeckSourceFileName(null); });
    return () => { cancelled = true; };
  }, [activeDeckId]);

  useEffect(() => {
    if (!activeDeckId) {
      setError("No deck selected.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const savedSession = sessionKey ? (() => {
      try { return JSON.parse(localStorage.getItem(sessionKey) || "null") as { cardIds: string[]; reviewedCount: number; totalCards: number } | string[] | null; }
      catch { return null; }
    })() : null;
    const savedQueue = Array.isArray(savedSession) ? savedSession : savedSession?.cardIds;
    setError(null);
    (savedQueue ? getDeckCards(activeDeckId) : reviewMode === "due" ? getDeckCards(activeDeckId, { dueOnly: true }) : getDeckCards(activeDeckId))
      .then((loaded) => {
        const initialList = reviewMode === "new"
          ? loaded.filter((card) => card.last_reviewed_at === null || card.reps === 0).slice(0, 15)
          : loaded;
        const byId = new Map((savedQueue ? loaded : initialList).map((card) => [card.id, card]));
        const list = savedQueue ? savedQueue.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []) : initialList;
        if (!savedQueue && sessionKey) localStorage.setItem(sessionKey, JSON.stringify({ cardIds: list.map((card) => card.id), reviewedCount: 0, totalCards: list.length }));
        setCards(list);
        setIndex(0);
        setReviewedCount(!Array.isArray(savedSession) && savedSession ? savedSession.reviewedCount : 0);
        setTotalCards(!Array.isArray(savedSession) && savedSession ? savedSession.totalCards : list.length);
        setFlipped(false);
        setHasRevealedAnswer(false);
      })
      .catch((e) => setError((e as Error)?.message || "Couldn't load this deck."))
      .finally(() => setIsLoading(false));
  }, [activeDeckId, reviewMode, sessionKey]);

  const grade = async (rating: 1 | 2 | 3 | 4) => {
    if (!current || isGrading || reviewMode === "cram") return;
    setIsGrading(true);
    try {
      await reviewCard({ cardId: current.id, rating });
      const ratingName = (["again", "hard", "good", "easy"] as const)[rating - 1];
      const { error: trackingError } = await supabase.rpc("record_flashcard_rating", {
        p_flashcard_id: current.id,
        p_rating: ratingName,
      });
      if (trackingError) {
        console.error("[flashcards] rating history could not be recorded", trackingError);
        toast.error("Your rating was saved, but it couldn't be added to progress counts.");
      }
    } catch (e) {
      console.error("[flashcards] review failed to save", e);
      toast.error("Your rating wasn't saved. Try again before leaving this card.");
      setIsGrading(false);
      return;
    }
    const future = cards.slice(1);
    const retryAt = Math.min(2, future.length);
    const remaining = rating === 1
      ? [...future.slice(0, retryAt), current, ...future.slice(retryAt)]
      : future;
    const nextReviewed = reviewedCount + 1;
    const nextTotal = totalCards + (rating === 1 ? 1 : 0);
    setCards(remaining);
    setIndex(0);
    setReviewedCount(nextReviewed);
    setTotalCards(nextTotal);
    if (sessionKey) {
      try {
        if (remaining.length) localStorage.setItem(sessionKey, JSON.stringify({ cardIds: remaining.map((card) => card.id), reviewedCount: nextReviewed, totalCards: nextTotal }));
        else localStorage.removeItem(sessionKey);
      } catch { /* review scheduling has already been saved remotely */ }
    }
    setFlipped(false);
    setHasRevealedAnswer(false);
    setIsGrading(false);
  };

  const movePastCramCard = () => {
    const remaining = cards.slice(1);
    const nextReviewed = reviewedCount + 1;
    setCards(remaining);
    setIndex(0);
    setReviewedCount(nextReviewed);
    if (sessionKey) {
      try {
        if (remaining.length) localStorage.setItem(sessionKey, JSON.stringify({ cardIds: remaining.map((card) => card.id), reviewedCount: nextReviewed, totalCards }));
        else localStorage.removeItem(sessionKey);
      } catch { /* cram navigation still works without a saved queue */ }
    }
    setFlipped(false);
    setHasRevealedAnswer(false);
  };

  const handleCardPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || !flipped || reviewMode === "cram") return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    suppressCardClickRef.current = true;
    window.setTimeout(() => { suppressCardClickRef.current = false; }, 0);
    void grade(dx < 0 ? 1 : 3);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("flashcards")}
            className="inline-flex items-center gap-1.5 text-sm text-[#F3E6C8]/80 hover:text-[#F7F3EA] dark:text-[#C4B8A0] dark:hover:text-[#F7F3EA]"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {current ? (
            <span className="text-sm font-semibold text-foreground">
              {code} · {reviewedCount + 1} of {totalCards}
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
            {sessionComplete ? (
              <>
                <p className="font-display text-xl font-semibold text-navy">Session complete</p>
                <p className="mt-1 text-sm text-muted-foreground">You've finished this review session.</p>
              </>
            ) : (
              <>
                <p className="font-display text-xl font-semibold text-navy">{reviewMode === "cram" ? "End of deck" : reviewMode === "new" ? "No new cards" : "All caught up"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {reviewMode === "due" ? "Nothing due. Come back tomorrow or use Cram." : reviewMode === "new" ? "No new cards in this deck." : "You've reached the end of this deck."}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* A two-sided card that flips without hiding its source details. */}
            <div className="flashcard-3d-stage w-full">
              <button
                type="button"
                aria-label={flipped ? "Show flashcard question" : "Show flashcard answer"}
                aria-pressed={flipped}
                onPointerDown={(event) => { swipeStartRef.current = { x: event.clientX, y: event.clientY }; }}
                onPointerUp={handleCardPointerUp}
                onPointerCancel={() => { swipeStartRef.current = null; }}
                onClick={() => setFlipped((wasFlipped) => {
                  if (suppressCardClickRef.current) return wasFlipped;
                  if (!wasFlipped) setHasRevealedAnswer(true);
                  return !wasFlipped;
                })}
                className={`flashcard-3d-card relative min-h-[22rem] w-full rounded-3xl text-center ${flipped ? "is-flipped" : ""}`}
              >
                <div
                  aria-hidden={flipped}
                  className="flashcard-face absolute inset-0 flex flex-col justify-between rounded-3xl border border-border bg-card p-8 text-foreground"
                >
                  <span className="flex-1" />
                  <div className="font-display text-2xl font-semibold leading-snug"><RichText>{current.front}</RichText></div>
                  <span className="flex-1" />
                  <div className="flex items-center justify-between gap-2 text-left text-xs text-muted-foreground">
                    <span className="min-w-0 truncate">{current.source_file_name || deckSourceFileName || "Course file"}</span>
                    <span className="shrink-0">{current.source_page ? `Page ${current.source_page}` : current.source_section ? `Section: ${current.source_section}` : "Page unavailable"}</span>
                  </div>
                  <span className="mt-2 text-xs text-muted-foreground">Tap to flip</span>
                </div>
                <div
                  aria-hidden={!flipped}
                  className="flashcard-face flashcard-back absolute inset-0 flex flex-col justify-between rounded-3xl border border-primary bg-primary p-8 text-primary-foreground"
                >
                  <span className="flex-1" />
                  <div className="font-display text-xl font-semibold leading-relaxed text-cream"><RichText>{current.back}</RichText></div>
                  <span className="flex-1" />
                  <div className="flex items-center justify-between gap-2 text-left text-xs text-cream/70">
                    <span className="min-w-0 truncate">{current.source_file_name || deckSourceFileName || "Course file"}</span>
                    <span className="shrink-0">{current.source_page ? `Page ${current.source_page}` : current.source_section ? `Section: ${current.source_section}` : "Page unavailable"}</span>
                  </div>
                  <span className="mt-2 text-xs text-cream/70">From your notes</span>
                </div>
              </button>
            </div>

            {reviewMode === "cram" ? (
              <button type="button" onClick={movePastCramCard} className="mt-6 h-12 w-full rounded-full bg-amber text-sm font-semibold text-cream">Next</button>
            ) : hasRevealedAnswer ? (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => void grade(1)} disabled={isGrading}
                  className="h-12 rounded-full border-2 border-border text-sm font-semibold text-foreground disabled:opacity-60">
                  Again
                </button>
                <button type="button" onClick={() => void grade(3)} disabled={isGrading}
                  className="h-12 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">
                  Got it
                </button>
              </div>
            ) : null}

            <p className="mt-4 text-center text-xs text-muted-foreground">
              {reviewMode === "cram" ? "Tap to flip · swipe to move between cards" : hasRevealedAnswer ? "Swipe left for Again · right for Got it" : "Tap to see the answer."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
