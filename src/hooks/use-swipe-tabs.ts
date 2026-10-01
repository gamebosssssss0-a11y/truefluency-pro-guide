import { useEffect, useRef, useState } from "react";
import { useProfile, type AppView } from "@/lib/profile-store";

/** The five root tabs, in the order the tab bar shows them. */
const ORDER: AppView[] = ["home", "mock-tests", "library", "chatbot", "account"];
const SWIPE_THRESHOLD = 70;
const TRANSITION_MS = 180;

type SwipePreview = { tab: AppView; side: "left" | "right" };

/** Which root tab (if any) the current view is. Sub-screens are not swipeable. */
function rootIndex(view: AppView): number {
  if (view === "dashboard") return 0;
  if (view === "settings") return 4;
  return ORDER.indexOf(view);
}

/** Root-tab gestures follow the finger, with the adjacent tab rendered beside the current one. */
export function useSwipeTabs(enabled = true): SwipePreview | null {
  const { view, navigate } = useProfile();
  const index = rootIndex(view);
  const navigateRef = useRef(navigate);
  const [preview, setPreview] = useState<SwipePreview | null>(null);
  navigateRef.current = navigate;

  useEffect(() => {
    if (!enabled || index < 0) {
      setPreview(null);
      return;
    }

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let horizontal = false;
    let deltaX = 0;
    let stage: HTMLElement | null = null;
    let settleTimer = 0;
    let previousOverflowX = "";

    const restoreStage = (node: HTMLElement, removePreview = true) => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      node.style.transition = reduced ? "none" : `transform ${TRANSITION_MS}ms ease`;
      node.style.transform = "translate3d(0, 0, 0)";
      node.dataset.swipeActive = "false";
      if (removePreview) {
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => setPreview(null), reduced ? 0 : TRANSITION_MS + 30);
      }
      window.setTimeout(() => {
        if (!node.isConnected || node.dataset.swipeActive === "true") return;
        node.style.transition = "";
        node.style.transform = "";
        node.style.willChange = "";
      }, reduced ? 0 : TRANSITION_MS + 30);
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        tracking = false;
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest("[data-swipe-lock], [role='dialog'], [role='menu'], button, a, input, textarea, select, [contenteditable='true']")) {
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
        previousOverflowX = document.documentElement.style.overflowX;
        document.documentElement.style.overflowX = "hidden";
      }
      deltaX = dx;
      const adjacentIndex = index + (dx < 0 ? 1 : -1);
      const adjacent = ORDER[adjacentIndex];
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (adjacent && !reduced) setPreview({ tab: adjacent, side: dx < 0 ? "right" : "left" });
      else setPreview(null);
      const resisted = adjacent ? dx : dx * 0.25;
      stage.style.transition = "none";
      stage.style.transform = reduced ? "" : `translate3d(${resisted}px, 0, 0)`;
      stage.dataset.swipeActive = "true";
      if (event.cancelable) event.preventDefault();
    };

    const onEnd = () => {
      if (!tracking || !stage) return;
      tracking = false;
      const node = stage;
      const targetIndex = index + (deltaX < 0 ? 1 : -1);
      const target = ORDER[targetIndex];
      if (!horizontal || !target || Math.abs(deltaX) < SWIPE_THRESHOLD) {
        restoreStage(node);
        document.documentElement.style.overflowX = previousOverflowX;
        return;
      }

      const outgoing = deltaX < 0 ? -1 : 1;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        node.style.transition = "none";
        node.style.transform = "translate3d(0, 0, 0)";
        node.dataset.swipeActive = "false";
        document.documentElement.style.overflowX = previousOverflowX;
        navigateRef.current(target);
        setPreview(null);
        return;
      }

      node.style.transition = `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      node.style.transform = `translate3d(${outgoing * window.innerWidth}px, 0, 0)`;
      window.setTimeout(() => {
        if (!node.isConnected) return;
        document.documentElement.style.overflowX = previousOverflowX;
        navigateRef.current(target);
      }, TRANSITION_MS);
    };

    const onCancel = () => {
      tracking = false;
      horizontal = false;
      if (stage) restoreStage(stage);
      document.documentElement.style.overflowX = previousOverflowX;
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
      window.clearTimeout(settleTimer);
      if (stage) {
        stage.style.transition = "";
        stage.style.transform = "";
        stage.style.willChange = "";
        stage.dataset.swipeActive = "false";
      }
      document.documentElement.style.overflowX = previousOverflowX;
      setPreview(null);
    };
  }, [enabled, index]);

  return preview;
}
