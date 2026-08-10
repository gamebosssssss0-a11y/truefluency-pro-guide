/**
 * Bridges the app's local identity (email account or guest) to a real
 * Supabase auth session so Storage + RLS work correctly.
 *
 * - "email" identity → deterministic Supabase email/password derived from the
 *   account record. If sign-in fails we sign up.
 * - "guest" identity → supabase.auth.signInAnonymously().
 *
 * Called on app boot and whenever the identity changes.
 *
 * The typed password is never stored. Two hashes are kept instead: a verifier
 * (to check the password locally) and the derived Supabase password.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/profile-store";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Deterministic Supabase password so the same device+account always resolves to
 * the same Supabase user without asking the user to re-enter anything. Not a
 * security boundary on its own: the whole local auth flow is a UX shim on top
 * of managed Supabase auth.
 */
export async function deriveSupabasePassword(
  email: string,
  localPassword: string,
): Promise<string> {
  return (await sha256Hex(`${email}::${localPassword}::truefluency-v1`)).slice(0, 32);
}

/** Hash used to verify a typed password against a stored account. */
export async function localPasswordVerifier(
  email: string,
  localPassword: string,
): Promise<string> {
  return sha256Hex(`${email}::${localPassword}::truefluency-verify-v1`);
}

export type SessionOutcome =
  | { ok: true; kind: "existing" | "password" | "signup" | "anonymous" }
  | { ok: false; reason: string };

export async function ensureSupabaseSession(profile: Profile): Promise<SessionOutcome> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return { ok: true, kind: "existing" };

  const id = profile.identity;
  if (!id) return { ok: false, reason: "no-identity" };

  if (id.kind === "guest") {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("[auth] guest session failed", error);
      return { ok: false, reason: error.message };
    }
    return { ok: true, kind: "anonymous" };
  }

  if (id.kind === "email" && id.email) {
    const email = id.email;
    const acct = profile.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
    // Google-authenticated users have no local account record. Don't guess a
    // password for them: their session comes from the OAuth flow instead.
    if (!acct?.derived) return { ok: false, reason: "oauth-or-missing-account" };

    const signIn = await supabase.auth.signInWithPassword({
      email,
      password: acct.derived,
    });
    if (!signIn.error) return { ok: true, kind: "password" };

    // Try signup — auto-confirm is enabled on this project.
    const signUp = await supabase.auth.signUp({ email, password: acct.derived });
    const after = await supabase.auth.getSession();
    if (after.data.session) return { ok: true, kind: "signup" };

    // Surface the real reason instead of silently downgrading to a guest
    // session, which would strand the user's cloud data under another user.
    const reason = signUp.error?.message ?? signIn.error.message;
    console.error("[auth] could not restore account session", reason);
    return { ok: false, reason };
  }

  return { ok: false, reason: "unsupported-identity" };
}
