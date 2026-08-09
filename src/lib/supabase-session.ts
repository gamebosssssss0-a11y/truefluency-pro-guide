/**
 * Bridges the app's local identity (email account or guest) to a real
 * Supabase auth session so Storage + RLS work correctly.
 *
 * - "email" identity → deterministic Supabase email/password
 *   (email + hashed local password). If sign-in fails we sign up.
 * - "guest" identity → supabase.auth.signInAnonymously().
 *
 * Called on app boot and whenever the identity changes.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/profile-store";

// Simple deterministic password derived from the local password so the same
// device+account always resolves to the same Supabase user without asking
// the user to re-enter anything. Not a security boundary — the whole local
// auth flow is a UX shim on top of managed Supabase auth.
async function derivePassword(email: string, localPassword: string) {
  const enc = new TextEncoder().encode(`${email}::${localPassword}::truefluency-v1`);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function ensureSupabaseSession(profile: Profile): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return; // already signed in

  const id = profile.identity;
  if (!id) return;

  if (id.kind === "guest") {
    await supabase.auth.signInAnonymously();
    return;
  }

  if (id.kind === "email" && id.email) {
    const acct = profile.accounts.find(
      (a) => a.email.toLowerCase() === id.email!.toLowerCase(),
    );
    // Google-authenticated users have no local password record. Don't guess a
    // password for them: their session comes from the OAuth flow instead.
    if (!acct) return;
    const localPw = acct.password;
    const pw = await derivePassword(id.email, localPw);

    const signIn = await supabase.auth.signInWithPassword({
      email: id.email,
      password: pw,
    });
    if (!signIn.error) return;

    // Try signup — auto-confirm is enabled on this project.
    await supabase.auth.signUp({ email: id.email, password: pw });
    // If signup failed (e.g. already exists with different pw), fall back to anon
    // so uploads still work.
    const after = await supabase.auth.getSession();
    if (!after.data.session) {
      await supabase.auth.signInAnonymously();
    }
  }
}
