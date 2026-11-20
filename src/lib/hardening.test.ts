import { describe, expect, it, vi } from "vitest";
import { chatWindowStart, nextChatReset } from "./entitlements";
import { advanceStudyStreak, getStreakState } from "./streak-state";
import { isChatAtBottom, pausePractice, tutorPrompt, tutorSnapshotMatches, type TutorSnapshot } from "./study-continuity";
import { thumbnailCacheKey, setCachedThumbnail, getCachedThumbnail, clearThumbnailCache } from "./document-preview-cache";

describe("fixed four-hour WAT allowance", () => {
  it("05:05 UTC is the 04:00–08:00 Lagos slot", () => {
    const now = new Date("2026-11-20T05:05:00Z");
    expect(chatWindowStart(now).toISOString()).toBe("2026-11-20T03:00:00.000Z");
    expect(nextChatReset(now).toISOString()).toBe("2026-11-20T07:00:00.000Z");
  });
  it("an exact 08:00 Lagos boundary starts the next four-hour slot", () => {
    const now = new Date("2026-11-20T07:00:00Z");
    expect(chatWindowStart(now).toISOString()).toBe("2026-11-20T07:00:00.000Z");
    expect(nextChatReset(now).toISOString()).toBe("2026-11-20T11:00:00.000Z");
  });
  it("20:00 Lagos resets at next day's midnight", () => {
    expect(nextChatReset(new Date("2026-11-20T20:15:00Z")).toISOString()).toBe("2026-11-20T23:00:00.000Z");
  });
});

describe("once-per-Lagos-day inclusive study streak", () => {
  const initial = { streakDays: 0, lastActiveDate: null, freezesAvailable: 1, freezeUsedOn: null };
  const today = Date.parse("2026-11-20T05:05:00Z");
  it("first meaningful activity starts one day", () => {
    expect(advanceStudyStreak(initial, today)).toEqual({ ...initial, streakDays: 1, lastActiveDate: "2026-11-20" });
  });
  it("multiple study activities on one day never double count", () => {
    const first = advanceStudyStreak(initial, today);
    expect(advanceStudyStreak(first, today + 10000).streakDays).toBe(1);
  });
  it("studying on the next Lagos day increments", () => {
    expect(advanceStudyStreak({ ...initial, streakDays: 3, lastActiveDate: "2026-11-19" }, today).streakDays).toBe(4);
  });
  it("one freeze protects a single missed day", () => {
    const next = advanceStudyStreak({ ...initial, streakDays: 3, lastActiveDate: "2026-11-18" }, today);
    expect(next.streakDays).toBe(3);
    expect(next.freezesAvailable).toBe(0);
    expect(next.freezeUsedOn).toBe("2026-11-20");
  });
  it("a missed day without a freeze starts at one", () => {
    expect(advanceStudyStreak({ ...initial, streakDays: 3, freezesAvailable: 0, lastActiveDate: "2026-11-18" }, today).streakDays).toBe(1);
  });
  it("zero streak has no fire state", () => {
    expect(getStreakState(initial, "2026-11-20")).toEqual({ days: 0, state: "none" });
  });
});

describe("Tutor handover", () => {
  const test = { courseCode: "PHY102", courseTitle: "Physics", mode: "tutor" as const, analyticsSessionId: "attempt-a", questionCount: 1,
    durationSec: 120, elapsedSec: 10, resumedAt: 1000, startedAt: 1000, answers: [1], currentIndex: 0, questionIds: [42] };
  const snapshot: TutorSnapshot = { ownerId: "student-a", sessionId: "attempt-a", courseCode: "PHY102", questionIndex: 1, totalQuestions: 1,
    selectedAnswer: 1, question: { id: 42, topic: "Motion", question: "Find acceleration", options: ["2", "4"], correct_index: 0, explanation: "Divide force by mass." } };
  it("pauses at the exact question without losing answers or active time", () => {
    const paused = pausePractice(test, 6000);
    expect(paused.elapsedSec).toBe(15);
    expect(paused.isPaused).toBe(true);
    expect(paused.resumedAt).toBeUndefined();
    expect(paused.answers).toEqual([1]);
    expect(pausePractice(paused, 9000).elapsedSec).toBe(15);
  });
  it("rejects a different account or attempt", () => {
    expect(tutorSnapshotMatches(snapshot, "student-a", test)).toBe(true);
    expect(tutorSnapshotMatches(snapshot, "student-b", test)).toBe(false);
    expect(tutorSnapshotMatches(snapshot, "student-a", { ...test, analyticsSessionId: "attempt-b" })).toBe(false);
  });
  it("context contains the selected question, choices and selected answer", () => {
    const prompt = tutorPrompt(snapshot);
    expect(prompt).toContain("Find acceleration");
    expect(prompt).toContain("A. 2\nB. 4");
    expect(prompt).toContain("My answer: B. Correct answer: A.");
  });
});

it("64px reading boundary does not force-follow streamed text", () => {
  expect(isChatAtBottom(1000, 500, 400)).toBe(false);
  expect(isChatAtBottom(1000, 536, 400)).toBe(false);
  expect(isChatAtBottom(1000, 537, 400)).toBe(true);
});

it("thumbnail keys isolate accounts and file revisions", () => {
  const first = thumbnailCacheKey("student-a", "file-1", "v2");
  expect(first).not.toBe(thumbnailCacheKey("student-b", "file-1", "v2"));
  expect(first).not.toBe(thumbnailCacheKey("student-a", "file-1", "v3"));
});

it("owner thumbnail cache expires after seven days and deletion removes its file only", async () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date("2026-11-20T05:05:00Z"));
    const a = thumbnailCacheKey("student-a", "file-1", "v1");
    const b = thumbnailCacheKey("student-b", "file-1", "v1");
    await setCachedThumbnail(a, "data:image/webp;base64,YQ==");
    await setCachedThumbnail(b, "data:image/webp;base64,Yg==");
    expect(await getCachedThumbnail(a)).toBe("data:image/webp;base64,YQ==");
    await clearThumbnailCache("student-a", "file-1");
    expect(await getCachedThumbnail(a)).toBeNull();
    expect(await getCachedThumbnail(b)).toBe("data:image/webp;base64,Yg==");
    vi.advanceTimersByTime(7 * 24 * 60 * 60 * 1000);
    expect(await getCachedThumbnail(b)).toBeNull();
  } finally { await clearThumbnailCache(); vi.useRealTimers(); }
});