import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

type SlideToConfirmProps = {
  label: string;
  disabled?: boolean;
  busy?: boolean;
  onConfirm: () => void;
};

export function SlideToConfirm({ label, disabled = false, busy = false, onConfirm }: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const updateProgress = (value: number) => {
    const bounded = Math.max(0, Math.min(1, value));
    progressRef.current = bounded;
    setProgress(bounded);
  };

  const setFromPointer = (clientX: number) => {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const travel = Math.max(1, bounds.width - 48);
    updateProgress((clientX - bounds.left - 24) / travel);
  };

  const finish = () => {
    const confirmed = progressRef.current >= 0.9;
    dragging.current = false;
    updateProgress(0);
    if (confirmed) onConfirm();
  };

  const cancel = () => {
    dragging.current = false;
    updateProgress(0);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromPointer(event.clientX);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setFromPointer(event.clientX);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) {
      setFromPointer(event.clientX);
      finish();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      updateProgress(progressRef.current + 0.25);
    } else if (event.key === "ArrowLeft" || event.key === "Home") {
      event.preventDefault();
      updateProgress(event.key === "Home" ? 0 : progressRef.current - 0.25);
    } else if (event.key === "End") {
      event.preventDefault();
      updateProgress(1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (progressRef.current >= 0.9) finish();
      else updateProgress(1);
    }
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-valuetext={`Slide to ${label}: ${Math.round(progress * 100)}%`}
      aria-disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={cancel}
      onKeyDown={onKeyDown}
      className="relative flex h-12 select-none touch-none items-center overflow-hidden rounded-full border border-destructive/40 bg-destructive/10 px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 rounded-full bg-destructive/15"
        style={{ width: `${48 + Math.max(0, (trackRef.current?.clientWidth ?? 48) - 48) * progress}px` }}
      />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-12 text-center text-sm font-semibold text-destructive">
        {label}
      </span>
      <span
        aria-hidden="true"
        className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-transform duration-100 motion-reduce:transition-none"
        style={{ transform: `translateX(${progress * Math.max(0, (trackRef.current?.clientWidth ?? 48) - 48)}px)` }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
      </span>
    </div>
  );
}

