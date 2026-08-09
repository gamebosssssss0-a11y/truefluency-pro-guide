import { useProfile } from "@/lib/profile-store";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Target, Calculator, TrendingUp } from "lucide-react";

/**
 * One-time introduction to CGPA goal-setting, shown at the end of setup.
 * Purely a signpost: it never asks for numbers here, and skipping costs
 * nothing because both tools stay in the Account tab.
 */
export function CgpaIntroScreen() {
  const { go, navigate, update } = useProfile();

  const finish = (openGoalSetter: boolean) => {
    update({ cgpaIntroSeen: true });
    go("dashboard");
    navigate(openGoalSetter ? "cgpa-goal" : "home");
  };

  return (
    <AppShell
      title="One last thing: your CGPA"
      subtitle="TrueFluency can work backwards from the CGPA you want, and tell you the grades and daily study load it actually takes."
    >
      <div className="space-y-2.5">
        <Point
          icon={Calculator}
          title="Know where you stand"
          body="Enter your real scores and see your semester GPA and cumulative CGPA on the 0.00 to 5.00 scale."
        />
        <Point
          icon={Target}
          title="Set a target"
          body="Pick the CGPA you're aiming at and see the minimum grade needed in each course this semester."
        />
        <Point
          icon={TrendingUp}
          title="Get a daily plan"
          body="Reading minutes and mock question quotas per course, weighted by credit units."
        />
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/60 p-3.5 text-xs text-muted-foreground">
        Setting a goal is optional and you can change it at any time. Both tools live under the
        Account tab.
      </div>

      <Button size="lg" className="mt-6 w-full" onClick={() => finish(true)}>
        <Target className="mr-1.5 h-4 w-4" /> Yes, set my CGPA goal
      </Button>
      <Button variant="ghost" size="lg" className="mt-2 w-full" onClick={() => finish(false)}>
        Skip for now
      </Button>
    </AppShell>
  );
}

function Point({
  icon: Icon, title, body,
}: { icon: typeof Target; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
