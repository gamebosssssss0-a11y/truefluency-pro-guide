import { describe, expect, it } from "vitest";
import { evaluate } from "./calculator-engine";

const run = (t: string[], angle: "DEG" | "RAD" = "DEG") => evaluate(t, { angle, ans: 0, memory: 0 });

describe("calculator engine", () => {
  it("unary minus binds looser than powers", () => {
    expect(run(["neg", "2", "²"])).toMatchObject({ ok: true, value: -4 });
    expect(run(["(", "neg", "2", ")", "²"])).toMatchObject({ ok: true, value: 4 });
  });
  it("adds fractions exactly", () => {
    const r = run(["1", "⁄", "2", "+", "1", "⁄", "3"]);
    expect(r).toMatchObject({ ok: true, exact: "5/6", decimal: "0.8333333333" });
  });
  it("snaps degree trig and rejects tan 90", () => {
    expect(run(["sin(", "3", "0", ")"])).toMatchObject({ ok: true, value: 0.5 });
    expect(run(["cos(", "6", "0", ")"])).toMatchObject({ ok: true, value: 0.5 });
    expect(run(["tan(", "9", "0", ")"])).toMatchObject({ ok: false, error: "Math ERROR" });
  });
  it("keeps 0.1 + 0.2 exact", () => {
    expect(run(["0", ".", "1", "+", "0", ".", "2"])).toMatchObject({ ok: true, decimal: "0.3" });
  });
  it("supports implicit multiplication and percent", () => {
    expect(run(["3", "(", "4", ")"])).toMatchObject({ ok: true, value: 12 });
    expect(run(["5", "0", "%"])).toMatchObject({ ok: true, value: 0.5 });
  });
  it("reports syntax errors with a cursor", () => {
    expect(run(["2", "+", "×", "3"])).toMatchObject({ ok: false, error: "Syntax ERROR", errorCursor: 2 });
    expect(run(["1", "÷", "0"])).toMatchObject({ ok: false, error: "Math ERROR" });
  });
});
