/**
 * University of Ibadan 5.00 grade scale + CGPA maths and the one-time static
 * study plan generator. Pure functions, no AI or backend involved.
 *
 * CGPA is always cumulative Total Quality Points / cumulative Total Credit
 * Units. Averaging per-course GPAs is mathematically wrong whenever unit loads
 * differ, so it is never done here.
 */
import type { CgpaPlan, CgpaPlanCourse } from "./profile-store";

export type GradeBand = { grade: string; points: number; percent: string; min: number };

export const GRADE_SCALE: GradeBand[] = [
  { grade: "A", points: 5, percent: "70 to 100%", min: 70 },
  { grade: "B", points: 4, percent: "60 to 69.99%", min: 60 },
  { grade: "C", points: 3, percent: "50 to 59.99%", min: 50 },
  { grade: "D", points: 2, percent: "45 to 49.99%", min: 45 },
  { grade: "E", points: 1, percent: "40 to 44.99%", min: 40 },
  { grade: "F", points: 0, percent: "Below 40%", min: 0 },
];

export const MAX_POINTS = 5;

/**
 * UI 5.0 bands as reported by UI-specific sources (Second Class Lower from 2.50).
 * Not confirmed against an official UI circular; the generic NUC table uses 2.40. Check before relying on or changing.
 */
export const CLASSIFICATION_BANDS = [
  { label: "Academic probation risk", min: 0, max: 1 },
  { label: "Pass", min: 1, max: 1.5 },
  { label: "Third Class", min: 1.5, max: 2.5 },
  { label: "Second Class Lower", min: 2.5, max: 3.5 },
  { label: "Second Class Upper", min: 3.5, max: 4.5 },
  { label: "First Class", min: 4.5, max: MAX_POINTS },
] as const;

export const PROBATION_THRESHOLD = CLASSIFICATION_BANDS.find((band) => band.label === "Pass")!.min;

export function classify(cgpa: number): string {
  return (
    [...CLASSIFICATION_BANDS].reverse().find((band) => cgpa >= band.min)?.label ??
    CLASSIFICATION_BANDS[0].label
  );
}

export function maxAchievableCgpa(
  currentCgpa: number,
  currentUnits: number,
  semesterUnits: number,
): number {
  const totalUnits = currentUnits + semesterUnits;
  if (totalUnits <= 0) return currentCgpa;
  return (currentCgpa * currentUnits + MAX_POINTS * semesterUnits) / totalUnits;
}

export function leverageIndex(units: number, accuracyPercentOrNull: number | null): number {
  return units * (1 - (accuracyPercentOrNull ?? 0) / 100);
}

export function daysUntil(examDateISO: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(examDateISO)) return 0;
  const [year, month, day] = examDateISO.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  const parsed = new Date(target);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return 0;
  }
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((target - today) / 86_400_000));
}

/** Smallest whole grade point that is at least `needed`. */
export function bandForRequirement(needed: number): GradeBand {
  const sorted = [...GRADE_SCALE].sort((a, b) => a.points - b.points);
  return sorted.find((b) => b.points >= needed - 1e-9) ?? sorted[sorted.length - 1];
}

export type PlanCourseInput = {
  code: string;
  name: string;
  units: number;
  /** Student's current average % in this course, if any mock data exists. */
  currentAveragePercent: number | null;
};

export function buildCgpaPlan(opts: {
  currentCgpa: number;
  currentUnits: number;
  targetCgpa: number;
  daysRemaining: number;
  courses: PlanCourseInput[];
}): CgpaPlan {
  const { currentCgpa, currentUnits, targetCgpa, daysRemaining, courses } = opts;

  const semesterUnits = courses.reduce((s, c) => s + c.units, 0);
  const totalUnits = currentUnits + semesterUnits;

  // Required semester quality points so that (currentTQP + x) / totalTCU = target
  const currentTqp = currentCgpa * currentUnits;
  const requiredTqp = targetCgpa * totalUnits - currentTqp;
  const requiredSemesterGpa = semesterUnits > 0 ? requiredTqp / semesterUnits : 0;

  const alreadyThere = requiredSemesterGpa <= 0;
  const reachable = requiredSemesterGpa <= MAX_POINTS + 1e-9;

  const effectiveNeed = alreadyThere
    ? 1 // just pass everything
    : Math.min(requiredSemesterGpa, MAX_POINTS);

  // Weight study time by unit load and by how far the requirement sits above
  // the student's current measured performance in that course.
  const weights = courses.map((c) => {
    const band = bandForRequirement(effectiveNeed);
    const current = c.currentAveragePercent ?? 50;
    const gap = Math.max(0, band.min - current);
    return c.units * (1 + gap / 40);
  });
  const totalWeight = weights.reduce((s, w) => s + w, 0) || 1;

  // Shorter runways mean a denser daily load, capped to something humane.
  const dailyBudgetMinutes = daysRemaining <= 7 ? 240 : daysRemaining <= 21 ? 180 : 120;
  const dailyQuestionBudget = daysRemaining <= 7 ? 60 : daysRemaining <= 21 ? 40 : 25;

  const planCourses: CgpaPlanCourse[] = courses.map((c, i) => {
    const share = weights[i] / totalWeight;
    const band = bandForRequirement(effectiveNeed);
    const minutes = Math.max(15, Math.round((dailyBudgetMinutes * share) / 5) * 5);
    const questions = Math.min(40, Math.max(5, Math.round((dailyQuestionBudget * share) / 5) * 5));
    return {
      code: c.code,
      name: c.name,
      units: c.units,
      requiredPoints: band.points,
      requiredGrade: band.grade,
      requiredPercent: band.percent,
      highImpact: c.units >= 4,
      dailyReadingMinutes: minutes,
      dailyMockQuestions: questions,
    };
  });

  return {
    createdAt: Date.now(),
    currentCgpa,
    currentUnits,
    targetCgpa,
    daysRemaining,
    semesterUnits,
    requiredSemesterGpa: Math.max(0, requiredSemesterGpa),
    reachable,
    alreadyThere,
    targetClassification: classify(targetCgpa),
    probationNote: currentCgpa > 0 && currentCgpa < PROBATION_THRESHOLD,
    courses: planCourses,
  };
}
