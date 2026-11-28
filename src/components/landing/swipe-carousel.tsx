import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Slide = { id: string; art: ReactNode; title: string; body: string };

/** Manual swipe carousel: scroll-snap, dots and Prev/Next. Never auto-plays. */
export function SwipeCarousel({ slides, label, layout = "stack" }: { slides: Slide[]; label: string; layout?: "stack" | "split" }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const gesture = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const children = Array.from(el.children) as HTMLElement[];
      const origin = children[0]?.offsetLeft ?? 0;
      let closest = 0;
      let distance = Infinity;
      children.forEach((child, i) => {
        const delta = Math.abs(child.offsetLeft - origin - el.scrollLeft);
        if (delta < distance) { distance = delta; closest = i; }
      });
      setIndex(closest);
    };
    const child = el.children[index] as HTMLElement | undefined;
    if (child) el.scrollTo({ left: child.offsetLeft - ((el.firstElementChild as HTMLElement | null)?.offsetLeft ?? 0), behavior: "instant" });
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
    // Restore the selected slide when motion preference changes the track.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, reducedMotion]);

  const goTo = useCallback((i: number) => {
    const next = Math.max(0, Math.min(slides.length - 1, i));
    if (reducedMotion) { setIndex(next); return; }
    const el = track.current;
    const child = el?.children[next] as HTMLElement | undefined;
    if (!el || !child) return;
    const origin = (el.firstElementChild as HTMLElement | null)?.offsetLeft ?? 0;
    el.scrollTo({ left: child.offsetLeft - origin, behavior: "smooth" });
  }, [reducedMotion, slides.length]);

  const controls = (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center" role="group" aria-label="Choose slide">
        {slides.map((s, i) => (
          <Button key={s.id} type="button" variant="ghost" size="icon" onClick={() => goTo(i)} aria-label={`Slide ${i + 1} of ${slides.length}: ${s.title}`} aria-current={i === index ? "true" : undefined} className="h-11 w-11 shrink-0 rounded-full p-0">
            <span className={cn("block h-2 rounded-full transition-all motion-reduce:transition-none", i === index ? "w-5 bg-accent-ink" : "w-2 bg-muted-foreground")} />
          </Button>
        ))}
      </div>
      <div className="ml-auto flex gap-2">
        <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous slide"><ChevronLeft className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => goTo(index + 1)} disabled={index === slides.length - 1} aria-label="Next slide"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} className="tf-swipe-carousel min-w-0">
      <div
        ref={track} data-swipe-lock
        onPointerDown={(event) => { if (reducedMotion && event.isPrimary) gesture.current = { x: event.clientX, y: event.clientY }; }}
        onPointerCancel={() => { gesture.current = null; }}
        onPointerUp={(event) => {
          const start = gesture.current;
          gesture.current = null;
          if (!start || !reducedMotion) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(index + (dx < 0 ? 1 : -1));
        }}
        className={cn("tf-carousel-track pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", reducedMotion ? "touch-pan-y" : "-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 md:mx-0 md:scroll-px-0 md:px-0")}
      >
        {slides.map((s, i) => reducedMotion && i !== index ? null : (
          <article key={s.id} aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`} className={cn("tf-carousel-slide shrink-0 snap-start rounded-[20px] border border-border bg-card p-3 shadow-sm", reducedMotion ? "w-full" : "w-[86%]", layout === "split" ? "md:grid md:w-full md:grid-cols-[1.1fr_1fr] md:items-center md:gap-8 md:p-6" : !reducedMotion && "sm:w-[70%]")}>
            <div>{s.art}</div>
            <div className={cn("px-1 pb-1 pt-4", layout === "split" && "md:pt-0")}>
              <p className="text-xs font-semibold tabular-nums text-accent-ink">{String(i + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-card-foreground">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </article>
        ))}
      </div>
      {controls}
    </div>
  );
}
