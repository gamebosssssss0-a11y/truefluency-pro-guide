/**
 * Turns one saved explanation string into the three labelled review blocks and
 * refuses to show anything that reads like the model arguing with itself.
 * Pure presentation: nothing here calls a model or rewrites question content.
 */
export const DIFFICULTY_LABELS: Record<string, string> = {
  gentle: "Gentle",
  balanced: "Balanced",
  challenging: "Challenging",
  exam: "Exam-level",
};

export function difficultyLabelOf(key: string | null | undefined): string {
  return DIFFICULTY_LABELS[String(key ?? "balanced")] ?? "Balanced";
}

const HEDGES = [
  "wait—",
  "wait,",
  "this is a mess",
  "i'll go with",
  "let me recalc",
  "re-evaluate",
  "no—re",
];

export const QUALITY_FAIL_NOTICE =
  "Explanation failed a quality check. Your score still stands.";

export function failsQualityCheck(text: string): boolean {
  const t = text.toLowerCase();
  return HEDGES.some((h) => t.includes(h));
}

export type WhyBlocks = {
  correct: string;
  wrong: string | null;
  concept: string | null;
};

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function section(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:\\-–]\\s*([\\s\\S]*?)(?=\\n\\s*[A-Z][A-Z ]{3,}\\s*[:\\-–]|$)`, "i");
    const m = text.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

const CONCEPT_HINT = /(rule|formula|law|principle|remember|because|use )/i;

/** Split a stored explanation into CORRECT / WHY YOUR PICK WAS WRONG / KEY CONCEPT. */
export function toWhyBlocks(explanation: string, wasWrong: boolean): WhyBlocks {
  const text = explanation.trim();

  const labelled = {
    correct: section(text, ["correct", "why this is correct", "answer"]),
    wrong: section(text, ["why your pick was wrong", "why you were wrong", "your pick", "wrong"]),
    concept: section(text, ["key concept", "concept", "rule", "formula"]),
  };
  if (labelled.correct || labelled.wrong || labelled.concept) {
    return {
      correct: clamp(labelled.correct ?? text, 2),
      wrong: wasWrong ? (labelled.wrong ? clamp(labelled.wrong, 2) : null) : null,
      concept: labelled.concept ? clamp(labelled.concept, 2) : null,
    };
  }

  const parts = sentences(text);
  let concept: string | null = null;
  if (parts.length > 2) {
    const idx = parts.findIndex((s, i) => i >= parts.length - 2 && CONCEPT_HINT.test(s));
    if (idx >= 0) concept = parts.splice(idx, 1)[0] ?? null;
  }
  const correct = parts.slice(0, 2).join(" ");
  const rest = parts.slice(2).join(" ");
  return {
    correct: correct || text,
    wrong: wasWrong && rest ? clamp(rest, 2) : null,
    concept,
  };
}

/** Keep each block short: at most `max` sentences, roughly four lines. */
function clamp(text: string, max: number): string {
  const parts = sentences(text);
  return parts.slice(0, max).join(" ");
}

/** Vertical working steps when the source shows a calculation. */
export function calcSteps(text: string): string[] | null {
  const lines = text
    .split(/\n+|(?:\s*(?:→|=>)\s*)/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && /[=]/.test(l));
  return lines.length >= 2 ? lines.slice(0, 4) : null;
}
