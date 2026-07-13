import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, User, GraduationCap, BookOpen, ShieldAlert, Zap,
  PlusCircle, Layers, ChevronRight, LogOut,
} from "lucide-react";

export function SettingsScreen() {
  const { profile, navigate, go, resetSetup } = useProfile();

  const jumpTo = [
    { label: "Start a mock test", icon: Zap, onClick: () => {
      const c = profile.courses[0];
      if (c) navigate("mock-gen", { courseCode: c.code });
    }},
    { label: "Flashcards", icon: Layers, onClick: () => navigate("flashcards-soon") },
    { label: "Add a course", icon: PlusCircle, onClick: () => navigate("add-course") },
    { label: "My courses", icon: BookOpen, onClick: () => navigate("dashboard") },
  ];

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

        {/* Jump to */}
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

        {/* Profile summary */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your profile</h2>
        <div className="space-y-2">
          <Row icon={User} label="Identity" value={profile.identity?.name ?? "—"} sub={profile.identity?.email} />
          <Row icon={GraduationCap} label="Faculty" value={profile.faculty ?? "—"} />
          <Row icon={GraduationCap} label="Department · Level" value={`${profile.department ?? "—"} · ${profile.level ?? "—"}L`} />
          <Row icon={BookOpen} label="Courses" value={`${profile.courses.length} on file`} />
        </div>

        {/* Legal */}
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
            <div className="text-[11px] text-muted-foreground">Study aid — not a substitute for lectures.</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Danger zone */}
        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reset</h2>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            if (confirm("Reset your setup? This will clear your saved profile and disclaimer acceptance.")) {
              resetSetup();
            }
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Reset all data
        </Button>
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
