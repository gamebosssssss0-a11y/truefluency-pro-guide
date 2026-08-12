/**
 * Client-callable entitlement checks. Thin wrappers only: all decision logic
 * lives in entitlements.server.ts so it can't be bypassed from the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AccessSummary, GatedFeature, QuotaVerdict } from "@/lib/entitlements";

const FEATURES: GatedFeature[] = [
  "mock_sets",
  "chatbot_messages",
  "flashcard_decks",
  "library_uploads",
];

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccessSummary> => {
    const { resolveAccess } = await import("@/lib/entitlements.server");
    return resolveAccess(context.userId);
  });

export const consumeFeatureQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { feature: GatedFeature; requestedQuestions?: number }) => {
    const feature = FEATURES.includes(input?.feature) ? input.feature : null;
    if (!feature) throw new Error("Unknown feature.");
    const requested = Number(input?.requestedQuestions);
    return {
      feature,
      requestedQuestions: Number.isFinite(requested) ? Math.round(requested) : undefined,
    };
  })
  .handler(async ({ data, context }): Promise<QuotaVerdict & { allowedQuestions?: number }> => {
    const { consumeQuota } = await import("@/lib/entitlements.server");
    const result = await consumeQuota({
      userId: context.userId,
      feature: data.feature,
      requestedQuestions: data.requestedQuestions,
    });
    const { access: _access, ...verdict } = result;
    return verdict;
  });
