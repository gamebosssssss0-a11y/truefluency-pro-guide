import type { ComponentProps } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Call the owning screen's existing navigation/leave guard, never a second router. */
export function BackButton({ onBack, className, ...props }: Omit<ComponentProps<typeof Button>, "onClick"> & { onBack: () => void }) {
  return (
    <Button type="button" variant="outline" size="icon" aria-label="Go back" title="Go back"
      {...props} onClick={() => {
        document.documentElement.dataset.nextViewDirection = "back";
        onBack();
      }} className={cn("tf-back-button size-11 shrink-0 rounded-full", className)}>
      <ArrowLeft className="size-[18px]" aria-hidden="true" />
    </Button>
  );
}