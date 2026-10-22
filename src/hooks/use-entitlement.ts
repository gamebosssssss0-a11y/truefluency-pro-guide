/**
 * Reads the signed-in student's entitlement for display purposes only.
 * Every real limit is enforced server-side; this just lets the UI show the
 * right ceilings and paywall copy.
 *
 * IMPORTANT: we wait for the Supabase session to resolve before calling the
 * protected server function. Calling it earlier sends no Authorization header
 * and the middleware rejects the request.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/entitlements.functions";
import {
  FREE_MAX_QUESTIONS,
  type AccessSummary,
} from "@/lib/entitlements";

// ADMIN (1/4): the server now adds isAdmin to the access object. Display only: the server enforces everything.
type AccessWithAdmin = AccessSummary & { isAdmin?: boolean };

export function useEntitlement() {
  const [access, setAccess] = useState<AccessWithAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    // ADMIN (2/4): cast so the extra field is visible to TypeScript.
    const current = (await getMyAccess()) as AccessWithAdmin;
    setAccess(current);
    return current;
  };

  useEffect(() => {
    let live = true;

    const refreshOnReturn = () => {
      if (document.visibilityState !== "visible") return;
      void supabase.auth.getSession()
        .then(({ data }) => {
          if (!live || !data.session?.access_token) return;
          return getMyAccess().then((current) => {
            if (live) setAccess(current as AccessWithAdmin);
          });
        })
        .catch((e) => console.warn("[entitlement] couldn't refresh access on return", e));
    };

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!live) return;
        // Signed out: free-tier defaults, no API call at all.
        if (!token) {
          setLoading(false);
          return;
        }
        const a = await getMyAccess();
        if (live) setAccess(a as AccessWithAdmin);
      } catch (e) {
        // Safety net only; the real fix is not calling too early.
        console.warn("[entitlement] couldn't read access, assuming free tier", e);
      } finally {
        if (live) setLoading(false);
      }
    })();

    return () => {
      live = false;
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, []);

  return {
    access,
    loading,
    refresh,
    /** Until the real answer arrives, assume the stricter free ceiling. */
    maxQuestionsPerSet: access?.maxQuestionsPerSet ?? FREE_MAX_QUESTIONS,
    explanationsUnlocked: access?.explanationsUnlocked ?? false,
    // ADMIN (3/4): true only when the server says this account is an admin. Use it to show the "Admin mode" chip.
    isAdmin: access?.isAdmin === true,
  };
}
