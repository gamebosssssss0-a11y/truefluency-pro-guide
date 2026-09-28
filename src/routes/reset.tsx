import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { deriveSupabasePassword } from "@/lib/supabase-session";
import { HeaderLogo } from "@/components/brand";

export const Route = createFileRoute("/reset")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recoverySession, setRecoverySession] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const validPassword = password.length >= 8 && password === confirm;

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      if (data.user?.email) {
        setEmail(data.user.email);
        setRecoverySession(true);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user?.email) {
        setEmail(session.user.email);
        setRecoverySession(true);
      }
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  const requestLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "https://truefluency.app/reset",
      });
      if (requestError) setError("We couldn't send the link. Check the email and try again.");
      else setMessage("We sent a link to that email. It expires.");
    } catch {
      setError("We couldn't send the link. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validPassword || !email) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const secret = await deriveSupabasePassword(email.trim().toLowerCase(), password);
      const { error: updateError } = await supabase.auth.updateUser({ password: secret });
      if (updateError) throw updateError;
      window.location.assign("/");
    } catch {
      setError("We couldn't update your password. Request a new reset link and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-2"><HeaderLogo /><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password reset</span></div>
        <h1 className="font-display text-3xl font-semibold text-foreground">{recoverySession ? "Choose a new password" : "Reset your password"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{recoverySession ? "Use at least 8 characters and enter it twice." : "We'll email you a secure link to choose a new password."}</p>
        <form onSubmit={recoverySession ? updatePassword : requestLink} className="mt-6 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
          <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={recoverySession} className="h-12" />
          {recoverySession ? <>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">New password</label>
            <Input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="h-12" />
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm new password</label>
            <Input type="password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} className="h-12" />
          </> : null}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {message ? <p role="status" className="text-sm text-foreground">{message}</p> : null}
          <Button type="submit" className="h-12 w-full" disabled={busy || (recoverySession && !validPassword)}>
            {busy ? "Working…" : recoverySession ? "Update password" : "Send reset link"}
          </Button>
        </form>
      </div>
    </div>
  );
}
