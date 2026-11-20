import { BackButton } from "@/components/ui/back-button";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { HeaderLogo } from "@/components/brand";
import { AddCourseFlow } from "@/components/add-course-flow";

export function AddCourseScreen() {
  const { profile, update, navigate } = useProfile();
  return (
    <div className="study-utility-page study-page-blend min-h-screen">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <BackButton onBack={() => navigate("account")} /><span className="text-sm text-muted-foreground">Account</span>
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

