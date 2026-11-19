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

/** When a renewal is charged, as words: each subscription follows the schedule its student agreed to. */
export const chargeTiming = (lead?: number | null) => (lead === 0 ? "when this period ends" : "one day before this period ends");

/** One plan as the SERVER quotes it. The sentences are written by the server and recorded word for word; the screen never writes its own. */
export type PlanQuote = {
  amount_naira: number;
  founding: boolean;
  introductory?: boolean;
  then_naira?: number;
  /** ISO date (Lagos) of the first automatic charge, and its label, e.g. "15 December 2026". Computed from the server's clock. */
  first_renewal_on?: string;
  first_renewal_label?: string;
  consent_auto?: string;
  consent_once?: string;
};

export type BillingStatus = {
  /** true only for an authorised test account: this is the Squad SANDBOX lane (fake money). Absent for everyone else. */
  sandbox?: boolean;
  /** false until the owner switches payments on: the app then says "payments aren't live yet". */
  enabled: boolean;
  /** false when the billing database could not be read just now. */
  available: boolean;
  plan?: BillingPlan | null;
  status?: "active" | "past_due" | "cancelled" | null;
  auto_renew?: boolean;
  period_end?: string | null;
  renewal_price_naira?: number | null;
  /** When the next automatic charge happens (null when nothing is scheduled), and the same day as a Lagos-time label like "15 December 2026". */
  next_renewal_at?: string | null;
  next_renewal_label?: string | null;
  /** 1 = charged one day before the period ends; 0 = when it ends (an agreement made under the first wording). */
  renewal_lead_days?: number | null;
  founding?: boolean;
  founding_seats_left?: number;
  /** amount_naira = what is charged now; then_naira = what every renewal costs. The introductory price is for the first 30 days only. */
  quote?: { core: PlanQuote; exam: PlanQuote };
  /** true once this student has used their introductory offer (a later purchase is never discounted again). */
  intro_used?: boolean;
  /** The version of the wording the server will accept consent for; sent back with the consent. */
  terms_version?: string;
  pending?: { ref: string; plan: BillingPlan; created_at: string } | null;
  receipts?: { ref: string; plan: BillingPlan; kind: "initial" | "renewal"; amount_naira: number; paid_at: string | null; receipt_no?: string | null; introductory?: boolean }[];
};

export type CheckoutResult = { checkout_url: string; ref: string; amount_naira: number; then_naira?: number; founding?: boolean; reused?: boolean; auto_renew?: boolean };

export type VerifyResult = {
  sandbox?: boolean;
  /** success | pending | failed | abandoned | needs_review | refund_due | unknown_ref | underpaid */
  state: string;
  plan?: BillingPlan;
  period_end?: string | null;
  auto_renew?: boolean | null;
  founding?: boolean | null;
  introductory?: boolean | null;
  receipt_no?: string | null;
  next_amount_naira?: number | null;
  next_renewal_label?: string | null;
  renewal_lead_days?: number | null;
  note?: string;
};

/** What the student saw and agreed to. The server compares every number with its own and refuses a checkout that differs. */
export type Consent = {
  accepted: boolean;
  first_amount_naira: number;
  /** null for "just this month". */
  recurring_amount_naira: number | null;
  period_days: 30;
  terms_version: string;
  /** The ISO date of the first automatic charge the student was shown; null for "just this month". */
  first_renewal_on: string | null;
};

/** The server's amounts are different from the ones on the screen (a place was taken, or the screen was out of date). Nothing was charged. */
export class PriceChangedError extends Error {
  constructor(
    message: string,
    public readonly firstAmountNaira: number,
    public readonly recurringAmountNaira: number | null,
    public readonly introductory: boolean,
    public readonly termsVersion: string,
    public readonly firstRenewalLabel: string | null = null,
  ) {
    super(message);
    this.name = "PriceChangedError";
  }
}

export type Receipt = {
  /** true for a test-lane receipt (numbered SBX-...). */
  sandbox?: boolean;
  receipt_no: string | null;
  reference: string;
  provider_reference: string | null;
  plan: BillingPlan;
  kind: "initial" | "renewal";
  currency: string;
  amount_naira: number;
  standard_price_naira: number | null;
  introductory: boolean;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  /** The amount of the next automatic charge, when the student agreed to automatic renewal. */
  renews_at_naira: number | null;
  /** The Lagos date of the next automatic charge, when the student agreed to renewal. */
  next_renewal_label?: string | null;
  renewal_lead_days?: number | null;
  agreed: { terms_version: string; text: string; at: string } | null;
  business: { name: string; status_note: string; support_email: string | null };
};

export type PaymentProblemCategory = "double_debit" | "not_activated" | "wrong_amount" | "unauthorized_renewal" | "refund_not_received" | "unrecognized" | "other";

export type PaymentProblem = {
  tracking_no: string;
  category: PaymentProblemCategory;
  ref: string | null;
  status: "open" | "in_review" | "waiting_for_student" | "resolved" | "rejected";
  public_note: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const PAYMENT_PROBLEM_LABELS: Record<PaymentProblemCategory, string> = {
  double_debit: "I was charged twice",
  not_activated: "I paid but my plan is not active",
  wrong_amount: "The amount charged is wrong",
  unauthorized_renewal: "A renewal I did not agree to",
  refund_not_received: "A refund I was promised has not arrived",
  unrecognized: "A charge I do not recognise",
  other: "Something else about billing",
};

export const PAYMENT_PROBLEM_STATUS_LABELS: Record<PaymentProblem["status"], string> = {
  open: "Received",
  in_review: "Being reviewed",
  waiting_for_student: "We need more from you",
  resolved: "Resolved",
  rejected: "Closed",
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
  if (res.status === 409) {
    try {
      const p = JSON.parse(text) as { code?: string; detail?: string; first_amount_naira?: number; recurring_amount_naira?: number | null; introductory?: boolean; terms_version?: string; first_renewal_label?: string | null };
      if (p.code === "price_changed" && typeof p.first_amount_naira === "number") {
        throw new PriceChangedError(p.detail ?? "The price changed.", p.first_amount_naira, p.recurring_amount_naira ?? null, Boolean(p.introductory), p.terms_version ?? "", p.first_renewal_label ?? null);
      }
    } catch (e) {
      if (e instanceof PriceChangedError) throw e;
    }
  }
  if (!res.ok) throw new Error(errorText(text, res.status));
  return JSON.parse(text) as T;
}

export const getBillingStatus = () => call<BillingStatus>("GET", "/billing/status");

export const startCheckout = (plan: BillingPlan, autoRenew: boolean, consent: Consent) =>
  call<CheckoutResult>("POST", "/billing/checkout", { plan, auto_renew: autoRenew, consent });

export const getReceipt = (ref: string) => call<Receipt>("GET", `/billing/receipt/${encodeURIComponent(ref)}`);

export const reportPaymentProblem = (input: { category: PaymentProblemCategory; ref: string | null; description: string }) =>
  call<PaymentProblem & { already_open: boolean; message: string }>("POST", "/billing/disputes", input);

export const listPaymentProblems = () => call<{ reports: PaymentProblem[] }>("GET", "/billing/disputes");

// ── admin review (the server only answers accounts listed in ADMIN_USER_IDS) ──
export type AdminDisputeRow = { id: string; tracking_no: string; user_id: string; ref: string | null; category: PaymentProblemCategory; status: PaymentProblem["status"]; created_at: string; updated_at: string };
export type AdminDisputeDetail = {
  dispute: AdminDisputeRow & { description: string; public_note: string | null };
  events: { actor: string; action: string; detail: string | null; at: string }[];
  payment: Record<string, string | number | boolean | null> | null;
  billing_profile: Record<string, string | number | boolean | null> | null;
};
export const adminListPaymentProblems = (status: "active" | PaymentProblem["status"] = "active") =>
  call<{ disputes: AdminDisputeRow[] }>("GET", `/admin/billing/disputes?status=${encodeURIComponent(status)}`);
export const adminGetPaymentProblem = (id: string) => call<AdminDisputeDetail>("GET", `/admin/billing/disputes/${encodeURIComponent(id)}`);
export const adminSetPaymentProblemStatus = (id: string, body: { status: PaymentProblem["status"]; public_note?: string; internal_note?: string }) =>
  call<{ ok: boolean; status: string }>("POST", `/admin/billing/disputes/${encodeURIComponent(id)}/status`, body);

export const verifyPayment = (ref: string) => call<VerifyResult>("POST", "/billing/verify", { ref });

export const cancelAutoRenew = () =>
  call<{ auto_renew: false; period_end: string | null; had_subscription: boolean }>("POST", "/billing/cancel");

// ── coming back from Squad ───────────────────────────────────────────────────────────────────────────────────────
// Squad sends the student back to /?payment_ref=<our reference>. The reference is also kept in this browser before the
// redirect, in case a payment page drops the address' query string.

const STORE_KEY = "tf_pending_payment_ref";
const REF_PATTERN = /^[A-Za-z0-9]{8,60}$/;
/** The references this backend creates: TFPI + 20 hex characters (first payment) or TFPR + ... (a renewal). */
const OUR_REF_PATTERN = /^TF[PS][IR][A-Z0-9]{16,40}$/;

export function rememberCheckout(ref: string): void {
  try { window.localStorage.setItem(STORE_KEY, ref); } catch { /* private mode: the URL still carries it */ }
}

/** The reference of a payment this browser just came back from, or null. */
export function readPaymentReturn(): string | null {
  if (typeof window === "undefined") return null;
  const fromUrl = readPaymentRefFromUrl();
  if (fromUrl) {
    capturedReturnRef = fromUrl;
    return fromUrl;
  }
  // The app rewrites the address (?view=home) on start-up, which drops the
  // reference before the payment check runs; fall back to the one captured
  // when this module first loaded.
  return capturedReturnRef;
}

let capturedReturnRef: string | null = null;

function readPaymentRefFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("payment_ref");
  if (fromUrl && REF_PATTERN.test(fromUrl)) return fromUrl;
  // Squad's own redirect may name the reference differently (its documentation says the reference is passed as a query parameter but not
  // which one). Accept the common names, but ONLY a value shaped like one of OUR references, so nothing else can start a payment check.
  for (const name of ["reference", "trxref", "transaction_ref", "transactionRef", "transaction_reference"]) {
    const alt = params.get(name);
    if (alt && OUR_REF_PATTERN.test(alt)) return alt;
  }
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
  capturedReturnRef = null;
  try { window.localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const key of ["payment_ref", "reference", "trxref", "transaction_ref", "transactionRef", "transaction_reference"]) url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", url.pathname + (url.search || "") + url.hash);
}

// Capture the return reference as soon as the app loads, before start-up
// navigation replaces the address.
if (typeof window !== "undefined") capturedReturnRef = readPaymentRefFromUrl();
