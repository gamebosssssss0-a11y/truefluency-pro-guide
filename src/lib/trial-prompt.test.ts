import { describe, expect, it } from "vitest";
import { canShowTrialPrompt } from "@/components/trial-prompt";

const NOW = Date.UTC(2026, 10, 23, 12);
const H = 3_600_000;

describe("trial prompt cap", () => {
  it("allows a second prompt within 24 hours", () => {
    expect(canShowTrialPrompt([NOW - 2 * H], NOW)).toBe(true);
  });
  it("blocks a third prompt within 24 hours", () => {
    expect(canShowTrialPrompt([NOW - 2 * H, NOW - 1 * H], NOW)).toBe(false);
  });
  it("allows again once an earlier prompt is over 24 hours old", () => {
    expect(canShowTrialPrompt([NOW - 25 * H, NOW - 1 * H], NOW)).toBe(true);
  });
});
