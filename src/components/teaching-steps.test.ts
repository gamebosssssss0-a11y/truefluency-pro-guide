import { test, expect } from "vitest";
import { splitSteps } from "./teaching-explanation";
test("splits steps", () => {
  expect(splitSteps("Step 1: x=2\nStep 2: y=4\nTherefore: z=6")?.map(s=>s.badge)).toEqual(["Step 1","Step 2","Therefore"]);
  expect(splitSteps("1. add 2. subtract")?.map(s=>s.text)).toEqual(["add","subtract"]);
  expect(splitSteps("Just one line with 3.5 kg")).toBeNull();
});
