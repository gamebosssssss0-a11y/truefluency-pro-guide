/**
 * Server-only entitlement gate.
 *
 * Every gated action resolves the caller's tier here and, for free accounts,
 * checks and increments a per-day counter. Counters and tier changes are
 * written with the service-role client so a browser can never fake them.
 * This module only ever grants or refuses permission; it does not touch
 * upload, extraction, or generation logic.
 */
import {
  FOUNDING_PRICE_NAIRA,
  FOUNDING_USER_LIMIT,
  FREE_DAILY_LIMITS,
  FREE_MAX_QUESTIONS,
  PAID_MAX_QUESTIONS,
  STANDARD_PRICE_NAIRA,
  TRIAL_DAYS,
  paywallCopy,
  type AccessSummary,
  type GatedFeature,
  type QuotaVerdict,
  type Tier,
} from "@/lib/entitlements";

type Row = {
  user_id: string;
  tier: string;
  trial_started_at: string;
  trial_ends_at: string;
  paid_until: string | null;
  paying_user_number: number | null;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Fetch the caller's subscription, creating a fresh 7-day trial on first use. */
async function ensureRow(userId: string): Promise<Row> {
  const db = await admin();
  const existing = await db
    .from("subscriptions")
    .select("user_id, tier, trial_started_at, trial_ends_at, paid_until, paying_user_number")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing.data) return existing.data as Row;

  const now = new Date();
  const ends = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const inserted = await db
    .from("subscriptions")
    .insert({
      user_id: userId,
      tier: "trial",
      trial_started_at: now.toISOString(),
      trial_ends_at: ends.toISOString(),
    })
    .select("user_id, tier, trial_started_at, trial_ends_at, paid_until, paying_user_number")
    .single();

  if (inserted.error || !inserted.data) {
    // A concurrent request may have created it first.
    const retry = await db
      .from("subscriptions")
      .select("user_id, tier, trial_started_at, trial_ends_at, paid_until, paying_user_number")
      .eq("user_id", userId)
      .maybeSingle();
    if (retry.data) return retry.data as Row;
    throw new Error("Couldn't read your subscription.");
  }
  return inserted.data as Row;
}

/** Trial rows whose window has closed settle into the free tier. */
async function settleTier(row: Row): Promise<Row> {
  const trialOver = new Date(row.trial_ends_at).getTime() <= Date.now();
  const paidOver =
    row.tier === "paid" && (!row.paid_until || new Date(row.paid_until).getTime() <= Date.now());

  if ((row.tier === "trial" && trialOver) || paidOver) {
    const db = await admin();
    await db.from("subscriptions").update({ tier: "free" }).eq("user_id", row.user_id);
    return { ...row, tier: "free" };
  }
  return row;
}

async function countPaidUsers(): Promise<number> {
  const db = await admin();
  const { count } = await db
    .from("subscriptions")
    .select("user_id", { count: "exact", head: true })
    .not("paying_user_number", "is", null);
  return count ?? 0;
}

async function usageToday(userId: string): Promise<Record<GatedFeature, number>> {
  const db = await admin();
  const { data } = await db
    .from("usage_counters")
    .select("feature, count")
    .eq("user_id", userId)
    .eq("day", today());

  const out: Record<GatedFeature, number> = {
    mock_sets: 0,
    chatbot_messages: 0,
    flashcard_decks: 0,
    library_uploads: 0,
  };
  for (const r of data ?? []) {
    const key = r.feature as GatedFeature;
    if (key in out) out[key] = Number(r.count) || 0;
  }
  return out;
}

export async function resolveAccess(userId: string): Promise<AccessSummary> {
  const row = await settleTier(await ensureRow(userId));
  const tier = row.tier as Tier;
  const fullAccess =
    (tier === "trial" && new Date(row.trial_ends_at).getTime() > Date.now()) ||
    (tier === "paid" && !!row.paid_until && new Date(row.paid_until).getTime() > Date.now());

  const paidSoFar = await countPaidUsers();
  const foundingPriceAvailable = paidSoFar < FOUNDING_USER_LIMIT;

  return {
    tier,
    fullAccess,
    trialEndsAt: row.trial_ends_at,
    paidUntil: row.paid_until,
    priceNaira: foundingPriceAvailable ? FOUNDING_PRICE_NAIRA : STANDARD_PRICE_NAIRA,
    foundingPriceAvailable,
    maxQuestionsPerSet: fullAccess ? PAID_MAX_QUESTIONS : FREE_MAX_QUESTIONS,
    explanationsUnlocked: fullAccess,
    libraryUploadsUnlocked: fullAccess,
    usageToday: await usageToday(userId),
    dailyLimits: {
      mock_sets: fullAccess ? null : FREE_DAILY_LIMITS.mock_sets,
      chatbot_messages: fullAccess ? null : FREE_DAILY_LIMITS.chatbot_messages,
      flashcard_decks: fullAccess ? null : FREE_DAILY_LIMITS.flashcard_decks,
      library_uploads: fullAccess ? null : FREE_DAILY_LIMITS.library_uploads,
    },
  };
}

async function bump(userId: string, feature: GatedFeature, current: number): Promise<void> {
  const db = await admin();
  await db
    .from("usage_counters")
    .upsert(
      { user_id: userId, feature, day: today(), count: current + 1 },
      { onConflict: "user_id,feature,day" },
    );
}

/**
 * Decide whether one gated action may run, and record it when it may.
 * `requestedQuestions` only applies to mock sets.
 */
export async function consumeQuota(opts: {
  userId: string;
  feature: GatedFeature;
  requestedQuestions?: number;
}): Promise<QuotaVerdict & { access: AccessSummary; allowedQuestions?: number }> {
  const access = await resolveAccess(opts.userId);
  const base = {
    priceNaira: access.priceNaira,
    maxQuestionsPerSet: access.maxQuestionsPerSet,
    access,
  };

  const requested = Math.max(1, Math.round(Number(opts.requestedQuestions) || 0));

  if (access.fullAccess) {
    if (opts.feature === "mock_sets") {
      return {
        ...base,
        allowed: true,
        allowedQuestions: Math.min(requested || PAID_MAX_QUESTIONS, PAID_MAX_QUESTIONS),
      };
    }
    return { ...base, allowed: true };
  }

  const limit = FREE_DAILY_LIMITS[opts.feature];
  const used = access.usageToday[opts.feature];

  if (limit === 0) {
    const verdict: QuotaVerdict = { ...base, allowed: false, reason: "locked" };
    return { ...verdict, ...base, message: paywallCopy(opts.feature, verdict).body };
  }

  if (opts.feature === "mock_sets" && opts.requestedQuestions && requested > FREE_MAX_QUESTIONS) {
    const verdict: QuotaVerdict = { ...base, allowed: false, reason: "question_cap" };
    return { ...verdict, ...base, message: paywallCopy(opts.feature, verdict).body };
  }

  if (used >= limit) {
    const verdict: QuotaVerdict = { ...base, allowed: false, reason: "daily_limit" };
    return {
      ...verdict,
      ...base,
      remainingToday: 0,
      message: paywallCopy(opts.feature, verdict).body,
    };
  }

  await bump(opts.userId, opts.feature, used);
  return {
    ...base,
    allowed: true,
    remainingToday: Math.max(0, limit - used - 1),
    ...(opts.feature === "mock_sets"
      ? { allowedQuestions: Math.min(requested || FREE_MAX_QUESTIONS, FREE_MAX_QUESTIONS) }
      : {}),
  };
}
