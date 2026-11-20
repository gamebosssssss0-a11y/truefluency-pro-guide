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
  .inputValidator((input: { answeredCount: number }) => {
    const answeredCount = Number(input?.answeredCount);
    if (!Number.isInteger(answeredCount) || answeredCount < 1 || answeredCount > 100) {
      throw new Error("At least one answer is required to update your streak.");
    }
    return { answeredCount };
  })
  .handler(async ({ data, context }): Promise<StreakUpdate | null> => {
    const rpc = context.supabase.rpc as unknown as (
      name: string,
      args: { answered_count: number },
    ) => Promise<{ data: StreakRow[] | null; error: { message: string } | null }>;
    const { data: rows, error } = await rpc("record_mock_streak", {
      answered_count: data.answeredCount,
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

export const recordStudyStreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StreakUpdate> => {
    const rpc = context.supabase.rpc as unknown as (name: string) => Promise<{ data: StreakRow[] | null; error: { message: string } | null }>;
    const { data: rows, error } = await rpc("record_study_activity");
    if (error) throw new Error(error.message);
    const row = rows?.[0];
    if (!row) throw new Error("Couldn't update your study streak.");
    return { streakDays: row.streak_days, lastActiveDate: row.last_active_date,
      freezesAvailable: row.freezes_available, freezeUsedOn: row.freeze_used_on,
      event: row.event === "protected" || row.event === "incremented" || row.event === "reset" ? row.event : "none", todayWat: row.today_wat };
  });