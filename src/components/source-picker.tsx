/**
 * "Study from": pick one of your files, or all of them, for the mock test, the predicted topics and the flashcards.
 * The choice is remembered per course. With "All my files" the questions (or cards) are shared out evenly between the files.
 */
import { FileText, Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MAX_ALL_FILES, SOURCE_ALL, isAllSource, pickSource, readyList, useSourceChoice, type CourseFile,
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

  const current = pickSource(ready, choice);
  const value = current && isAllSource(current.id) ? SOURCE_ALL : current?.id ?? "";
  const usedByAll = Math.min(ready.length, MAX_ALL_FILES);

  return (
    <div className={className}>
      <label className={`mb-1.5 block text-xs font-semibold uppercase tracking-wider ${muted}`}>Study from</label>
      <Select value={value} onValueChange={(next) => setChoice(next === SOURCE_ALL ? SOURCE_ALL : next)}>
        <SelectTrigger className="h-auto min-h-11 w-full rounded-xl py-2 text-left" aria-label="Choose which of your files to use">
          <SelectValue placeholder="Choose a file" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SOURCE_ALL}>
            <span className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              All my files for this course ({usedByAll})
            </span>
          </SelectItem>
          {ready.map((file) => (
            <SelectItem key={file.id} value={file.id}>
              <span className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{file.file_name}</span>
                {shortDate(file.created_at) ? <span className="shrink-0 text-muted-foreground">· {shortDate(file.created_at)}</span> : null}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className={`mt-1.5 text-[11px] leading-relaxed ${muted}`}>
        {value === SOURCE_ALL
          ? `Shared evenly across ${usedByAll} files${ready.length > MAX_ALL_FILES ? ` (your ${MAX_ALL_FILES} newest)` : ""}. Best for revising the whole course.`
          : "Everything comes from this one file. Best for focusing on one topic or lecture."}
        {waiting > 0 ? ` ${waiting} other file${waiting > 1 ? "s are" : " is"} not ready yet and not listed.` : ""}
      </p>
    </div>
  );
}
