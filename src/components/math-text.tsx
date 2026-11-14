/**
 * Renders delimited LaTeX through the app's existing KaTeX wrapper. Invalid
 * formulas fall back to ordinary text, never KaTeX's red error treatment.
 */
import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

type Segment = { kind: "text" | "inline" | "block"; value: string; source?: string };

const PATTERN = /\\\[([\s\S]+?)\\\]|\\begin\{(?:aligned|gathered|matrix|pmatrix|bmatrix|cases)\}[\s\S]+?\\end\{(?:aligned|gathered|matrix|pmatrix|bmatrix|cases)\}|\\\(([\s\S]+?)\\\)|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

function unescapeDelimiters(input: string) {
  return input
    .replace(/\\\\\(/g, "\\(")
    .replace(/\\\\\)/g, "\\)")
    .replace(/\\\\\[/g, "\\[")
    .replace(/\\\\\]/g, "\\]");
}

function split(input: string, examMath = false): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of input.matchAll(PATTERN)) {
    const at = match.index ?? 0;
    if (at > last) appendTextSegment(input.slice(last, at), out, examMath);
    if (match[0].startsWith("\\begin{")) {
      if (examMath) out.push({ kind: "block", value: match[0], source: match[0] });
      else appendTextSegment(match[0], out, examMath);
    } else if (match[1] !== undefined) out.push({ kind: "block", value: match[1], source: match[0] });
    else if (match[2] !== undefined) out.push({ kind: "inline", value: match[2], source: match[0] });
    else if (match[3] !== undefined) out.push({ kind: "block", value: match[3], source: match[0] });
    else if (match[4] !== undefined) out.push({ kind: "inline", value: match[4], source: match[0] });
    last = at + match[0].length;
  }
  if (last < input.length) appendTextSegment(input.slice(last), out, examMath);
  if (out.length === 0) appendTextSegment(input, out, examMath);
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
const BARE_TEX_COMMAND = /\\(?:frac|dfrac|tfrac|sqrt|sum|prod|int|lim|begin|vec|overline|underline|mathrm|mathbf|text|cdot|times|left|right|sin|cos|tan|log|ln|exp|min|max|gcd|det|ker|dim|alpha|beta|gamma|theta|pi|mu|sigma|omega|Delta|pm|infty|boxed|overrightarrow|overleftarrow|operatorname|mathbb|mathcal|perp|parallel|approx|leq|geq|neq|equiv|partial|nabla|angle)\b/;

function looksLikeBareTex(value: string, examMath: boolean) {
  const tex = value.trim();
  if (!tex || tex.length > MAX_TEX_LENGTH) return false;

  if (!examMath) {
    const commandFormula = /^\\[A-Za-z]+/.test(tex)
      && BARE_TEX_COMMAND.test(tex)
      && /[{}^_=]/.test(tex);
    const compactFormula = /^[A-Za-z0-9(){}^_=+\-*/.,]+$/.test(tex) && /[=^_]/.test(tex);
    return commandFormula || compactFormula;
  }

  const withoutCommandsAndGroups = tex
    .replace(/\\[A-Za-z]+/g, " ")
    .replace(/\\?\{[^{}]*\}/g, " ");
  const commandFormula = BARE_TEX_COMMAND.test(tex)
    && /[{}^_=]/.test(tex)
    && !/[A-Za-z]{4,}/.test(withoutCommandsAndGroups);

  const compact = tex.replace(/\s+/g, "");
  const identifiers = compact.match(/[A-Za-z]+/g) ?? [];
  const compactFormula = /^[A-Za-z0-9(){}^_=+\-*/.,]+$/.test(compact)
    && /[=^_]/.test(compact)
    && identifiers.every((identifier) => identifier.length <= 2);

  return commandFormula || compactFormula;
}

function extractBareCommandFormula(line: string): { prefix: string; formula: string; suffix: string } | null {
  const command = BARE_TEX_COMMAND.exec(line);
  if (!command) return null;

  const commandStart = command.index;
  const leftSide = line.slice(0, commandStart).match(/[A-Za-z][A-Za-z0-9]*(?:[_^]\{[^{}]+\})?\s*=\s*$/);
  const start = leftSide ? commandStart - leftSide[0].length : commandStart;
  let depth = 0;
  let end = line.length;

  for (let index = commandStart; index < line.length; index += 1) {
    const char = line[index];
    if (char === "{") depth += 1;
    else if (char === "}") depth = Math.max(0, depth - 1);
    else if (depth === 0 && /[.,;:!?]/.test(char ?? "")
      && (index === line.length - 1 || /\s/.test(line[index + 1] ?? ""))) {
      end = index;
      break;
    }
  }

  const formula = line.slice(start, end).trim().replace(/[.,;:!?]+$/, "");
  if (!formula || (!looksLikeBareTex(formula, true) && !BARE_TEX_COMMAND.test(formula))) return null;
  const stripUnmatchedDelimiters = (value: string) => value
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/^\s*\$(?=\s*(?:[A-Za-z]|\\))/g, "")
    .replace(/\s*\$(?=\s*$)/g, "");
  return {
    prefix: stripUnmatchedDelimiters(line.slice(0, start)),
    formula,
    suffix: stripUnmatchedDelimiters(line.slice(end)),
  };
}

function appendTextSegment(value: string, out: Segment[], examMath: boolean) {
  if (!examMath) {
    out.push({ kind: "text", value });
    return;
  }
  for (const part of value.split(/(\r?\n)/)) {
    if (!part) continue;
    if (/^\r?\n$/.test(part)) {
      out.push({ kind: "text", value: part });
      continue;
    }

    const candidate = part.match(/^(\s*(?:(?:equation|formula|result)\s*[:\-–—]\s*)?)(.+?)(\s*)$/i);
    if (candidate && looksLikeBareTex(candidate[2] ?? "", true)) {
      if (candidate[1]) out.push({ kind: "text", value: candidate[1] });
      out.push({ kind: "block", value: (candidate[2] ?? "").trim() });
      if (candidate[3]) out.push({ kind: "text", value: candidate[3] });
      continue;
    }

    const extracted = extractBareCommandFormula(part);
    if (extracted) {
      if (extracted.prefix) out.push({ kind: "text", value: extracted.prefix });
      out.push({ kind: "block", value: extracted.formula });
      if (extracted.suffix) out.push({ kind: "text", value: extracted.suffix });
      continue;
    }

    const unwrapped = part.replace(/\\\(|\\\)|\\\[|\\\]/g, "");
    const delimiterless = unwrapped.replace(/\$/g, "");
    if (looksLikeBareTex(delimiterless, true)) {
      out.push({ kind: "block", value: delimiterless.trim() });
      continue;
    }

    const containsTeXCommand = /\\[A-Za-z]+/.test(part);
    out.push({ kind: "text", value: containsTeXCommand ? readableMathFallback(unwrapped) : part });
  }
}

function readableMathFallback(source: string): string {
  let text = source
    .replace(/\\left|\\right/g, "")
    .replace(/\\(?:begin|end)\{[^{}]*\}/g, "");
  for (let pass = 0; pass < 4; pass += 1) {
    text = text
      .replace(/\\(?:dfrac|tfrac|frac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)")
      .replace(/\\sqrt(?:\[([^\]]+)\])?\s*\{([^{}]*)\}/g, (_match: string, degree: string | undefined, value: string) => degree ? "root[" + degree + "](" + value + ")" : "√(" + value + ")")
      .replace(/\\(?:mathrm|mathbf|mathit|operatorname|text)\s*\{([^{}]*)\}/g, "$1");
  }
  const symbols: Record<string, string> = {
    alpha: "α", beta: "β", gamma: "γ", theta: "θ", pi: "π", mu: "μ",
    sigma: "σ", omega: "ω", Delta: "Δ", pm: "±", infty: "∞", sum: "Σ",
    prod: "Π", int: "∫", cdot: "·", times: "×", leq: "≤", geq: "≥",
    neq: "≠", approx: "≈", vec: "", boxed: "", overrightarrow: "", overleftarrow: "", operatorname: "", mathbb: "", mathcal: "", perp: "⊥", parallel: "∥", equiv: "≡", partial: "∂", nabla: "∇", angle: "∠",
  };
  text = text.replace(/\\([A-Za-z]+)\b/g, (_command: string, name: string) => symbols[name] ?? name);
  return text
    .replace(/\\([{}_%&#])/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/\\/g, "")
    .replace(/\$/g, "")
    .trim();
}

function shouldUseDisplayMath(tex: string): boolean {
  return /\\(?:dfrac|tfrac|frac|sqrt|sum|prod|int|begin|vec|overline|underline)\b/.test(tex)
    || tex.includes("=")
    || tex.trim().length > 32;
}

function render(tex: string, display: boolean): string | null {
  if (tex.length > MAX_TEX_LENGTH) return null;
  try {
    return katex.renderToString(tex, { ...KATEX_OPTIONS, displayMode: display });
  } catch {
    return null;
  }
}

function MathOutput({ html, display, examMath }: { html: string; display: boolean; examMath: boolean }) {
  const className = display
    ? `my-3 block max-w-full overflow-x-auto text-center ${examMath ? "text-[20px] exam-math-display" : "text-[1.15em]"}`
    : "inline";
  const Element = display ? "div" : "span";

  return <Element className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function MathText({ children, examMath = false }: { children: string | null | undefined; examMath?: boolean }) {
  const text = children ?? "";
  const normalized = useMemo(() => unescapeDelimiters(text), [text]);
  const segments = useMemo(() => split(normalized, examMath), [normalized, examMath]);
  const trimmedSegments = useMemo(() => split(normalized.trim(), examMath), [normalized, examMath]);
  const onlyFormula = trimmedSegments.length === 1 && trimmedSegments[0]?.kind !== "text" ? trimmedSegments[0] : null;

  if (onlyFormula) {
    const display = onlyFormula.kind === "block" || (examMath && shouldUseDisplayMath(onlyFormula.value));
    const html = render(onlyFormula.value, display);
    if (!html) return <>{examMath ? readableMathFallback(onlyFormula.value) : normalized}</>;
    return <MathOutput html={html} display={display} examMath={examMath} />;
  }

  if (!segments.some((segment) => segment.kind !== "text")) {
    const bareTex = normalized.trim();
    if (looksLikeBareTex(bareTex, examMath)) {
      const html = render(bareTex, true);
      if (html) return <MathOutput html={html} display examMath={examMath} />;
    }
    return <>{text}</>;
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === "text") return <span key={index}>{segment.value}</span>;
        const html = render(segment.value, segment.kind === "block");
        if (!html) return <span key={index}>{examMath ? readableMathFallback(segment.value) : segment.source ?? segment.value}</span>;
        return <MathOutput key={index} html={html} display={segment.kind === "block" || (examMath && shouldUseDisplayMath(segment.value))} examMath={examMath} />;
      })}
    </>
  );
}
