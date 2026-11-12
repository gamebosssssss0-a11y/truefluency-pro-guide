import { useEffect, useRef, useState } from "react";
import { useNavigation, type AppView } from "@/lib/profile-store";

/** The five root tabs, in the order the tab bar shows them. */
const ORDER: AppView[] = ["home", "mock-tests", "library", "chatbot", "account"];
const SWIPE_THRESHOLD = 70;
const TRANSITION_MS = 180;

export type SwipePreview = { tab: AppView; side: "left" | "right"; highlightedTab: AppView | null };

/** Which root tab (if any) the current view is. Sub-screens are not swipeable. */
function rootIndex(view: AppView): number {
  if (view === "dashboard") return 0;
  if (view === "settings") return 4;
  return ORDER.indexOf(view);
}

/** Root-tab gestures follow the finger, with the adjacent tab rendered beside the current one. */
export function useSwipeTabs(enabled = true): SwipePreview | null {
  const { view, navigate } = useNavigation();
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
    let lightFrame = 0;
    let lightProgress = index;
    let lightIntensity = 0;
    const paintTabLight = (progress: number, intensity: number, settle = false) => {
      lightProgress = progress;
      lightIntensity = intensity;
      if (lightFrame) window.cancelAnimationFrame(lightFrame);
      lightFrame = window.requestAnimationFrame(() => {
        lightFrame = 0;
        const indicator = document.querySelector<HTMLElement>("[data-tab-indicator]");
        if (!indicator) return;
        indicator.style.transition = settle
          ? `left ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${TRANSITION_MS}ms ease, box-shadow ${TRANSITION_MS}ms ease`
          : "none";
        indicator.style.left = `${((lightProgress + 0.5) / ORDER.length) * 100}%`;
        indicator.style.opacity = String(0.35 + lightIntensity * 0.65);
        indicator.style.boxShadow = `0 0 ${4 + lightIntensity * 10}px color-mix(in srgb, var(--accent) ${20 + lightIntensity * 50}%, transparent)`;
        if (settle) {
          window.setTimeout(() => {
            if (indicator.isConnected) indicator.style.transition = "";
          }, TRANSITION_MS + 30);
        }
      });
    };
    const restoreStage = (node: HTMLElement, removePreview = true) => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      paintTabLight(index, 0, !reduced);
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
      }
      deltaX = dx;
      const adjacentIndex = index + (dx < 0 ? 1 : -1);
      const adjacent = ORDER[adjacentIndex];
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const progress = Math.max(0, Math.min(ORDER.length - 1, index - Math.max(-1, Math.min(1, dx / SWIPE_THRESHOLD))));
      const intensity = Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD);
      if (adjacent && !reduced) {
        const side = dx < 0 ? "right" : "left";
        const highlightedTab = Math.abs(dx) >= window.innerWidth / 2 ? adjacent : null;
        // Keep React out of the per-pixel path. The tab light is painted in
        // requestAnimationFrame; React only mounts the neighbor and crosses
        // the active-tab highlight boundary.
        setPreview((current) => current?.tab === adjacent && current.side === side && current.highlightedTab === highlightedTab
          ? current
          : { tab: adjacent, side, highlightedTab });
        paintTabLight(progress, intensity);
      } else {
        setPreview((current) => current === null ? current : null);
      }
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
        if (horizontal && target) setPreview({ tab: target, side: deltaX < 0 ? "right" : "left", highlightedTab: null });
        restoreStage(node);
        return;
      }

      const outgoing = deltaX < 0 ? -1 : 1;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        navigateRef.current(target, { replace: true });
        setPreview(null);
        return;
      }

      paintTabLight(targetIndex, 0, true);
      setPreview({ tab: target, side: deltaX < 0 ? "right" : "left", highlightedTab: target });
      node.style.transition = `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      node.style.transform = `translate3d(${outgoing * window.innerWidth}px, 0, 0)`;
      window.setTimeout(() => {
        if (!node.isConnected) return;
        // ProfileProvider commits the destination while the stage remains
        // off-screen. Router resets the transform in a layout effect after
        // that destination has committed, so no empty frame can paint.
        setPreview(null);
        navigateRef.current(target, { replace: true });
      }, TRANSITION_MS);
    };

    const onCancel = () => {
      tracking = false;
      horizontal = false;
      setPreview(null);
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
      window.clearTimeout(settleTimer);
      if (lightFrame) window.cancelAnimationFrame(lightFrame);
      if (stage) {
        stage.style.transition = "";
        stage.style.transform = "";
        stage.style.willChange = "";
        stage.dataset.swipeActive = "false";
      }
      setPreview(null);
    };
  }, [enabled, index]);

  return preview;
}
