import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BookOpen, ShieldCheck, Sparkles } from "lucide-react";

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


/** Branded halo: a gold arc orbiting a centre mark. Pure CSS, reduced-motion safe. */
export function BrandOrbit({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("tf-orbit relative mx-auto grid h-24 w-24 place-items-center", className)}>
      <span className="tf-orbit-halo absolute inset-0 rounded-full border border-accent/30" />
      <span className="tf-orbit-arc absolute inset-1 rounded-full border-2 border-transparent border-t-accent border-r-accent/40" />
      <span className="tf-orbit-arc-rev absolute inset-4 rounded-full border border-transparent border-b-primary/60" />
      <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">{children}</span>
    </div>
  );
}

/** Ordered stage list: done, active (pulsing), upcoming. */
export function StageSteps({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="mx-auto mt-5 max-w-xs space-y-2 text-left">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2.5 text-sm">
          <span
            className={cn(
              "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold transition-colors",
              i < active ? "border-accent bg-accent text-accent-foreground" : i === active ? "tf-step-pulse border-accent text-accent" : "border-border text-muted-foreground",
            )}
          >
            {i < active ? "✓" : i + 1}
          </span>
          <span className={cn(i === active ? "font-semibold text-foreground" : i < active ? "text-foreground" : "text-muted-foreground")}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

/** Three cards fanning out, for flashcard loading. */
export function CardFan({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center py-6">
      <div aria-hidden="true" className="relative h-24 w-20">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`tf-fan-card tf-fan-${i} absolute inset-0 rounded-xl border border-accent/60 bg-card shadow-md`} />
        ))}
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

/** A thin gold beam sweeping a document card while text is read. */
export function ScanBeam({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("relative mt-2 h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <span className="tf-scan-beam absolute inset-y-0 w-1/3 rounded-full bg-accent" />
    </div>
  );
}

/** No fictional progress: ornament moves while the caller reports real status. */
export function MockGeneratingLoader({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("tf-generating relative mx-auto grid size-28 place-items-center", className)}>
    <span className="tf-orbit-arc absolute inset-0 rounded-full border border-border border-t-accent" />
    <span className="tf-orbit-arc-rev absolute inset-3 rounded-full border border-border border-b-accent" />
    <span className="tf-compass absolute inset-8 rounded-lg border border-accent bg-card shadow-sm" />
    <Sparkles className="relative size-7 text-accent" />
  </div>;
}

export function PaymentVerifyingLoader() {
  return <div aria-hidden="true" className="tf-payment relative mx-auto grid size-28 place-items-center">
    <span className="tf-orbit-arc absolute inset-0 rounded-full border-2 border-border border-t-accent" />
    <span className="tf-orbit-halo absolute inset-3 rounded-full border border-accent/40" />
    <ShieldCheck className="relative size-12 text-accent" strokeWidth={1.4} />
  </div>;
}

/** Sized like the real folder list; the binder and scan are purely decorative. */
export function LockerSkeletonLoader({ shelf = false, files = false }: { shelf?: boolean; files?: boolean }) {
  return <div role="status" aria-label={shelf ? "Loading course shelf" : "Loading your files"} aria-busy="true" className="space-y-3">
    <div className="flex min-h-16 items-center gap-3 px-1">
      <div aria-hidden="true" className="tf-binder relative grid size-12 shrink-0 place-items-center rounded-lg border border-accent/40 bg-card">
        <BookOpen className="size-6 text-accent" />
        <span className="tf-binder-cover absolute inset-0 rounded-lg border border-accent/50 bg-card/80" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{shelf ? "Loading published course materials…" : "Loading your study files…"}</p>
    </div>
    <div aria-hidden="true" className="space-y-3">
      {[0, 1, 2].map((row) => <div key={row} className={cn("tf-file-skeleton locker-skeleton-row relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card px-4", files ? "h-36" : "h-20")}>
        <SkeletonBlock className={files ? "h-24 w-18 shrink-0" : "size-10 shrink-0"} />
        <div className="min-w-0 flex-1 space-y-2"><SkeletonBlock className="h-3 w-2/3" /><SkeletonBlock className="h-2.5 w-1/3" /></div>
        <span className="tf-document-scan pointer-events-none absolute inset-y-0 w-1/4" />
      </div>)}
    </div>
  </div>;
}
