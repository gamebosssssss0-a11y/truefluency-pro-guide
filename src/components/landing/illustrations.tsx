/**
 * Editorial inline-SVG illustrations for the landing page and plan sheets.
 * Colours come only from theme variables so light and dark modes both work.
 * Motion classes (tf-ill-*) are switched off under prefers-reduced-motion.
 */
import type { ReactNode } from "react";

const INK = "var(--foreground)";
const PAPER = "var(--card)";
const CANVAS = "var(--background)";
const GOLD = "var(--accent)";
const LINE = "var(--border)";
const SOFT = "var(--muted)";

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 220" role="img" aria-label={label} className="h-auto w-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="318" height="218" rx="20" fill={CANVAS} stroke={LINE} />
      {children}
    </svg>
  );
}

const Bar = ({ x, y, w, o = 0.18 }: { x: number; y: number; w: number; o?: number }) => (
  <rect x={x} y={y} width={w} height="6" rx="3" fill={INK} opacity={o} />
);

export function NotesToMockArt() {
  return (
    <Frame label="A handout flowing into a four-option question card">
      <g transform="rotate(-5 90 110)">
        <rect x="34" y="44" width="104" height="136" rx="10" fill={PAPER} stroke={INK} strokeWidth="1.5" />
        <rect x="46" y="56" width="34" height="16" rx="5" fill={INK} />
        <text x="63" y="68" textAnchor="middle" fontSize="11" fontWeight="700" fill={CANVAS}>PDF</text>
        <Bar x={46} y={86} w={78} /><Bar x={46} y={100} w={66} /><Bar x={46} y={114} w={72} />
        <Bar x={46} y={128} w={52} /><Bar x={46} y={142} w={70} /><Bar x={46} y={156} w={44} />
      </g>
      <path className="tf-ill-flow" d="M146 110 C164 110 166 110 182 110" stroke={GOLD} strokeWidth="2" strokeDasharray="4 5" />
      <path d="M178 104 l7 6 -7 6" stroke={GOLD} strokeWidth="2" />
      <rect x="192" y="40" width="104" height="140" rx="12" fill={PAPER} stroke={INK} strokeWidth="1.5" />
      <Bar x={204} y={54} w={80} o={0.55} /><Bar x={204} y={66} w={58} o={0.3} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="204" y={86 + i * 22} width="80" height="16" rx="8" fill={i === 1 ? GOLD : CANVAS} fillOpacity={i === 1 ? 0.22 : 1} stroke={i === 1 ? GOLD : LINE} strokeWidth="1.5" />
          <circle cx="213" cy={94 + i * 22} r="3.5" fill={i === 1 ? GOLD : "none"} stroke={i === 1 ? GOLD : INK} strokeOpacity={i === 1 ? 1 : 0.4} strokeWidth="1.5" />
          <Bar x={222} y={91 + i * 22} w={i === 1 ? 50 : 40} o={0.22} />
        </g>
      ))}
    </Frame>
  );
}

export function ExplanationArt() {
  return (
    <Frame label="An answered option with a check mark and a structured explanation">
      <rect x="40" y="34" width="240" height="152" rx="14" fill={PAPER} stroke={INK} strokeWidth="1.5" />
      <rect x="56" y="50" width="208" height="28" rx="10" fill={INK} />
      <circle cx="74" cy="64" r="8" fill={CANVAS} />
      <path d="M70 64 l3 3 6 -6" stroke={INK} strokeWidth="2" />
      <rect x="90" y="61" width="110" height="6" rx="3" fill={CANVAS} opacity="0.8" />
      <rect x="56" y="94" width="4" height="72" rx="2" fill={GOLD} />
      <circle className="tf-ill-pulse" cx="76" cy="102" r="6" fill={GOLD} />
      <rect x="90" y="98" width="70" height="8" rx="4" fill={GOLD} opacity="0.5" />
      <Bar x={72} y={120} w={176} o={0.2} /><Bar x={72} y={132} w={150} o={0.2} />
      <Bar x={72} y={150} w={168} o={0.14} /><Bar x={72} y={162} w={120} o={0.14} />
    </Frame>
  );
}

export function SavedMockArt() {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <Frame label="A timer with a progress arc beside a shield showing saved progress">
      <circle cx="120" cy="112" r={r} fill={PAPER} stroke={INK} strokeWidth="1.5" />
      <circle cx="120" cy="112" r={r - 10} stroke={SOFT} strokeWidth="6" />
      <circle className="tf-ill-arc" cx="120" cy="112" r={r - 10} stroke={GOLD} strokeWidth="6" strokeDasharray={`${c * 0.62} ${c}`} transform="rotate(-90 120 112)" />
      <rect x="112" y="52" width="16" height="8" rx="3" fill={INK} />
      <path d="M120 112 V86 M120 112 L136 120" stroke={INK} strokeWidth="2" />
      <circle cx="120" cy="112" r="3.5" fill={INK} />
      <path d="M232 64 L268 76 V112 C268 136 252 152 232 160 C212 152 196 136 196 112 V76 Z" fill={PAPER} stroke={INK} strokeWidth="1.5" />
      <path d="M232 76 L256 84 V112 C256 128 246 140 232 146 Z" fill={GOLD} opacity="0.22" />
      <path d="M218 112 l9 9 17 -18" stroke={INK} strokeWidth="2.25" />
    </Frame>
  );
}

export function FlashcardArt() {
  return (
    <Frame label="Two overlapping flashcards with a flip cue and a mastery dot">
      <rect x="64" y="58" width="150" height="104" rx="14" fill={SOFT} stroke={INK} strokeOpacity="0.35" strokeWidth="1.5" transform="rotate(-7 139 110)" />
      <g className="tf-ill-float">
        <rect x="104" y="52" width="156" height="110" rx="14" fill={PAPER} stroke={INK} strokeWidth="1.5" />
        <text x="122" y="76" fontSize="11" fontWeight="700" fill={INK} opacity="0.6">TERM</text>
        <Bar x={122} y={90} w={104} o={0.5} /><Bar x={122} y={104} w={78} o={0.22} />
        <circle cx="240" cy="72" r="6" fill={GOLD} />
        <rect x="122" y="128" width="64" height="20" rx="10" fill={CANVAS} stroke={LINE} />
        <Bar x={132} y={135} w={44} o={0.25} />
      </g>
      <path d="M228 176 a26 14 0 0 1 -60 0" stroke={GOLD} strokeWidth="2" />
      <path d="M166 170 l2 7 7 -2" stroke={GOLD} strokeWidth="2" />
    </Frame>
  );
}

export function CgpaGaugeArt() {
  // Semicircle gauge calibrated 0 → 5.00 with First Class (4.50–5.00) in gold.
  const cx = 160, cy = 160, r = 92;
  const pt = (v: number, rr = r) => {
    const a = Math.PI * (1 - v / 5);
    return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)] as const;
  };
  const arc = (a: number, b: number) => {
    const [x1, y1] = pt(a); const [x2, y2] = pt(b);
    return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const [nx, ny] = pt(4.62, r - 22);
  return (
    <Frame label="A CGPA gauge on the 5.00 scale with the First Class range from 4.50 to 5.00 marked">
      <path d={arc(0, 5)} stroke={SOFT} strokeWidth="14" />
      <path d={arc(0, 4.5)} stroke={INK} strokeOpacity="0.18" strokeWidth="14" />
      <path d={arc(4.5, 5)} stroke={GOLD} strokeWidth="14" />
      {[0, 1, 2, 3, 4, 5].map((v) => {
        const [x1, y1] = pt(v, r + 12); const [tx, ty] = pt(v, r + 24);
        return (
          <g key={v}>
            <circle cx={x1} cy={y1} r="1.6" fill={INK} opacity="0.5" />
            <text x={tx} y={ty + 4} textAnchor="middle" fontSize="11" fill={INK} opacity="0.6" style={{ fontVariantNumeric: "tabular-nums" }}>{v}</text>
          </g>
        );
      })}
      <path className="tf-ill-needle" d={`M${cx} ${cy} L${nx} ${ny}`} stroke={INK} strokeWidth="3" style={{ transformOrigin: `${cx}px ${cy}px` }} />
      <circle cx={cx} cy={cy} r="7" fill={INK} />
      <text x={cx} y={cy + 30} textAnchor="middle" fontSize="13" fontWeight="700" fill={INK} style={{ fontVariantNumeric: "tabular-nums" }}>First Class · 4.50–5.00</text>
    </Frame>
  );
}

/** Small numeric plan illustration: a large figure with a caption pill. */
export function LimitArt({ value, unit, label, locked = false }: { value: string; unit: string; label: string; locked?: boolean }) {
  return (
    <Frame label={`${value} ${unit}: ${label}`}>
      <rect x="70" y="36" width="180" height="148" rx="16" fill={PAPER} stroke={INK} strokeWidth="1.5" />
      <text x="160" y="110" textAnchor="middle" fontSize="48" fontWeight="700" fill={locked ? INK : INK} opacity={locked ? 0.35 : 1} style={{ fontVariantNumeric: "tabular-nums" }}>{value}</text>
      <text x="160" y="134" textAnchor="middle" fontSize="13" fill={INK} opacity="0.65">{unit}</text>
      <rect x="110" y="150" width="100" height="6" rx="3" fill={locked ? SOFT : GOLD} />
      {locked ? (
        <g transform="translate(222 46)">
          <rect x="0" y="10" width="20" height="16" rx="4" fill={INK} />
          <path d="M4 10 V6 a6 6 0 0 1 12 0 V10" stroke={INK} strokeWidth="2" />
        </g>
      ) : (
        <circle className="tf-ill-pulse" cx="232" cy="56" r="6" fill={GOLD} />
      )}
    </Frame>
  );
}
