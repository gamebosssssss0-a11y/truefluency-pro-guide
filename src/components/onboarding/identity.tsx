import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/lib/profile-store";
import { Eye, EyeOff, Loader2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

type Tab = "signup" | "login";

export function IdentityScreen() {
  const { profile, update, go } = useProfile();
  const [tab, setTab] = useState<Tab>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "signup" | "login" | "guest" | "google">(null);

  const finish = (identity: { kind: "email" | "guest"; name: string; email?: string }, extraAccounts?: typeof profile.accounts) => {
    update({ identity, ...(extraAccounts ? { accounts: extraAccounts } : {}) });
    go("goal");
  };

  const withDelay = (kind: "signup" | "login" | "guest", fn: () => void) => {
    setError(null);
    setBusy(kind);
    setTimeout(() => { setBusy(null); fn(); }, 900);
  };

  const onSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;
    const em = email.trim().toLowerCase();
    if (profile.accounts.some((a) => a.email.toLowerCase() === em)) {
      setError("An account with that email already exists on this device. Try logging in.");
      return;
    }
    const next = [...profile.accounts, { name: name.trim(), email: em, password }];
    withDelay("signup", () => finish({ kind: "email", name: name.trim(), email: em }, next));
  };

  const onLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    const em = email.trim().toLowerCase();
    const match = profile.accounts.find((a) => a.email.toLowerCase() === em);
    if (!match) {
      setError("We couldn't find an account with that email on this device. Try signing up instead.");
      return;
    }
    if (match.password !== password) {
      setError("Wrong password for that account.");
      return;
    }
    withDelay("login", () => finish({ kind: "email", name: match.name, email: match.email }));
  };

  const onGoogle = async () => {
    setError(null);
    setBusy("google");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        console.error("[auth] Google sign-in failed", result.error);
        setError("Google sign-in didn't complete. Tap to try again.");
        setBusy(null);
        return;
      }
      if (result.redirected) return; // browser is navigating to Google
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setError("Google sign-in didn't complete. Tap to try again.");
        setBusy(null);
        return;
      }
      const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
      const displayName = meta.full_name || meta.name || (user.email ?? "").split("@")[0] || "Student";
      setBusy(null);
      finish({ kind: "email", name: displayName, email: user.email ?? undefined });
    } catch (err) {
      console.error("[auth] Google sign-in threw", err);
      setError("Google sign-in didn't complete. Tap to try again.");
      setBusy(null);
    }
  };

  return (
    <AppShell
      title={tab === "signup" ? "Create your account" : "Welcome back"}
      subtitle="Signed-in progress syncs to your account across devices."
    >
      {/* Tabs */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(["signup", "login"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); }}
            className={cn(
              "rounded-lg py-2 text-sm font-semibold transition",
              tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {t === "signup" ? "Sign Up" : "Log In"}
          </button>
        ))}
      </div>

      {tab === "signup" ? (
        <form onSubmit={onSignup} className="space-y-3">
          <Field label="Name">
            <Input required autoFocus placeholder="Ada Okafor" value={name} onChange={(e) => setName(e.target.value)} className="h-12" />
          </Field>
          <Field label="Email">
            <Input required type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
          </Field>
          <PasswordField password={password} setPassword={setPassword} showPw={showPw} setShowPw={setShowPw} />
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          <Button type="submit" className="h-12 w-full text-base" disabled={busy !== null}>
            {busy === "signup" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</> : "Create Account"}
          </Button>
          <SwitchLine text="Already have an account?" cta="Log In" onClick={() => { setTab("login"); setError(null); }} />
        </form>
      ) : (
        <form onSubmit={onLogin} className="space-y-3">
          <Field label="Email">
            <Input required autoFocus type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
          </Field>
          <PasswordField password={password} setPassword={setPassword} showPw={showPw} setShowPw={setShowPw} />
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          <Button type="submit" className="h-12 w-full text-base" disabled={busy !== null}>
            {busy === "login" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</> : "Log In"}
          </Button>
          <SwitchLine text="Don't have an account?" cta="Sign Up" onClick={() => { setTab("signup"); setError(null); }} />
        </form>
      )}

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={() => void onGoogle()}
        disabled={busy !== null}
        className="mb-3 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card font-semibold text-foreground shadow-sm transition hover:shadow-md disabled:opacity-60"
      >
        {busy === "google" ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleGlyph />}
        <span className="text-[15px]">Continue with Google</span>
      </button>

      <button
        onClick={() => withDelay("guest", () => finish({ kind: "guest", name: "Guest" }))}
        disabled={busy !== null}
        className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-accent hover:shadow-md disabled:opacity-60"
      >
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
          {busy === "guest" ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserRound className="h-5 w-5" />}
        </div>
        <div>
          <div className="font-semibold text-foreground">Continue as Guest</div>
          <div className="text-xs text-muted-foreground">Skip ahead. You can add an account later.</div>
        </div>
      </button>
    </AppShell>
  );
}

function GoogleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function PasswordField({ password, setPassword, showPw, setShowPw }: {
  password: string; setPassword: (v: string) => void; showPw: boolean; setShowPw: (v: boolean) => void;
}) {
  return (
    <Field label="Password">
      <div className="relative">
        <Input
          required
          type={showPw ? "text" : "password"}
          placeholder="At least 6 characters"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 pr-11"
        />
        <button
          type="button"
          onClick={() => setShowPw(!showPw)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground"
          aria-label={showPw ? "Hide password" : "Show password"}
        >
          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      {children}
    </div>
  );
}

function SwitchLine({ text, cta, onClick }: { text: string; cta: string; onClick: () => void }) {
  return (
    <p className="pt-1 text-center text-xs text-muted-foreground">
      {text}{" "}
      <button type="button" onClick={onClick} className="font-semibold text-primary hover:underline">
        {cta}
      </button>
    </p>
  );
}
