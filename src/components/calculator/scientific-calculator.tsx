/**
 * Natural-display scientific calculator for timed mocks (Casio COMP parity).
 * Results are never written into the answer options. State lives in
 * sessionStorage for the current attempt only.
 */
import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { evaluate, formatDecimal, tokenLabel, type AngleUnit, type CalcToken } from "@/lib/calculator-engine";

type Stored = { angle: AngleUnit; ans: number; memory: number; preferDecimal: boolean; history: { expr: string; out: string }[] };
const DEFAULT: Stored = { angle: "DEG", ans: 0, memory: 0, preferDecimal: false, history: [] };
const storeKey = (id: string) => `tf.calc.${id}`;

export function clearCalculatorSession(attemptId: string) {
  try { window.sessionStorage.removeItem(storeKey(attemptId)); } catch { /* blocked storage */ }
}

type Key = { k: string; shift?: string; tone?: "fn" | "num" | "op" | "eq" | "clear" | "mode"; run: (shift: boolean) => void; label?: string };

function Frac({ text }: { text: string }) {
  const [n, d] = text.split("/");
  const neg = n?.startsWith("-");
  return (
    <span className="inline-flex items-center gap-1">
      {neg ? <span>−</span> : null}
      <span className="inline-flex flex-col items-center leading-none">
        <span className="px-1">{neg ? n?.slice(1) : n}</span>
        <span className="my-0.5 h-px w-full bg-current" aria-hidden="true" />
        <span className="px-1">{d}</span>
      </span>
    </span>
  );
}

export function ScientificCalculatorSheet({ attemptId, onClose }: { attemptId: string; onClose: () => void }) {
  const [state, setState] = useState<Stored>(DEFAULT);
  const [tokens, setTokens] = useState<CalcToken[]>([]);
  const [cursor, setCursor] = useState(0);
  const [shift, setShift] = useState(false);
  const [result, setResult] = useState<{ exact: string | null; decimal: string } | null>(null);
  const [error, setError] = useState<{ kind: string; at: number } | null>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(storeKey(attemptId));
      if (raw) setState({ ...DEFAULT, ...(JSON.parse(raw) as Partial<Stored>) });
    } catch { /* ignore */ }
  }, [attemptId]);
  useEffect(() => {
    try { window.sessionStorage.setItem(storeKey(attemptId), JSON.stringify(state)); } catch { /* ignore */ }
  }, [attemptId, state]);

  const insert = (...t: CalcToken[]) => {
    if (error) return;
    if (result) {
      // After "=", an operator continues from Ans; anything else starts fresh.
      const continues = ["+", "-", "×", "÷", "²", "³", "^(", "%", "⁄"].includes(t[0] ?? "");
      const base: CalcToken[] = continues ? ["Ans"] : [];
      setTokens([...base, ...t]);
      setCursor(base.length + t.length);
      setResult(null);
      return;
    }
    setTokens((cur) => [...cur.slice(0, cursor), ...t, ...cur.slice(cursor)]);
    setCursor((c) => c + t.length);
  };

  const equals = () => {
    if (error || tokens.length === 0) return;
    const r = evaluate(tokens, { angle: state.angle, ans: state.ans, memory: state.memory });
    if (!r.ok) { setError({ kind: r.error, at: r.errorCursor }); return; }
    const out = r.exact && !state.preferDecimal ? r.exact : r.decimal;
    setResult({ exact: r.exact, decimal: r.decimal });
    setState((s) => ({ ...s, ans: r.value, history: [{ expr: tokens.map(tokenLabel).join(""), out }, ...s.history].slice(0, 10) }));
  };

  const moveCursor = (dir: -1 | 1) => {
    if (error) { setCursor(error.at); setError(null); return; }
    if (result) { setResult(null); setCursor(dir < 0 ? tokens.length : 0); return; }
    setCursor((c) => Math.max(0, Math.min(tokens.length, c + dir)));
  };

  const del = () => {
    if (error) { setError(null); return; }
    if (result) { setResult(null); return; }
    if (cursor === 0) return;
    setTokens((cur) => [...cur.slice(0, cursor - 1), ...cur.slice(cursor)]);
    setCursor((c) => c - 1);
  };
  const clearAll = () => { setTokens([]); setCursor(0); setResult(null); setError(null); };

  const s = (fn: (shift: boolean) => void) => (sh: boolean) => { fn(sh); setShift(false); };
  const upper: Key[] = [
    { k: "2nd", tone: "mode", run: () => setShift((v) => !v) },
    { k: "◀", tone: "mode", run: s(() => moveCursor(-1)), label: "Move cursor left" },
    { k: "▶", tone: "mode", run: s(() => moveCursor(1)), label: "Move cursor right" },
    { k: "M+", shift: "M−", tone: "fn", run: s((sh) => {
      const r = result ? { ok: true as const, value: state.ans } : evaluate(tokens, { angle: state.angle, ans: state.ans, memory: state.memory });
      if (r.ok) setState((st) => ({ ...st, memory: st.memory + (sh ? -r.value : r.value) }));
    }) },
    { k: "MR", shift: "MC", tone: "fn", run: s((sh) => (sh ? setState((st) => ({ ...st, memory: 0 })) : insert("M"))) },
    { k: "S⇔D", tone: "fn", run: s(() => setState((st) => ({ ...st, preferDecimal: !st.preferDecimal }))), label: "Switch fraction and decimal" },
    { k: "a/b", tone: "fn", run: s(() => insert("⁄")), label: "Fraction" },
    { k: "√□", shift: "∛□", tone: "fn", run: s((sh) => insert(sh ? "∛(" : "√(")) },
    { k: "x²", shift: "x³", tone: "fn", run: s((sh) => insert(sh ? "³" : "²")) },
    { k: "x^□", tone: "fn", run: s(() => insert("^(")) },
    { k: "log", shift: "Abs", tone: "fn", run: s((sh) => insert(sh ? "Abs(" : "log(")) },
    { k: "ln", tone: "fn", run: s(() => insert("ln(")) },
    { k: "sin", shift: "sin⁻¹", tone: "fn", run: s((sh) => insert(sh ? "sin⁻¹(" : "sin(")) },
    { k: "cos", shift: "cos⁻¹", tone: "fn", run: s((sh) => insert(sh ? "cos⁻¹(" : "cos(")) },
    { k: "tan", shift: "tan⁻¹", tone: "fn", run: s((sh) => insert(sh ? "tan⁻¹(" : "tan(")) },
    { k: "(", tone: "fn", run: s(() => insert("(")) },
    { k: ")", tone: "fn", run: s(() => insert(")")) },
    { k: "(−)", shift: "%", tone: "fn", run: s((sh) => insert(sh ? "%" : "neg")), label: "Negative" },
  ];
  const digit = (d: string): Key => ({ k: d, tone: "num", run: s(() => insert(d)) });
  const lower: Key[] = [
    digit("7"), digit("8"), digit("9"),
    { k: "DEL", shift: "DRG", tone: "clear", run: s((sh) => (sh ? setState((st) => ({ ...st, angle: st.angle === "DEG" ? "RAD" : "DEG" })) : del())) },
    { k: "AC", tone: "clear", run: s(clearAll) },
    digit("4"), digit("5"), digit("6"),
    { k: "×", tone: "op", run: s(() => insert("×")) },
    { k: "÷", tone: "op", run: s(() => insert("÷")) },
    digit("1"), digit("2"), digit("3"),
    { k: "+", tone: "op", run: s(() => insert("+")) },
    { k: "−", tone: "op", run: s(() => insert("-")), label: "Minus" },
    digit("0"),
    { k: ".", shift: "e", tone: "num", run: s((sh) => insert(sh ? "e" : ".")) },
    { k: "×10ˣ", shift: "π", tone: "num", run: s((sh) => insert(sh ? "π" : "×10^")) },
    { k: "Ans", tone: "num", run: s(() => insert("Ans")) },
    { k: "=", tone: "eq", run: s(equals) },
  ];

  const shown = useMemo(() => {
    if (!result) return null;
    if (result.exact && !state.preferDecimal) return <Frac text={result.exact} />;
    return <span>{result.decimal}</span>;
  }, [result, state.preferDecimal]);

  const renderKey = (key: Key) => {
    const label = shift && key.shift ? key.shift : key.k;
    return (
      <button
        key={key.k}
        type="button"
        aria-label={key.label ?? label}
        aria-pressed={key.k === "2nd" ? shift : undefined}
        onClick={() => key.run(shift)}
        className={cn(
          "relative flex h-11 min-w-0 flex-col items-center justify-center rounded-xl border text-sm font-semibold transition-[transform,opacity] duration-100 ease-out active:translate-y-[0.5px] active:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          key.tone === "eq" && "border-accent bg-accent text-accent-foreground",
          key.tone === "op" && "border-accent/40 bg-accent/10 text-accent-ink",
          key.tone === "clear" && "border-destructive/30 bg-destructive/10 text-destructive",
          key.tone === "mode" && (key.k === "2nd" && shift ? "border-accent bg-accent/20 text-accent-ink" : "border-border bg-muted text-foreground"),
          key.tone === "fn" && "border-border bg-secondary text-foreground",
          key.tone === "num" && "border-border bg-card text-foreground",
          shift && key.shift && "text-accent-ink",
        )}
      >
        {key.shift && !shift ? <span className="pointer-events-none absolute right-1 top-0.5 text-[9px] font-medium text-accent-ink">{key.shift}</span> : null}
        <span className="truncate px-1 text-[13px]">{label}</span>
      </button>
    );
  };

  return (
    <Sheet open modal={false} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="bottom"
        aria-modal="false"
        onInteractOutside={(e) => e.preventDefault()}
        className="tf-calc-sheet max-h-[88dvh] overflow-y-auto bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="mb-2 text-left">
          <SheetTitle className="font-display text-base">Scientific calculator</SheetTitle>
          <SheetDescription className="text-xs">Results are never entered into your answers.</SheetDescription>
        </SheetHeader>

        <div role="status" aria-live="polite" className="mb-3 rounded-2xl border border-border bg-muted px-3 py-2.5 shadow-inner">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className={cn("rounded px-1.5 py-0.5", state.angle === "DEG" ? "bg-accent/15 text-accent-ink" : "bg-secondary text-foreground")}>{state.angle}</span>
            {shift ? <span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent-ink">2nd</span> : null}
            {state.memory !== 0 ? <span>M</span> : null}
            {state.preferDecimal ? <span>Dec</span> : <span>Math</span>}
          </div>
          <div className="mt-1 min-h-7 overflow-x-auto whitespace-nowrap font-mono text-[15px] text-foreground sm:text-base">
            {tokens.map((t, n) => (
              <span key={n} className={cn(error && error.at === n && "rounded bg-destructive/15 text-destructive")}>
                {n === cursor && !result && !error ? <span className="mx-px inline-block h-4 w-px animate-pulse bg-accent align-middle" aria-hidden="true" /> : null}
                {tokenLabel(t)}
              </span>
            ))}
            {cursor === tokens.length && !result && !error ? <span className="mx-px inline-block h-4 w-px animate-pulse bg-accent align-middle" aria-hidden="true" /> : null}
          </div>
          <div className="mt-1 flex min-h-10 items-center justify-end font-display text-2xl font-semibold tabular-nums text-foreground">
            {error ? (
              <span className="text-base text-destructive">{error.kind} <span className="text-xs font-normal text-muted-foreground">· press ◀ or ▶ to fix</span></span>
            ) : shown ?? <span className="text-muted-foreground">{formatDecimal(0)}</span>}
          </div>
        </div>

        <div className="grid grid-cols-6 gap-1.5">{upper.map(renderKey)}</div>
        <div className="mt-2 grid grid-cols-5 gap-1.5">{lower.map(renderKey)}</div>

        {state.history.length > 0 ? (
          <details className="mt-3 rounded-xl border border-border bg-background px-3 py-2 text-xs">
            <summary className="cursor-pointer font-semibold text-muted-foreground">History</summary>
            <ul className="mt-2 space-y-1 font-mono">
              {state.history.map((h, n) => (
                <li key={n} className="flex justify-between gap-2 text-foreground"><span className="truncate">{h.expr}</span><span>= {h.out}</span></li>
              ))}
            </ul>
          </details>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
