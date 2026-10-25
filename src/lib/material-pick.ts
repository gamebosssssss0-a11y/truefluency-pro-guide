/**
 * Which uploaded file(s) a feature should use for a course, and what to tell the student when there are none.
 *
 * "Study from": the student ticks the files a mock test, the predicted topics and the flashcards are made from. How many
 * may be ticked depends on the plan (Free 1, Core 3, Exam 6: MOCK_SOURCE_LIMITS in entitlements.ts, enforced by the server).
 * Uploading is never limited. The choice is remembered per course (in this browser). Until they choose, the newest readable
 * file is used, which is what the app always did.
 *
 * Several ticked files are represented by a stand-in file whose id is "sel:<signature of the files>" and which carries the
 * real ids in `selectedIds`. Everything that already works with a file id (the stored topic analysis, "is this analysis for
 * the files I'm about to use?") keeps working unchanged, and the signature changes when the ticked files change, so an
 * old analysis is recognised as out of date. apiSource() turns the stand-in into what the server expects.
 *
 * Also here (flashcards): the old screen compared the course code in one spelling ("MTH103") with the spelling used when the
 * file was uploaded ("mth103", "MTH 103", "C-MTH103"), so the student's file "wasn't found". Codes are now compared the way
 * the rest of the app compares them (sameCourseCode), only small columns are read, and when nothing can be used the message
 * says exactly why.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { canonicalCourseCode, sameCourseCode } from "@/lib/course-code";
import { MOST_FILES_TOGETHER } from "@/lib/entitlements";

export type CourseFile = {
  id: string;
  file_name: string;
  file_type: string;
  course_code: string;
  extraction_status: string;
  created_at: string;
};

type SourceFile = Pick<CourseFile, "id" | "file_name" | "file_type" | "extraction_status">;

/** The ids ticked, or null when nothing has been chosen yet (the newest readable file is used). */
export type SourceChoice = string[] | null;

/** A real file, or the stand-in for several ticked files (selectedIds holds the real ids). */
export type Picked<T> = T & { selectedIds?: string[] };

/* ------------------------------------------------------------------ choosing */

/** Files whose text was read successfully (photos have no text), in the order given (newest first). */
export function readyList<T extends SourceFile>(files: T[]): T[] {
  return files.filter((file) => file.file_type !== "image" && file.extraction_status === "success");
}

/** The id of the stand-in for several ticked files: changes whenever the set of files changes. */
export function selectionId(ids: string[]): string {
  return "sel:" + ids.map((id) => id.replace(/-/g, "").slice(0, 8)).sort().join("");
}

export function isMultiSource(id: string | null | undefined): boolean {
  return Boolean(id) && id!.startsWith("sel:");
}

/**
 * The file (or the stand-in for the ticked files) to use. Ticked files that no longer exist are ignored, more than the plan's
 * limit are cut (the newest are kept), and with nothing usable ticked the newest readable file is used, so there is always
 * something to use when any file is ready.
 */
export function pickSource<T extends SourceFile>(files: T[], choice: SourceChoice, limit: number = MOST_FILES_TOGETHER): Picked<T> | null {
  const ready = readyList(files);
  if (ready.length === 0) return null;
  const wanted = new Set(choice ?? []);
  const chosen = ready.filter((file) => wanted.has(file.id)).slice(0, Math.max(1, limit));
  if (chosen.length === 0) return ready[0];
  if (chosen.length === 1) return chosen[0];
  const ids = chosen.map((file) => file.id);
  return { ...chosen[0], id: selectionId(ids), file_name: `${ids.length} files`, selectedIds: ids };
}

/** The ids behind a pick, whether it is one file or several. */
export function pickedIds(picked: Picked<SourceFile> | null): string[] {
  if (!picked) return [];
  return picked.selectedIds?.length ? picked.selectedIds : [picked.id];
}

/** What to send the server: a plain file id, or the stand-in id plus the real ids. */
export function apiSource(picked: { id: string; selectedIds?: string[] }): { materialId: string; materialIds?: string[] } {
  return picked.selectedIds && picked.selectedIds.length > 1
    ? { materialId: picked.id, materialIds: picked.selectedIds }
    : { materialId: picked.id };
}

/** The ids that are ticked right now (what the picker shows), given the files and the plan's limit. */
export function effectiveIds<T extends SourceFile>(files: T[], choice: SourceChoice, limit: number): string[] {
  return pickedIds(pickSource(files, choice, limit));
}

/** Ticking / unticking one file. With a limit of 1 it simply switches file; at the limit nothing more can be ticked; the last tick stays. */
export function toggleChoice(current: string[], fileId: string, limit: number): string[] {
  if (limit <= 1) return [fileId];
  if (current.includes(fileId)) return current.length > 1 ? current.filter((id) => id !== fileId) : current;
  if (current.length >= limit) return current;
  return [...current, fileId];
}

/* ------------------------------------------------------- remembering the choice */

const STORAGE_PREFIX = "tf-source:";
const CHANGE_EVENT = "tf-source-changed";

function storageKey(courseCode: string): string {
  return STORAGE_PREFIX + canonicalCourseCode(courseCode);
}

export function readSourceChoice(courseCode: string): SourceChoice {
  try {
    const raw = window.localStorage.getItem(storageKey(courseCode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((x) => typeof x === "string") && parsed.length ? (parsed as string[]) : null;
  } catch {
    return null; // private window, blocked storage or an old format: the newest file is used
  }
}

export function writeSourceChoice(courseCode: string, choice: SourceChoice): void {
  try {
    if (choice && choice.length) window.localStorage.setItem(storageKey(courseCode), JSON.stringify(choice));
    else window.localStorage.removeItem(storageKey(courseCode));
  } catch {
    /* not remembered, still used for this visit through the event below */
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: canonicalCourseCode(courseCode) }));
  } catch {
    /* ignore */
  }
}

/** The remembered choice for a course, kept in step across screens. */
export function useSourceChoice(courseCode: string): [SourceChoice, (choice: SourceChoice) => void] {
  const [choice, setChoice] = useState<SourceChoice>(null);
  useEffect(() => {
    setChoice(readSourceChoice(courseCode));
    const onChange = (event: Event) => {
      const which = (event as CustomEvent<string>).detail;
      if (!which || which === canonicalCourseCode(courseCode)) setChoice(readSourceChoice(courseCode));
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, [courseCode]);
  const set = useCallback((next: SourceChoice) => writeSourceChoice(courseCode, next), [courseCode]);
  return [choice, set];
}

/** Fires on every screen that listens for "the choice changed" (used by lists that cache a ready file per course). */
export const SOURCE_CHANGE_EVENT = CHANGE_EVENT;

/* ----------------------------------------------------------------- listing files */

/** Every file this student uploaded for the course, whatever way the code was typed, newest first. No text is downloaded. */
export async function listCourseFiles(courseCode: string): Promise<CourseFile[]> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from("course_materials")
    .select("id,file_name,file_type,course_code,extraction_status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as CourseFile[]).filter((file) => sameCourseCode(file.course_code ?? "", courseCode));
}

/** Files whose text was read successfully. Order is kept: newest first. */
export function readyFiles(files: CourseFile[]): CourseFile[] {
  return readyList(files);
}

/** One plain sentence saying why none of the student's files can be used yet. */
export function whyNothingReady(files: CourseFile[], courseLabel: string): string {
  if (files.length === 0) {
    return `You haven't uploaded anything for ${courseLabel} yet. Add a PDF, Word or PowerPoint file in My Files, or paste your notes, then try again.`;
  }
  const quote = (file: CourseFile) => `"${file.file_name}"`;
  const reading = files.find((f) => f.extraction_status === "pending");
  if (reading) return `${quote(reading)} is still being read. Give it a minute, then try again.`;
  const scanned = files.find((f) => f.extraction_status === "scanned_pdf");
  if (scanned) return `${quote(scanned)} is a scanned PDF, so its text has to be read from the pictures first. Open My Files to see how far it has got.`;
  const failed = files.find((f) => f.extraction_status === "failed" || f.extraction_status === "timeout");
  if (failed) return `We couldn't read ${quote(failed)}. Open My Files and tap Retry, or upload it again.`;
  return `Your uploads for ${courseLabel} are photos, and flashcards are made from text. Upload a PDF, Word or PowerPoint file, or paste your notes.`;
}
