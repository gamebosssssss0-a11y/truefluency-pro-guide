import { expect, it } from "vitest";
import { SUPPORT_RESPONSE_HOURS } from "./support-policy";

it("keeps the owner's support response commitment at 24 hours", () => {
  expect(SUPPORT_RESPONSE_HOURS).toBe(24);
});
