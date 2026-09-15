/**
 * Shared, user-facing wording for every terminal extraction state.
 *
 * One source of truth so the badge, the upload toast and the retry toast can
 * never disagree, and so no state renders as a dead end: each unreadable
 * outcome carries a reason plus concrete next steps.
 */
import type { CourseMaterial } from "@/lib/course-materials";

/** A pending row older than this is treated as abandoned, never as "working". */
export const STUCK_PENDING_MS = 90_000;

export const STUCK_PENDING_REASON =
  "Reading this file was interrupted before it finished. Tap retry to try again.";

export type ExtractionSummary = {
  /** Short badge label. */
  label: string;
  tone: "ok" | "working" | "warn" | "error";
  /** Plain-language reason, only for states that need explaining. */
  reason?: string;
  /** Concrete things the student can do right now. */
  nextSteps: string[];
};

const SCAN_STEPS = [
  "Upload the same pages as JPG or PNG photos, which we read as images.",
  "Or paste the text straight into the Paste text box.",
];

const FAILED_STEPS = [
  "Tap retry, transient problems usually clear on a second attempt.",
  "Re-save or re-download the file, then upload the fresh copy.",
  "If it stays unreadable, paste the text straight into the Paste text box.",
];

export function isStuckPending(m: CourseMaterial): boolean {
  if (m.extraction_status !== "pending") return false;
  return Date.now() - new Date(m.created_at).getTime() > STUCK_PENDING_MS;
}

export function extractionSummary(m: CourseMaterial): ExtractionSummary | null {
  const status = m.extraction_status;

  if (status === "success") return { label: "Text ready", tone: "ok", nextSteps: [] };

  if (status === "pending") {
    if (isStuckPending(m)) {
      return {
        label: "Couldn't read content",
        tone: "error",
        reason: STUCK_PENDING_REASON,
        nextSteps: FAILED_STEPS,
      };
    }
    return { label: "Extracting…", tone: "working", nextSteps: [] };
  }

  if (status === "scanned_pdf") {
    return {
      label: "Scanned, no text layer",
      tone: "warn",
      reason:
        m.extraction_error ??
        "This file has no selectable text, so it looks like a scan or a photo of a page.",
      nextSteps: SCAN_STEPS,
    };
  }

  if (status === "failed" || status === "timeout") {
    return {
      label: "Couldn't read content",
      tone: "error",
      reason:
        m.extraction_error ??
        (status === "timeout"
          ? "Reading this file took too long to finish."
          : "We couldn't read any text from this file."),
      nextSteps: FAILED_STEPS,
    };
  }

  return null;
}

/** One-line description used in toasts. */
export function extractionToastMessage(m: CourseMaterial): string {
  const summary = extractionSummary(m);
  if (!summary || summary.tone === "ok" || summary.tone === "working") {
    return "Text is ready for this upload.";
  }
  return [summary.reason, summary.nextSteps[0]].filter(Boolean).join(" ");
}
