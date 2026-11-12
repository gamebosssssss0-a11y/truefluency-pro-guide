# TrueFluency Required Change Backlog

This backlog adds the recommendations in the user-provided *TrueFluency Pro Bug Analysis and Improvement Plan*, dated November 11, 2026. That report counted 67 open issues across 13 files at commit `e1f12bb`. Its code observations are a snapshot of that commit. Compare every item with the current branch before implementation because PR #55 contains overlapping reliability and UX work.

The report's recommendations are captured here as project work. Its suggested palette and delivery choices do not supersede decisions already made in this project: retain the current page background, preserve the existing brand direction, meet WCAG AA contrast, and support desktop and phone layouts. This backlog does not authorize deployment or changes to external services.

## Phase 0: Smooth navigation and correct data

**Goal:** Remove swipe lag and blank frames, correct invalid averages and errors, and avoid duplicate material requests.

| ID | Required change |
| --- | --- |
| P1 | Prevent every visited tab from rerendering on each tab change. Memoize provider values and functions; split view state from data if profiling still shows cost. |
| P2 | Stop updating swipe preview state on every touch move. Only update when the adjacent tab or highlight state changes, and memoize root tabs. |
| P3 | Keep the prefetched Chat screen in the keyed tab list so the prefetch instance survives the first visit. |
| P4 | Pre-mount adjacent tabs during idle time and reset the swipe stage in the same frame as navigation commits to eliminate blank frames. |
| P5 | Show the actual pre-mounted neighboring screen during a swipe instead of a generic skeleton. |
| P6 | Replace empty My Files placeholders with row-shaped loading skeletons; persist the last folder list locally; honor reduced motion. |
| P7 | Debounce profile persistence and keep large question and answer payloads out of the frequent local-storage write path. |
| P8 | Lazy-load the PDF viewer and embedded Chat to reduce Library's initial bundle. |
| PR3 | Calculate course averages using only attempts with at least five answers. |
| M3 | Pass the actual generation error to the error card, keeping its timeout wording only as a fallback. |
| M8 | Reset the mock submission guard after a failed save and before retry. |
| H6 | Share one cached materials query between Home, the next-action card, and the continue-file card; refresh it from the existing materials event. |

**Done when:** a 6 fps Practice, My Files, and Chat swipe recording has no blank frames; hidden tabs do not rerender on tab changes; incomplete attempts do not affect averages; generation displays its real error; and Home makes one shared materials request.

## Phase 1: Visual foundations and Chat overflow

**Goal:** Make typography, contrast, controls, headers, loading and error states consistent while preserving the current background.

| ID | Required change |
| --- | --- |
| G1 | Consolidate hard-coded gold, navy, and cream values into theme tokens that work in light and dark mode. |
| G2 | Meet WCAG AA for small accent text; use a readable contrast-safe text shade while retaining the brand accent for fills and decoration. |
| G3 | Raise tab labels to at least 12 px, use the available content width, add safe-area padding, and hide tabs on mock run and generation screens. |
| G4 | Tokenize the error-card tint and give its link at least a 44 px target and readable text. |
| G5 | Establish a consistent primary and secondary button rule across screens, aligned with the accepted brand direction. |
| G6 | Consolidate status-color naming and layer CSS overrides so utility classes behave predictably. |
| G7 | Use a type scale with 16 px body text, 14 px secondary text, and a 12 px minimum for labels. |
| G8 | Use one page-header pattern with consistent title hierarchy and remove duplicate eyebrow titles. |
| G9 | Use consistent content-shaped loading skeletons for My Files, uploads, Chat, and Practice. |
| C1 | Fix Chat horizontal overflow with an explicit single-column minmax grid and `min-width: 0`; verify at 360 px. |
| C2 | Show a thread-shaped loading state and last-known conversation promptly; show reassurance only when loading takes longer than about three seconds. |
| C3 | Put the course-material grounding indicator on its own line with a check icon; never truncate it. |
| C4 | Make Chat's New chat and History controls at least 44 px tall with 12 px text, or provide one accessible overflow menu. |
| C5 | Give composer controls 44 px hit areas while allowing smaller visual icons inside them. |
| C6 | Limit swipe locking to horizontally interactive Chat surfaces, or allow root navigation from a defined screen-edge zone. |
| PR1 | Shorten Practice search to “Search courses” and show it only when there are more than five courses. |
| PR4 | Remove clipping gold stripes from cards by using a plain border or an inset accent. |
| PR5 | Use British spelling consistently in study copy. |
| PR6 | Replace chart hex values with theme tokens, use the shared 52 rem content column, and raise captions to at least 12 px. |
| PR8 | Separate neutral topic-prominence labels from score-state chips; use theme-token colors for score states. |
| M10 | Size mock generation, paused, and error screens to the usable viewport above the tab bar. |
| M11 | Add safe-area-aware bottom padding to the mock run action bar. |
| M14 | Raise mock-flow captions below 12 px to the 12 px minimum. |
| A3 | Normalize Account body text and align its links consistently. |
| A6 | Use a quiet destructive trigger and a destructive final confirmation in the designed dialog. |
| L2 | Align My Files to the shared 52 rem content width and page gutter. |
| L4 | Replace hard-coded file-type colors and checkbox accents with theme tokens. |

**Done when:** text and control contrast meet WCAG AA, body and label sizes follow the scale, Chat fits a 360 px phone width with visible 44 px controls, and no score chip combines topic prominence with a percentage.

## Phase 2: Course-first structure

**Goal:** Make the course the home for materials and study actions, with one clear next action on Home.

| ID | Required change |
| --- | --- |
| H1 | Reduce Home to one adaptive next action and at most three supporting sections; move duplicated destinations to their own homes. |
| H2 | Move routine plan messaging to Account; show it on Home only when a plan or trial is nearing expiry. |
| H3 | Resolve the report's open choice about streak and daily-goal prominence in line with the previously agreed “next action first, progress below” Home hierarchy. |
| H4 | Replace alarmist CGPA wording with a clear next step and use full-width Calculator and Goal Setter rows. |
| H5 | Simplify the greeting to the student's name and one supporting line. |
| H7 | Choose Home's next action from live progress in this order: unfinished test, weakest topic or last result, due flashcards, then the first-run study preference. |
| H8 | Route a weakest-topic action to that topic's course and start focused practice. |
| H9 | Make “Your courses” open a course hub, or rename it if it remains an Add course action. |
| H10 | Replace the six-second rotating quote with one static daily tip. |
| PR2 | When a test is active, show one clear Continue action and one active course card instead of disabling every course action. |
| PR7 | Replace equal-weight course buttons in Practice with a one-card-at-a-time carousel: neighboring cards peek, only the centered card is interactive, visible previous/next controls work, the centered course is remembered, and reduced motion removes tilt. |
| A1 | Show the student's plan and renewal date in one plan card with one Manage action; remove duplicate routes to Premium. |
| A4 | Create one course hub for course management, keeping add and remove actions there. |
| A7 | Remove the unavailable browser-extension row; make appearance a real Light, Dark, System choice or remove the read-only control. |
| A8 | Remove duplicate course, CGPA, history, and flashcard destinations from Account; keep profile, plan, support, appearance, and session controls there. |
| L3 | Make folder rows compact and replace “some on shelf” with a clear shared-file count. |

**Done when:** students pick a course once per session, Home presents one progress-aware action and no more than four sections, the Practice carousel settles in about 250 ms without navigating root tabs, and Account contains no duplicate study destinations.

## Phase 3: Mock flow and results

**Goal:** Close remaining mock correctness and accessibility gaps and give results one useful next step.

| ID | Required change |
| --- | --- |
| M1 | Add a confirmed Discard this test action; when no answers exist, offer discard instead of saving a zero-percent attempt. |
| M2 | Move the Resume card to the top of mock setup as its primary action. |
| M4 | Explain locked difficulty options and their unlock requirement when tapped. |
| M5 | Label unanswered questions “Not answered,” retain the explanation and key-concept panels, and correct the Review back target. |
| M6 | Require a sufficient sample before showing Mastered; show Learning while evidence is sparse. |
| M7 | Separate share-link creation from clipboard copying; if copying fails, show the link in a selectable field. |
| M9 | Check for an in-progress test before any readiness redirect so the Resume card remains reachable. |
| M12 | Make question-map, calculator, and submit sheets trap focus, close on Escape, and return focus to their trigger. |
| M13 | Change the timer warning state at 10% remaining and do not pulse it. |
| A2 | Restyle Delete all my data as a quiet outlined danger action, last on Account, retaining the two-step confirmation. |
| A5 | Replace the native Reset profile confirmation with the designed AlertDialog and state the consequence. |
| L1 | Put file size and date below the name in locker and shelf cards instead of beside it. |

**Done when:** abandon and blank-submit paths are safe; unanswered answers are labeled accurately; sheets are keyboard accessible; and a result screen has one clear next action.

## Shared design and interaction direction

- Keep the existing page background and brand direction. Improve hierarchy, spacing, borders, and restrained depth without introducing neon or unrelated colors.
- Use a centered 52 rem content column, 20 px mobile gutters, a 4/8 px spacing grid, readable 40–70 character prose lines, and touch targets of at least 44 px.
- Use one strong hero per screen, readable humanist sans-serif typography, restrained shadows, and accessible accent states.
- Animate transform and opacity only; honor reduced motion. Keep feedback around 100–150 ms and useful transitions around 200–300 ms; avoid decorative loops and motion over 400 ms.
- Preserve the agreed swipe behavior: root swipes only between main sections, disabled in forms, menus, Chat text, and active tests; the tab light tracks the finger and settles or returns with the screen.
- Keep the existing mock-sharing privacy boundary: share score, course, date, and selected topic strengths only, never questions or private filenames.
- Retain responsive desktop and phone layouts and manually verify the preview before deployment.

## Audit note

The source report says the listed findings were open at `e1f12bb`. PR #55 is the current implementation branch and overlaps several items. Before taking any item as unfinished, compare its acceptance criteria with the current branch and the report's evidence; preserve the source ID when recording its verified status.

## Current branch progress

Implemented on PR #55; preview and runtime verification are still pending:

- H6: Home owns one materials request and shares its filtered results with its cards.
- P1 (implementation): provider values are split between student data and route state; route actions are stable; the five root screens are memoized; Home, Practice, My Files, and Account subscribe to student data without subscribing to route changes. Chat alone subscribes to the current view because its thread lifecycle depends on it. Render-count profiling is still needed before calling the acceptance criterion verified.
- P2: swipe progress paints the tab light in `requestAnimationFrame`; React state changes only when the neighboring tab or desktop highlight changes.
- P3: Chat stays mounted as its keyed root tab; the separate prefetch instance was removed.
- P4/P5: adjacent tabs warm during idle time and the swipe preview renders the actual mounted screen beside the current tab; the existing layout-effect stage reset is retained.
- P7: local profile serialization is debounced by 250 ms.
- P8: the PDF viewer and embedded Chat are lazy-loaded when a file preview needs them.
- P6: My Files uses a row-shaped loading skeleton; the latest locker metadata is cached by signed-in user for fast return and offline fallback. Cached entries exclude storage paths and extracted course text, and request sequencing prevents stale account responses replacing the active list.
- M8: The current result-first submit flow keeps the result locally and offers a save retry using the same attempt ID; `pushMockAttempt` upserts on `(user_id, id)`, so retry is idempotent. Resetting the runner's guard is not needed because the submitted test is already cleared before persistence.

PR3's minimum-answer average and M3's actual generation-error message were already present on the current branch. The remaining Phase 0 rendering and skeleton items still need a flow-level audit.
