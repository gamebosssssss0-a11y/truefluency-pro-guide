/**
 * Shared course-code normalization for in-app search and matching only.
 *
 * Students type course codes inconsistently ("CHM 102", "CHM102", "chm102").
 * Normalize both sides before comparing: uppercase and strip all whitespace.
 * This never changes how a code is displayed back to the student.
 */
export function normalizeCourseCode(code: string): string {
  return (code ?? "").toUpperCase().replace(/\s+/g, "");
}

/** True when two course codes refer to the same course, ignoring spacing/case. */
export function sameCourseCode(a: string, b: string): boolean {
  return normalizeCourseCode(a) === normalizeCourseCode(b);
}

/** True when a typed query matches part of a course code, ignoring spacing/case. */
export function courseCodeMatches(code: string, query: string): boolean {
  const q = normalizeCourseCode(query);
  if (!q) return false;
  return normalizeCourseCode(code).includes(q);
}
