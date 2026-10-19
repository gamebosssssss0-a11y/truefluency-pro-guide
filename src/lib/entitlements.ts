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

/**
 * Daily caps. EVERY plan, the trial included, has a number for everything that costs money: "full access" never means
 * "no cap" (the trial used to be uncapped, i.e. unlimited free generation for a week). 0 means the feature is locked.
 * Study Chat is not counted in messages any more: it is a usage plan, a daily token allowance (CHAT_DAILY_TOKENS below),
 * so chatbot_messages is null everywhere. Mirrors PLAN_DAILY_LIMITS in the backend's main.py.
 */
export const FREE_DAILY_LIMITS: Record<GatedFeature, number | null> = {
  mock_sets: 2,
  chatbot_messages: null,
  flashcard_decks: 2,
  library_uploads: 0,
};

export const CORE_DAILY_LIMITS: Record<GatedFeature, number | null> = {
  mock_sets: 3,
  chatbot_messages: null,
  flashcard_decks: 4,
  library_uploads: 20,
};

export const EXAM_DAILY_LIMITS: Record<GatedFeature, number | null> = {
  mock_sets: 6,
  chatbot_messages: null,
  flashcard_decks: 8,
  library_uploads: 40,
};

/** The seven-day trial is Core: same daily caps, same 45-question sets. */
export const TRIAL_DAILY_LIMITS: Record<GatedFeature, number | null> = { ...CORE_DAILY_LIMITS };

/**
 * Study Chat allowance per day, in tokens (what the AI provider counts: your question, the notes and instructions sent
 * with it, and the reply). Free is small on purpose; every paid plan doubles the one below it. Refreshes at midnight
 * Lagos time. Mirrors usage_meter.py on the backend, which enforces it.
 */
export const CHAT_DAILY_TOKENS: Record<"free" | "trial" | "core" | "exam", number> = {
  free: 24_000,
  trial: 48_000,
  core: 48_000,
  exam: 96_000,
};
/** What a normal reply costs on average (measured), only used to say "about N replies". */
export const CHAT_AVG_REPLY_TOKENS = 3_800;
export function approxChatReplies(tokens: number): number {
  return Math.round(tokens / CHAT_AVG_REPLY_TOKENS);
}

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
  /** How many of the 25 founding places are still free. Real, never a countdown. */
  foundingSeatsLeft: number;
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
  const nextPlan = tier === "core" || tier === "trial"
    ? "Exam adds 6 mock sets a day, 60 questions per set, four times the free Study Chat allowance, and 8 flashcard decks."
    : "Core adds 3 mock sets a day, 45 questions per set, answer explanations, peer-save, twice the free Study Chat allowance, and 4 flashcard decks.";

  if (verdict.reason === "question_cap") {
    return {
      title: `${tier === "exam" ? "Exam" : tier === "core" ? "Core" : tier === "trial" ? "Trial" : "Free"} sets cap at ${verdict.maxQuestionsPerSet} questions`,
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
        : "You've reached today's peer-save limit. It resets tomorrow.",
    };
  }

  if (feature === "chatbot_messages") {
    const more = tier === "exam" ? "" : ` ${nextPlan}`;
    return {
      title: "That's your Study Chat allowance for today",
      body: `Study Chat is a daily allowance that refreshes at midnight (Lagos time).${more}`,
    };
  }

  const what = feature === "mock_sets" ? "mock sets" : "new flashcard decks";
  if (tier === "core" || tier === "exam" || tier === "trial") {
    const limit = (tier === "exam" ? EXAM_DAILY_LIMITS : CORE_DAILY_LIMITS)[feature];
    const name = tier === "core" ? "Core" : tier === "exam" ? "Exam" : "trial";
    return {
      title: `That's your ${name} limit for today`,
      body: tier === "exam"
        ? `Your Exam plan includes ${limit} ${what} a day. Your count resets tomorrow.`
        : `Your ${name} plan includes ${limit} ${what} a day. Upgrade to Exam for expanded daily access. Your count resets tomorrow.`,
    };
  }

  return {
    title: "That's your free limit for today",
    body: `Free includes ${FREE_DAILY_LIMITS[feature]} ${what} a day. ${nextPlan} Your count resets tomorrow.`,
  };
}
