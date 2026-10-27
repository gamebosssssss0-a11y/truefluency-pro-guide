import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EVENTS = ["mock_started", "mock_submitted", "upload_created", "upload_practice"] as const;
type EventName = typeof EVENTS[number];

export const recordAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventName: EventName; courseCode?: string; materialId?: string; attemptId?: string }) => {
    if (!input || !EVENTS.includes(input.eventName)) throw new Error("Invalid analytics event.");
    const clean = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.length <= max ? value.trim() : undefined;
    return {
      eventName: input.eventName,
      courseCode: clean(input.courseCode, 64),
      materialId: clean(input.materialId, 64),
      attemptId: clean(input.attemptId, 128),
    };
  })
  .handler(async ({ data, context }) => {
    try {
      const { recordAnalyticsEvent } = await import("@/lib/analytics.server");
      await recordAnalyticsEvent({ userId: context.userId, ...data });
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });
