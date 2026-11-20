import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CHAT_DAILY_TOKENS, chatWindowStart, nextChatReset, approxChatReplies } from "./entitlements";
import type { ChatUsage } from "./chat-api";

/** Reads real server usage. No optimistic reset or browser-written counters. */
export const getFourHourChatUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChatUsage | null> => {
    const { resolveAccess } = await import("./entitlements.server");
    const access = await resolveAccess(context.userId);
    const now = new Date();
    // Narrow boundary for separately deployed schema; never edit generated types.
    const client = context.supabase as unknown as { from: (name: string) => {
      select: (columns: string) => { eq: (column: string, value: string) => {
        eq: (column: string, value: string) => { maybeSingle: () => Promise<{ data: { tokens: number; turns: number } | null; error: unknown }> }
      } }
    } };
    const { data, error } = await client.from("chat_token_windows").select("tokens,turns")
      .eq("user_id", context.userId).eq("window_start", chatWindowStart(now).toISOString()).maybeSingle();
    if (error) return null;
    const used = Math.max(0, Number(data?.tokens ?? 0));
    const budget = CHAT_DAILY_TOKENS[access.tier];
    const remaining = Math.max(0, budget - used);
    return { plan: access.tier, used_tokens: used, budget_tokens: budget, remaining_tokens: remaining,
      percent: Math.min(100, Math.round(used / budget * 100)), approx_replies_left: approxChatReplies(remaining),
      replies_today: Number(data?.turns ?? 0), resets_at: nextChatReset(now).toISOString(), metering: true, window_hours: 4 };
  });