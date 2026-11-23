/**
 * Casio-style COMP evaluator for the mock-test calculator.
 * Input is a token list (what the keypad inserts). Rational arithmetic stays
 * exact through fraction.js; anything irrational falls back to a float that is
 * rounded to 10 significant digits with decimal.js for display.
 *
 * Precedence (high → low): brackets/functions, powers & roots, postfix %,
 * unary minus, implicit multiplication, × ÷, + −. So −2² = −4 and (−2)² = 4.
 */
import Fraction from "fraction.js";
import Decimal from "decimal.js";

export type AngleUnit = "DEG" | "RAD";
export type CalcToken = string;

export const FUNCS = ["sin(", "cos(", "tan(", "sin⁻¹(", "cos⁻¹(", "tan⁻¹(", "log(", "ln(", "Abs(", "√(", "∛("] as const;
const CONSTS = ["π", "e", "Ans", "M"];

type Val = { f: Fraction | null; n: number };

export type CalcResult =
  | { ok: true; value: number; exact: string | null; decimal: string }
  | { ok: false; error: "Math ERROR" | "Syntax ERROR"; errorCursor: number };

class CalcError extends Error {
  constructor(public kind: "Math ERROR" | "Syntax ERROR", public at: number) { super(kind); }
}

const isDigit = (t: string | undefined) => t !== undefined && /^[0-9.]$/.test(t);
const startsPrimary = (t: string | undefined) =>
  t !== undefined && (isDigit(t) || CONSTS.includes(t) || t === "(" || (FUNCS as readonly string[]).includes(t));

const num = (n: number): Val => ({ f: null, n });
const frac = (f: Fraction): Val => ({ f, n: Number(f.valueOf()) });

function toFrac(v: Val): Fraction | null { return v.f; }

export function formatDecimal(n: number): string {
  if (!Number.isFinite(n)) return "Math ERROR";
  if (n === 0) return "0";
  const d = new Decimal(n).toSignificantDigits(10);
  const abs = d.abs();
  if (abs.gte(1e10) || abs.lt(1e-2)) {
    const [m, e] = d.toExponential().split("e");
    return `${m}×10^${Number(e)}`;
  }
  return d.toString();
}

export function evaluate(
  tokens: CalcToken[],
  opts: { angle: AngleUnit; ans: number; memory: number },
): CalcResult {
  let i = 0;
  const peek = () => tokens[i];
  const toRad = (x: number) => (opts.angle === "DEG" ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (opts.angle === "DEG" ? (x * 180) / Math.PI : x);
  const snap = (raw: number) => { const x = Number(raw.toPrecision(13)); return (Math.abs(x - Math.round(x)) < 1e-12 ? Math.round(x) : Math.abs(x) < 1e-12 ? 0 : x); };
  const asVal = (x: number): Val => {
    if (!Number.isFinite(x)) throw new CalcError("Math ERROR", i);
    const s = snap(x);
    return Number.isInteger(s) || s === 0.5 || s === -0.5 ? frac(new Fraction(s)) : num(s);
  };

  const add = (a: Val, b: Val, sign: 1 | -1): Val => {
    const fa = toFrac(a), fb = toFrac(b);
    return fa && fb ? frac(sign === 1 ? fa.add(fb) : fa.sub(fb)) : num(a.n + sign * b.n);
  };
  const mul = (a: Val, b: Val): Val => {
    const fa = toFrac(a), fb = toFrac(b);
    return fa && fb ? frac(fa.mul(fb)) : num(a.n * b.n);
  };
  const div = (a: Val, b: Val, at: number): Val => {
    if (b.n === 0) throw new CalcError("Math ERROR", at);
    const fa = toFrac(a), fb = toFrac(b);
    return fa && fb ? frac(fa.div(fb)) : num(a.n / b.n);
  };
  const pow = (a: Val, b: Val, at: number): Val => {
    const fa = toFrac(a), fb = toFrac(b);
    if (fa && fb && Number(fb.d) === 1 && Math.abs(Number(fb.n)) <= 64) {
      if (a.n === 0 && b.n < 0) throw new CalcError("Math ERROR", at);
      return frac(fa.pow(fb));
    }
    const r = Math.pow(a.n, b.n);
    if (!Number.isFinite(r) || Number.isNaN(r)) throw new CalcError("Math ERROR", at);
    return num(r);
  };

  function expr(): Val {
    let v = term();
    while (peek() === "+" || peek() === "-") {
      const op = tokens[i++];
      v = add(v, term(), op === "+" ? 1 : -1);
    }
    return v;
  }
  function term(): Val {
    let v = implicit();
    while (peek() === "×" || peek() === "÷") {
      const at = i;
      const op = tokens[i++];
      const r = implicit();
      v = op === "×" ? mul(v, r) : div(v, r, at);
    }
    return v;
  }
  function implicit(): Val {
    let v = unary();
    while (startsPrimary(peek())) v = mul(v, unary());
    return v;
  }
  function unary(): Val {
    if (peek() === "neg") { i++; const v = unary(); return mul(frac(new Fraction(-1)), v); }
    return postfix();
  }
  function postfix(): Val {
    let v = fraction();
    while (peek() === "%") { i++; v = div(v, frac(new Fraction(100)), i); }
    return v;
  }
  /** a⁄b binds tighter than × ÷ so it behaves like a stacked fraction. */
  function fraction(): Val {
    let v = power();
    while (peek() === "⁄") { const at = i; i++; v = div(v, power(), at); }
    return v;
  }
  function power(): Val {
    let v = primary();
    for (;;) {
      const t = peek();
      if (t === "²") { i++; v = pow(v, frac(new Fraction(2)), i); }
      else if (t === "³") { i++; v = pow(v, frac(new Fraction(3)), i); }
      else if (t === "^(") { const at = i; i++; const e = expr(); close(); v = pow(v, e, at); }
      else if (t === "×10^") {
        const at = i; i++;
        let neg = false;
        if (peek() === "neg") { neg = true; i++; }
        const e = primary();
        v = mul(v, pow(frac(new Fraction(10)), neg ? mul(frac(new Fraction(-1)), e) : e, at));
      } else break;
    }
    return v;
  }
  function close() {
    if (peek() === ")") { i++; return; }
    if (i >= tokens.length) return; // Casio closes trailing brackets automatically
    throw new CalcError("Syntax ERROR", i);
  }
  function primary(): Val {
    const t = peek();
    const at = i;
    if (t === undefined) throw new CalcError("Syntax ERROR", i);
    if (isDigit(t)) {
      let s = "";
      while (isDigit(peek())) s += tokens[i++];
      if ((s.match(/\./g) ?? []).length > 1 || s === ".") throw new CalcError("Syntax ERROR", at);
      return frac(new Fraction(s.startsWith(".") ? `0${s}` : s));
    }
    if (t === "π") { i++; return num(Math.PI); }
    if (t === "e") { i++; return num(Math.E); }
    if (t === "Ans") { i++; return asVal(opts.ans); }
    if (t === "M") { i++; return asVal(opts.memory); }
    if (t === "(") { i++; const v = expr(); close(); return v; }
    if ((FUNCS as readonly string[]).includes(t)) {
      i++;
      const a = expr();
      close();
      const x = a.n;
      switch (t) {
        case "sin(": return asVal(Math.sin(toRad(x)));
        case "cos(": return asVal(Math.cos(toRad(x)));
        case "tan(": {
          if (Math.abs(Math.cos(toRad(x))) < 1e-12) throw new CalcError("Math ERROR", at);
          return asVal(Math.tan(toRad(x)));
        }
        case "sin⁻¹(": case "cos⁻¹(": {
          if (x < -1 || x > 1) throw new CalcError("Math ERROR", at);
          return asVal(fromRad(t === "sin⁻¹(" ? Math.asin(x) : Math.acos(x)));
        }
        case "tan⁻¹(": return asVal(fromRad(Math.atan(x)));
        case "log(": if (x <= 0) throw new CalcError("Math ERROR", at); return asVal(Math.log10(x));
        case "ln(": if (x <= 0) throw new CalcError("Math ERROR", at); return asVal(Math.log(x));
        case "Abs(": return a.f ? frac(a.f.abs()) : num(Math.abs(x));
        case "√(": {
          if (x < 0) throw new CalcError("Math ERROR", at);
          const r = Math.sqrt(x);
          return Number.isInteger(r) ? frac(new Fraction(r)) : num(r);
        }
        case "∛(": { const r = Math.cbrt(x); return Number.isInteger(snap(r)) ? frac(new Fraction(snap(r))) : num(r); }
      }
    }
    throw new CalcError("Syntax ERROR", at);
  }

  if (tokens.length === 0) return { ok: true, value: 0, exact: null, decimal: "0" };
  try {
    const v = expr();
    if (i < tokens.length) throw new CalcError("Syntax ERROR", i);
    if (!Number.isFinite(v.n)) throw new CalcError("Math ERROR", 0);
    const exact = v.f && Number(v.f.d) !== 1 ? v.f.toFraction() : null;
    return { ok: true, value: v.n, exact, decimal: formatDecimal(v.n) };
  } catch (e) {
    if (e instanceof CalcError) return { ok: false, error: e.kind, errorCursor: Math.min(e.at, tokens.length) };
    return { ok: false, error: "Math ERROR", errorCursor: 0 };
  }
}

/** How each token reads on the display. */
export function tokenLabel(t: CalcToken): string {
  if (t === "neg") return "−";
  if (t === "-") return "−";
  if (t === "^(") return "^(";
  if (t === "×10^") return "×10^";
  return t;
}
