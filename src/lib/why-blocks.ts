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


export type TeachingExplanation = {
  whatItTests: string | null;
  plainEnglish: string | null;
  minimumRule: string | null;
  easyExample: string | null;
  commonMistake: string | null;
  workedSolution: string | null;
  finalAnswer: string | null;
  recap: {
    rule: string | null;
    application: string | null;
    therefore: string | null;
    intro: string | null;
  };
};

type TeachingKey = keyof Omit<TeachingExplanation, "recap"> | "whyItWorks" | "recapRule" | "recapApplication" | "recapTherefore" | "recapIntro";

const TEACHING_HEADINGS: Array<{ key: TeachingKey; labels: string[] }> = [
  { key: "whatItTests", labels: ["what it tests", "what this tests"] },
  { key: "plainEnglish", labels: ["plain english words", "plain english", "in plain english"] },
  { key: "minimumRule", labels: ["minimum rule", "minimum rule / why it works", "key concept", "concept", "rule", "formula"] },
  { key: "whyItWorks", labels: ["why it works"] },
  { key: "easyExample", labels: ["easy example", "example"] },
  { key: "commonMistake", labels: ["common mistake", "why your pick was wrong", "why your selected answer was wrong", "why you were wrong", "wrong"] },
  { key: "workedSolution", labels: ["worked solution / steps", "worked solution", "worked steps", "solution", "steps", "correct", "why this is correct", "answer"] },
  { key: "finalAnswer", labels: ["final answer", "final result", "correct answer"] },
  { key: "recapRule", labels: ["the rule to remember", "rule to remember"] },
  { key: "recapApplication", labels: ["apply it here", "application"] },
  { key: "recapTherefore", labels: ["therefore", "conclusion"] },
  { key: "recapIntro", labels: ["short recap strip", "recap"] },
];

const TEACHING_LABELS = new Map(
  TEACHING_HEADINGS.flatMap(({ key, labels }) => labels.map((label) => [label, key] as const)),
);

function normalizeTeachingLabel(label: string): string {
  return label
    .replace(/\*\*/g, "")
    .replace(/[_`]/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/[.!?]+$/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function teachingHeader(line: string): { key: TeachingKey; content: string } | null {
  const cleaned = line.trim().replace(/^#{1,6}\s*/, "").replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, "");
  const delimiter = cleaned.search(/[:：]|\s+[—–]\s+/);
  const label = delimiter < 0 ? cleaned : cleaned.slice(0, delimiter);
  const key = TEACHING_LABELS.get(normalizeTeachingLabel(label));
  if (!key) return null;
  const content = delimiter < 0
    ? ""
    : cleaned.slice(delimiter).replace(/^(?:[:：]|\s+[—–]\s+)/, "").trim();
  return { key, content };
}

function emptyTeachingExplanation(): TeachingExplanation {
  return {
    whatItTests: null,
    plainEnglish: null,
    minimumRule: null,
    easyExample: null,
    commonMistake: null,
    workedSolution: null,
    finalAnswer: null,
    recap: { rule: null, application: null, therefore: null, intro: null },
  };
}

/**
 * Reads explicitly labelled teaching sections from the saved explanation.
 * Legacy explanation text stays intact as the worked-solution fallback; no
 * explanatory copy is generated or inferred.
 */
export function toTeachingExplanation(explanation: string): TeachingExplanation {
  const result = emptyTeachingExplanation();
  const buckets = new Map<TeachingKey, string[]>();
  let current: TeachingKey | null = null;
  const preamble: string[] = [];

  const append = (key: TeachingKey, value: string) => {
    const text = value.trim();
    if (!text) return;
    const bucket = buckets.get(key) ?? [];
    bucket.push(text);
    buckets.set(key, bucket);
  };

  const multiRecap = (line: string): Array<{ key: TeachingKey; content: string }> => {
    const matches = [...line.matchAll(/(?:^|[·|])\s*(The rule to remember|Rule to remember|Apply it here|Therefore)\s*[:：—–-]\s*([\s\S]*?)(?=(?:[·|]\s*)?(?:The rule to remember|Rule to remember|Apply it here|Therefore)\s*[:：—–-]|$)/gi)];
    return matches.map((match) => {
      const key = TEACHING_LABELS.get(normalizeTeachingLabel(match[1] ?? "")) ?? "recapIntro";
      return { key, content: (match[2] ?? "").trim() };
    });
  };

  const lines = explanation.trim().split(/\r?\n/);
  for (const line of lines) {
    const trimmedLine = line.trim();
    const recapText = trimmedLine.replace(/^(?:short recap strip|recap)\s*[:：]\s*/i, "");
    const recapParts = multiRecap(recapText);
    if (recapParts.length > 1) {
      if (current) current = null;
      for (const part of recapParts) append(part.key, part.content);
      continue;
    }
    const header = teachingHeader(line);
    if (header) {
      current = header.key;
      append(header.key, header.content);
    } else if (current) {
      append(current, line);
    } else if (line.trim()) {
      preamble.push(line);
    }
  }

  const join = (key: TeachingKey) => buckets.get(key)?.join("\n").trim() || null;
  result.whatItTests = join("whatItTests");
  result.plainEnglish = join("plainEnglish");
  const minimumRule = [join("minimumRule"), join("whyItWorks")].filter(Boolean).join("\n");
  result.minimumRule = minimumRule || null;
  result.easyExample = join("easyExample");
  result.commonMistake = join("commonMistake");
  result.workedSolution = [preamble.join("\n").trim(), join("workedSolution")]
    .filter(Boolean)
    .join("\n")
    || null;
  result.finalAnswer = join("finalAnswer");
  result.recap = {
    rule: join("recapRule"),
    application: join("recapApplication"),
    therefore: join("recapTherefore"),
    intro: join("recapIntro"),
  };

  if (!buckets.size && preamble.length) result.workedSolution = preamble.join("\n").trim();
  if (!result.workedSolution && !result.whatItTests && !result.plainEnglish
    && !result.minimumRule && !result.easyExample && !result.commonMistake
    && !result.finalAnswer && !result.recap.rule && !result.recap.application
    && !result.recap.therefore && !result.recap.intro && explanation.trim()) {
    result.workedSolution = explanation.trim();
  }

  return result;
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
