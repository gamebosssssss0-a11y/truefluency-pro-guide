import { expect, it } from "vitest";
import { GRADE_SCALE } from "./cgpa";

it("preserves the University of Ibadan A-to-F five-point grading scale", () => {
  expect(GRADE_SCALE.map(({ grade, points }) => [grade, points])).toEqual([
    ["A", 5],
    ["B", 4],
    ["C", 3],
    ["D", 2],
    ["E", 1],
    ["F", 0],
  ]);
});