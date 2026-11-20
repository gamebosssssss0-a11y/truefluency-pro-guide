<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Navigation and swipe architecture

- Keep the existing five root destinations and the existing ProfileProvider navigation state. Do not introduce a second router for tabs.
- App-created browser history entries must carry the current tab-session marker and only the opened view and its parameters. Establish Home with replaceState, make repeated navigation to the same view and parameters a no-op, and skip stale app entries from earlier sessions on Back.
- useSwipeTabs is the only root-tab swipe mechanism. A gesture starting inside [data-swipe-lock] belongs to that surface, and vertical scrolling must never navigate tabs.
- Keep protected mock-run leave confirmation independent from tab swipe and browser-history handling.

## Visual polish boundaries

- Use the shared BackButton with the owning screen's existing callback; this preserves navigation and protected mock leave guards.
- Load document engines only in browser effects, limit concurrent thumbnail work, and keep peer previews in memory only while visible; this preserves SSR compatibility and revocable access.
- Scope chat mirrors and in-flight reads by authenticated user and canonical course, debounce writes, and clear them on account changes; this prevents stale messages leaking between accounts.
- Theme snapshots must originate at the initiating control with synchronous theme commits and an instant reduced-motion fallback; this avoids cross-fades and hydration mismatches.
