import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StreakEvent = "incremented" | "protected" | "reset" | "none";
export type StreakUpdate = {
  streakDays: number;
  lastActiveDate: string;
  freezesAvailable: number;
  freezeUsedOn: string | null;
  event: StreakEvent;
  todayWat: string;
};

type StreakRow = {
  streak_days: number;
  last_active_date: string;
  freezes_available: number;
  freeze_used_on: string | null;
  event: string;
  today_wat: string;
};

export const recordMockStreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string }) => {
    const attemptId = String(input?.attemptId ?? "").trim();
    if (!attemptId || attemptId.length > 64) throw new Error("A completed mock is required.");
    return { attemptId };
  })
  .handler(async ({ data, context }): Promise<StreakUpdate | null> => {
    const rpc = context.supabase.rpc as unknown as (
      name: string,
      args: { attempt_id: string },
    ) => Promise<{ data: StreakRow[] | null; error: { message: string } | null }>;
    const { data: rows, error } = await rpc("record_mock_streak", {
      attempt_id: data.attemptId,
    });
    if (error) throw new Error(error.message);
    const row = rows?.[0];
    if (!row) throw new Error("Couldn't update your study streak.");

    const event: StreakEvent =
      row.event === "incremented" || row.event === "protected" || row.event === "reset"
        ? row.event
        : "none";
    return {
      streakDays: row.streak_days,
      lastActiveDate: row.last_active_date,
      freezesAvailable: row.freezes_available,
      freezeUsedOn: row.freeze_used_on,
      event,
      todayWat: row.today_wat,
    };
  });