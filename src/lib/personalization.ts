import type { Goal, Timeline, StudyPreference } from "./profile-store";

/* ---------- Goal-based copy ---------- */

export function focusCardCopy(goal: Goal | null, topic: string): { label: string; heading: string } {
  switch (goal) {
    case "top-grades":
      return { label: "Push for excellence", heading: `Push for excellence: sharpen up on ${topic}` };
    case "catch-up":
      return { label: "Catch-up priority", heading: `Let's catch you up on ${topic} first` };
    case "pass":
    default:
      return { label: "Stay on track", heading: `Master this to stay on track: ${topic}` };
  }
}

export function greetingSubline(goal: Goal | null): string | null {
  switch (goal) {
    case "top-grades":
      return "Aiming high, let's keep the edge sharp.";
    case "catch-up":
      return "We'll help you catch up, one topic at a time.";
    case "pass":
      return "Steady work now means fewer surprises on exam day.";
    default:
      return null;
  }
}

/* ---------- Timeline-based defaults + urgency ---------- */

export type TimelineDefaults = {
  questionCount: number;
  minutes: number;
  urgency: null | { badge: string; tone: "urgent" | "steady" };
  toneLine: string | null;
};

export function timelineDefaults(timeline: Timeline | null): TimelineDefaults {
  switch (timeline) {
    case "lt-week":
      return {
        questionCount: 10,
        minutes: 15,
        urgency: { badge: "Exam soon, let's focus", tone: "urgent" },
        toneLine: "Short, frequent sessions beat long ones this close to exams.",
      };
    case "gt-month":
      return {
        questionCount: 20,
        minutes: 30,
        urgency: { badge: "Steady progress", tone: "steady" },
        toneLine: "Plenty of time, build the habit and let mastery compound.",
      };
    case "2-4-weeks":
    case "unsure":
    default:
      return { questionCount: 20, minutes: 30, urgency: null, toneLine: null };
  }
}

/* ---------- Study preference-based ordering ---------- */

export type CourseFeatureKey = "mock" | "materials" | "flashcards";

/**
 * Returns ordered feature keys for a course card based on the user's stored
 * study preference. First entry = most prominent.
 * Flashcards are still placeholder; when the user prefers them we surface
 * mock as the actionable primary and expose a "flashcards coming soon" note.
 */
export function courseFeatureOrder(pref: StudyPreference | null): {
  order: CourseFeatureKey[];
  flashcardsPlaceholderNote: boolean;
} {
  switch (pref) {
    case "reading":
      return { order: ["materials", "mock"], flashcardsPlaceholderNote: false };
    case "flashcards":
      return { order: ["mock", "materials"], flashcardsPlaceholderNote: true };
    case "practice":
    default:
      return { order: ["mock", "materials"], flashcardsPlaceholderNote: false };
  }
}
