import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/lib/profile-store";
import {
  facultyData,
  gesCoursesByLevel,
  getDepartmentEntries,
  isUnverifiedEntries,
  type CatalogEntry,
  type Level,
} from "@/lib/uni-data";
import { AddCourseFlow, StatusBadge } from "@/components/add-course-flow";
import type { UserCourse } from "@/lib/profile-store";
import {
  BookOpen, Check, ChevronRight, GraduationCap, Info, Lock, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* -------- Faculty -------- */
export function FacultyScreen() {
  const { update, go } = useProfile();
  const faculties = Object.keys(facultyData);
  return (
    <AppShell
      step={4}
      total={7}
      title="Pick your faculty"
      subtitle="Tap the one you belong to. You can change this later in Settings."
    >
      <div className="space-y-2.5">
        {faculties.map((f) => {
          const incomplete = facultyData[f].length === 0;
          return (
            <button
              key={f}
              onClick={() => { update({ faculty: f, department: null }); go("department"); }}
              className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-accent hover:shadow-md"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{f}</div>
                {incomplete ? (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Info className="h-3 w-3" />
                    List may be incomplete. Verify your department with your faculty.
                  </div>
                ) : (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {facultyData[f].length} departments
                  </div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-accent" />
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}

/* -------- Department -------- */
export function DepartmentScreen() {
  const { profile, update, go } = useProfile();
  const [q, setQ] = useState("");
  const [customDept, setCustomDept] = useState("");
  const faculty = profile.faculty!;
  const depts = facultyData[faculty] ?? [];

  const filtered = useMemo(
    () => depts.filter((d) => d.toLowerCase().includes(q.toLowerCase())),
    [depts, q]
  );

  if (depts.length === 0) {
    return (
      <AppShell
        step={5}
        total={7}
        title="Type your department"
        subtitle={`We don't have departments for ${faculty} listed yet. Type yours in and we'll add it.`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!customDept.trim()) return;
            update({ department: customDept.trim() });
            go("level");
          }}
          className="space-y-4"
        >
          <Input autoFocus placeholder="e.g. Data Science" value={customDept} onChange={(e) => setCustomDept(e.target.value)} className="h-12 text-base" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => go("faculty")}>Back</Button>
            <Button type="submit" className="flex-1">Continue</Button>
          </div>
        </form>
      </AppShell>
    );
  }

  return (
    <AppShell step={5} total={7} title="Your department" subtitle={faculty}>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your department…" className="h-12 pl-10 text-base" />
      </div>
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No matches. Try another term.</p>
        ) : filtered.map((d) => (
          <button
            key={d}
            onClick={() => { update({ department: d }); go("level"); }}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-accent hover:shadow-md"
          >
            <span className="text-sm font-medium text-foreground">{d}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Button variant="ghost" size="sm" onClick={() => go("faculty")}>← Change faculty</Button>
      </div>
    </AppShell>
  );
}

/* -------- Level -------- */
export function LevelScreen() {
  const { update, go } = useProfile();
  const levels: Level[] = ["100", "200", "300", "400", "500"];
  return (
    <AppShell step={6} total={7} title="What level are you in?" subtitle="Pick your current academic level.">
      <div className="grid grid-cols-2 gap-3">
        {levels.map((l) => (
          <button
            key={l}
            onClick={() => { update({ level: l }); go("courses"); }}
            className="group flex flex-col items-start gap-1 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-accent hover:shadow-md"
          >
            <span className="font-display text-3xl font-semibold text-primary group-hover:text-accent">{l}L</span>
            <span className="text-xs text-muted-foreground">
              {l === "100" ? "Freshman" : l === "200" ? "Sophomore" : l === "300" ? "Junior" : l === "400" ? "Senior" : "Final year"}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Button variant="ghost" size="sm" onClick={() => go("department")}>← Back</Button>
      </div>
    </AppShell>
  );
}

/* -------- Course confirmation (Screen 4) -------- */
export function CoursesScreen() {
  const { profile, update, go } = useProfile();
  const level = profile.level!;
  const dept = profile.department!;

  const ges = gesCoursesByLevel[level];
  const rawDept = getDepartmentEntries(dept, level);
  const deptUnverified = isUnverifiedEntries(rawDept);
  const deptEntries: CatalogEntry[] = deptUnverified ? [] : rawDept!;

  // Selected department courses (verified ones, toggled by user).
  const [selectedDept, setSelectedDept] = useState<string[]>(deptEntries.map((c) => c.code));
  // Manually / browse-added courses (used when catalog is missing or user wants extras).
  const [manualCourses, setManualCourses] = useState<UserCourse[]>([]);

  const toggleDept = (code: string) => {
    setSelectedDept((cur) => cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]);
  };

  const finish = () => {
    const gesCourses: UserCourse[] = ges.map((c) => ({ ...c, source: "verified" }));
    const chosenDept: UserCourse[] = deptEntries
      .filter((c) => selectedDept.includes(c.code))
      .map((c) => ({ ...c, source: "verified" }));
    const all: UserCourse[] = [...gesCourses, ...chosenDept, ...manualCourses];
    update({ courses: all, setupComplete: true });
    go("dashboard");
  };

  const totalPicked = ges.length + selectedDept.length + manualCourses.length;

  return (
    <AppShell step={7} total={7} title="Confirm your courses" subtitle={`${dept} · ${level}L`} compact>
      {/* GES */}
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">General Studies</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Compulsory for all students
          </span>
        </div>

        {ges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
            No additional general courses at this level.
          </div>
        ) : (
          <div className="space-y-2">
            {ges.map((c) => (
              <div key={c.code} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{c.code}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.name}</div>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Department courses OR manual-entry fallback */}
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your department courses
        </h2>

        {deptUnverified ? (
          <AddCourseFlow
            existing={manualCourses}
            onAdd={(c) => setManualCourses((cur) => [...cur, c])}
            onRemove={(code) => setManualCourses((cur) => cur.filter((c) => c.code !== code))}
            level={level}
            emptyStateMessage={`We don't have a verified course list for ${dept} at ${level} Level yet. Add your courses manually below. Search our catalogue first, then free-text as a fallback.`}
          />
        ) : (
          <>
            <div className="space-y-2">
              {deptEntries.map((c) => {
                const on = selectedDept.includes(c.code);
                return (
                  <button
                    key={c.code}
                    onClick={() => toggleDept(c.code)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left shadow-sm transition",
                      on ? "border-accent bg-accent/5" : "border-border bg-card hover:border-accent/50"
                    )}
                  >
                    <div className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition",
                      on ? "bg-accent text-accent-foreground" : "bg-secondary text-primary"
                    )}>
                      {on ? <Check className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground">{c.code}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{c.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Add-more area, also using the browse-first flow */}
            <details className="mt-4 rounded-2xl border border-border bg-card p-4">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                Add a course not shown above
              </summary>
              <div className="mt-4">
                <AddCourseFlow
                  existing={manualCourses}
                  onAdd={(c) => setManualCourses((cur) => [...cur, c])}
                  onRemove={(code) => setManualCourses((cur) => cur.filter((c) => c.code !== code))}
                  level={level}
                />
              </div>
            </details>
          </>
        )}
      </section>

      <div className="sticky bottom-0 -mx-5 border-t border-border bg-background/95 px-5 py-4 backdrop-blur">
        <Button size="lg" className="w-full" onClick={finish} disabled={totalPicked === 0}>
          Finish Setup {totalPicked > 0 ? `· ${totalPicked} course${totalPicked === 1 ? "" : "s"}` : ""}
        </Button>
      </div>
    </AppShell>
  );
}
