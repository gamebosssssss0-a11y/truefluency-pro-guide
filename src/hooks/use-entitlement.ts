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

export function useEntitlement() {
  const [access, setAccess] = useState<AccessSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;

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
        if (live) setAccess(a);
      } catch (e) {
        // Safety net only; the real fix is not calling too early.
        console.warn("[entitlement] couldn't read access, assuming free tier", e);
      } finally {
        if (live) setLoading(false);
      }
    })();

    return () => {
      live = false;
    };
  }, []);

  return {
    access,
    loading,
    /** Until the real answer arrives, assume the stricter free ceiling. */
    maxQuestionsPerSet: access?.maxQuestionsPerSet ?? FREE_MAX_QUESTIONS,
    explanationsUnlocked: access?.explanationsUnlocked ?? false,
  };
}
