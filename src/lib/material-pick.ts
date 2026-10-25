/**
 * Which uploaded file(s) a feature should use for a course, and what to tell the student when there are none.
 *
 * "Study from": the student chooses ONE file, or "All my files for this course". The choice is remembered per course (in
 * this browser) and used by the mock test, the predicted topics and the flashcards. Until they choose, the newest readable
 * file is used, which is what the app always did.
 *
 * "All my files" is represented by a stand-in file whose id is "all:<signature of the files>". Everything that already works
 * with a file id (the stored topic analysis, "is this analysis for the file I'm about to use?") keeps working unchanged, and
 * the signature changes when a file is added, so an old analysis is recognised as out of date. Before anything goes to the
 * server, toApiMaterialId turns that id into the plain word "all" (the server then reads the course's files itself).
 *
 * Also here (flashcards): the old screen compared the course code in one spelling ("MTH103") with the spelling used when the
 * file was uploaded ("mth103", "MTH 103", "C-MTH103"), so the student's file "wasn't found". Codes are now compared the way
 * the rest of the app compares them (sameCourseCode), only small columns are read, and when nothing can be used the message
 * says exactly why.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { canonicalCourseCode, sameCourseCode } from "@/lib/course-code";

/** The server reads at most this many files for "All my files" (the newest ones). Must match source_text.MAX_FILES. */
export const MAX_ALL_FILES = 6;
export const SOURCE_ALL = "all";

export type CourseFile = {
  id: string;
  file_name: string;
  file_type: string;
  course_code: string;
  extraction_status: string;
  created_at: string;
};

type SourceFile = Pick<CourseFile, "id" | "file_name" | "file_type" | "extraction_status">;

/** What was chosen: "all", a file id, or null (nothing chosen yet: the newest readable file). */
export type SourceChoice = string | null;

/* ------------------------------------------------------------------ choosing */

/** Files whose text was read successfully (photos have no text), in the order given (newest first). */
export function readyList<T extends SourceFile>(files: T[]): T[] {
  return files.filter((file) => file.file_type !== "image" && file.extraction_status === "success");
}

/** The id of the stand-in for "all my files": changes whenever the set of files changes. */
export function allSourceId(files: SourceFile[]): string {
  return "all:" + files.map((file) => file.id.replace(/-/g, "").slice(0, 6)).sort().join("");
}

export function isAllSource(id: string | null | undefined): boolean {
  return Boolean(id) && (id === SOURCE_ALL || id!.startsWith("all:"));
}

/** What to send the server as material_id. */
export function toApiMaterialId(id: string): string {
  return isAllSource(id) ? SOURCE_ALL : id;
}

/**
 * The file (or the stand-in for all files) to use. A choice that no longer applies (the file was deleted, or "all" with
 * fewer than two files left) falls back to the newest readable file, so there is always something to use when any file is ready.
 */
export function pickSource<T extends SourceFile>(files: T[], choice: SourceChoice): T | null {
  const ready = readyList(files);
  if (ready.length === 0) return null;
  if (choice === SOURCE_ALL && ready.length >= 2) {
    const used = ready.slice(0, MAX_ALL_FILES);
    return { ...used[0], id: allSourceId(used), file_name: `All ${used.length} files` };
  }
  if (choice && choice !== SOURCE_ALL) {
    const hit = ready.find((file) => file.id === choice);
    if (hit) return hit;
  }
  return ready[0];
}

/* ------------------------------------------------------- remembering the choice */

const STORAGE_PREFIX = "tf-source:";
const CHANGE_EVENT = "tf-source-changed";

function storageKey(courseCode: string): string {
  return STORAGE_PREFIX + canonicalCourseCode(courseCode);
}

export function readSourceChoice(courseCode: string): SourceChoice {
  try {
    return window.localStorage.getItem(storageKey(courseCode)) || null;
  } catch {
    return null; // private window or blocked storage: the newest file is used
  }
}

export function writeSourceChoice(courseCode: string, choice: SourceChoice): void {
  try {
    if (choice) window.localStorage.setItem(storageKey(courseCode), choice);
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
