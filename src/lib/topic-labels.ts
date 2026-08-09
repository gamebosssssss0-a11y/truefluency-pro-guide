/**
 * Subject-aware "Predicted Topics" category labels.
 *
 * Category headings used to be hardcoded to a STEM set ("Theory & Proofs",
 * "Edge Cases"), which reads as nonsense on humanities courses like
 * GST 112 (Nigerian Peoples and Culture). Labels are now derived from the
 * course's faculty/department, with university-wide GES/GST courses always
 * treated as humanities and an explicit per-course override taking priority.
 */
import { facultyData, uiCourseCatalog } from "./uni-data";

export type SubjectType = "stem" | "humanities" | "neutral";

export const STEM_LABELS = ["Core Concepts", "Applications", "Theory & Proofs", "Edge Cases"];
export const HUMANITIES_LABELS = ["Core Concepts", "Applications", "Case Studies", "Debates & Perspectives"];
export const NEUTRAL_LABELS = ["Core Concepts", "Applications", "Key Topics", "Common Questions"];

const STEM_FACULTIES = [
  "Faculty of Science",
  "Faculty of Technology",
  "Faculty of Computing",
  "Faculty of Pharmacy",
  "Faculty of Veterinary Medicine",
  "College of Medicine",
];

const HUMANITIES_FACULTIES = [
  "Faculty of Arts",
  "Faculty of the Social Sciences",
  "Faculty of Education",
  "Faculty of Law",
  "Faculty of Economics and Management Sciences",
  "Faculty of Environmental Design and Management",
  "Faculty of Agriculture and Forestry",
];

/** University-wide general studies courses, regardless of the student's faculty. */
export function isGeneralStudiesCourse(code: string): boolean {
  const bare = code.replace(/^[A-Z]-/, "").toUpperCase();
  return /^(GST|GES)\s*\d/.test(bare);
}

function facultyForDepartment(department: string | null): string | null {
  if (!department) return null;
  for (const [faculty, departments] of Object.entries(facultyData)) {
    if (departments.includes(department)) return faculty;
  }
  return null;
}

/** Explicit per-course override set on a uiCourseCatalog entry, if any. */
function overrideForCode(code: string): SubjectType | null {
  for (const entries of Object.values(uiCourseCatalog)) {
    const hit = entries.find((e) => e.code === code);
    if (hit?.labelOverride) return hit.labelOverride;
  }
  return null;
}

export function subjectTypeFor(opts: {
  code: string;
  department?: string | null;
  faculty?: string | null;
}): SubjectType {
  const override = overrideForCode(opts.code);
  if (override) return override;

  if (isGeneralStudiesCourse(opts.code)) return "humanities";

  const faculty = opts.faculty ?? facultyForDepartment(opts.department ?? null);
  if (faculty && STEM_FACULTIES.includes(faculty)) return "stem";
  if (faculty && HUMANITIES_FACULTIES.includes(faculty)) return "humanities";

  // Engineering departments live under Faculty of Technology, but a
  // manually-typed department may not match the catalogue at all.
  if (opts.department && /engineering/i.test(opts.department)) return "stem";

  return "neutral";
}

export function topicCategoryLabels(opts: {
  code: string;
  department?: string | null;
  faculty?: string | null;
}): string[] {
  switch (subjectTypeFor(opts)) {
    case "stem": return STEM_LABELS;
    case "humanities": return HUMANITIES_LABELS;
    default: return NEUTRAL_LABELS;
  }
}

/**
 * Splits predicted topics into up to four confidence-ranked groups and tags
 * each group with the subject-appropriate category label.
 */
export function groupTopicsByCategory<T extends { topic: string; confidence: number }>(
  topics: T[],
  opts: { code: string; department?: string | null; faculty?: string | null },
): { label: string; topics: T[] }[] {
  const labels = topicCategoryLabels(opts);
  if (!topics.length) return [];
  const ranked = [...topics].sort((a, b) => b.confidence - a.confidence);
  const groups: { label: string; topics: T[] }[] = labels.map((label) => ({ label, topics: [] }));
  ranked.forEach((t, i) => {
    groups[i % Math.min(labels.length, ranked.length)].topics.push(t);
  });
  return groups.filter((g) => g.topics.length > 0);
}
