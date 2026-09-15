import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
            onClick={() => navigate("account")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Account
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

        <Button size="lg" className="mt-6 w-full" onClick={() => navigate("home")}>Done</Button>
      </div>
    </div>
  );
}

