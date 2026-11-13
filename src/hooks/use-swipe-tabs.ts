import { useEffect, useRef, useState } from "react";
import { useNavigation, type AppView } from "@/lib/profile-store";

/** The five root tabs, in the order the tab bar shows them. */
const ORDER: AppView[] = ["home", "mock-tests", "library", "chatbot", "account"];
const SETTLE_MS = 220;

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
    let neighbor: HTMLElement | null = null;
    let previewTab: AppView | null = null;
    let previewSide: "left" | "right" | null = null;
    let settleTimer = 0;
    let lightFrame = 0;
    let samples: Array<{ x: number; time: number }> = [];
    let clickTarget: Element | null = null;
    let cancelNextClick = false;

    const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paintTabLight = (progress: number, speed = 0, settle = false) => {
      if (lightFrame) window.cancelAnimationFrame(lightFrame);
      lightFrame = window.requestAnimationFrame(() => {
        lightFrame = 0;
        const nav = document.querySelector<HTMLElement>("[data-mobile-tab-bar]");
        const indicator = document.querySelector<HTMLElement>("[data-tab-indicator]");
        if (!nav || !indicator) return;
        nav.style.setProperty("--tab-progress", String(Math.max(0, Math.min(ORDER.length - 1, progress))));
        indicator.style.transition = settle && !reducedMotion()
          ? `left ${SETTLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${SETTLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
          : "none";
        const stretch = 1 + Math.min(0.4, Math.abs(speed) / 2);
        indicator.style.transform = `translateX(-50%) scaleX(${stretch})`;
      });
    };

    const clearWillChange = () => {
      stage?.querySelectorAll<HTMLElement>("[data-root-tab]").forEach((tab) => { tab.style.willChange = ""; });
      if (stage) stage.style.willChange = "";
    };

    const finishPreview = () => {
      setPreview(null);
      previewTab = null;
      neighbor = null;
      previewSide = null;
      clearWillChange();
    };

    const restoreStage = (node: HTMLElement) => {
      paintTabLight(index, 0, true);
      node.style.transition = reducedMotion() ? "none" : `transform ${SETTLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      node.style.transform = "translate3d(0, 0, 0)";
      node.dataset.swipeActive = "false";
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        finishPreview();
        if (!node.isConnected || node.dataset.swipeActive === "true") return;
        node.style.transition = "";
        node.style.transform = "";
        clearWillChange();
      }, reducedMotion() ? 0 : SETTLE_MS + 20);
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        tracking = false;
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest("[data-swipe-lock], [role='dialog'], [role='menu'], input, textarea, select, [contenteditable='true'], [contenteditable='']")) {
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
      samples = [{ x: touch.clientX, time: performance.now() }];
      clickTarget = target instanceof Element ? target.closest("button, a, [role='button']") : null;
      previewTab = null;
      neighbor = null;
      previewSide = null;
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
        if (Math.abs(dx) <= 8 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
        horizontal = true;
        stage.style.willChange = "transform";
        stage.querySelectorAll<HTMLElement>("[data-root-tab]").forEach((tab) => { tab.style.willChange = "transform"; });
        const adjacentIndex = index + (dx < 0 ? 1 : -1);
        previewTab = ORDER[adjacentIndex] ?? null;
        previewSide = dx < 0 ? "right" : "left";
        if (previewTab && !reducedMotion()) {
          neighbor = stage.querySelector<HTMLElement>(`[data-root-tab="${previewTab}"]`);
          setPreview({ tab: previewTab, side: previewSide, highlightedTab: null });
        }
      }
      deltaX = dx;
      const now = performance.now();
      samples.push({ x: touch.clientX, time: now });
      if (samples.length > 3) samples.shift();
      const first = samples[0]!;
      const last = samples[samples.length - 1]!;
      const velocity = last.time > first.time ? (last.x - first.x) / (last.time - first.time) : 0;
      const progress = Math.max(0, Math.min(4, index - dx / window.innerWidth));
      paintTabLight(progress, velocity);

      if (!reducedMotion()) {
        stage.style.transition = "none";
        stage.style.transform = `translate3d(${previewTab ? dx : dx * 0.25}px, 0, 0)`;
        if (neighbor && previewSide) {
          neighbor.style.transform = `translate3d(${previewSide === "right" ? -dx : -dx}px, 0, 0)`;
        }
      }
      stage.dataset.swipeActive = "true";
      if (clickTarget && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) cancelNextClick = true;
      if (event.cancelable) event.preventDefault();
    };

    const onEnd = () => {
      if (!tracking || !stage) return;
      tracking = false;
      const node = stage;
      const targetIndex = index + (deltaX < 0 ? 1 : -1);
      const target = ORDER[targetIndex];
      const first = samples[0];
      const last = samples[samples.length - 1];
      const releaseVelocity = first && last && last.time > first.time ? (last.x - first.x) / (last.time - first.time) : 0;
      const fastEnough = target != null && (deltaX < 0 ? releaseVelocity < -0.4 : releaseVelocity > 0.4);
      const shouldCommit = Boolean(horizontal && target && (Math.abs(deltaX) > window.innerWidth * 0.35 || fastEnough));
      if (!shouldCommit || !target) {
        if (horizontal) restoreStage(node);
        else {
          previewTab = null;
          clickTarget = null;
        }
        return;
      }

      if (reducedMotion()) {
        navigateRef.current(target, { replace: true });
        finishPreview();
        return;
      }

      paintTabLight(targetIndex, 0, true);
      setPreview({ tab: target, side: deltaX < 0 ? "right" : "left", highlightedTab: target });
      node.style.transition = `transform ${SETTLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      node.style.transform = `translate3d(${deltaX < 0 ? -window.innerWidth : window.innerWidth}px, 0, 0)`;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (!node.isConnected) return;
        finishPreview();
        navigateRef.current(target, { replace: true });
      }, SETTLE_MS);
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!cancelNextClick || !clickTarget) return;
      const target = event.target;
      if (target instanceof Node && (target === clickTarget || clickTarget.contains(target))) {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelNextClick = false;
        clickTarget = null;
      }
    };

    const onCancel = () => {
      tracking = false;
      horizontal = false;
      if (stage) restoreStage(stage);
      else finishPreview();
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onCancel, { passive: true });
    window.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
      window.removeEventListener("click", onClickCapture, true);
      window.clearTimeout(settleTimer);
      if (lightFrame) window.cancelAnimationFrame(lightFrame);
      if (stage) {
        stage.style.transition = "";
        stage.style.transform = "";
        stage.style.willChange = "";
        stage.dataset.swipeActive = "false";
      }
      clearWillChange();
      finishPreview();
    };
  }, [enabled, index]);

  return preview;
}
