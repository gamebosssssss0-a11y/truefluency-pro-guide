import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers, Sparkles } from "lucide-react";
import { HeaderLogo } from "@/components/brand";
import { AddCourseFlow } from "@/components/add-course-flow";

export function AddCourseScreen() {
  const { profile, update, navigate } = useProfile();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <button
            onClick={() => navigate("settings")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Settings
          </button>
        </div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Add a course</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search the catalogue first. If it's not there, add it manually.
        </p>

        <div className="mt-6">
          <AddCourseFlow
            existing={profile.courses}
            level={profile.level ?? undefined}
            onAdd={(c) => update({ courses: [...profile.courses, c] })}
            onRemove={(code) => update({ courses: profile.courses.filter((x) => x.code !== code) })}
          />
        </div>

        <Button size="lg" className="mt-6 w-full" onClick={() => navigate("dashboard")}>Done</Button>
      </div>
    </div>
  );
}

export function FlashcardsSoonScreen() {
  const { navigate } = useProfile();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <button
            onClick={() => navigate("dashboard")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
            <Layers className="h-6 w-6" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coming soon</div>
          <h1 className="mt-1 font-display text-2xl font-semibold text-foreground">Flashcards</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-generated spaced-repetition cards straight from your predicted topics.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> We'll notify you here when it's ready.
          </div>
        </div>
      </div>
    </div>
  );
}
