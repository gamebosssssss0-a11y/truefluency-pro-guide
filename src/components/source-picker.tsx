/**
 * "Study from": tick the files a mock test, the predicted topics and the flashcards are made from. Uploading is not limited;
 * how many files can be used TOGETHER depends on the plan (Free 1, Core 3, Exam 6). The choice is remembered per course, and
 * the server enforces the same limit. With "several files" the questions (or cards) are shared evenly between them.
 */
import { Check, FileText } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { useEntitlement } from "@/hooks/use-entitlement";
import { maxSourceFiles } from "@/lib/entitlements";
import {
  effectiveIds, readyList, toggleChoice, useSourceChoice, type CourseFile,
} from "@/lib/material-pick";

type PickerFile = Pick<CourseFile, "id" | "file_name" | "file_type" | "extraction_status"> & { created_at?: string };

function shortDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function SourcePicker({
  courseCode,
  files,
  showSingle = false,
  tone = "light",
  className = "",
}: {
  courseCode: string;
  /** The course's uploads (any status). The picker lists the ones that were read successfully. */
  files: PickerFile[] | null;
  /** With only one readable file there is nothing to choose: show which file is used (true) or nothing at all (false). */
  showSingle?: boolean;
  /** "dark" for screens drawn on the navy background (the flashcards page). */
  tone?: "light" | "dark";
  className?: string;
}) {
  const [choice, setChoice] = useSourceChoice(courseCode);
  const { navigate } = useProfile();
  const { access } = useEntitlement();
  const limit = maxSourceFiles(access?.tier);
  const muted = tone === "dark" ? "text-[#F3E6C8]/80 dark:text-[#C4B8A0]" : "text-muted-foreground";
  if (!files) return null;
  const ready = readyList(files);
  const waiting = files.length - ready.length;
  if (ready.length === 0) return null;

  if (ready.length === 1) {
    if (!showSingle) return null;
    return (
      <div className={`flex items-center gap-2 text-[11px] ${muted} ${className}`}>
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">Study from: {ready[0].file_name}</span>
      </div>
    );
  }

  const ticked = effectiveIds(ready, choice, limit);
  const atLimit = ticked.length >= limit;
  const canTickMore = limit > 1;
  const tier = access?.tier;
  const nextPlanLine =
    tier === "exam" ? `Your Exam plan uses up to ${limit} files together.`
      : tier === "core" || tier === "trial" ? `Core uses up to ${limit} files together. Exam uses up to 6.`
        : "Free uses 1 file at a time. Core uses up to 3, Exam up to 6.";

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label className={`block text-xs font-semibold uppercase tracking-wider ${muted}`}>Study from</label>
        <span className={`text-[11px] tabular-nums ${muted}`}>{ticked.length} of {limit} {limit === 1 ? "file" : "files"}</span>
      </div>
      <div role={limit === 1 ? "radiogroup" : "group"} aria-label="Choose which of your files to use" className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
        {ready.map((file) => {
          const on = ticked.includes(file.id);
          const blocked = !on && limit > 1 && atLimit;
          return (
            <button
              key={file.id}
              type="button"
              role={limit === 1 ? "radio" : "checkbox"}
              aria-checked={on}
              aria-disabled={blocked}
              disabled={blocked}
              onClick={() => setChoice(toggleChoice(ticked, file.id, limit))}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                on ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-secondary"
              } ${blocked ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center border ${limit === 1 ? "rounded-full" : "rounded-md"} ${
                  on ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background"
                }`}
                aria-hidden="true"
              >
                {on ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground">{file.file_name}</span>
              {shortDate(file.created_at) ? <span className="shrink-0 text-[11px] text-muted-foreground">{shortDate(file.created_at)}</span> : null}
            </button>
          );
        })}
      </div>
      <p className={`mt-1.5 text-[11px] leading-relaxed ${muted}`}>
        {ticked.length > 1
          ? `Shared evenly across your ${ticked.length} files. Best for revising the whole course.`
          : "Everything comes from this one file."}
        {waiting > 0 ? ` ${waiting} other file${waiting > 1 ? "s are" : " is"} not ready yet and not listed.` : ""}
      </p>
      {(atLimit || !canTickMore) && tier !== "exam" ? (
        <p className={`mt-1 flex flex-wrap items-center gap-x-2 text-[11px] leading-relaxed ${muted}`}>
          <span>{nextPlanLine}</span>
          <button type="button" onClick={() => navigate("upgrade")} className="font-semibold text-accent underline underline-offset-2">
            See plans
          </button>
        </p>
      ) : null}
    </div>
  );
}
