/**
 * Renders text that may contain LaTeX delimited by \( ... \) (inline) or
 * \[ ... \] (block). Everything outside those delimiters is left exactly as
 * it was, so plain-text questions render unchanged. Invalid LaTeX falls back
 * to showing the raw source instead of throwing.
 */
import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

type Segment = { kind: "text" | "inline" | "block"; value: string };

const PATTERN = /\\\((.+?)\\\)|\\\[([\s\S]+?)\\\]/g;

function split(input: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of input.matchAll(PATTERN)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ kind: "text", value: input.slice(last, at) });
    if (match[1] !== undefined) out.push({ kind: "inline", value: match[1] });
    else if (match[2] !== undefined) out.push({ kind: "block", value: match[2] });
    last = at + match[0].length;
  }
  if (last < input.length) out.push({ kind: "text", value: input.slice(last) });
  return out;
}

// Rendered content originates from an LLM response, which is itself grounded
// in a student-uploaded document — so it is attacker-influenceable (a PDF
// containing prompt-injection text could try to make the model emit
// pathological LaTeX). KaTeX's `trust` already defaults to false, which is
// what blocks \href / \includegraphics / \class from injecting arbitrary
// HTML or URLs — set explicitly here so that stays true even if a future
// KaTeX version changes its default. maxExpand and maxSize cap macro-
// expansion and rendered-element size, which is what stops a deeply nested
// expression from hanging the tab (a real, documented KaTeX DoS class).
const KATEX_OPTIONS = {
  throwOnError: false,
  strict: false,
  output: "html" as const,
  trust: false,
  maxExpand: 1000,
  maxSize: 25,
};

// A legitimate equation is never this long. Anything past this is either a
// pathological input or a rendering bug upstream — render it as plain text
// instead of handing KaTeX a huge string to chew on.
const MAX_TEX_LENGTH = 2000;

function wholeFormula(input: string): { tex: string; display: boolean } | null {
  const trimmed = input.trim();
  const block = trimmed.match(/^\\\[([\s\S]+)\\\]$/);
  if (block?.[1]) return { tex: block[1], display: true };
  const inline = trimmed.match(/^\\\(([\s\S]+)\\\)$/);
  if (inline?.[1]) {
    const needsDisplay = /\\(?:frac|dfrac|tfrac|sqrt)\b/.test(inline[1]) || inline[1].includes("√");
    return { tex: inline[1], display: needsDisplay };
  }
  return null;
}

function render(tex: string, display: boolean): string | null {
  if (tex.length > MAX_TEX_LENGTH) return null;
  try {
    return katex.renderToString(tex, { ...KATEX_OPTIONS, displayMode: display });
  } catch {
    return null;
  }
}

export function MathText({ children }: { children: string | null | undefined }) {
  const text = children ?? "";
  const segments = useMemo(() => split(text), [text]);
  const whole = useMemo(() => wholeFormula(text), [text]);

  if (whole) {
    const html = render(whole.tex, whole.display);
    if (!html) return <>{text}</>;
    return (
      <span
        className={whole.display ? "my-3 block overflow-x-auto text-center text-[1.15em]" : "inline"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (!text.includes("\\(") && !text.includes("\\[")) return <>{text}</>;

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "text") return <span key={i}>{seg.value}</span>;
        const html = render(seg.value, seg.kind === "block");
        if (!html) {
          const raw = seg.kind === "block" ? `\\[${seg.value}\\]` : `\\(${seg.value}\\)`;
          return <span key={i}>{raw}</span>;
        }
        return (
          <span
            key={i}
            className={seg.kind === "block" ? "my-3 block overflow-x-auto text-center text-[1.15em]" : "inline"}
            // KaTeX output is generated locally from the question text.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </>
  );
}
