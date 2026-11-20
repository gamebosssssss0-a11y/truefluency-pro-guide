import type { AIQuestion, InProgressTest } from "./profile-store";
import { canonicalCourseCode } from "./course-code";

export type TutorSnapshot = {
  ownerId: string;
  sessionId: string;
  courseCode: string;
  questionIndex: number;
  totalQuestions: number;
  question: AIQuestion;
  selectedAnswer: number | null;
};

export function pausePractice(test: NonNullable<InProgressTest>, now: number): NonNullable<InProgressTest> {
  if (test.isPaused) return test;
  return {
    ...test,
    elapsedSec: (test.elapsedSec ?? 0) + Math.max(0, Math.floor((now - (test.resumedAt ?? test.startedAt)) / 1000)),
    resumedAt: undefined,
    isPaused: true,
  };
}

export function tutorSnapshotMatches(snapshot: TutorSnapshot, ownerId: string | null, test: InProgressTest): boolean {
  return Boolean(ownerId && snapshot.ownerId === ownerId && test && test.mode === "tutor" &&
    snapshot.sessionId === (test.analyticsSessionId ?? String(test.startedAt)) &&
    canonicalCourseCode(snapshot.courseCode) === canonicalCourseCode(test.courseCode) &&
    test.questionIds[snapshot.questionIndex - 1] === snapshot.question.id);
}

export function tutorPrompt(snapshot: TutorSnapshot): string {
  const question = snapshot.question;
  const options = question.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n");
  const picked = snapshot.selectedAnswer === null ? "Not answered" : String.fromCharCode(65 + snapshot.selectedAnswer);
  return `I am practising Question ${snapshot.questionIndex} of ${snapshot.totalQuestions} in Tutor Mode for ${canonicalCourseCode(snapshot.courseCode)}.\n${question.question}\n${options}\nMy answer: ${picked}. Correct answer: ${String.fromCharCode(65 + question.correct_index)}.\nPlease explain step by step and why the other options are wrong.`;
}

export function isChatAtBottom(scrollHeight: number, scrollTop: number, clientHeight: number): boolean {
  return scrollHeight - scrollTop - clientHeight < 64;
}