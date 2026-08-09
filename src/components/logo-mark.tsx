import markAsset from "@/assets/truefluency-mark.jpg.asset.json";

/**
 * TrueFluency PRO logo mark: the indigo squircle with the white flowing wave
 * and amber tip. Single source of truth for the logo everywhere in the app.
 */
export const LOGO_MARK_URL = markAsset.url;

export const LOGO_VIEWBOX = "0 0 100 64";

/** Legacy stroke path kept for the splash pulse geometry. */
export const LOGO_PATH =
  "M6 42 C16 42 20 12 32 12 C44 12 44 44 56 44 L66 54 L82 22";

/** Terminal point of the stroke, where the amber dot locks in. */
export const LOGO_DOT = { x: 85, y: 17, r: 5.5 };

export const LOGO_BG = "#0F0F14";
export const LOGO_ACCENT = "#F59E0B";

export function LogoMark({
  className,
  plain,
}: {
  className?: string;
  strokeWidth?: number;
  /** Render the mark without the rounded container sizing helper. */
  plain?: boolean;
}) {
  return (
    <img
      src={LOGO_MARK_URL}
      alt=""
      aria-hidden="true"
      className={
        (plain ? "" : "shrink-0 overflow-hidden rounded-[22%] ") +
        (className ?? "h-7 w-7")
      }
      style={{ objectFit: "cover" }}
    />
  );
}
