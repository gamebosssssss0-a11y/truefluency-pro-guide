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
    // No credential is stored on the device, so an expired session can only be
    // restored by signing in again (email/password or Google).
    return { ok: false, reason: "sign-in-required" };
  }

  return { ok: false, reason: "unsupported-identity" };
}
