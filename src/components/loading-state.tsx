import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function useDelayedLoading(loading: boolean, delayMs = 150, minimumVisibleMs = 300) {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    let timer: number | undefined;
    if (loading) {
      if (!visible) {
        timer = window.setTimeout(() => {
          shownAt.current = Date.now();
          setVisible(true);
        }, delayMs);
      }
    } else if (visible) {
      const remaining = Math.max(0, minimumVisibleMs - (Date.now() - shownAt.current));
      timer = window.setTimeout(() => setVisible(false), remaining);
    }
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [delayMs, loading, minimumVisibleMs, visible]);

  return visible;
}

export function SkeletonBlock({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("loading-skeleton rounded-md", className)} {...props} />;
}

export function LoadingStatus({
  loading = true,
  label,
  slowMessage,
  longMessage,
  slowAfterMs = 8_000,
  longAfterMs = 20_000,
  className,
  children,
}: {
  loading?: boolean;
  label: string;
  slowMessage: string;
  longMessage: string;
  slowAfterMs?: number;
  longAfterMs?: number;
  className?: string;
  children?: ReactNode;
}) {
  const visible = useDelayedLoading(loading);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!loading) { setElapsedMs(0); return; }
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 1_000);
    return () => window.clearInterval(timer);
  }, [loading]);

  if (!loading || !visible) return null;
  const message = elapsedMs >= longAfterMs ? longMessage : elapsedMs >= slowAfterMs ? slowMessage : label;
  return (
    <section role="status" aria-live="polite" aria-busy="true" className={cn("loading-region", className)}>
      {children}
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      <div aria-hidden="true" className="loading-progress-track mt-4 h-1.5 overflow-hidden rounded-full">
        <div className="loading-progress-bar h-full w-2/5 rounded-full" />
      </div>
    </section>
  );
}
