import { useState } from "react";
import { useProfile } from "@/lib/profile-store";
import { HeaderLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { facultyData, type Level } from "@/lib/uni-data";
import { ArrowLeft, Loader2, UserCog } from "lucide-react";
import { toast } from "sonner";

const LEVELS: Level[] = ["100", "200", "300", "400", "500"];

/**
 * Edit the identity and academic details captured during onboarding. Saving
 * writes to the profile and pushes it straight to the cloud profiles row, so
 * the change survives sign-out and follows the user across devices.
 */
export function EditIdentityScreen() {
  const { profile, update, navigate } = useProfile();

  const [name, setName] = useState(profile.identity?.name ?? "");
  const [email, setEmail] = useState(profile.identity?.email ?? "");
  const [faculty, setFaculty] = useState(profile.faculty ?? "");
  const [department, setDepartment] = useState(profile.department ?? "");
  const [level, setLevel] = useState<Level | "">((profile.level as Level | null) ?? "");
  const [saving, setSaving] = useState(false);

  // Keep whatever is already on the profile selectable, even if the catalogue
  // has since been renamed, so opening this screen never silently blanks it.
  const faculties = Array.from(new Set([...Object.keys(facultyData), ...(faculty ? [faculty] : [])]));
  const departments = faculty
    ? Array.from(new Set([...(facultyData[faculty] ?? []), ...(department ? [department] : [])]))
    : department ? [department] : [];
  const isGuest = profile.identity?.kind === "guest";
  const coursesWillReset =
    (department && department !== profile.department) || (level && level !== profile.level);

  const canSave = name.trim().length > 1 && !!faculty && !!department && !!level && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);

    const patch = {
      identity: {
        kind: profile.identity?.kind ?? "email",
        name: name.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
      } as typeof profile.identity,
      faculty,
      department,
      level: level as Level,
      // Course selection belongs to a department and level, so a change there
      // clears it rather than leaving courses that no longer apply.
      ...(coursesWillReset ? { courses: [] } : {}),
    };

    update(patch);

    try {
      const { pushCloudProfile } = await import("@/lib/cloud-sync");
      const ok = await pushCloudProfile({ ...profile, ...patch });
      toast[ok ? "success" : "message"](
        ok ? "Profile updated and saved to your account." : "Saved on this device. It will sync when you're back online.",
      );
    } catch (err) {
      console.error("[edit-identity] cloud save failed", err);
      toast.message("Saved on this device. It will sync when you're back online.");
    }

    setSaving(false);
    if (coursesWillReset) {
      toast.message("Pick your courses again for the new department or level.");
      navigate("add-course");
    } else {
      navigate("account");
    }
  };

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

        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
          <UserCog className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">Edit your details</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything here is saved to your account, not just this phone.
        </p>

        <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div>
            <Label htmlFor="edit-name">Full name</Label>
            <Input
              id="edit-name"
              className="mt-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Adaeze Okonkwo"
            />
          </div>

          <div>
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              className="mt-1.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isGuest ? "Add an email to secure your account" : "you@example.com"}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Used to restore your data. Changing it here updates your profile, not your sign-in method.
            </p>
          </div>

          <div>
            <Label htmlFor="edit-faculty">Faculty</Label>
            <select
              id="edit-faculty"
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={faculty}
              onChange={(e) => {
                setFaculty(e.target.value);
                setDepartment("");
              }}
            >
              <option value="">Select your faculty</option>
              {faculties.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="edit-department">Department</Label>
            <select
              id="edit-department"
              disabled={!faculty && !department}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground disabled:opacity-50"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">{faculty ? "Select your department" : "Pick a faculty first"}</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="edit-level">Level</Label>
            <select
              id="edit-level"
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
            >
              <option value="">Select your level</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l} level</option>
              ))}
            </select>
          </div>
        </div>

        {coursesWillReset ? (
          <p className="mt-3 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-[11px] leading-relaxed text-foreground">
            Changing your department or level clears your current course selection, since the course
            list is different. Your uploaded files and test history are kept.
          </p>
        ) : null}

        <Button size="lg" className="mt-5 w-full" disabled={!canSave} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Save changes
        </Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => navigate("account")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
