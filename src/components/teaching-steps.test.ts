import { test, expect } from "vitest";
import { splitSteps } from "./teaching-explanation";
test("splits explicit step headers", () => {
  expect(splitSteps("Step 1: x=2\nStep 2: y=4\nTherefore: z=6")?.map(s=>s.badge)).toEqual(["Step 1","Step 2","Therefore"]);
  expect(splitSteps("Just one line with 3.5 kg")).toBeNull();
});
test("never breaks an equation at numbers or semicolons", () => {
  expect(splitSteps("v = ds/dt = 3t² − 12t + 9; a = dv/dt = 6t − 12. Set a=0 gives t=2 s.")).toBeNull();
  expect(splitSteps("m = (y₂ − y₁)/(x₂ − x₁) = (-3 − 0)/(3 − 2) = −3/1.")).toBeNull();
});
