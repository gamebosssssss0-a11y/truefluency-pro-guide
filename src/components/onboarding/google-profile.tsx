import { useRef, useState } from "react";
import { useProfile } from "@/lib/profile-store";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadMyAvatar } from "@/lib/avatar";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Shown once, the first time a Google account signs in. Google often hands us
 * no usable name, which used to leave the greeting blank, so the student
 * confirms their name here and may add a photo. The saved cloud display name
 * marks this done, so it is never asked for again on any device.
 */
export function GoogleProfileScreen() {
  const { profile, update, go } = useProfile();

  const googleName = (profile.identity?.name ?? "").trim();
  const email = profile.identity?.email ?? "";

  const [name, setName] = useState(googleName === "Student" ? "" : googleName);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  const canContinue = name.trim().length > 1 && !uploading && !saving;

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadMyAvatar(file);
      setPhotoUrl(url);
      toast.success("Photo added.");
    } catch (err) {
      console.error("[google-profile] photo upload failed", err);
      toast.message(err instanceof Error ? err.message : "We couldn't add that photo.");
    }
    setUploading(false);
  };

  const finish = async () => {
    if (!canContinue) return;
    setSaving(true);

    const patch = {
      identity: {
        kind: "email" as const,
        name: name.trim(),
        ...(email ? { email } : {}),
      },
      profileCompleted: true,
    };
    update(patch);

    try {
      const { pushCloudProfile } = await import("@/lib/cloud-sync");
      await pushCloudProfile({ ...profile, ...patch });
    } catch (err) {
      console.error("[google-profile] cloud save failed", err);
    }

    setSaving(false);
    go(profile.setupComplete ? "dashboard" : "goal");
  };

  return (
    <AppShell
      title="Finish your profile"
      subtitle="Two quick things, so the app can greet you properly."
    >
      <div className="space-y-5">
        {/* Photo, optional */}
        <div className="flex items-center gap-4 rounded-2xl border border-[#E4DCC8] bg-card p-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-accent/15 font-display text-xl font-semibold text-foreground"
            aria-label="Add a photo"
          >
            {photoUrl ? (
              <img src={photoUrl} alt="Your photo" className="h-full w-full object-cover" />
            ) : uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#B86E0A]" />
            ) : (
              initial
            )}
            <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full bg-[#B86E0A] text-white">
              <Camera className="h-3.5 w-3.5" />
            </span>
          </button>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm font-semibold text-[#B86E0A]"
            >
              {photoUrl ? "Change photo" : "Add a photo"}
            </button>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Optional. Skip it and we'll use the letter circle. You can add one later in Account.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void pickPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        {/* Name */}
        <div>
          <Label htmlFor="google-name">Your full name</Label>
          <Input
            id="google-name"
            autoFocus
            className="mt-1.5 h-12"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ada Okafor"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            This is the name you'll see on Home and on anything you choose to share.
          </p>
        </div>

        {/* Email, read-only */}
        {email ? (
          <div>
            <Label htmlFor="google-email">Your email</Label>
            <Input id="google-email" readOnly value={email} className="mt-1.5 h-12 bg-muted" />
            <p className="mt-1 text-[11px] text-muted-foreground">
              This is the Google account you signed in with. Your work is saved to it.
            </p>
          </div>
        ) : null}

        <Button
          size="lg"
          className="w-full bg-[#B86E0A] text-white hover:bg-[#B86E0A]/90"
          disabled={!canContinue}
          onClick={() => void finish()}
        >
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Continue
        </Button>
      </div>
    </AppShell>
  );
}
