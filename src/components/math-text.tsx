/**
 * Renders delimited LaTeX through the app's existing KaTeX wrapper. Invalid
 * formulas fall back to ordinary text, never KaTeX's red error treatment.
 */
import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

type Segment = { kind: "text" | "inline" | "block"; value: string; source?: string };

const PATTERN = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

function unescapeDelimiters(input: string) {
  return input
    .replace(/\\\\\(/g, "\\(")
    .replace(/\\\\\)/g, "\\)")
    .replace(/\\\\\[/g, "\\[")
    .replace(/\\\\\]/g, "\\]");
}

function split(input: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of input.matchAll(PATTERN)) {
    const at = match.index ?? 0;
    if (at > last) out.push({ kind: "text", value: input.slice(last, at) });
    if (match[1] !== undefined) out.push({ kind: "block", value: match[1], source: match[0] });
    else if (match[2] !== undefined) out.push({ kind: "inline", value: match[2], source: match[0] });
    else if (match[3] !== undefined) out.push({ kind: "block", value: match[3], source: match[0] });
    else if (match[4] !== undefined) out.push({ kind: "inline", value: match[4], source: match[0] });
    last = at + match[0].length;
  }
  if (last < input.length) out.push({ kind: "text", value: input.slice(last) });
  if (out.length === 0) out.push({ kind: "text", value: input });
  return out;
}

// KaTeX is fed model text grounded in student documents. Keep its HTML/URL
// trust disabled and cap expansion/size, while throwing parse errors so they
// can be rendered as normal body text instead of red .katex-error markup.
const KATEX_OPTIONS = {
  throwOnError: true,
  strict: false,
  output: "html" as const,
  trust: false,
  maxExpand: 1000,
  maxSize: 25,
};

const MAX_TEX_LENGTH = 2000;

function render(tex: string, display: boolean): string | null {
  if (tex.length > MAX_TEX_LENGTH) return null;
  try {
    return katex.renderToString(tex, { ...KATEX_OPTIONS, displayMode: display });
  } catch {
    return null;
  }
}

function mathClass(display: boolean) {
  return display
    ? "my-3 block max-w-full overflow-x-auto text-center text-[1.15em]"
    : "inline";
}

export function MathText({ children }: { children: string | null | undefined }) {
  const text = children ?? "";
  const normalized = useMemo(() => unescapeDelimiters(text), [text]);
  const segments = useMemo(() => split(normalized), [normalized]);
  const trimmedSegments = useMemo(() => split(normalized.trim()), [normalized]);
  const onlyFormula = trimmedSegments.length === 1 && trimmedSegments[0]?.kind !== "text" ? trimmedSegments[0] : null;

  if (onlyFormula) {
    const html = render(onlyFormula.value, true);
    if (!html) return <>{normalized}</>;
    return (
      <span
        className={mathClass(true)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (!segments.some((segment) => segment.kind !== "text")) return <>{text}</>;

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === "text") return <span key={index}>{segment.value}</span>;
        const html = render(segment.value, segment.kind === "block");
        if (!html) return <span key={index}>{segment.source ?? segment.value}</span>;
        return (
          <span
            key={index}
            className={mathClass(segment.kind === "block")}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </>
  );
}
