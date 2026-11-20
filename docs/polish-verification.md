# Visual polish verification

## Implemented

- Shared 44px circular back control across study subviews, preserving destination callbacks and the independent mock leave confirmation.
- Light/Dark snapshot reveal from pointer coordinates or the initiating control centre for keyboard activation; instant unsupported/reduced-motion fallback.
- Lazy first-page PDF rendering, real DOCX leading-text preview, and contributor badges over thumbnails. DOCX previews are not pixel-identical Word pagination. Unsupported legacy DOC/PPT formats and inaccessible/oversized files show an honest unavailable state with the existing View action.
- Browser-only document loading with two concurrent renders, 25MB source limit, bounded Word XML extraction, cancellation, and no persistent peer bytes or signed URLs.
- Account-scoped device chat mirrors, 500ms buffered persistence with lifecycle flush, frame-buffered reply updates, ID reconciliation, read deduplication/timeouts, cached incremental history, and account/conversation invalidation.
- Existing flashcard geometry retained with both faces contributing to height, compositor flip, long source wrapping, and reduced motion. Existing mock question stage retained with directional 260ms motion.
- Frame-painted root swipe transforms, measured stage width, resize cancellation, inert neighbor panels, back/forward screen entries, and scroll-to-top.
- Binder/scan shelf and locker loaders, compass mock generator, and shield payment verifier; existing messages retained rather than invented processing claims.
- Existing brand palette, backend calls, grading/entitlement rules, source checks, uploads, and payment-return handling preserved.

## Verified

- Latest preview build: OK.
- 47 existing regression checks passed; obsolete loader-source styling assertion removed rather than testing markup.
- 7 Vitest checks passed, including theme geometry, account isolation, write buffering/lifecycle flush, stale-message reconciliation, and worked explanations.
- Actual guest onboarding through Home at 360×619, then Account theme switch, edit/back, Home→Practice swipe, and desktop navigation at 1280×1800.
- Theme animation recorded at actual toggle coordinates with a 380ms circular clip; reduced motion changed theme without a snapshot animation.
- Circular back target measured 44px; returned to Account at scroll position zero.
- Guest phone and desktop checks reported no page errors or horizontal overflow.
- Independent browser rendering of an uploaded PDF and sample DOCX bytes confirmed visible page canvases and contributor badge, both-theme loaders, phone fit, and static reduced-motion decoration.

## Not verified

- The project uses external unmanaged Supabase authentication. No authenticated test session is available, so signed-in chat streaming/history, protected shelf/locker signing, real flashcard scheduling, mock Next/Previous flows, and live Squad confirmation were not exercised end-to-end.
- Thumbnail rendering was independently checked with real document bytes, not claimed as a protected shelf end-to-end check.
- Production publication was not requested or performed.