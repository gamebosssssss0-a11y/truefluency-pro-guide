import { useMemo, useState } from "react";
import { useProfile, type UserCourse } from "@/lib/profile-store";
import { AddCourseFlow } from "@/components/add-course-flow";
import { sameCourseCode } from "@/lib/course-code";
import { Button } from "@/components/ui/button";
import { ListPlus, ChevronUp } from "lucide-react";

type Field = "cgpaCalcCourses" | "cgpaGoalCourses";

/**
 * Which courses feed a CGPA tool. Selection is persisted on the profile the
 * same way the other per-tool CGPA state is (`update` → localStorage/cloud).
 * `null` means "not chosen yet", so every course on the profile is used.
 */
export function useCgpaCourseSelection(field: Field) {
  const { profile, update } = useProfile();

  const codes = useMemo(
    () => profile[field] ?? profile.courses.map((c) => c.code),
    [profile, field],
  );

  const selected = useMemo<UserCourse[]>(
    () =>
      codes
        .map(
          (code) =>
            profile.courses.find((c) => sameCourseCode(c.code, code)) ??
            ({ code, name: code, status: "Elective", source: "manual" } as UserCourse),
        )
        .filter(Boolean),
    [codes, profile.courses],
  );

  const add = (course: UserCourse) => {
    if (codes.some((c) => sameCourseCode(c, course.code))) return;
    const courses = profile.courses.some((c) => sameCourseCode(c.code, course.code))
      ? profile.courses
      : [...profile.courses, course];
    update({ courses, [field]: [...codes, course.code] } as never);
  };

  const remove = (code: string) => {
    update({ [field]: codes.filter((c) => !sameCourseCode(c, code)) } as never);
  };

  return { selected, add, remove };
}

/** Shared add/remove course picker for the CGPA calculator and goal setter. */
export function CgpaCoursePicker({
  field,
  helper,
}: {
  field: Field;
  helper?: string;
}) {
  const { profile } = useProfile();
  const { selected, add, remove } = useCgpaCourseSelection(field);
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full border-border"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <>
            <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> Done choosing courses
          </>
        ) : (
          <>
            <ListPlus className="mr-1.5 h-3.5 w-3.5" /> Choose courses ({selected.length})
          </>
        )}
      </Button>

      {open ? (
        <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          {helper ? (
            <p className="mb-3 text-[11px] text-muted-foreground">{helper}</p>
          ) : null}
          <AddCourseFlow
            existing={selected}
            onAdd={add}
            onRemove={remove}
            level={profile.level ?? undefined}
          />
        </div>
      ) : null}
    </div>
  );
}
