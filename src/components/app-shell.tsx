import { type ReactNode } from "react";
import { GraduationCap } from "lucide-react";

export function AppShell({
  children,
  step,
  total,
  title,
  subtitle,
  compact,
}: {
  children: ReactNode;
  step?: number;
  total?: number;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const pct = step && total ? Math.round((step / total) * 100) : 0;
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-display text-base font-semibold tracking-tight text-foreground">
              TrueFluency <span className="text-accent">Pro</span>
            </span>
          </div>
          {step && total ? (
            <span className="text-xs font-medium text-muted-foreground">
              Step {step} of {total}
            </span>
          ) : null}
        </header>

        {step && total ? (
          <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}

        {title ? (
          <div className={compact ? "mb-4" : "mb-6"}>
            <h1 className="font-display text-3xl font-semibold leading-tight text-foreground">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
