import { lagosDay } from "@/lib/wat-day";

export type StreakState = "fire" | "frozen" | "none";

export function advanceStudyStreak(input: { streakDays: number; lastActiveDate: string | null; freezesAvailable: number; freezeUsedOn: string | null }, now = Date.now()) {
  const today = lagosDay(now);
  const last = input.lastActiveDate ? Date.parse(`${input.lastActiveDate}T00:00:00Z`) : NaN;
  const gap = (Date.parse(`${today}T00:00:00Z`) - last) / 86_400_000;
  if (gap === 0 && input.streakDays > 0) return input;
  if (gap === 2 && input.streakDays > 0 && input.freezesAvailable > 0) {
    return { ...input, lastActiveDate: today, freezesAvailable: input.freezesAvailable - 1, freezeUsedOn: today };
  }
  const streakDays = gap === 1 && input.streakDays > 0 ? input.streakDays + 1 : 1;
  return { ...input, streakDays, lastActiveDate: today,
    freezesAvailable: streakDays === 7 ? Math.min(2, input.freezesAvailable + 1) : input.freezesAvailable };
}

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
  // Derive adjacent calendar days from the chosen Lagos day, rather than
  // subtracting elapsed hours from the clock (or from a different override).
  const adjacentDay = (day: string, offset: number) => {
    const [year, month, date] = day.split("-").map(Number);
    const value = new Date(Date.UTC(year, month - 1, date + offset));
    return value.toISOString().slice(0, 10);
  };
  const yesterday = adjacentDay(today, -1);
  const twoDaysAgo = adjacentDay(today, -2);

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
  // A stale stored count is not a live streak. It is reset by the next
  // qualifying server-side activity; until then, Home must not display it.
  return { state: "none", days: 0 };
}
