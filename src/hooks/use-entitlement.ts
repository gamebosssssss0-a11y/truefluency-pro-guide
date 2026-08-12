/**
 * Reads the signed-in student's entitlement for display purposes only.
 * Every real limit is enforced server-side; this just lets the UI show the
 * right ceilings and paywall copy.
 */
import { useEffect, useState } from "react";
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
    getMyAccess()
      .then((a) => {
        if (live) setAccess(a);
      })
      .catch((e) => {
        console.warn("[entitlement] couldn't read access, assuming free tier", e);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
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
