import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/lib/profile-store";
import { Mail, UserRound } from "lucide-react";

export function IdentityScreen() {
  const { update, go } = useProfile();
  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [email, setEmail] = useState("");

  const finish = (identity: { kind: "email" | "guest"; name: string; email?: string }) => {
    update({ identity });
    go("faculty");
  };

  return (
    <AppShell
      title="Let's set you up"
      subtitle="We only need this to greet you on the dashboard. No verification, no password."
    >
      {mode === "choose" ? (
        <div className="space-y-3">
          <button
            onClick={() => setMode("email")}
            className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-accent hover:shadow-md"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground">Continue with Email</div>
              <div className="text-xs text-muted-foreground">Just an address — no password yet.</div>
            </div>
          </button>

          <button
            onClick={() => finish({ kind: "guest", name: "Guest" })}
            className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-accent hover:shadow-md"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground">Continue as Guest</div>
              <div className="text-xs text-muted-foreground">Skip ahead — you can add an email later.</div>
            </div>
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            const name = email.split("@")[0];
            finish({ kind: "email", email: email.trim(), name });
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Your email</label>
            <Input
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-base"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              We'll use the part before @ as your display name.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setMode("choose")}>Back</Button>
            <Button type="submit" className="flex-1">Continue</Button>
          </div>
        </form>
      )}
    </AppShell>
  );
}
