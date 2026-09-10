/**
 * Bridges the app's local identity (email account or guest) to a real
 * Supabase auth session so Storage + RLS work correctly.
 *
 * - "email" identity → the existing Supabase session only. No credential is
 *   ever stored on the device, so a signed-out email user must sign in again.
 * - "guest" identity → supabase.auth.signInAnonymously().
 *
 * Called on app boot and whenever the identity changes.
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
 * Stretches the typed password before it reaches Supabase Auth. The result is
 * used once, in memory, at sign-up / sign-in time and is never persisted: the
 * only thing kept on the device is the Supabase session token.
 */
export async function deriveSupabasePassword(
  email: string,
  localPassword: string,
): Promise<string> {
  return (await sha256Hex(`${email}::${localPassword}::truefluency-v1`)).slice(0, 32);
}

export type SessionOutcome =
  | { ok: true; kind: "existing" | "anonymous" }
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
