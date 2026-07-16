import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/lib/profile-store";
import { Eye, EyeOff, Loader2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "signup" | "login";

export function IdentityScreen() {
  const { profile, update, go } = useProfile();
  const [tab, setTab] = useState<Tab>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "signup" | "login" | "guest">(null);

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

  return (
    <AppShell
      title={tab === "signup" ? "Create your account" : "Welcome back"}
      subtitle="Saved locally on this device. No cloud sync yet. Clearing storage removes it."
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
        onClick={() => withDelay("guest", () => finish({ kind: "guest", name: "Guest" }))}
        disabled={busy !== null}
        className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-accent hover:shadow-md disabled:opacity-60"
      >
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
          {busy === "guest" ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserRound className="h-5 w-5" />}
        </div>
        <div>
          <div className="font-semibold text-foreground">Continue as Guest</div>
          <div className="text-xs text-muted-foreground">Skip ahead — you can add an account later.</div>
        </div>
      </button>
    </AppShell>
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
