import { useEffect, useRef } from "react";
import { useProfile, type AppView } from "@/lib/profile-store";

/** The five root tabs, in the order the tab bar shows them. */
const ORDER: AppView[] = ["home", "mock-tests", "library", "chatbot", "account"];
const SWIPE_THRESHOLD = 70;
const TRANSITION_MS = 180;

/** Which root tab (if any) the current view is. Sub-screens are not swipeable. */
function rootIndex(view: AppView): number {
  if (view === "dashboard") return 0;
  if (view === "settings") return 4;
  return ORDER.indexOf(view);
}

/**
 * Root-tab gestures follow the finger. The current stage slides out, then the
 * adjacent destination enters from the same direction. Thread and task surfaces
 * can claim their own touch gestures with data-swipe-lock.
 */
export function useSwipeTabs() {
  const { view, navigate } = useProfile();
  const index = rootIndex(view);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (index < 0) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let horizontal = false;
    let deltaX = 0;
    let stage: HTMLElement | null = null;

    const restoreStage = (node: HTMLElement) => {
      node.style.transition = "transform " + TRANSITION_MS + "ms ease";
      node.style.transform = "translate3d(0, 0, 0)";
      node.dataset.swipeActive = "false";
      window.setTimeout(() => {
        if (!node.isConnected || node.dataset.swipeActive === "true") return;
        node.style.transition = "";
        node.style.transform = "";
        node.style.willChange = "";
      }, TRANSITION_MS + 30);
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        tracking = false;
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest("[data-swipe-lock], [role='dialog'], [role='menu']")) {
        tracking = false;
        return;
      }
      stage = document.querySelector<HTMLElement>("[data-tab-swipe-stage]");
      if (!stage) return;
      const touch = event.touches[0]!;
      startX = touch.clientX;
      startY = touch.clientY;
      deltaX = 0;
      horizontal = false;
      tracking = true;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1 || !stage) return;
      const touch = event.touches[0]!;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (!horizontal) {
        if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) {
          tracking = false;
          return;
        }
        if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
        horizontal = true;
        stage.style.willChange = "transform";
      }
      deltaX = dx;
      const adjacentIndex = index + (dx < 0 ? 1 : -1);
      const resisted = ORDER[adjacentIndex] ? dx : dx * 0.25;
      stage.style.transition = "none";
      stage.style.transform = "translate3d(" + resisted + "px, 0, 0)";
      stage.dataset.swipeActive = "true";
      if (event.cancelable) event.preventDefault();
    };

    const onEnd = () => {
      if (!tracking || !stage) return;
      tracking = false;
      const node = stage;
      if (!horizontal) {
        restoreStage(node);
        return;
      }
      const targetIndex = index + (deltaX < 0 ? 1 : -1);
      const target = ORDER[targetIndex];
      if (!target || Math.abs(deltaX) < SWIPE_THRESHOLD) {
        restoreStage(node);
        return;
      }

      const outgoing = deltaX < 0 ? -1 : 1;
      node.style.transition = "transform " + TRANSITION_MS + "ms cubic-bezier(0.22, 1, 0.36, 1)";
      node.style.transform = "translate3d(" + (outgoing * window.innerWidth) + "px, 0, 0)";
      window.setTimeout(() => {
        if (!node.isConnected) return;
        navigateRef.current(target);
        requestAnimationFrame(() => {
          node.style.transition = "none";
          node.style.transform = "translate3d(" + (outgoing * -window.innerWidth) + "px, 0, 0)";
          void node.offsetWidth;
          requestAnimationFrame(() => {
            if (!node.isConnected) return;
            node.style.transition = "transform " + TRANSITION_MS + "ms cubic-bezier(0.22, 1, 0.36, 1)";
            node.style.transform = "translate3d(0, 0, 0)";
            node.dataset.swipeActive = "false";
            window.setTimeout(() => {
              if (!node.isConnected || node.dataset.swipeActive === "true") return;
              node.style.transition = "";
              node.style.transform = "";
              node.style.willChange = "";
            }, TRANSITION_MS + 30);
          });
        });
      }, TRANSITION_MS);
    };

    const onCancel = () => {
      tracking = false;
      horizontal = false;
      if (stage) restoreStage(stage);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
      if (stage) restoreStage(stage);
    };
  }, [index]);
}
