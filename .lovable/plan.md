# Dark type, Study Chat layout, swipe motion, and back stack

## Outcome
- Keep the existing TrueFluency product, backend, quotas, mock flow, Library data, calculator formulas, PDF behavior, and five destinations.
- Make dark mode use `#020a1a` for the page and `#F7F3EA` for body text everywhere requested, with raised surfaces using the supplied dark card tokens.
- Rework only the existing Study Chat presentation and failure handling; no new chat product or service.
- Make root-tab swipes visibly move and make browser Back reflect screens the student actually opened.

## Implementation

### 1. Theme tokens and dark readability
- Update the existing dark token values in `src/styles.css`:
  - page `#020a1a`
  - card `#0E1A33`
  - raised sheet/popover `#132240`
  - text `#F7F3EA`
  - muted text `#C4B8A0`
  - line `#243656`
  - amber unchanged at `#B86E0A`
- Keep light tokens unchanged and preserve the fixed PDF/DOC/PPT colors and white PDF page pixels.
- Replace light-only chrome colors in Home, Account, Library, Practice, Study Chat, sheets, and tab bars with existing semantic tokens. Keep intentional fixed-color elements such as the sand student message with navy text and file-type chips.
- Add only the requested looping thinking classes; leave all splash and existing one-shot animation classes unchanged. Reduced-motion users get a static logo.

### 2. Study Chat structure and behavior
- Keep `ChatbotScreen` and its existing successful send, quota, share, history, speech, and backend paths.
- Replace the course chip wall with one active-course control that opens a themed course picker sheet. Remove “All my notes”; the active course remains the default.
- Make starter/advisory chips populate the composer only. They never send automatically.
- Keep student messages as compact right-aligned sand chips with navy text.
- Render assistant replies full-width with no card background, rounded wrapper, or width cap. Put Copy, Read aloud, token status, and Share in a full-width hairline action row below each reply.
- Replace the sending slab with a bare 32px looping `LogoMark` plus exactly “Thinking”.
- Preserve the draft until a send succeeds. A failed send remains attached to that student message with “Couldn't send.”, Retry, and Copy; Retry reuses that message’s stored course and mode without adding a duplicate student message or consuming quota for a failed call.
- Keep the existing `RichText`/`MathText` path. Make final results use the theme border/text tokens, preserve inline and display KaTeX, and style only step titles already present in the reply.

### 3. Docked chat layout and gesture isolation
- Constrain Study Chat to the available viewport above the live tab bar, keep the composer docked with at least 8px clearance, and make only the thread scroll.
- Add overscroll containment and vertical touch behavior to the message list, plus an explicit swipe lock so gestures beginning in the thread never change tabs.
- Keep sheets and existing protected task screens excluded from tab swiping.

### 4. Root-tab swipe motion
- Extend the existing five-tab swipe hook and screen stage rather than adding another navigation system.
- Track the finger’s horizontal offset on eligible root screens, visually translate the stage during a clear horizontal shell gesture, then animate the outgoing/current stage and incoming destination in the swipe direction.
- Commit at most one adjacent tab per gesture in this order: Home → Practice → My Files → Study Chat → Account.
- Cancel back to the current tab for short/vertical gestures; never start a tab swipe from the Study Chat message list, mock run/review, Library preview, or flashcard review.

### 5. Browser back stack
- Give app-created history entries a current-session marker and store only the screen and parameters actually opened.
- Make repeated navigation to the current screen a no-op, and replace rather than push when establishing Home as the dashboard root.
- On Back, restore only valid entries from the current session. Skip stale app entries from earlier sessions without rendering them, preventing Home from showing phantom Practice, Support, or Account screens.
- Preserve the existing in-progress mock leave guard as a separate mechanism.
- Keep sub-screen entries so phone Back returns once to the screen that actually opened them.

## Verification
- Confirm the existing build remains green and check browser/runtime logs.
- At 360px, verify dark Home, Practice, My Files, Study Chat, Account, tab bar, and sheets use the requested page/text values with no unreadable navy-on-page chrome.
- Verify Study Chat: active-course picker, suggestion fill-only behavior, full-width assistant reply, sand student chip, KaTeX display/inline rendering, boxed final result, looping “Thinking” row, failed-send Retry/Copy, preserved draft, and docked composer.
- Verify gestures: vertical chat scrolling does not switch tabs; an eligible root swipe follows the finger, moves one tab, and shows directional transition.
- Verify browser Back: Home does not reveal phantom app screens; a real sub-screen returns exactly once to its origin; mock-run guard remains intact.

## Files expected to change
- `src/styles.css`
- `src/components/chatbot.tsx`
- `src/components/rich-text.tsx`
- `src/hooks/use-swipe-tabs.ts`
- `src/routes/index.tsx`
- `src/lib/profile-store.tsx`
- `src/components/tab-bar.tsx`
- Only the requested Home/Account/Library/Practice presentation files where a light-only chrome literal blocks the shared dark tokens
- `AGENTS.md` for the history/swipe architecture rule

## Locked areas
No splash changes, PDF engine or page-pixel changes, Vite exclusions, mock polling/generation changes, quota number changes, Library schema changes, calculator formula changes, Cloud changes, environment changes, payment work, or automatic sending from suggestion chips.
