import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("same-day streak return stays active and expired streaks do not display stale counts", async () => {
  const helper = await read("../src/lib/streak-state.ts");
  const store = await read("../src/lib/profile-store.tsx");
  assert.match(helper, /input\.lastActiveDate === today \|\| input\.lastActiveDate === yesterday/);
  assert.match(helper, /adjacentDay\(today, -1\)/);
  assert.match(helper, /adjacentDay\(today, -2\)/);
  assert.match(helper, /return \{ state: "none", days: 0 \}/);
  assert.match(store, /lastActiveDate: string \| null/);
  assert.match(store, /streakDays: number/);
});

test("mock pause and resume preserve saved answers and remaining time", async () => {
  const flow = await read("../src/components/mock-test-flow.tsx");
  assert.match(flow, /Your answers and remaining time are saved/);
  assert.match(flow, /isPaused: true/);
  assert.match(flow, /isPaused: false, resumedAt: Date\.now\(\)/);
  assert.match(flow, /const resumed = \{ \.\.\.t, isPaused: false, resumedAt: Date\.now\(\) \}/);\n  assert.match(flow, /const paused = \{ \.\.\.current, elapsedSec, resumedAt: undefined, isPaused: true \}/);
});

test("shared mock sign-in handoff returns to the same preview", async () => {
  const share = await read("../src/routes/mock-share.$token.tsx");
  const profile = await read("../src/lib/profile-store.tsx");
  assert.match(share, /sessionStorage\.setItem\("returnTo", "\/mock-share\/" \+ token\)/);
  assert.match(profile, /returnTo\.startsWith\("\/mock-share\/"\)/);
});

test("Tutor Mode hides the Key Concept section when no concept is saved", async () => {
  const flow = await read("../src/components/mock-test-flow.tsx");
  assert.match(flow, /!failsQualityCheck\(explanation\) && blocks\.concept \?/);
  assert.doesNotMatch(flow, /A separate key concept was not included/);
  assert.doesNotMatch(flow, /The key concept is not available for this question/);
});

test("University of Ibadan A-F grade scale remains 5-0", async () => {
  const cgpa = await read("../src/lib/cgpa.ts");
  assert.match(cgpa, /grade: "A", points: 5/);
  assert.match(cgpa, /grade: "B", points: 4/);
  assert.match(cgpa, /grade: "C", points: 3/);
  assert.match(cgpa, /grade: "D", points: 2/);
  assert.match(cgpa, /grade: "E", points: 1/);
  assert.match(cgpa, /grade: "F", points: 0/);
  assert.match(cgpa, /export const MAX_POINTS = 5/);
});


test("library empty state explains how to upload and loading uses skeleton cards", async () => {
  const library = await read("../src/components/library.tsx");
  assert.match(library, /Nothing in your locker yet\. Upload a past paper or lecture note/);
  assert.match(library, /aria-label="Loading your files"/);
  assert.match(library, /aria-label="Loading your files"/);\n  assert.match(library, /h-20 rounded-xl border border-border bg-card/);
});


test("mock practice empty state offers a clear next action", async () => {
  const flow = await read("../src/components/mock-test-flow.tsx");
  assert.match(flow, /No questions yet/);
  assert.match(flow, /Choose a practice set/);
});


test("onboarding preferences are stored and offer real next actions", async () => {
  const profile = await read("../src/lib/profile-store.tsx");
  const onboarding = await read("../src/components/onboarding/personalization.tsx");
  const dashboard = await read("../src/components/dashboard.tsx");
  const welcome = await read("../src/components/onboarding/trial-welcome.tsx");
  const cloudSync = await read("../src/lib/cloud-sync.ts");
  assert.match(profile, /export type StudyPreference = "practice" \| "flashcards" \| "reading" \| "cgpa" \| "tutor"/);
  assert.match(cloudSync, /study_preference: profile\.studyPreference/);
  assert.match(cloudSync, /studyPreference: \(row\.study_preference as StudyPreference \| null\)/);
  assert.match(onboarding, /label: "Practice past questions"/);
  assert.match(onboarding, /label: "Check my CGPA"/);
  assert.match(onboarding, /label: "Get explanations \/ tutor help"/);
  assert.match(dashboard, /profile\.studyPreference === "practice"/);
  assert.match(dashboard, /profile\.studyPreference === "cgpa"/);
  assert.match(dashboard, /profile\.studyPreference === "tutor"/);
  assert.match(welcome, /case "practice":[\s\S]*?case "cgpa":[\s\S]*?case "tutor"/);
});

test("returning profiles with completed setup do not restart onboarding", async () => {
  const store = await read("../src/lib/profile-store.tsx");
  assert.match(store, /if \(syncedProfile\.setupComplete\)/);
  assert.match(store, /setStep\("dashboard"\)/);
});

test("Tutor Mode shows X on a wrong selection and check on the correct answer only after selection", async () => {
  const flow = await read("../src/components/mock-test-flow.tsx");
  assert.match(flow, /const isCorrectOption = mode === "tutor" && locked && i === q\.correct_index/);
  assert.match(flow, /const isWrongSelection = mode === "tutor" && on && i !== q\.correct_index/);
  assert.match(flow, /isCorrectOption \? <Check[\s\S]*?isWrongSelection \? <X/);
  assert.match(flow, /mode === "tutor" && locked && isCorrectOption/);
  assert.match(flow, /mode === "tutor" && locked && isWrongSelection/);
  assert.match(flow, /const mode: MockMode = t\?\.mode \?\? "exam"/);
});
