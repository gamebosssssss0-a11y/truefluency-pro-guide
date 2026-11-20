import { useEffect, useMemo, useState } from "react";
import { Copy, Link2, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createMockShare, getMockShareStatus, revokeMockShare } from "@/lib/mock-sharing.functions";
import { toast } from "sonner";
import type { MockAttempt } from "@/lib/profile-store";

type ShareVisibility = "public" | "private";
type ShareInfo = { exists: false } | {
  exists: true;
  token: string;
  visibility: ShareVisibility;
  expiresAt: string;
  status: "active" | "expired" | "revoked";
};

function remainingLabel(expiresAt: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${String(seconds % 60).padStart(2, "0")}s` : `${seconds}s`;
}

export function MockShareSheet({ open, onOpenChange, attemptId, attempt }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attemptId: string;
  attempt?: MockAttempt;
}) {
  const [visibility, setVisibility] = useState<ShareVisibility>("private");
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const url = useMemo(() => share?.exists ? new URL("/mock-share/" + share.token, window.location.origin).toString() : "", [share]);
  const status = share?.exists
    ? share.status === "revoked" ? "revoked" : Date.parse(share.expiresAt) <= now ? "expired" : "active"
    : null;

  useEffect(() => {
    if (!open) return;
    setError("");
    setShare(null);
    setVisibility("private");
    let alive = true;
    void getMockShareStatus({ data: { attemptId } }).then((result) => {
      if (!alive) return;
      if (!result.ok) { setError(result.reason); return; }
      setShare(result.share as ShareInfo);
      if (result.share.exists) setVisibility(result.share.visibility);
    }).catch(() => alive && setError("Couldn't load this mock link."));
    return () => { alive = false; };
  }, [attemptId, open]);

  useEffect(() => {
    if (!open || !share?.exists || status !== "active") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open, share, status]);

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      let result = await createMockShare({ data: { attemptId, visibility } });
      if (!result.ok && attempt && /could not be found/i.test(result.reason)) {
        // The finished mock may not have reached your account yet: save it, then retry once.
        const { pushMockAttempt } = await import("@/lib/cloud-sync");
        await pushMockAttempt(attempt);
        result = await createMockShare({ data: { attemptId, visibility } });
      }
      if (!result.ok) { setError(result.reason); return; }
      setShare({ exists: true, ...result });
    } catch {
      setError("Couldn't create this share link.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Mock link copied");
    } catch {
      setError("Clipboard access is unavailable. Select and copy the link below.");
    }
  };

  const revoke = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await revokeMockShare({ data: { attemptId } });
      if (!result.ok) { setError(result.reason); return; }
      if (result.share.exists) setShare(result.share as ShareInfo);
    } catch {
      setError("Couldn't revoke this mock link.");
    } finally {
      setBusy(false);
    }
  };

  const label = (value: ShareVisibility) => value === "public" ? "Anyone with the link" : "Only me";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-card pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-card-foreground">
        <SheetHeader className="text-left">
          <SheetTitle>Share this mock</SheetTitle>
          <SheetDescription>One link is created for this test. It expires 30 minutes after creation and cannot be renewed.</SheetDescription>
        </SheetHeader>
        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
        {share?.exists ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
              {status === "active" ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <div>
                <p className="text-sm font-semibold">{status === "active" ? "Link ready" : status === "expired" ? "Link expired" : "Link revoked"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Access: {label(share.visibility)} · {status === "active" ? `Expires in ${remainingLabel(share.expiresAt, now)}` : "This link cannot be renewed."}
                </p>
              </div>
            </div>
            <label className="block text-xs font-semibold text-muted-foreground" htmlFor="mock-share-url">One-time mock link</label>
            <input id="mock-share-url" readOnly value={url} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground" />
            {status === "active" ? (
              <>
                <Button type="button" className="w-full" onClick={() => void copy()}><Copy className="mr-2 h-4 w-4" />Copy link</Button>
                <Button type="button" variant="outline" disabled={busy} className="w-full" onClick={() => void revoke()}>Revoke link</Button>
              </>
            ) : null}
          </div>
        ) : share && !share.exists ? (
          <div className="mt-4 space-y-3">
            <fieldset disabled={busy} className="space-y-2">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Who can view it?</legend>
              {(["private", "public"] as const).map((option) => (
                <label key={option} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3">
                  <input type="radio" name="mock-share-visibility" value={option} checked={visibility === option} onChange={() => setVisibility(option)} className="mt-0.5" />
                  <span><span className="block text-sm font-semibold">{label(option)}</span><span className="text-xs text-muted-foreground">{option === "private" ? "Only your signed-in account can open it." : "Anyone with the link can preview and start this mock."}</span></span>
                </label>
              ))}
            </fieldset>
            <Button type="button" className="w-full" disabled={busy} onClick={() => void create()}><Link2 className="mr-2 h-4 w-4" />{busy ? "Creating link…" : "Create one-time link"}</Button>
          </div>
        ) : <p role="status" className="mt-4 text-sm text-muted-foreground">Checking this test’s share status…</p>}
      </SheetContent>
    </Sheet>
  );
}
