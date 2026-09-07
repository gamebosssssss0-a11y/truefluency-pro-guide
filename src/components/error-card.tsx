import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * One shared failure card: generation timeouts, sharing offline, redeem
 * misses and auth failures all use it. White card on cream, amber action.
 */
export function ErrorCard({
  title = "Mock didn't finish",
  body = "The server took too long. Your file is still in your locker.",
  actionLabel = "Try again",
  onAction,
  linkLabel = "Back to Mock Tests",
  onLink,
}: {
  title?: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  linkLabel?: string;
  onLink?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#E4DCC8] bg-white p-5 text-left">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#B86E0A]/12 text-[#B86E0A]">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h2 className="font-display text-lg font-semibold text-[#1B2A4A]">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[#5C5C70]">{body}</p>
      {onAction ? (
        <Button
          className="mt-4 w-full bg-[#B86E0A] text-white hover:bg-[#B86E0A]/90"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
      {onLink ? (
        <button
          type="button"
          onClick={onLink}
          className="mt-3 w-full text-center text-[13px] font-medium text-[#5C5C70] underline underline-offset-4"
        >
          {linkLabel}
        </button>
      ) : null}
    </div>
  );
}
