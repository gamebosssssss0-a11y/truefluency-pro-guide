import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Slide = { id: string; art: ReactNode; title: string; body: string };

/** Manual swipe carousel: scroll-snap, dots and Prev/Next. Never auto-plays. */
export function SwipeCarousel({ slides, label, layout = "stack" }: { slides: Slide[]; label: string; layout?: "stack" | "split" }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? el.clientWidth;
      setIndex(Math.max(0, Math.min(slides.length - 1, Math.round(el.scrollLeft / (w + 16)))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [slides.length]);

  const goTo = useCallback((i: number) => {
    const el = track.current;
    const child = el?.children[i] as HTMLElement | undefined;
    if (!el || !child) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: reduce ? "auto" : "smooth" });
  }, []);

  const controls = (
    <div className="mt-4 flex items-center justify-between gap-3">
      <div className="flex items-center" role="group" aria-label="Choose slide">
        {slides.map((s, i) => (
          <button key={s.id} type="button" onClick={() => goTo(i)} aria-label={`Slide ${i + 1} of ${slides.length}: ${s.title}`} aria-current={i === index ? "true" : undefined} className="grid h-11 w-6 place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
            <span className={cn("block h-2 rounded-full transition-all motion-reduce:transition-none", i === index ? "w-5 bg-accent" : "w-2 bg-foreground/20")} />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous slide"><ChevronLeft className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => goTo(index + 1)} disabled={index === slides.length - 1} aria-label="Next slide"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} className="min-w-0">
      <div ref={track} data-swipe-lock className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:scroll-px-0 md:px-0">
        {slides.map((s, i) => (
          <article key={s.id} aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`} className={cn("w-[86%] shrink-0 snap-start rounded-[20px] border border-border bg-card p-3 shadow-sm", layout === "split" ? "md:grid md:w-full md:grid-cols-[1.1fr_1fr] md:items-center md:gap-8 md:p-6" : "sm:w-[70%]")}>
            <div>{s.art}</div>
            <div className="px-1 pb-1 pt-4 md:pt-0">
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
