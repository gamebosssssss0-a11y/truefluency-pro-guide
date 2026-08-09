/**
 * TrueFluency PRO logo mark: a flowing white stroke that resolves into a
 * checkmark, anchored by an amber dot, on the dark (near-black) lockup.
 * This is the single source of truth for the logo everywhere in the app.
 */
export const LOGO_VIEWBOX = "0 0 100 64";

/** The flowing-line-into-checkmark stroke path. */
export const LOGO_PATH =
  "M6 42 C16 42 20 12 32 12 C44 12 44 44 56 44 L66 54 L82 22";

/** Terminal point of the stroke, where the amber dot locks in. */
export const LOGO_DOT = { x: 85, y: 17, r: 5.5 };

export const LOGO_BG = "#0F0F14";
export const LOGO_ACCENT = "#F59E0B";

export function LogoMark({
  className,
  strokeWidth = 7,
  plain,
}: {
  className?: string;
  strokeWidth?: number;
  /** Render just the mark with no dark plate behind it. */
  plain?: boolean;
}) {
  const svg = (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={plain ? className : "h-[62%] w-[62%]"}
      fill="none"
      aria-hidden="true"
    >
      <path
        d={LOGO_PATH}
        stroke="#FFFFFF"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={LOGO_DOT.x} cy={LOGO_DOT.y} r={LOGO_DOT.r} fill={LOGO_ACCENT} />
    </svg>
  );

  if (plain) return svg;

  return (
    <span
      className={
        "grid shrink-0 place-items-center overflow-hidden rounded-lg " + (className ?? "h-7 w-7")
      }
      style={{ backgroundColor: LOGO_BG }}
    >
      {svg}
    </span>
  );
}
