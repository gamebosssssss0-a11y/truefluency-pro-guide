import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, User, Building2, BookOpen, ShieldAlert, PlusCircle, Layers, ChevronRight,
  LogOut, FolderOpen, Trash2, Loader2, Calculator, Target, ClipboardList,
  RotateCcw, LifeBuoy, Moon, Sun, Pencil,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { HeaderLogo } from "@/components/brand";
import {
  deleteAllUserMaterials, deleteMaterial, listAllUserMaterials,
  type CourseMaterial,
} from "@/lib/course-materials";
import { MaterialRow } from "@/components/course-detail";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function AccountScreen() {
  const { profile, navigate, resetSetup } = useProfile();
  const { theme, setTheme } = useTheme();
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  /** Two-tap confirmation: 1 = warning, 2 = final confirm. No typing required. */
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleting, setDeleting] = useState(false);

  const closeDelete = () => {
    setDeleteAllOpen(false);
    setDeleteStep(1);
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      // Files and database rows first. Local state is only cleared once the
      // backend deletion has actually succeeded.
      await deleteAllUserMaterials();
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error("[account] sign-out after deletion failed", signOutError);
      }
    } catch (e) {
      console.error("[account] delete all failed", e);
      toast.error((e as Error).message || "Couldn't delete everything. Try again.");
      setDeleting(false);
      closeDelete();
      return;
    }
    resetSetup();
    toast.success("All your data has been deleted.");
    setDeleting(false);
    closeDelete();
  };

  /**
   * Sign out. The cloud snapshot is pushed first so nothing that only existed
   * locally is lost, then the session ends and the local cache is cleared.
   * The data itself stays in the account and comes back on next sign-in.
   */
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { pushCloudProfile } = await import("@/lib/cloud-sync");
      const saved = await pushCloudProfile(profile);
      if (!saved) {
        toast.error("Couldn't save your latest changes to your account. Check your connection and try again.");
        setSigningOut(false);
        return;
      }
    } catch (e) {
      console.error("[account] pre-sign-out save failed", e);
      toast.error("Couldn't save your latest changes to your account. Check your connection and try again.");
      setSigningOut(false);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("[account] sign-out failed", e);
    }

    resetSetup();
    toast.success("Signed out. Your data is saved to your account.");
    setSigningOut(false);
    setSignOutOpen(false);
  };

  const tools = [
    {
      label: "CGPA calculator",
      blurb: "Enter real scores, get your semester GPA and cumulative CGPA.",
      icon: Calculator,
      onClick: () => navigate("cgpa"),
    },
    {
      label: "CGPA goal setter",
      blurb: "Set a target CGPA and get the grades plus daily plan it needs.",
      icon: Target,
      onClick: () => navigate("cgpa-goal"),
    },
    {
      label: "Test history",
      blurb: "Every attempt, with question-by-question review.",
      icon: ClipboardList,
      onClick: () => navigate("test-history"),
    },
    {
      label: "Support",
      blurb: "Common questions, and how to reach us directly.",
      icon: LifeBuoy,
      onClick: () => navigate("support"),
    },
    {
      label: "Flashcards",
      blurb: "Coming soon.",
      icon: Layers,
      onClick: () => navigate("flashcards-soon"),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </span>
        </div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile, your tools, and your data.
        </p>

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tools
        </h2>
        <div className="space-y-2">
          {tools.map((t) => (
            <button
              key={t.label}
              onClick={t.onClick}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-accent/50"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <t.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{t.label}</div>
                <div className="text-[11px] text-muted-foreground">{t.blurb}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          My courses
        </h2>
        <div className="space-y-2">
          <button
            onClick={() => navigate("all-uploads")}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-accent/50"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">All my uploads</div>
              <div className="text-[11px] text-muted-foreground">
                Every file you've uploaded, across every course.
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate("add-course")}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-accent/50"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <PlusCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">Add a course</div>
              <div className="text-[11px] text-muted-foreground">
                Anything your department list missed.
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your profile
        </h2>
        <div className="space-y-2">
          <button
            onClick={() => navigate("edit-identity")}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition hover:border-accent/50"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Identity</div>
              <div className="truncate text-sm font-medium text-foreground">
                {profile.identity?.name ?? "Not set"}
              </div>
              {profile.identity?.email ? (
                <div className="truncate text-[11px] text-muted-foreground">{profile.identity.email}</div>
              ) : null}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent">
              <Pencil className="h-3 w-3" /> Edit
            </span>
          </button>
          <Row icon={Building2} label="Faculty" value={profile.faculty ?? "Not set"} />
          <Row icon={Layers} label="Department · Level" value={`${profile.department ?? "Not set"} · ${profile.level ?? "?"}L`} />
          <Row icon={BookOpen} label="Courses" value={`${profile.courses.length} on file`} />
        </div>

        <button
          onClick={() => navigate("edit-identity")}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent/80"
        >
          <Pencil className="h-3 w-3" /> Edit faculty, department or level
        </button>

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Appearance
        </h2>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">Theme</div>
            <div className="text-[11px] text-muted-foreground">
              {theme === "dark" ? "Dark, easier at night." : "Light, easier in daylight."}
            </div>
          </div>
          <div className="flex overflow-hidden rounded-full border border-border">
            <button
              type="button"
              aria-pressed={theme === "light"}
              onClick={() => setTheme("light")}
              className={
                "px-2.5 py-1.5 text-[11px] font-semibold transition " +
                (theme === "light" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")
              }
            >
              Light
            </button>
            <button
              type="button"
              aria-pressed={theme === "dark"}
              onClick={() => setTheme("dark")}
              className={
                "px-2.5 py-1.5 text-[11px] font-semibold transition " +
                (theme === "dark" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")
              }
            >
              Dark
            </button>
          </div>
        </div>

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Legal
        </h2>
        <button
          onClick={() => navigate("disclaimer-view")}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-accent/50"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">Review the disclaimer</div>
            <div className="text-[11px] text-muted-foreground">
              Study aid, not a substitute for lectures.
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Session */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Session
        </h2>
        <Button variant="outline" className="w-full" onClick={() => setSignOutOpen(true)}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Your profile, courses, uploads and test history stay saved to your account and come back
          when you sign in again, on this phone or any other.
        </p>

        {/* Reset, clears local profile only, keeps uploaded files */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Reset
        </h2>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            if (confirm("Reset your profile? This clears your faculty, department, level, confirmed courses, streak, and mock test history. Your uploaded past papers and slides are kept. You can find them under 'All my uploads'.")) {
              resetSetup();
            }
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Reset profile
        </Button>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Keeps your uploaded files. Only clears profile and course selection.
        </p>

        {/* Danger, deletes everything including files in storage */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-destructive">
          Danger zone
        </h2>
        <Button variant="destructive" className="w-full" onClick={() => { setDeleteStep(1); setDeleteAllOpen(true); }}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete all my data
        </Button>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Permanently deletes your uploaded past papers, slides, pasted notes, and profile.
        </p>

        <AlertDialog open={signOutOpen} onOpenChange={(o) => { if (!o && !signingOut) setSignOutOpen(false); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of TrueFluency Pro?</AlertDialogTitle>
              <AlertDialogDescription>
                Your profile, courses, uploads, mock attempts and streak are saved to your account
                first, so nothing is lost. Sign back in with the same account to pick up exactly
                where you left off.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={signingOut}>Stay signed in</AlertDialogCancel>
              <AlertDialogAction
                disabled={signingOut}
                onClick={(e) => { e.preventDefault(); void handleSignOut(); }}
              >
                {signingOut ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Save and sign out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={deleteAllOpen}
          onOpenChange={(o) => { if (!o && !deleting) closeDelete(); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteStep === 1 ? "Delete all my data" : "Last check, this is permanent"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteStep === 1
                  ? "This permanently deletes your uploaded past papers, slides, pasted notes, mock test history, and profile. It cannot be undone."
                  : "Tap Delete everything to confirm. Your files are removed from storage first, then your profile is cleared on this device."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              {deleteStep === 1 ? (
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteStep(2);
                  }}
                >
                  Continue
                </AlertDialogAction>
              ) : (
                <AlertDialogAction
                  disabled={deleting}
                  onClick={(e) => {
                    e.preventDefault();
                    void handleDeleteAll();
                  }}
                >
                  {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Delete everything
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/** Back-compat alias for older navigation that still says "settings". */
export const SettingsScreen = AccountScreen;

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

  const grouped: Record<string, CourseMaterial[]> = {};
  (items ?? []).forEach((m) => {
    (grouped[m.course_code] ??= []).push(m);
  });
  const codes = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <button
            onClick={() => navigate("account")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Account
          </button>
        </div>
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
