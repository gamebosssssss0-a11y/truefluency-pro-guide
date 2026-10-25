/**
 * "Report this question" — a small flag on a question, while taking a mock or in its review. Reporting is always the
 * student's choice: nothing is selected until they pick a reason. The backend stops that question coming back for them and,
 * once two different students agree, for everyone on the course, and tells the question writer what went wrong (a wrong key,
 * an incomplete question, more than one right answer ...) so the next papers are better.
 */
import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASONS, reportQuestion, type ReportReason } from "@/lib/report-api";

export function ReportQuestionButton({
  courseCode,
  materialId,
  question,
  options,
  markedIndex,
  compact = false,
}: {
  courseCode: string;
  materialId?: string | null;
  question: string;
  options: string[];
  markedIndex?: number | null;
  /** A small "Report" flag for use while the test is running, instead of the longer label used in the review. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!reason) return;
    setSending(true);
    try {
      const out = await reportQuestion({ courseCode, materialId, question, options, markedIndex, reason, note });
      setSent(true);
      setOpen(false);
      toast.success(out.status === "already_reported" ? "You've already reported this one" : "Thanks, we'll avoid it", {
        description: "This question won't come back for you, and it helps make the next papers better.",
      });
    } catch (e) {
      toast.error((e as Error).message || "Couldn't send your report.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={sent}
        aria-label={sent ? "Question reported" : "Report this question"}
        className={`${compact ? "" : "mt-2 "}inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-60`}
      >
        <Flag className="h-3 w-3" aria-hidden="true" />
        {sent ? "Reported" : compact ? "Report" : "Report this question"}
      </button>
      <Dialog open={open} onOpenChange={(o) => { if (!sending) setOpen(o); }}>
        <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report this question</DialogTitle>
            <DialogDescription>
              What's wrong with it? Pick the closest reason. It's optional, and closing this changes nothing. A report keeps this
              question from coming back for you and teaches the question writer.
            </DialogDescription>
          </DialogHeader>
          <div role="radiogroup" aria-label="What's wrong with this question" className="space-y-1.5">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={reason === r.value}
                onClick={() => setReason(r.value)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${reason === r.value ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-secondary"}`}
              >
                <span className="font-medium">{r.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{r.hint}</span>
              </button>
            ))}
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder="Anything else we should know? (optional)"
            className="min-h-16 text-sm"
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
            <Button onClick={() => void send()} disabled={sending || !reason}>{sending ? "Sending…" : reason ? "Send report" : "Pick a reason"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
