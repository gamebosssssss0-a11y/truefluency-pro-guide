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

function render(tex: string, display: boolean): string | null {
  try {
    return katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      strict: false,
      output: "html",
    });
  } catch {
    return null;
  }
}

export function MathText({ children }: { children: string | null | undefined }) {
  const text = children ?? "";
  const segments = useMemo(() => split(text), [text]);

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
            className={seg.kind === "block" ? "block my-1 overflow-x-auto" : "inline"}
            // KaTeX output is generated locally from the question text.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </>
  );
}
