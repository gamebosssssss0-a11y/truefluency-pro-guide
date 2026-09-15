/**
 * Client for TrueFluency's flashcard feature (FastAPI on Render, flashcard.py).
 * flashcard.py already implements the full feature — grounded generation
 * from uploaded material, FSRS scheduling, deck/card persistence. This file
 * is just the missing wiring: flashcards.tsx used to be a UI-only stub that
 * never called any of it.
 */
import { supabase } from "@/integrations/supabase/client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

export function isFlashcardsConfigured(): boolean {
  return typeof BACKEND_URL === "string" && BACKEND_URL.trim().length > 0;
}

function base(): string {
  if (!isFlashcardsConfigured()) throw new Error("Flashcard service isn't configured yet");
  return BACKEND_URL!.replace(/\/+$/, "");
}

function readErrorDetail(text: string, status: number): string {
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    const detail = parsed?.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
  } catch {
    /* not JSON */
  }
  if (status === 402) return "You've used today's free flashcard decks.";
  if (status === 422) return "Couldn't generate flashcards from that upload — try a clearer file.";
  if (status === 502) return "Flashcard generation failed. Try again.";
  return "The flashcard service had a problem. Please try again.";
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sign in to use flashcards.");
  return { Authorization: `Bearer ${accessToken}` };
}

export type Flashcard = {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  source_excerpt: string | null;
  stability: number | null;
  difficulty: number | null;
  reps: number;
  lapses: number;
  last_reviewed_at: string | null;
  due_at: string;
};

export type FlashcardDeck = {
  id: string;
  user_id: string;
  material_id: string | null;
  course_code: string;
  title: string;
  card_count: number;
  created_at: string;
};

async function postJson<T>(path: string, body: unknown, timeoutMs = 60_000): Promise<T> {
  const url = `${base()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const auth = await authHeader();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[flashcards] request failed", { path, status: res.status, text });
      throw new Error(readErrorDetail(text, res.status));
    }
    return (await res.json()) as T;
  } catch (e) {
    if ((e as Error)?.name === "AbortError")
      throw new Error("Flashcard generation timed out. Try again.");
    if (e instanceof TypeError) {
      throw new Error("Couldn't reach the flashcard service. Check your connection and try again.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function getJson<T>(path: string, timeoutMs = 15_000): Promise<T> {
  const url = `${base()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const auth = await authHeader();
    const res = await fetch(url, { method: "GET", headers: auth, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(readErrorDetail(text, res.status));
    }
    return (await res.json()) as T;
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw new Error("The request timed out.");
    if (e instanceof TypeError) {
      throw new Error("Couldn't reach the flashcard service. Check your connection and try again.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generates FSRS-scheduled deck(s) from an already-uploaded, successfully
 * extracted material. The backend decides 1 vs 2 decks based on source
 * length and degrades gracefully on quota — see flashcard.py.
 */
export async function generateFlashcards(input: {
  materialId: string;
  courseCode: string;
  courseName?: string | null;
}): Promise<{ decks: FlashcardDeck[]; deckCount: number }> {
  const data = await postJson<{ decks: FlashcardDeck[]; deck_count: number }>(
    "/flashcards/generate",
    {
      material_id: input.materialId,
      course_code: input.courseCode,
      course_name: input.courseName ?? null,
    },
    90_000,
  );
  return { decks: data.decks ?? [], deckCount: data.deck_count ?? (data.decks ?? []).length };
}

/** All of the student's decks, newest first. */
export async function listDecks(): Promise<FlashcardDeck[]> {
  const data = await getJson<{ decks: FlashcardDeck[] }>("/flashcards/decks");
  return data.decks ?? [];
}

/** Cards in a deck, soonest-due first. dueOnly=true returns just what's due for review right now. */
export async function getDeckCards(
  deckId: string,
  opts?: { dueOnly?: boolean },
): Promise<Flashcard[]> {
  const qs = opts?.dueOnly ? "?due_only=true" : "";
  const data = await getJson<{ cards: Flashcard[] }>(`/flashcards/deck/${deckId}${qs}`);
  return data.cards ?? [];
}

/**
 * Records one review and reschedules the card with FSRS. Pass `recalled`
 * for the simple swipe gesture (right = true/Good, left = false/Again), or
 * an explicit 1–4 `rating` (1=Again, 2=Hard, 3=Good, 4=Easy).
 */
export async function reviewCard(input: {
  cardId: string;
  recalled?: boolean;
  rating?: 1 | 2 | 3 | 4;
}): Promise<{ dueAt: string; nextIntervalDays: number }> {
  const data = await postJson<{ due_at: string; next_interval_days: number }>(
    "/flashcards/review",
    {
      card_id: input.cardId,
      recalled: input.recalled,
      rating: input.rating,
    },
  );
  return { dueAt: data.due_at, nextIntervalDays: data.next_interval_days };
}
