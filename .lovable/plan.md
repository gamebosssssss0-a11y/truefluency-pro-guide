# TrueFluency Pro full bug-fix pass

## Confirmed current state
- The latest preview build log is currently green, but no requested item will be reported as complete without live interaction testing.
- Light cards, popovers, and chat surfaces still resolve to pure `#FFFFFF`; dark page/text tokens are already `#020A1A` and `#F7F3EA`.
- Flashcards still render every course as a chip. Review ratings render before a flip, and a finished session reuses the initial empty-session copy.
- Study Chat still uses a one-line input. Its empty state reserves a fixed minimum height, and its thinking mark has only two particles.
- The upgrade CTA inherits non-wrapping button text, which can overflow when it contains the full pricing sentence.
- **PDF diagnosis:** `LibraryScreen.openPreview()` in `src/components/library.tsx` still calls `supabase.storage.from("course-materials").createSignedUrl()` for the student's own files. Shelf/shared previews already use `storage.presignDownload()` against R2. This explains why own-file viewing can fail after the storage migration.
- `MAX_TOPIC_FOCUS` and the chip-disable condition already use 3, but generation currently allows fewer than 3 selected topics.
- Root-tab clicks and completed swipes still call `navigate()` without replace semantics, so they push browser entries. Child screens use the same API and must retain push behavior.
- Google sign-in is a **full-page redirect**: `IdentityScreen.onGoogle()` calls `signInWithOAuth()` and then assigns `window.location.href` to the returned URL.

## Implementation

### 1. Warm ivory surface and dark contrast
- Add `--surface: #FBF7EE` and `--color-surface`, then make light card/popover/chat-card roles use this token instead of pure white.
- Replace card, sheet, input, and secondary-control `bg-white`/`#FFFFFF` literals with `bg-surface` or the matching semantic surface role across affected screens, including onboarding, shared-file, flashcard, Practice, Account, chat, Library, and PDF error chrome.
- Preserve intentional white **foreground** on dark status/file chips and CTA text, and preserve PDF canvas/page pixels.
- Audit dark-mode foreground/background pairs with computed contrast, replacing light-only navy text on dark semantic surfaces with `text-foreground`/`text-card-foreground`. Body and label text must meet 4.5:1 at rest.

### 2. Smooth root-tab motion
- Keep `useSwipeTabs` as the only tab gesture mechanism and retain all swipe locks and reduced-motion behavior.
- Remove the current settle/navigation race that can briefly show transformed old and new screens together. Keep one adjacent preview during drag, use one consistent transform/easing during commit or cancel, clip the stage, and reset only after the destination has mounted.
- Root-tab swipes will replace history rather than push it.

### 3. Flashcards
- Replace the course-chip wall with one active-course trigger and a themed bottom picker using the same interaction pattern as Study Chat.
- Track “answer revealed for this card” separately from the current front/back face. Hide ratings until the first flip; keep them available if the student flips back; reset reveal state only when advancing to another card.
- Track whether the loaded session began with cards and whether the student advanced past its final card. Show distinct completion copy with course code and reviewed count only after finishing; preserve the existing zero-card messages for sessions that started empty.

### 4. Study Chat composer, spacing, and thinking particles
- Replace the single-line input with an auto-growing textarea that wraps, grows to roughly six lines, then scrolls vertically; Enter sends and Shift+Enter inserts a line break.
- Remove fixed empty-state/thread spacing that creates the dead buffer, while keeping the thread as the flexible scroll region and the composer directly above the tab bar.
- Render six sharp 4–6px particles around the thinking logo with radial offsets and staggered delays. Adjust only particle opacity/scale timing so dots remain distinct until the final convergence; leave `sonic-mark-loop`, `thinking-shimmer`, and the existing reduced-motion disabling intact.

### 5. Upgrade mobile fit
- Keep `PRICE_LINE` and every price unchanged.
- Make the pricing rows and CTA shrink/wrap within 360–400px, override inherited no-wrap behavior where needed, and add safe word wrapping without horizontal scrolling.

### 6. R2 PDF previews
- Add an authenticated server function for an owner's preview URL. It will validate the material ID, query through the authenticated Supabase client so ownership/RLS applies, and call the existing server-only `storage.presignDownload()` helper.
- Change only the own-file branch of `LibraryScreen.openPreview()` to use that server function. Shelf/shared previews keep their already-working R2 path.
- Keep all `R2_*` reads inside server-only code, preserve the exact Retry/Close fallback, and make no database or environment changes.

### 7. Exact three-topic selection
- Preserve `MAX_TOPIC_FOCUS = 3` and the existing two-topic smart default.
- Keep unselected topics enabled at two selections, disable only unselected topics at three, and re-enable them immediately after a deselection.
- Disable mock generation until exactly three topics are selected whenever analysed topics are available; never permit more than three.

### 8. Browser history and Home floor
- Extend `navigate()` with an optional `replace` flag and pass it into `writeAppLocation()`.
- Make desktop and mobile root-tab clicks, plus root-tab swipes, use replace semantics. Keep all genuine child-screen navigation on the existing push path.
- Preserve current-session markers, duplicate no-ops, stale-entry skipping, and the independent mock-run leave guard.
- Because Google uses redirect OAuth, establish a marked Home floor after the completed sign-in flow. Handle that marker during Back so one user Back action skips the internal floor/redirect remnants instead of rendering onboarding or an old app screen. Do not treat a normal warm reload as a fresh OAuth completion.

## Verification
- Run the focused checks and confirm the latest preview build log is green.
- Use the live preview at 360px and desktop widths, in light and dark themes. Measure representative dark text/background contrast rather than judging visually.
- Live-test items 1–9 through their actual screens, including Flashcards picker/reveal/completion, multiline chat drafting and send, chat short/long threads, tab gestures, and upgrade overflow.
- With an authenticated real file, open an own PDF from My Files/Library, retry once, and verify the PDF renders; also open a shelf/shared PDF when available. Inspect browser requests and built client assets to confirm no R2 credential name/value is exposed as client configuration.
- Exercise the topic picker at 2, 3, and back to 2 selections, and confirm proceeding is blocked below 3.
- Verify repeated root-tab taps and swipes do not increase `history.length`; verify course detail, mock result/review, and flashcard review still return to their parent tab. Verify Home Back exits the app in a normal session and after a real Google redirect flow when that flow is available.
- Report each item 1–13 as `DONE`, `FAIL`, or `NOT LIVE-TESTED`; never infer live success from compilation. Include every requested item-specific answer and the complete touched-file list.

## Expected files
- `src/styles.css`
- Surface-literal consumers found by the audit, limited to cards/sheets/inputs/secondary backgrounds
- `src/components/flashcards.tsx`
- `src/components/chatbot.tsx`
- `src/components/upgrade.tsx`
- `src/components/library.tsx`
- `src/lib/storage.functions.ts`
- `src/components/mock-test-flow.tsx`
- `src/hooks/use-swipe-tabs.ts`
- `src/routes/index.tsx`
- `src/lib/profile-store.tsx`
- `src/components/tab-bar.tsx`
- `AGENTS.md` only if the established history architecture rule needs clarification

## Locked scope
No Supabase schema/policy/data changes, no new Cloud project, no `.env` edits, no payment integration, no price/cap/formula changes, no PDF engine/page-pixel changes, no mock polling/generation changes, and no changes to the protected mock leave confirmation.
