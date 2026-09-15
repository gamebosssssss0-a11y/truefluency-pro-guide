import { useProfile } from "@/lib/profile-store";
import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

/**
 * Small, static, icon-only brand mark for the app header. Present on every
 * screen as a constant brand anchor; tapping it returns to Home.
 */
export function HeaderLogo({ className }: { className?: string }) {
  const { navigate } = useProfile();
  return (
    <button
      type="button"
      onClick={() => navigate("home")}
      aria-label="TrueFluency Pro home"
      className={cn("shrink-0 rounded-lg shadow-sm transition hover:opacity-90", className)}
    >
      <LogoMark className="h-7 w-7" />
    </button>
  );
}

/**
 * Full wordmark: "TrueFluency" in Fraunces (display optical size) plus a small
 * Inter "PRO" tag. Used on the splash screen and any About placement.
 */
export function Wordmark({
  size = "md",
  onDark,
  className,
}: {
  size?: "md" | "lg";
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end gap-2", className)}>
      <span
        className={cn(
          "font-display font-bold leading-none tracking-tight",
          size === "lg" ? "text-4xl" : "text-2xl",
          onDark ? "text-primary-foreground" : "text-[#4F46E5]",
        )}
        style={{ fontVariationSettings: '"opsz" 144', fontWeight: 700 }}
      >
        TrueFluency
      </span>
      <span
        className={cn(
          "pb-0.5 font-sans font-semibold uppercase",
          size === "lg" ? "text-xs" : "text-[10px]",
          onDark ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
        style={{ letterSpacing: "0.05em" }}
      >
        Pro
      </span>
    </div>
  );
}

/** Brand lockup: the mark beside the wordmark, for empty states and headers. */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-9" />
      <Wordmark />
    </div>
  );
}
