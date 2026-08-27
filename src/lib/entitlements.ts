/**
 * Pricing and free-tier limits, shared by the server-side gate and the UI.
 * Numbers live here so the paywall copy and the enforcement can never drift.
 */

/** Founding price is for the first 25 PAYING students, not sign-ups. */
export const FOUNDING_USER_LIMIT = 25;
export const FOUNDING_PRICE_NAIRA = 1000;
export const STANDARD_PRICE_NAIRA = 2000;
export const TRIAL_DAYS = 7;

export type GatedFeature =
  | "mock_sets"
  | "chatbot_messages"
  | "flashcard_decks"
  | "library_uploads";

/** Daily caps for a free (post-trial) account. 0 means the feature is locked. */
export const FREE_DAILY_LIMITS: Record<GatedFeature, number> = {
  mock_sets: 3,
  chatbot_messages: 25,
  flashcard_decks: 3,
  library_uploads: 0,
};

export const FREE_MAX_QUESTIONS = 60;
export const PAID_MAX_QUESTIONS = 120;

export type Tier = "trial" | "free" | "paid";

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
};

export type QuotaVerdict = {
  allowed: boolean;
  reason?: "daily_limit" | "question_cap" | "locked";
  message?: string;
  priceNaira: number;
  maxQuestionsPerSet: number;
  remainingToday?: number;
};

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

/** Friendly, non-blocking copy for each way a free account can hit a wall. */
export function paywallCopy(
  feature: GatedFeature,
  verdict: QuotaVerdict,
): { title: string; body: string } {
  const price = formatNaira(verdict.priceNaira);
  const upsell = `Full access is ${price} for the semester at our founding price, and it unlocks unlimited mock tests, up to ${PAID_MAX_QUESTIONS} questions a set, and the WHY behind every answer.`;

  if (verdict.reason === "question_cap") {
    return {
      title: `Free sets cap at ${FREE_MAX_QUESTIONS} questions`,
      body: `You asked for more than ${FREE_MAX_QUESTIONS} questions in one set. ${upsell}`,
    };
  }
  if (feature === "library_uploads") {
    return {
      title: "Uploading to the Library is a paid feature",
      body: `Browsing and downloading stay free for everyone. ${upsell}`,
    };
  }
  const labels: Record<GatedFeature, string> = {
    mock_sets: `${FREE_DAILY_LIMITS.mock_sets} mock test sets a day`,
    chatbot_messages: `${FREE_DAILY_LIMITS.chatbot_messages} chatbot messages a day`,
    flashcard_decks: `${FREE_DAILY_LIMITS.flashcard_decks} new flashcard decks a day`,
    library_uploads: "Library uploads",
  };
  return {
    title: "That's your free limit for today",
    body: `Free accounts get ${labels[feature]}, and your count resets tomorrow. ${upsell}`,
  };
}
