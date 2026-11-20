import { describe, expect, it } from "vitest";
import { canUseTutorMode } from "./entitlements";

describe("Tutor mode is paid-only", () => {
  it("is locked on the Free plan", () => expect(canUseTutorMode("free")).toBe(false));
  it("is locked while the plan is unknown", () => expect(canUseTutorMode(null)).toBe(false));
  it("is open on Core", () => expect(canUseTutorMode("core")).toBe(true));
  it("is open on Exam", () => expect(canUseTutorMode("exam")).toBe(true));
  it("is open during the Core trial", () => expect(canUseTutorMode("trial")).toBe(true));
});
