/**
 * Admin: payment problems students have reported. Reviewing or closing a report only changes the report (and writes an audit row).
 * It never cancels access, refunds or charges: refunds are done by a person in the Squad dashboard, after review.
 */
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  adminGetPaymentProblem, adminListPaymentProblems, adminSetPaymentProblemStatus, PAYMENT_PROBLEM_LABELS, PAYMENT_PROBLEM_STATUS_LABELS,
  type AdminDisputeDetail, type AdminDisputeRow, type PaymentProblem,
} from "@/lib/billing-api";

const STATUSES: PaymentProblem["status"][] = ["open", "in_review", "waiting_for_student", "resolved", "rejected"];

export function AdminPaymentProblems() {
  const [rows, setRows] = useState<AdminDisputeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminDisputeDetail | null>(null);
  const [status, setStatus] = useState<PaymentProblem["status"]>("in_review");
  const [publicNote, setPublicNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try { setRows((await adminListPaymentProblems("active")).disputes); } catch (e) { setError((e as Error).message); setRows([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const open = async (id: string) => {
    setError(null);
    try {
      const d = await adminGetPaymentProblem(id);
      setDetail(d);
      setStatus(d.dispute.status === "open" ? "in_review" : d.dispute.status);
      setPublicNote("");
      setInternalNote("");
    } catch (e) { setError((e as Error).message); }
  };

  const save = async () => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      await adminSetPaymentProblemStatus(detail.dispute.id, { status, public_note: publicNote.trim() || undefined, internal_note: internalNote.trim() || undefined });
      await open(detail.dispute.id);
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4" aria-labelledby="pp-admin">
      <h2 id="pp-admin" className="font-display text-xl font-semibold">Payment problems</h2>
      <p className="mt-1 text-xs text-muted-foreground">Open reports from students. Closing one only changes the report; refunds are done by a person in the Squad dashboard.</p>
      {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
      {rows === null ? <p className="mt-2 text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nothing waiting.</p> : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => void open(r.id)} className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 py-2 text-left text-sm hover:bg-secondary/50">
                <span><span className="font-mono text-xs font-semibold">{r.tracking_no}</span> · {PAYMENT_PROBLEM_LABELS[r.category]}</span>
                <span className="text-xs text-muted-foreground">{PAYMENT_PROBLEM_STATUS_LABELS[r.status]} · {new Date(r.created_at).toLocaleDateString("en-NG")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {detail ? (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-background p-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-mono text-sm font-semibold">{detail.dispute.tracking_no}</h3>
            <span className="text-xs text-muted-foreground">student {detail.dispute.user_id.slice(0, 8)}…</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{PAYMENT_PROBLEM_LABELS[detail.dispute.category]}</p>
          <p className="whitespace-pre-wrap break-words">{detail.dispute.description}</p>
          {detail.payment ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-secondary p-2 text-xs">
              {Object.entries(detail.payment).filter(([, v]) => v !== null && v !== "").map(([k, v]) => (<div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="break-words font-mono">{String(v)}</dd></div>))}
            </dl>
          ) : <p className="text-xs text-muted-foreground">No payment attached.</p>}
          {detail.billing_profile ? <p className="text-xs text-muted-foreground">Plan {String(detail.billing_profile.plan)} · {String(detail.billing_profile.status)} · auto-renew {String(detail.billing_profile.auto_renew)} · until {String(detail.billing_profile.period_end ?? "")}</p> : null}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audit trail</h4>
            <ul className="mt-1 space-y-1 text-xs">{detail.events.map((e, i) => <li key={i}><span className="text-muted-foreground">{new Date(e.at).toLocaleString("en-NG")} · {e.actor} · {e.action}</span>{e.detail ? ` · ${e.detail}` : ""}</li>)}</ul>
          </div>
          <label className="block text-xs font-medium" htmlFor="pp-status">Status</label>
          <select id="pp-status" value={status} onChange={(e) => setStatus(e.target.value as PaymentProblem["status"])} className="min-h-11 w-full rounded-lg border border-border bg-card px-2">
            {STATUSES.map((s) => <option key={s} value={s}>{PAYMENT_PROBLEM_STATUS_LABELS[s]}</option>)}
          </select>
          <label className="block text-xs font-medium" htmlFor="pp-public">Note the student will see (required to resolve or close)</label>
          <textarea id="pp-public" value={publicNote} onChange={(e) => setPublicNote(e.target.value)} rows={3} maxLength={1000} className="w-full rounded-lg border border-border bg-card p-2" />
          <label className="block text-xs font-medium" htmlFor="pp-internal">Internal note (audit trail only)</label>
          <textarea id="pp-internal" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={2} maxLength={1000} className="w-full rounded-lg border border-border bg-card p-2" />
          <div className="flex gap-2"><Button disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save"}</Button><Button variant="outline" onClick={() => setDetail(null)}>Close</Button></div>
        </div>
      ) : null}
    </section>
  );
}
