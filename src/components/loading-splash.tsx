import { useEffect, useMemo, useRef, useState } from "react";
import {
  LOGO_ACCENT, LOGO_BG, LOGO_DOT, LOGO_PATH, LOGO_VIEWBOX,
} from "@/components/logo-mark";
import { cn } from "@/lib/utils";

/**
 * "Sonic Unfurl + Particle Lock" full-screen loading / splash animation.
 *
 * 1. UNFURL      0 -> 1.1s   stroke draws itself along the exact logo path
 * 2. PARTICLES   0.9 -> 1.3s 14 particles converge on the stroke endpoint
 * 3. FLARE       1.3 -> 1.5s amber dot springs in, glow flash, pulse sweeps back
 * 4. TEXT        1.5 -> 1.9s wordmark fades + slides up, staggered
 * 5. HOLD/EXIT   fades out on ready, or loops steps 2-3 as an ambient beat
 */

const PARTICLE_COUNT = 14;
const AMBIENT_AFTER_MS = 2500;
const AMBIENT_EVERY_MS = 1400;

type Particle = {
  dx: number;
  dy: number;
  size: number;
  color: string;
  opacity: number;
  delay: number;
  duration: number;
};

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random();
    const dist = 18 + Math.random() * 22;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      size: 2 + Math.round(Math.random() * 2),
      color: i % 3 === 0 ? "#FFFFFF" : LOGO_ACCENT,
      opacity: 0.5 + Math.random() * 0.5,
      delay: 900 + Math.random() * 220,
      duration: 340 + Math.random() * 160,
    };
  });
}

export function SonicUnfurlLoader({
  /** Fires once the full sequence has played out. */
  onDone,
  /** While true, the loader keeps looping the ambient particle + flare beat. */
  busy,
  caption,
  tapHint,
  className,
}: {
  onDone?: () => void;
  busy?: boolean;
  caption?: string;
  tapHint?: string;
  className?: string;
}) {
  const particles = useMemo(makeParticles, []);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [cycle, setCycle] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch { /* ignore */ }
    setReduceMotion(reduced);

    const total = reduced ? 350 : 1900;
    const timer = window.setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone?.();
    }, total);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  // Ambient "still working" beat: replay particles + flare only, line stays drawn.
  useEffect(() => {
    if (!busy || reduceMotion) return;
    const start = window.setTimeout(() => {
      setCycle((c) => c + 1);
    }, AMBIENT_AFTER_MS);
    const loop = window.setInterval(() => setCycle((c) => c + 1), AMBIENT_EVERY_MS);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(loop);
    };
  }, [busy, reduceMotion]);

  const ambient = cycle > 0;

  return (
    <div
      className={cn("relative grid min-h-screen w-full place-items-center px-6", className)}
      style={{ backgroundColor: LOGO_BG }}
    >
      <div className="flex flex-col items-center">
        {/* Mark */}
        <div className="relative h-[104px] w-[164px]">
          <svg viewBox={LOGO_VIEWBOX} className="absolute inset-0 h-full w-full" fill="none" aria-hidden="true">
            <path
              d={LOGO_PATH}
              stroke="#FFFFFF"
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              className={reduceMotion ? undefined : "sonic-unfurl-path"}
              strokeDasharray={1}
            />
            {/* Light pulse travelling back along the drawn line */}
            {!reduceMotion ? (
              <path
                key={`pulse-${cycle}`}
                d={LOGO_PATH}
                stroke={LOGO_ACCENT}
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray="0.14 0.86"
                className={ambient ? "sonic-pulse sonic-pulse-ambient" : "sonic-pulse"}
              />
            ) : null}
            <circle
              key={`dot-${cycle}`}
              cx={LOGO_DOT.x}
              cy={LOGO_DOT.y}
              r={LOGO_DOT.r}
              fill={LOGO_ACCENT}
              className={reduceMotion ? undefined : ambient ? "sonic-dot sonic-dot-ambient" : "sonic-dot"}
              style={{ transformOrigin: `${LOGO_DOT.x}px ${LOGO_DOT.y}px` }}
            />
          </svg>

          {/* Lock-in flare */}
          {!reduceMotion ? (
            <span
              key={`flare-${cycle}`}
              aria-hidden="true"
              className={ambient ? "sonic-flare sonic-flare-ambient" : "sonic-flare"}
              style={{
                left: `${(LOGO_DOT.x / 100) * 100}%`,
                top: `${(LOGO_DOT.y / 64) * 100}%`,
              }}
            />
          ) : null}

          {/* Particle convergence on the endpoint */}
          {!reduceMotion
            ? particles.map((p, i) => (
                <span
                  key={`p-${cycle}-${i}`}
                  aria-hidden="true"
                  className={ambient ? "sonic-particle sonic-particle-ambient" : "sonic-particle"}
                  style={{
                    left: `${(LOGO_DOT.x / 100) * 100}%`,
                    top: `${(LOGO_DOT.y / 64) * 100}%`,
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    // @ts-expect-error custom properties
                    "--dx": `${p.dx}px`,
                    "--dy": `${p.dy}px`,
                    "--po": p.opacity,
                    animationDelay: `${ambient ? p.delay - 900 : p.delay}ms`,
                    animationDuration: `${p.duration}ms`,
                  }}
                />
              ))
            : null}
        </div>

        {/* Text reveal */}
        <div className="mt-4 flex items-end gap-2">
          <span
            className={cn("font-display text-4xl font-bold leading-none tracking-tight", !reduceMotion && "sonic-text-1")}
            style={{ color: "#A5B4FC", fontVariationSettings: '"opsz" 144', fontWeight: 700 }}
          >
            TrueFluency
          </span>
          <span
            className={cn("pb-1 font-sans text-xs font-semibold uppercase", !reduceMotion && "sonic-text-2")}
            style={{ color: "#9CA3AF", letterSpacing: "0.08em" }}
          >
            Pro
          </span>
        </div>

        {caption ? (
          <p className={cn("mt-3 text-center text-sm", !reduceMotion && "sonic-text-2")} style={{ color: "#9CA3AF" }}>
            {caption}
          </p>
        ) : null}
        {tapHint ? (
          <p className="mt-6 text-[11px]" style={{ color: "#6B7280" }}>{tapHint}</p>
        ) : null}
      </div>
    </div>
  );
}
