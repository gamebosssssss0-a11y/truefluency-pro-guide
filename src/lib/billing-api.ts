/**
 * Client for monthly payments (billing.py on the Render backend, paid through Squad).
 *
 * The browser never decides anything about money. It asks the backend to start a checkout, sends the student to Squad's
 * page, and when Squad sends them back it asks the backend "did that payment really go through?". The backend answers
 * only after asking Squad itself. Card details never touch this site: Squad's page takes them.
 */
import { supabase } from "@/integrations/supabase/client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

export type BillingPlan = "core" | "exam";

export type BillingStatus = {
  /** false until the owner switches payments on: the app then says "payments aren't live yet". */
  enabled: boolean;
  /** false when the billing database could not be read just now. */
  available: boolean;
  plan?: BillingPlan | null;
  status?: "active" | "past_due" | "cancelled" | null;
  auto_renew?: boolean;
  period_end?: string | null;
  renewal_price_naira?: number | null;
  founding?: boolean;
  founding_seats_left?: number;
  quote?: { core: { amount_naira: number; founding: boolean }; exam: { amount_naira: number; founding: boolean } };
  pending?: { ref: string; plan: BillingPlan; created_at: string } | null;
  receipts?: { ref: string; plan: BillingPlan; kind: "initial" | "renewal"; amount_naira: number; paid_at: string | null }[];
};

export type CheckoutResult = { checkout_url: string; ref: string; amount_naira: number; founding?: boolean; reused?: boolean; auto_renew?: boolean };

export type VerifyResult = {
  /** success | pending | failed | abandoned | needs_review | refund_due | unknown_ref | underpaid */
  state: string;
  plan?: BillingPlan;
  period_end?: string | null;
  auto_renew?: boolean | null;
  founding?: boolean | null;
  note?: string;
};

function base(): string {
  if (typeof BACKEND_URL !== "string" || !BACKEND_URL.trim()) throw new Error("Payments aren't set up yet.");
  return BACKEND_URL.replace(/\/+$/, "");
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to manage your plan.");
  return { Authorization: `Bearer ${token}` };
}

function errorText(text: string, status: number): string {
  try {
    const detail = (JSON.parse(text) as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
  } catch { /* not JSON */ }
  if (status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  if (status === 503) return "Payments aren't live yet. Nothing has been charged.";
  return "Something went wrong with the payment service. Nothing was charged.";
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(errorText(text, res.status));
  return JSON.parse(text) as T;
}

export const getBillingStatus = () => call<BillingStatus>("GET", "/billing/status");

export const startCheckout = (plan: BillingPlan, autoRenew: boolean) =>
  call<CheckoutResult>("POST", "/billing/checkout", { plan, auto_renew: autoRenew });

export const verifyPayment = (ref: string) => call<VerifyResult>("POST", "/billing/verify", { ref });

export const cancelAutoRenew = () =>
  call<{ auto_renew: false; period_end: string | null; had_subscription: boolean }>("POST", "/billing/cancel");

// ── coming back from Squad ───────────────────────────────────────────────────────────────────────────────────────
// Squad sends the student back to /?payment_ref=<our reference>. The reference is also kept in this browser before the
// redirect, in case a payment page drops the address' query string.

const STORE_KEY = "tf_pending_payment_ref";
const REF_PATTERN = /^[A-Za-z0-9]{8,60}$/;

export function rememberCheckout(ref: string): void {
  try { window.localStorage.setItem(STORE_KEY, ref); } catch { /* private mode: the URL still carries it */ }
}

/** The reference of a payment this browser just came back from, or null. */
export function readPaymentReturn(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("payment_ref");
  if (fromUrl && REF_PATTERN.test(fromUrl)) return fromUrl;
  return null;
}

export function lastCheckoutRef(): string | null {
  try {
    const ref = window.localStorage.getItem(STORE_KEY);
    return ref && REF_PATTERN.test(ref) ? ref : null;
  } catch {
    return null;
  }
}

export function clearPaymentReturn(): void {
  try { window.localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const key of ["payment_ref", "reference", "trxref"]) url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", url.pathname + (url.search || "") + url.hash);
}
