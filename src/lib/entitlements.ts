/**
 * Pricing and free-tier limits, shared by the server-side gate and the UI.
 * Numbers live here so the paywall copy and the enforcement can never drift.
 */

/** Founding price is for the first 25 PAYING students, not sign-ups. */
export const FOUNDING_USER_LIMIT = 25;
export const FOUNDING_PRICE_NAIRA = 1000;
export const STANDARD_PRICE_NAIRA = 2000;
export const EXAM_PRICE_NAIRA = 4000;
export const TRIAL_DAYS = 7;

export type GatedFeature =
  | "mock_sets"
  | "chatbot_messages"
  | "flashcard_decks"
  | "library_uploads";

/** Daily caps for a free (post-trial) account. 0 means the feature is locked. */
export const FREE_DAILY_LIMITS: Record<GatedFeature, number> = {
  mock_sets: 2,
  chatbot_messages: 10,
  flashcard_decks: 2,
  library_uploads: 0,
};

export const CORE_DAILY_LIMITS: Record<GatedFeature, number | null> = {
  mock_sets: 3,
  chatbot_messages: 30,
  flashcard_decks: 4,
  library_uploads: null,
};

export const EXAM_DAILY_LIMITS: Record<GatedFeature, number | null> = {
  mock_sets: 6,
  chatbot_messages: 60,
  flashcard_decks: 8,
  library_uploads: null,
};

/** The seven-day trial includes Core features without daily set/chat/deck caps. */
export const TRIAL_DAILY_LIMITS: Record<GatedFeature, number | null> = {
  mock_sets: null,
  chatbot_messages: null,
  flashcard_decks: null,
  library_uploads: null,
};

export const FREE_MAX_QUESTIONS = 30;
export const CORE_MAX_QUESTIONS = 45;
export const EXAM_MAX_QUESTIONS = 60;
/** Backwards-compatible name for the Core question cap. */
export const PAID_MAX_QUESTIONS = CORE_MAX_QUESTIONS;

export type Tier = "trial" | "free" | "core" | "exam";

export type AccessSummary = {
  tier: Tier;
  fullAccess: boolean;
  trialEndsAt: string | null;
  paidUntil: string | null;
  /** Semester price this student would pay today, in naira. */
  priceNaira: number;
  foundingPriceAvailable: boolean;
  maxQuestionsPerSet: number;
  explanationsUnlocked: boolean;
  libraryUploadsUnlocked: boolean;
  usageToday: Record<GatedFeature, number>;
  dailyLimits: Record<GatedFeature, number | null>;
  watToday: string;
};

export type QuotaVerdict = {
  allowed: boolean;
  reason?: "daily_limit" | "question_cap" | "locked";
  message?: string;
  priceNaira: number;
  maxQuestionsPerSet: number;
  tier?: Tier;
  remainingToday?: number;
};

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

/** Friendly copy follows the same plan caps enforced by the server. */
export function paywallCopy(
  feature: GatedFeature,
  verdict: QuotaVerdict,
): { title: string; body: string } {
  const tier = verdict.tier ?? "free";
  const nextPlan = tier === "core"
    ? "Exam adds 6 mock sets a day, 60 questions per set, 60 Study Chat messages, and 8 flashcard decks."
    : "Core adds 3 mock sets a day, 45 questions per set, answer explanations, peer-save, 30 Study Chat messages, and 4 flashcard decks.";

  if (verdict.reason === "question_cap") {
    return {
      title: `${tier === "exam" ? "Exam" : tier === "core" ? "Core" : "Free"} sets cap at ${verdict.maxQuestionsPerSet} questions`,
      body: tier === "exam"
        ? `Exam sets support up to ${verdict.maxQuestionsPerSet} questions.`
        : `This plan supports up to ${verdict.maxQuestionsPerSet} questions per set. ${nextPlan}`,
    };
  }

  if (feature === "library_uploads") {
    return {
      title: "Saving files to your Library is included with a paid plan",
      body: tier === "free"
        ? `You can view published files. Core and Exam include peer-save. ${nextPlan}`
        : "Peer-save is included with your plan.",
    };
  }

  if (tier === "core" || tier === "exam") {
    const label = tier === "core"
      ? `${CORE_DAILY_LIMITS[feature]} ${feature === "mock_sets" ? "mock sets" : feature === "chatbot_messages" ? "Study Chat messages" : "new flashcard decks"}`
      : `${EXAM_DAILY_LIMITS[feature]} ${feature === "mock_sets" ? "mock sets" : feature === "chatbot_messages" ? "Study Chat messages" : "new flashcard decks"}`;
    return {
      title: `That's your ${tier === "core" ? "Core" : "Exam"} limit for today`,
      body: tier === "core"
        ? `Your plan includes ${label} a day. Upgrade to Exam for expanded daily access.`
        : `Your Exam plan includes ${label} a day. Your count resets tomorrow.`,
    };
  }

  const labels: Record<GatedFeature, string> = {
    mock_sets: `${FREE_DAILY_LIMITS.mock_sets} mock test sets`,
    chatbot_messages: `${FREE_DAILY_LIMITS.chatbot_messages} Study Chat messages`,
    flashcard_decks: `${FREE_DAILY_LIMITS.flashcard_decks} new flashcard decks`,
    library_uploads: "Library peer-save",
  };
  return {
    title: "That's your free limit for today",
    body: `Free includes ${labels[feature]} a day. ${nextPlan} Your count resets tomorrow.`,
  };
}
