import { useState, type ComponentType } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useProfile, type Goal, type Timeline, type StudyPreference } from "@/lib/profile-store";
import type { OnboardingStep } from "@/lib/profile-store";
import {
  Target, Trophy, RefreshCcw,
  AlarmClock, CalendarDays, CalendarRange, HelpCircle,
  ClipboardCheck, Layers, BookOpen,
  Check, ArrowLeft, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Option<T> = { value: T; label: string; hint?: string; icon: ComponentType<{ className?: string }> };

const goals: Option<Goal>[] = [
  { value: "pass", label: "Pass my exams", hint: "Cover the essentials and stay above the line.", icon: Target },
  { value: "top-grades", label: "Aim for top grades", hint: "Push for firsts and stretch questions.", icon: Trophy },
  { value: "catch-up", label: "Catch up on missed classes", hint: "Fill the gaps from topics you skipped.", icon: RefreshCcw },
];

const timelines: Option<Timeline>[] = [
  { value: "lt-week", label: "Less than a week", icon: AlarmClock },
  { value: "2-4-weeks", label: "2 – 4 weeks", icon: CalendarDays },
  { value: "gt-month", label: "More than a month", icon: CalendarRange },
  { value: "unsure", label: "Not sure yet", icon: HelpCircle },
];

const prefs: Option<StudyPreference>[] = [
  { value: "practice", label: "Practice questions", hint: "Mock tests with instant feedback.", icon: ClipboardCheck },
  { value: "flashcards", label: "Flashcards / quick review", hint: "Bite-sized memory drills.", icon: Layers },
  { value: "reading", label: "Reading through notes", hint: "Longer-form notes and slides.", icon: BookOpen },
];

/* Position in the personalization sub-sequence (3 dots). */
function Dots({ index }: { index: 0 | 1 | 2 }) {
  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i === index ? "w-6 bg-accent" : "w-1.5 bg-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

function PersonalizationScreen<T extends string>({
  step, stepIndex, title, subtitle, options, value, onChange, onBack, onNext,
}: {
  step: number;
  stepIndex: 0 | 1 | 2;
  title: string;
  subtitle: string;
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <AppShell step={step} total={7} title={title} subtitle={subtitle}>
      <div className="space-y-2.5">
        {options.map((o) => {
          const selected = value === o.value;
          const Icon = o.icon;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-2xl border p-4 text-left shadow-sm transition",
                selected
                  ? "border-accent bg-accent/10 shadow-md"
                  : "border-border bg-card hover:border-accent/60",
              )}
            >
              <div
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-xl transition",
                  selected ? "bg-accent text-accent-foreground" : "bg-secondary text-primary",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{o.label}</div>
                {o.hint ? <div className="mt-0.5 text-xs text-muted-foreground">{o.hint}</div> : null}
              </div>
              {selected ? (
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Check className="h-3.5 w-3.5" />
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <Dots index={stepIndex} />

      <div className="mt-6 flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Button type="button" className="flex-[2]" disabled={!value} onClick={onNext}>
          Next <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </AppShell>
  );
}

export function GoalScreen() {
  const { profile, update, go } = useProfile();
  const [value, setValue] = useState<Goal | null>(profile.goal);
  return (
    <PersonalizationScreen
      step={2}
      stepIndex={0}
      title="What's your main goal right now?"
      subtitle="We'll tune your dashboard around this."
      options={goals}
      value={value}
      onChange={setValue}
      onBack={() => go("identity" as OnboardingStep)}
      onNext={() => { if (value) { update({ goal: value }); go("timeline"); } }}
    />
  );
}

export function TimelineScreen() {
  const { profile, update, go } = useProfile();
  const [value, setValue] = useState<Timeline | null>(profile.timeline);
  return (
    <PersonalizationScreen
      step={3}
      stepIndex={1}
      title="How much time until your next exam?"
      subtitle="This helps us pace your study sessions."
      options={timelines}
      value={value}
      onChange={setValue}
      onBack={() => go("goal")}
      onNext={() => { if (value) { update({ timeline: value }); go("study-pref"); } }}
    />
  );
}

export function StudyPreferenceScreen() {
  const { profile, update, go } = useProfile();
  const [value, setValue] = useState<StudyPreference | null>(profile.studyPreference);
  return (
    <PersonalizationScreen
      step={4}
      stepIndex={2}
      title="How do you prefer to study?"
      subtitle="We'll surface this style first on your dashboard."
      options={prefs}
      value={value}
      onChange={setValue}
      onBack={() => go("timeline")}
      onNext={() => { if (value) { update({ studyPreference: value }); go("faculty"); } }}
    />
  );
}
