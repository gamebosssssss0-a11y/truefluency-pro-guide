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
  assert.match(library, /locker-skeleton-row.*h-20.*rounded-xl.*border.*bg-card/);
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
  assert.match(chat, /whitespace-normal break-words text-left leading-4/);
  assert.match(chat, /line-clamp-2/);
  assert.doesNotMatch(chat, /mix-blend-difference/);
  assert.match(styles, /\.study-chat-screen\s*\{[\s\S]*?height: 100%/);
  assert.match(styles, /--accent: var\(--tf-gold\)/);
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

test("the supplied mark is shared, the splash stays static, and sign-in owns the animation", async () => {
  const styles = await read("../src/styles.css");
  const mark = await read("../src/components/logo-mark.tsx");
  const root = await read("../src/routes/__root.tsx");
  const splash = await read("../src/components/onboarding/splash.tsx");
  const loader = await read("../src/components/loading-splash.tsx");
  const signingIn = await read("../src/components/signing-in.tsx");
  assert.match(styles, /\.sonic-mark-in\s*\{\s*animation:\s*sonic-mark-in/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(mark, /LOGO_MARK_URL = "\/truefluency-mark\.jpg"/);
  assert.match(root, /href: "\/truefluency-mark\.jpg", type: "image\/jpeg"/);
  assert.doesNotMatch(splash, /SonicUnfurlLoader/);
  assert.match(splash, /Plays on every app entry/);
  assert.match(splash, /window\.setTimeout\(advance, 1900\)/);
  assert.match(splash, /Tap to skip/);
  assert.match(signingIn, /SonicUnfurlLoader/);
  assert.match(signingIn, /busy/);
  assert.match(signingIn, /backgroundColor="var\(--tf-black\)"/);
  assert.match(loader, /sonic-mark-in/);
  assert.match(loader, /onDone\?\.\(\)/);
});
test("chat thinking animation remains visible independently of the empty-thread branch", async () => {
  const chat = await read("../src/components/chatbot.tsx");
  const indicator = chat.indexOf("          {isSending && streamingBubbleId === null ? (");
  const thinking = chat.indexOf("chat-thinking-label font-medium");
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


test("mock answer counts do not treat missing legacy answers as answered", async () => {
  const flow = await read("../src/components/mock-test-flow.tsx");
  assert.match(flow, /const answeredCount = t\.answers\.filter\(\(answer\) => answer !== null && answer !== undefined\)\.length/);
  assert.match(flow, /const answered = t\.answers\.filter\(\(a\) => a !== null && a !== undefined\)\.length/);
});


test("failed or unconfirmed storage PUTs attempt owner-scoped rollback", async () => {
  const materials = await read("../src/lib/course-materials.ts");
  const upload = materials.slice(materials.indexOf("async function uploadViaPresignedPut"), materials.indexOf("function compressImage"));
  assert.match(upload, /try \{[\s\S]*confirmMaterialUpload\(\{ data: \{ path \} \}\)/);
  assert.match(upload, /catch \(error\) \{[\s\S]*deleteMaterialFiles\(\{ data: \{ paths: \[path\] \} \}\)/);
  assert.match(upload, /throw error;/);
});


test("mock test unmount cannot restore an attempt after submission", async () => {
  const flow = await read("../src/components/mock-test-flow.tsx");
  assert.match(flow, /if \(!current \|\| current\.isPaused \|\| submittedRef\.current\) return/);
  assert.match(flow, /submittedRef\.current = true/);
  assert.match(flow, /inProgressTest: null/);
});

test("mock generation and run share one back guard", async () => {
  const router = await read("../src/routes/index.tsx");
  assert.match(router, /const inExamView = view === "mock-run" \|\| view === "mock-gen"/);
  assert.match(router, /\}, \[inExamView\]\)/);
});

test("in-progress mocks offer resume instead of discard copy", async () => {
  const flow = await read("../src/components/mock-test-flow.tsx");
  assert.match(flow, /profile\.inProgressTest \? \([\s\S]*?test in progress[\s\S]*?Resume test/);
  assert.doesNotMatch(flow, /Generating a new test will discard your current in-progress attempt/);
});

test("mock run provides an escape when saved questions are missing", async () => {
  const flow = await read("../src/components/mock-test-flow.tsx");
  assert.match(flow, /if \(questions\.length === 0\)[\s\S]*?This test's questions weren't saved[\s\S]*?Discard and choose a new set/);
  assert.match(flow, /const idx = Math\.min\(t\.currentIndex, questions\.length - 1\)/);
});

test("submitting incomplete mocks uses an in-app sheet instead of a browser confirm", async () => {
  const flow = await read("../src/components/mock-test-flow.tsx");
  assert.match(flow, /questions\.length - answered > 0\)[\s\S]*?setConfirmOpen\(true\)/);
  assert.match(flow, /Go to first unanswered[\s\S]*?Submit anyway/);
  assert.doesNotMatch(flow, /window\.confirm\(/);
});

test("mock result opens before cloud save and a failed save can be retried", async () => {
  const flow = await read("../src/components/mock-test-flow.tsx");
  const resultNavigation = flow.indexOf('navigate("mock-result", { courseCode: t.courseCode });');
  const cloudSave = flow.indexOf("await pushMockAttempt(attempt)");
  assert.ok(resultNavigation >= 0 && resultNavigation < cloudSave);
  assert.match(flow, /label: "Retry"[\s\S]*?pushMockAttempt\(attempt\)/);
});

test("mock flow uses its dedicated content widths and counts legacy missing answers correctly", async () => {
  const flow = await read("../src/components/mock-test-flow.tsx");
  const router = await read("../src/routes/index.tsx");
  assert.match(flow, /const SCREEN = "mx-auto w-full max-w-\[52rem\] px-4 sm:px-6"/);
  assert.match(flow, /const PROSE = "max-w-\[42rem\]"/);
  assert.match(flow, /answers\.filter\(\(a\) => a !== null && a !== undefined\)\.length/);
  assert.match(router, /const flowScreen = examFocus \|\| view === "mock-config" \|\| view === "mock-result"/);
});


test("peer share use limits are claimed atomically and failed claims roll back copies", async () => {
  const server = await read("../src/lib/library.server.ts");
  assert.match(server, /\.eq\("use_count", useCount\)/);
  assert.match(server, /\.eq\("is_revoked", false\)/);
  assert.match(server, /\.gt\("expires_at", new Date\(\)\.toISOString\(\)\)/);
  assert.match(server, /\.lt\("use_count", useLimit\)/);
  assert.match(server, /if \(claimError \|\| !claimed\) \{[\s\S]*\.delete\(\)\.eq\("id", inserted\.id\)[\s\S]*deleteObject\(destPath\)/);
});

test("file previews recheck share or shelf access on every request and are not cached", async () => {
  const route = await read("../src/routes/api/public/file-preview.ts");
  const server = await read("../src/lib/library.server.ts");
  const viewer = await read("../src/components/pdf-viewer.tsx");
  assert.match(route, /readSharePreview\(shareToken, range\)/);
  assert.match(route, /readShelfPreview\(materialId!, viewerId, range\)/);
  assert.match(route, /Cache-Control": "private, no-store, max-age=0"/);
  assert.match(server, /\.eq\("published", true\)/);
  assert.match(server, /resolveShare\(token\)/);
  assert.match(server, /previewUrl: `\/api\/public\/file-preview\?shareToken=/);
  assert.match(server, /url: `\/api\/public\/file-preview\?materialId=/);
  assert.match(viewer, /disableCache \? null/);
  assert.match(viewer, /disableCache\) memoryCache =/);
  assert.match(viewer, /!disableCache\) \{/);
});


test("theme follows the browser color scheme and does not force dark on app entry", async () => {
  const theme = await read("../src/lib/theme.tsx");
  const root = await read("../src/routes/__root.tsx");
  assert.match(theme, /matchMedia\("\(prefers-color-scheme: dark\)"\)/);
  assert.match(theme, /media\.addEventListener\?\.\("change", syncTheme\)/);
  assert.doesNotMatch(theme, /setThemeState\("dark"\)|localStorage\.setItem\(KEY/);
  assert.doesNotMatch(root, /<html lang="en" className="dark">/);
  assert.match(root, /window\.matchMedia\('\(prefers-color-scheme: dark\)'\)/);
});

test("chat history does not overwrite the active thread cache and tolerates per-course failures", async () => {
  const chat = await read("../src/components/chatbot.tsx");
  assert.match(chat, /const requests = courseOptions\.map/);
  assert.match(chat, /setHistoryRows\(\(current\) => \[/);
  assert.match(chat, /const group = grouped\.get\(convKey\)/);
  assert.match(chat, /historyRows\.length === 0 && historyLoading/);
  assert.match(chat, /Loading more conversations…/);
  assert.doesNotMatch(chat, /Promise\.allSettled\(courseOptions\.map/);
  const historyEffect = chat.slice(chat.indexOf("const loadCourse"), chat.indexOf("const handleResumeConversation"));
  assert.doesNotMatch(historyEffect, /persistCache/);
  assert.doesNotMatch(chat, /const raw = \(await getCourseHistory\(course\)\)\.messages;\s*if \(!threadCache\.current\.has\(cacheMapKey\(course\)\)\) persistCache/);
});

test("mobile chat composer uses the tab-nav-reserved viewport and message text wraps", async () => {
  const styles = await read("../src/styles.css");
  const chat = await read("../src/components/chatbot.tsx");
  assert.match(styles, /\.study-chat-screen\s*\{[\s\S]*?height: 100%/);
  assert.match(chat, /whitespace-pre-wrap rounded-2xl[^\n]*\[overflow-wrap:anywhere\]/);
  assert.match(chat, /w-full min-w-0 max-w-full break-words \[overflow-wrap:anywhere\]/);
});


test("Study Chat warms and prefetches its selected thread before the tab is opened", async () => {
  const chat = await read("../src/components/chatbot.tsx");
  const router = await read("../src/routes/index.tsx");
  assert.match(router, /const active = activeTab === tab/);
  assert.match(router, /tab === "chatbot" \? <MemoChatbotScreen active=\{active\} \/>/);
  assert.ok(chat.includes("if (!active) {"));
  assert.ok(chat.includes("void warmBackend();"));
  assert.ok(chat.includes("getCourseThread(key).then"));
  assert.ok(chat.includes("[selected, reloadNonce, active]"));
});

test("chat history contrast is explicit and the chat column no longer caps width", async () => {
  const chat = await read("../src/components/chatbot.tsx");
  assert.ok(chat.includes('style={{ color: m.role === "user" ? "var(--text-secondary)" : "var(--muted-foreground)" }}'));
  assert.ok(chat.includes("max-w-[96%] break-words [overflow-wrap:anywhere]"));
  assert.ok(chat.includes("w-full px-3 sm:px-4 md:pt-4"));
  assert.ok(!chat.includes("max-w-[640px] px-4 sm:px-5 md:pt-4"));
});

test("root swipe progress is frame-painted and the mobile tab bar floats", async () => {
  const hook = await read("../src/hooks/use-swipe-tabs.ts");
  const tabBar = await read("../src/components/tab-bar.tsx");
  const styles = await read("../src/styles.css");
  const dashboard = await read("../src/components/dashboard.tsx");
  const practice = await read("../src/components/mock-tests-tab.tsx");
  const chat = await read("../src/components/chatbot.tsx");
  assert.match(hook, /index - dx \/ window\.innerWidth/);
  assert.match(hook, /window\.innerWidth \* 0\.35 \|\| fastEnough/);
  assert.match(hook, /releaseVelocity < -0\.4/);
  const moveHandler = hook.slice(hook.indexOf("const onMove"), hook.indexOf("const onEnd"));
  assert.equal((moveHandler.match(/setPreview\(/g) || []).length, 1, "mount the neighbor once when a horizontal gesture begins");
  assert.match(hook, /setPreview\(\{ tab: previewTab, side: previewSide, highlightedTab: null \}\)/);
  assert.match(tabBar, /mobile-tab-bar fixed inset-x-4/);
  assert.match(tabBar, /h-\[68px\].*rounded-3xl.*backdrop-blur-\[16px\]/);
  assert.match(tabBar, /h-\[3px\] w-7/);
  assert.match(styles, /--tf-page-title-size: 28px/);
  assert.match(styles, /--tf-section-title-size: 22px/);
  assert.match(styles, /--tf-body-size: 16px/);
  assert.match(styles, /--tf-secondary-size: 14px/);
  assert.match(styles, /--tf-caption-size: 12px/);
  assert.match(dashboard, /home-next-card/);
  assert.match(practice, /--carousel-scale.*0\.88/);
  assert.match(practice, /tf-visual-phase2 min-h-screen/);
  const bannedColors = /#(?:0D9488|0F766E|1E293B|334155|F8FAFC|64748B)\b/i;
  for (const source of [styles, dashboard, practice, chat]) assert.doesNotMatch(source, bannedColors);
  for (const source of [styles, dashboard, practice, chat]) assert.doesNotMatch(source, /text-\[(?:9|10|11)px\]/);
});

test("math text uses KaTeX for marked and bare formulas across practice and review", async () => {
  const math = await read("../src/components/math-text.tsx");
  const practice = await read("../src/components/mock-tests-tab.tsx");
  const review = await read("../src/components/mock-test-flow.tsx");
  assert.match(math, /import katex from "katex"/);
  assert.match(math, /looksLikeBareTex/);
  assert.match(math, /compactFormula/);
  assert.match(math, /exam-math-display/);
  assert.match(math, /readableMathFallback/);
  assert.match(review, /toTeachingExplanation/);
  assert.match(review, /What it tests/);
  assert.match(review, /Plain-English words/);
  assert.match(review, /Minimum rule/);
  assert.match(review, /Easy example/);
  assert.match(review, /Common mistake/);
  assert.match(review, /Worked solution \/ steps/);
  assert.match(review, /The rule to remember/);
  assert.match(review, /animate-explanation-unfurl/);
  assert.match(review, /Not answered/);
  assert.match(practice, /<MathText>\{miss\.question\}<\/MathText>/);
  assert.match(review, /<MathText(?: examMath)?>\{q\.question\}<\/MathText>/);
  assert.match(review, /<MathText(?: examMath)?>\{opt\}<\/MathText>/);
});

test("carousel swipes stay in their track and root swipe cancels multipoint gestures", async () => {
  const swipe = await read("../src/hooks/use-swipe-tabs.ts");
  const history = await read("../src/components/mock-tests-tab.tsx");
  assert.match(swipe, /target\.closest\("\[data-swipe-lock\]/);
  assert.match(swipe, /event\.touches\.length !== 1/);
  assert.match(swipe, /translate \$\{SETTLE_MS\}ms/);
  assert.match(history, /data-swipe-lock=""/);
  assert.match(history, /requestAnimationFrame\(\(\) => \{/);
  assert.match(history, /setActiveAttemptIndex\(\(current\) => current === nearest \? current : nearest\)/);
});
