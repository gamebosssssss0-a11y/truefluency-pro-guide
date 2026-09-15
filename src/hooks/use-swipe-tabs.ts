import { useEffect } from "react";
import { useProfile, type AppView } from "@/lib/profile-store";

/** The five root tabs, in the order the tab bar shows them. */
const ORDER: AppView[] = ["home", "mock-tests", "library", "chatbot", "account"];

/** Which root tab (if any) the current view is. Sub-screens are not swipeable. */
function rootIndex(view: AppView): number {
  if (view === "dashboard") return 0;
  if (view === "settings") return 4;
  return ORDER.indexOf(view);
}

/**
 * Horizontal swipe moves one tab at a time, and only while a root tab is on
 * screen: a mock run, a review, the Library preview sheet or flashcards review
 * are all excluded because they are not root tabs. Vertical scrolling wins any
 * ambiguous gesture, so scrolling is never hijacked.
 */
export function useSwipeTabs() {
  const { view, navigate } = useProfile();
  const index = rootIndex(view);

  useEffect(() => {
    if (index < 0) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { tracking = false; return; }
      // A reader or overlay on screen (e.g. the file viewer) owns the gesture.
      if (document.querySelector("[data-swipe-lock]")) { tracking = false; return; }
      const t = e.touches[0]!;
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    };


    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < 70) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return; // vertical scroll wins
      const next = dx < 0 ? index + 1 : index - 1;
      const target = ORDER[next];
      if (target) navigate(target);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [index, navigate]);
}
