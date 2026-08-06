import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, User, GraduationCap, BookOpen, ShieldAlert, Zap,
  PlusCircle, Layers, ChevronRight, LogOut, FolderOpen, Trash2, Loader2, Calculator,
} from "lucide-react";
import { HeaderLogo } from "@/components/brand";
import {
  deleteAllUserMaterials, deleteMaterial, listAllUserMaterials,
  type CourseMaterial,
} from "@/lib/course-materials";
import { MaterialRow } from "@/components/course-detail";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export function SettingsScreen() {
  const { profile, navigate, go, resetSetup } = useProfile();
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const jumpTo = [
    { label: "Start a mock test", icon: Zap, onClick: () => {
      const c = profile.courses[0];
      if (c) navigate("mock-config", { courseCode: c.code });
    }},
    { label: "CGPA calculator", icon: Calculator, onClick: () => navigate("cgpa") },
    { label: "Flashcards", icon: Layers, onClick: () => navigate("flashcards-soon") },
    { label: "Add a course", icon: PlusCircle, onClick: () => navigate("add-course") },
    { label: "My courses", icon: BookOpen, onClick: () => navigate("dashboard") },
  ];


  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await deleteAllUserMaterials();
      resetSetup();
      toast.success("All your data has been deleted.");
    } catch (e) {
      toast.error((e as Error).message || "Couldn't delete everything. Try again.");
    } finally {
      setDeleting(false);
      setDeleteAllOpen(false);
      setDeleteConfirmText("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <button
          onClick={() => navigate("dashboard")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="font-display text-3xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile and preferences.</p>

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jump to</h2>
        <div className="grid grid-cols-2 gap-2">
          {jumpTo.map((j) => (
            <button
              key={j.label}
              onClick={j.onClick}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition hover:border-accent/50"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                <j.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-foreground">{j.label}</span>
            </button>
          ))}
        </div>

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">My courses</h2>
        <button
          onClick={() => navigate("all-uploads")}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-accent/50"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <FolderOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">All my uploads</div>
            <div className="text-[11px] text-muted-foreground">Every file you've uploaded, across every course.</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your profile</h2>
        <div className="space-y-2">
          <Row icon={User} label="Identity" value={profile.identity?.name ?? "Not set"} sub={profile.identity?.email} />
          <Row icon={GraduationCap} label="Faculty" value={profile.faculty ?? "Not set"} />
          <Row icon={GraduationCap} label="Department · Level" value={`${profile.department ?? "Not set"} · ${profile.level ?? "?"}L`} />
          <Row icon={BookOpen} label="Courses" value={`${profile.courses.length} on file`} />
        </div>

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal</h2>
        <button
          onClick={() => go("disclaimer")}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-accent/50"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">Review the disclaimer</div>
            <div className="text-[11px] text-muted-foreground">Study aid, not a substitute for lectures.</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Reset — clears local profile only, keeps uploaded files */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reset</h2>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            if (confirm("Reset your profile? This clears your faculty, department, level, confirmed courses, streak, and mock test history. Your uploaded past papers and slides are kept. You can find them under 'All my uploads'.")) {
              resetSetup();
            }
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Reset profile
        </Button>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Keeps your uploaded files. Only clears profile and course selection.
        </p>

        {/* Danger — deletes everything including files in storage */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-destructive">Danger zone</h2>
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setDeleteAllOpen(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete all my data
        </Button>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Permanently deletes your uploaded past papers, slides, and profile.
        </p>

        <AlertDialog open={deleteAllOpen} onOpenChange={(o) => { setDeleteAllOpen(o); if (!o) setDeleteConfirmText(""); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all my data</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your uploaded past papers and slides. This cannot be undone. Type <span className="font-bold text-foreground">DELETE</span> to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
            />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteConfirmText !== "DELETE" || deleting}
                onClick={(e) => {
                  e.preventDefault();
                  void handleDeleteAll();
                }}
              >
                {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Delete everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium text-foreground">{value}</div>
        {sub ? <div className="truncate text-[11px] text-muted-foreground">{sub}</div> : null}
      </div>
    </div>
  );
}

/* -------- All my uploads screen -------- */

export function AllUploadsScreen() {
  const { profile, navigate } = useProfile();
  const [items, setItems] = useState<CourseMaterial[] | null>(null);
  const activeCodes = new Set(profile.courses.map((c) => c.code));

  const load = async () => {
    try {
      const rows = await listAllUserMaterials();
      setItems(rows);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    void load();
    const h = () => void load();
    window.addEventListener("course-materials-refresh", h);
    return () => window.removeEventListener("course-materials-refresh", h);
  }, []);

  // Group by course_code
  const grouped: Record<string, CourseMaterial[]> = {};
  (items ?? []).forEach((m) => {
    (grouped[m.course_code] ??= []).push(m);
  });
  const codes = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <button
          onClick={() => navigate("settings")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </button>
        <h1 className="font-display text-3xl font-semibold text-foreground">All my uploads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you've uploaded stays with you, even if you change department or level later.
        </p>

        {items === null ? (
          <Progress value={40} className="mt-6 h-1.5" />
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-xs text-muted-foreground">
            You haven't uploaded anything yet.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {codes.map((code) => {
              const isActive = activeCodes.has(code);
              return (
                <div key={code}>
                  <div className="mb-2 flex items-center gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {code}
                    </h2>
                    {!isActive ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Previous selection
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {grouped[code].map((m) => (
                      <MaterialRow
                        key={m.id}
                        m={m}
                        isFromInactiveCourse={!isActive}
                        onDelete={async () => {
                          await deleteMaterial(m);
                          window.dispatchEvent(new Event("course-materials-refresh"));
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
