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
  assert.match(flow, /const resumed = \{ \.\.\.t, isPaused: false, resumedAt: Date\.now\(\) \}/);
  assert.match(flow, /const paused = \{ \.\.\.current, elapsedSec, resumedAt: undefined, isPaused: true \}/);
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
  assert.match(library, /aria-label="Loading your files"/);
  assert.match(library, /h-20 rounded-xl border border-border bg-card/);
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

test("screen navigation resets nested scroll, chat resets on exit, and mobile controls stay clear", async () => {
  const router = await read("../src/routes/index.tsx");
  const chat = await read("../src/components/chatbot.tsx");
  const styles = await read("../src/styles.css");
  const calculator = await read("../src/components/cgpa-calculator.tsx");
  const goalSetter = await read("../src/components/cgpa-goal-setter.tsx");
  const pdfViewer = await read("../src/components/pdf-viewer.tsx");
  const dashboard = await read("../src/components/dashboard.tsx");

  assert.match(router, /document\.documentElement\.scrollTop = 0/);
  assert.match(router, /data-chat-thread/);
  assert.match(chat, /thread\.scrollTop = 0/);
  assert.match(chat, /thread\.scrollTo\(\{ top: thread\.scrollHeight, behavior: "auto" \}\)/);
  assert.match(chat, /line-clamp-2 whitespace-normal break-words text-left leading-4/);
  assert.doesNotMatch(chat, /mix-blend-difference/);
  assert.match(styles, /height: calc\(100dvh - 9rem - env\(safe-area-inset-bottom\)\)/);
  assert.match(styles, /--accent: #E0B458/);
  assert.match(styles, /--muted-foreground: #C5CCD6/);
  assert.match(dashboard, /pb-\[calc\(5\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
  const upgrade = await read("../src/components/upgrade.tsx");
  assert.doesNotMatch(upgrade, /mix-blend-difference/);
  assert.match(upgrade, /standard price after the offer ends/);
  assert.match(upgrade, /places remain/);
  assert.doesNotMatch(styles, /--tf-navy-950|FINAL GLOBAL REFERENCE BACKGROUND|TrueFluency reference treatment/);
  assert.doesNotMatch(calculator, /sticky top-0 z-20/);
  assert.match(goalSetter, /bottom-\[calc\(3\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(pdfViewer, /data-pdf-scroll/);
  assert.match(pdfViewer, /className="min-w-0 flex-1 overflow-y-auto p-1"/);
  assert.doesNotMatch(dashboard, /FirstRunTourHost/);
  await assert.rejects(() => read("../public/reference-home.html"));
  await assert.rejects(() => read("../public/reference-home-light.html"));
});

test("splash and loading animations remain enabled and splash plays on every app entry", async () => {
  const styles = await read("../src/styles.css");
  const splash = await read("../src/components/onboarding/splash.tsx");
  const loader = await read("../src/components/loading-splash.tsx");
  assert.doesNotMatch(styles, /Final calm-motion guard/);
  assert.match(styles, /\.sonic-mark-in\s*\{\s*animation:\s*sonic-mark-in/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(splash, /truefluency-splash-seen|sessionStorage|SPLASH_HOLD_MS/);
  assert.match(splash, /Plays on every app entry/);
  assert.match(splash, /onDone=\{\(\) => advance\(\)\}/);
  assert.match(loader, /sonic-mark-in/);
  assert.match(loader, /onDone\?\.\(\)/);
});

test("chat thinking animation remains visible independently of the empty-thread branch", async () => {
  const chat = await read("../src/components/chatbot.tsx");
  const indicator = chat.indexOf("          {isSending && streamingBubbleId === null ? (");
  const thinking = chat.indexOf("thinking-shimmer font-medium text-foreground");
  const anchor = chat.indexOf('<div ref={scrollAnchorRef} />');
  assert.notEqual(indicator, -1);
  assert.notEqual(thinking, -1);
  assert.ok(chat.slice(indicator - 30, indicator).includes(") : null}"), "indicator must be outside the empty-thread conditional");
  assert.ok(thinking > indicator, "thinking animation must be rendered in the independent send-status block");
  assert.ok(anchor > thinking, "thinking indicator must remain inside the scrollable thread");
  assert.match(chat, /aria-busy=\{isLoadingThread \|\| isSending\}/);
});

test("failed chat streams discard incomplete assistant text but preserve retryable student messages", async () => {
  const chat = await read("../src/components/chatbot.tsx");
  const catchStart = chat.indexOf("    } catch (error) {", chat.indexOf("const send = async"));
  const catchEnd = chat.indexOf("    } finally {", catchStart);
  assert.notEqual(catchStart, -1);
  assert.notEqual(catchEnd, -1);
  const failureHandler = chat.slice(catchStart, catchEnd);
  assert.ok(failureHandler.includes("streamId === null"));
  assert.ok(failureHandler.includes("cur.filter((message) => message.id !== streamId)"));
  assert.match(failureHandler, /sendError: true/);
  assert.match(failureHandler, /retryCourse: course/);
  assert.match(failureHandler, /retryMode: sendMode/);
  assert.match(failureHandler, /persistCache\(course, next\)/);
});


test("admin permission failures are not misreported as zero paywall hits", async () => {
  const admin = await read("../src/routes/admin.tsx");
  assert.match(admin, /gateCountsError/);
  assert.match(admin, /Some paywall-hit counts could not be verified/);
  assert.match(admin, /gate in gateCounts \? gateCounts\[gate\] : "—"/);
  assert.doesNotMatch(admin, /countResult\.error \? 0 : countResult\.count/);
});


test("chat account changes invalidate pending thread loads and stream callbacks", async () => {
  const chat = await read("../src/components/chatbot.tsx");
  assert.match(chat, /const authEpoch = useRef\(0\)/);
  assert.match(chat, /authEpoch\.current \+= 1/);
  assert.match(chat, /loadToken\.current \+= 1/);
  assert.match(chat, /authEpoch\.current !== sendAuthEpoch/);
  assert.match(chat, /authEpoch\.current === sendAuthEpoch/);
});


test("chat cache persistence cannot cross account switches", async () => {
  const chat = await read("../src/components/chatbot.tsx");
  assert.match(chat, /const expectedUid = currentUid\.current/);
  assert.match(chat, /currentUid\.current !== expectedUid/);
  assert.match(chat, /key !== `tf-chat-v1:\$\{expectedUid\}:\$\{scope\}`/);
});

test("peer-save quota course is required and must match the verified source", async () => {
  const functions = await read("../src/lib/library.functions.ts");
  const server = await read("../src/lib/library.server.ts");
  assert.match(functions, /if \(!courseCode\) throw new Error\("Choose the course for this file and try again\."\)/);
  assert.match(functions, /courseCode: data\.courseCode/);
  assert.match(server, /source\.course_code\.trim\(\)\.toUpperCase\(\) !== opts\.courseCode\.trim\(\)\.toUpperCase\(\)/);
});
