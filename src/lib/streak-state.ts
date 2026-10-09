import { lagosDay } from "@/lib/wat-day";

export type StreakState = "fire" | "frozen" | "none";

export function getStreakState(
  input: {
    streakDays: number;
    lastActiveDate: string | null;
    freezesAvailable: number;
    freezeUsedOn: string | null;
  },
  todayOverride?: string,
  now = Date.now(),
): { state: StreakState; days: number } {
  const today = todayOverride ?? lagosDay(now);
  const yesterday = lagosDay(now - 86_400_000);
  const twoDaysAgo = lagosDay(now - 172_800_000);

  if (input.streakDays <= 0) return { state: "none", days: 0 };
  if (input.lastActiveDate === today || input.lastActiveDate === yesterday) {
    return { state: "fire", days: input.streakDays };
  }
  // record_mock_streak applies a freeze only when the next qualifying mock
  // is completed and writes that application day to both date fields.
  // Before the student returns, a single missed Lagos day is covered by an
  // available freeze when lastActiveDate is two days ago.
  if (input.lastActiveDate === twoDaysAgo && input.freezesAvailable > 0) {
    return { state: "frozen", days: input.streakDays };
  }
  // freeze_used_on records the day a freeze was applied. In the migration,
  // that is also last_active_date, so it is already handled as alive above.
  void input.freezeUsedOn;
  return { state: "none", days: input.streakDays };
}
