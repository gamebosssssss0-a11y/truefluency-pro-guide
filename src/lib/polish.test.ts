import { afterEach, describe, expect, it, vi } from "vitest";
import { themeRevealGeometry } from "./theme-reveal";
import { clearChatMirrors, flushChatMirrors, readChatMirror, reconcileThread, writeChatMirror } from "./chat-cache";

afterEach(() => { flushChatMirrors(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it("theme reveal begins at the actual toggle and reaches every phone corner", () => {
  const geometry = themeRevealGeometry(360, 619, { x: 320, y: 40 });
  expect(geometry.x).toBe(320);
  expect(geometry.y).toBe(40);
  expect(geometry.radius).toBe(Math.hypot(320, 579));
  for (const [x, y] of [[0, 0], [360, 0], [0, 619], [360, 619]]) {
    expect(geometry.radius).toBeGreaterThanOrEqual(Math.hypot(x - 320, y - 40));
  }
});

describe("account-scoped optional chat mirror", () => {
  function storage() {
    const rows = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: {
      getItem: (key: string) => rows.get(key) ?? null,
      setItem: (key: string, value: string) => rows.set(key, value),
      removeItem: (key: string) => rows.delete(key),
      key: (index: number) => [...rows.keys()][index] ?? null,
      get length() { return rows.size; },
    } });
    return rows;
  }
  it("same-course messages never appear in another student's mirror", () => {
    storage();
    writeChatMirror("student-a", "PHY102", [{ text: "Private notes" }], true);
    expect(readChatMirror("student-b", "PHY102")).toBeNull();
    expect(readChatMirror("student-a", "PHY102")).toEqual([{ text: "Private notes" }]);
  });
  it("stream writes are buffered for 500ms and lifecycle flush saves the newest text", () => {
    vi.useFakeTimers();
    const rows = storage();
    writeChatMirror("student-a", "PHY102", { text: "First" });
    vi.advanceTimersByTime(499);
    expect(rows.size).toBe(0);
    writeChatMirror("student-a", "PHY102", { text: "Newest" });
    flushChatMirrors();
    expect(rows.size).toBe(1);
    expect(readChatMirror("student-a", "PHY102")).toEqual({ text: "Newest" });
  });
  it("stream persistence writes the latest snapshot at 500ms, not earlier", () => {
    vi.useFakeTimers();
    const rows = storage();
    writeChatMirror("student-a", "PHY102", { text: "First" });
    vi.advanceTimersByTime(499);
    expect(rows.size).toBe(0);
    writeChatMirror("student-a", "PHY102", { text: "Latest" });
    vi.advanceTimersByTime(1);
    expect(rows.size).toBe(1);
    expect(readChatMirror("student-a", "PHY102")).toEqual({ text: "Latest" });
  });
  it("sign-out cancels pending writes and removes only that account's mirrors", () => {
    vi.useFakeTimers();
    storage();
    writeChatMirror("student-a", "PHY102", ["private"]);
    writeChatMirror("student-b", "PHY102", ["other"], true);
    clearChatMirrors("student-a");
    vi.advanceTimersByTime(500);
    expect(readChatMirror("student-a", "PHY102")).toBeNull();
    expect(readChatMirror("student-b", "PHY102")).toEqual(["other"]);
  });
  it("refresh retains rendered IDs, removes stale replies, and keeps unsent prompts", () => {
    const local = [
      { id: 7, from: "assistant", text: "Saved", createdAt: "2026-11-20" },
      { id: 8, from: "assistant", text: "Deleted remotely" },
      { id: 9, from: "student", text: "Retry me", sendError: true },
    ];
    const remote = [{ id: 20, from: "assistant", text: "Saved", createdAt: "2026-11-20" }];
    expect(reconcileThread(local, remote)).toEqual([local[0], local[2]]);
  });
});