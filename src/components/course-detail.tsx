import { useCallback, useEffect, useRef, useState } from "react";
import { useProfile, averageForCourse, type CourseTopicAnalysis } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Zap, Upload, Sparkles, ChevronRight, Wand2, ClipboardPaste, X,
  FileImage, FileText, FileType2, Presentation, Trash2, AlertCircle, CheckCircle2, Loader2, RotateCw, RefreshCw,
} from "lucide-react";
import { AiGeneratedLabel, TopicPill, scoreToStrength } from "@/components/common";
import { HeaderLogo } from "@/components/brand";
import {
  uploadCourseMaterial, listMaterialsForCourse, deleteMaterial,
  findDuplicateMaterial, pickAnalyzableMaterial, ACCEPTED_UPLOAD_MIME,
  isRetryableMaterial, retryExtraction,
  savePastedText, MIN_PASTED_CHARS, PASTED_TOO_SHORT_MESSAGE,
  type CourseMaterial, type UploadStage,
} from "@/lib/course-materials";
import {
  getMetadataFlag, dismissMetadataFlag, METADATA_NOTE,
} from "@/lib/material-metadata";
import { extractionSummary, extractionToastMessage } from "@/lib/extraction-status";
import { predictTopics, isBackendConfigured, NOT_CONFIGURED_MESSAGE } from "@/lib/backend-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { groupTopicsByCategory } from "@/lib/topic-labels";
import { courseFeatureOrder } from "@/lib/personalization";


/* -------- shared materials loader for this screen -------- */

function useCourseMaterials(courseCode: string) {
  const [items, setItems] = useState<CourseMaterial[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listMaterialsForCourse(courseCode));
    } catch (e) {
      console.error("[materials] load failed", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [courseCode]);

  useEffect(() => {
    void load();
    const h = () => void load();
    window.addEventListener("course-materials-refresh", h);
    return () => window.removeEventListener("course-materials-refresh", h);
  }, [load]);

  /* Uploads left at "pending" (e.g. from an earlier failed extraction) get one
   * automatic repair attempt per session so old files become usable without
   * the student having to re-upload anything. The outcome is always reported,
   * so a failure can never look like nothing happened. */
  const repaired = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!items) return;
    const stuck = items.filter(
      (m) => m.extraction_status === "pending" && !repaired.current.has(m.id),
    );
    if (stuck.length === 0) return;
    for (const m of stuck) repaired.current.add(m.id);
    void (async () => {
      let changed = false;
      let failure: string | null = null;
      for (const m of stuck) {
        try {
          const fresh = await retryExtraction(m.id);
          changed = true;
          if (fresh && fresh.extraction_status !== "success") {
            failure = fresh.extraction_error || "We couldn't read text from that file.";
          }
        } catch (e) {
          console.error("[materials] auto-repair failed", { id: m.id, error: e });
          changed = true;
          failure = (e as Error)?.message || "We couldn't read text from that file.";
        }
      }
      if (failure) {
        toast.message("One of your uploads couldn't be read", { description: failure });
      }
      if (changed) void load();
    })();
  }, [items, load]);


  return { items, loading };
}

export function CourseDetailScreen() {
  const { profile, navigate, activeCourseCode } = useProfile();
  const course = profile.courses.find((c) => c.code === activeCourseCode);
  const { items, loading } = useCourseMaterials(course?.code ?? "__none__");

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-5 pt-6">
          <Button variant="ghost" onClick={() => navigate("home")}>← Back</Button>
          <p className="mt-6 text-sm text-muted-foreground">Course not found.</p>
        </div>
      </div>
    );
  }

  const avg = averageForCourse(profile, course.code);
  const relevantAttempts = profile.attempts.filter((a) => a.courseCode === course.code).slice(-3).reverse();
  const readyMaterial = items ? pickAnalyzableMaterial(items) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <button
            onClick={() => navigate("home")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
        </div>


        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground shadow-sm">
          <div className="text-xs font-medium text-primary-foreground/70">{course.code}</div>
          <div className="mt-0.5 font-display text-2xl font-semibold leading-tight">{course.name}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-primary-foreground/60">
            {course.status} · {course.source === "manual" ? "Manually added" : "Verified"}
          </div>
        </div>

        <CoursePrimaryActions
          courseCode={course.code}
          courseName={course.name}
          materials={items}
          materialsLoading={loading}
          readyMaterial={readyMaterial}
        />

        <div className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your recent attempts
          </h2>
          {relevantAttempts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
              No attempts yet. Start a mock test to build your topic profile.
            </div>
          ) : (
            <div className="space-y-2">
              {avg !== null ? (
                <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Average score</div>
                    <TopicPill label={`${avg}%`} strength={scoreToStrength(avg)} big />
                  </div>
                </div>
              ) : null}
              {relevantAttempts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => navigate("attempt-review", { courseCode: course.code, attemptId: a.id })}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-sm transition hover:border-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{a.correct}/{a.total} correct</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(a.submittedAt).toLocaleDateString()} · {a.total} questions · Review answers
                    </div>
                  </div>
                  <TopicPill label={`${a.score}%`} strength={scoreToStrength(a.score)} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------- Personalization-aware action section -------- */

function CoursePrimaryActions({
  courseCode, courseName, materials, materialsLoading, readyMaterial,
}: {
  courseCode: string;
  courseName: string;
  materials: CourseMaterial[] | null;
  materialsLoading: boolean;
  readyMaterial: CourseMaterial | null;
}) {
  const { navigate, profile } = useProfile();
  const { order, flashcardsPlaceholderNote } = courseFeatureOrder(profile.studyPreference);
  const ready = Boolean(readyMaterial);
  /* An upload whose text hasn't been read yet still powers Analyze: the button
   * reads it first, then analyzes. */
  const repairable = readyMaterial
    ? null
    : (materials ?? []).find((m) => isRetryableMaterial(m)) ?? null;
  const analysis = useAnalyzeTopics(courseCode, courseName, readyMaterial, repairable);
  const canAnalyze = Boolean(readyMaterial || repairable);

  const analyzeButton = (
    <Button
      size="lg"
      variant="outline"
      className={ready ? undefined : "w-full"}
      onClick={() => void analysis.analyze()}
      disabled={analysis.busy || !canAnalyze}
    >
      {analysis.busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
      {analysis.busy
        ? "Analyzing…"
        : !canAnalyze
          ? "Upload a paper first"
          : analysis.stored && !analysis.stale ? "Re-analyze" : "Analyze Upload"}
    </Button>
  );

  const actions = ready ? (
    <div className="mt-5 grid grid-cols-2 gap-2">
      {analyzeButton}
      <Button size="lg" onClick={() => navigate("mock-config", { courseCode })}>
        <Zap className="mr-1.5 h-4 w-4" /> Customize Mock Test
      </Button>
      <div className="col-span-2">
        <UploadButton courseCode={courseCode} />
      </div>
      <div className="col-span-2">
        <PasteTextButton courseCode={courseCode} />
      </div>
    </div>
  ) : (
    <div className="mt-5 space-y-2">
      <UploadButton courseCode={courseCode} />
      <PasteTextButton courseCode={courseCode} />
      {analyzeButton}
      <Button size="lg" className="w-full" disabled>
        <Zap className="mr-1.5 h-4 w-4" /> Customize Mock Test
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        {materialsLoading && materials === null
          ? "Checking your uploads…"
          : repairable
            ? "Tap Analyze Upload and we'll read your file, then predict topics."
            : materials && materials.length > 0
              ? "We couldn't read text from your uploads yet. Add a PDF, Word or PowerPoint file, or paste text, to unlock mock tests."
              : "Upload a past paper or paste text first."}
      </p>

    </div>
  );



  const topics = (
    <PredictedTopicsSection courseCode={courseCode} material={readyMaterial} analysis={analysis} />
  );

  const readingFirst = order[0] === "materials";

  return (
    <>
      {readingFirst ? (
        <>
          <MaterialsList courseCode={courseCode} items={materials} loading={materialsLoading} />
          {actions}
          {topics}
        </>
      ) : (
        <>
          {actions}
          {topics}
          <MaterialsList courseCode={courseCode} items={materials} loading={materialsLoading} />
        </>
      )}
      {flashcardsPlaceholderNote ? (
        <>
          <Button size="lg" variant="outline" className="mt-4 w-full" disabled>
            Flashcards · Coming soon
          </Button>
          <p className="mt-2 text-center text-[11px] italic text-muted-foreground">
            Flashcards coming soon, your preferred study method.
          </p>
        </>
      ) : null}
    </>
  );
}

/* -------- Analyze Upload + real predicted topics -------- */

const ANALYZE_STEPS = [
  "Reading your material…",
  "Identifying likely topics…",
  "Scoring confidence…",
];

/**
 * Shared analysis runner. Stores the result on the profile keyed by course so
 * revisiting the screen doesn't re-fetch, while a newer upload allows a re-run.
 */
function useAnalyzeTopics(
  courseCode: string,
  courseName: string,
  material: CourseMaterial | null,
  fallback: CourseMaterial | null = null,
) {
  const { profile, update } = useProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setStepIdx((i) => (i + 1) % ANALYZE_STEPS.length), 1800);
    return () => clearInterval(id);
  }, [busy]);

  const stored: CourseTopicAnalysis | undefined = profile.courseTopicAnalysis[courseCode];
  const stale = Boolean(stored && material && stored.materialId !== material.id);

  const analyze = async () => {
    if ((!material && !fallback) || runningRef.current) return;
    runningRef.current = true;
    setBusy(true);
    setError(null);
    try {
      let target = material;

      /* An upload whose text was never read (stuck or failed) gets read first,
       * so Analyze does the obvious thing instead of being unavailable. */
      if (!target && fallback) {
        const fresh = await retryExtraction(fallback.id);
        try { window.dispatchEvent(new Event("course-materials-refresh")); } catch { /* ignore */ }
        if (fresh && fresh.extraction_status === "success") {
          target = fresh;
        } else {
          throw new Error(
            fresh?.extraction_error ||
              "We couldn't read text from that file. Try a PDF, Word or PowerPoint file, or paste the text instead.",
          );
        }
      }
      if (!target) throw new Error("Upload a past paper first.");

      if (!isBackendConfigured()) throw new Error(NOT_CONFIGURED_MESSAGE);
      const topics = await predictTopics({
        materialId: target.id,
        courseCode,
        courseName,
        level: profile.level,
        department: profile.department,
      });
      update({
        courseTopicAnalysis: {
          ...profile.courseTopicAnalysis,
          [courseCode]: { materialId: target.id, analyzedAt: Date.now(), topics },
        },
      });
    } catch (e) {
      console.error("[analyze] failed", e);
      const msg = (e as Error)?.message;
      setError(
        msg === NOT_CONFIGURED_MESSAGE
          ? NOT_CONFIGURED_MESSAGE
          : msg && msg.length < 200
            ? msg
            : "Couldn't analyze your material right now. Try again in a moment.",
      );
    } finally {
      setBusy(false);
      runningRef.current = false;
    }
  };

  return { analyze, busy, error, stored, stale, statusText: ANALYZE_STEPS[stepIdx] };
}


type AnalysisState = ReturnType<typeof useAnalyzeTopics>;

function PredictedTopicsSection({ courseCode, material, analysis }: {
  courseCode: string; material: CourseMaterial | null; analysis: AnalysisState;
}) {
  const { profile } = useProfile();
  const { analyze, busy, error, stored, stale, statusText } = analysis;
  const topics = stored?.topics ?? [];

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" /> Predicted topics
      </div>

      {busy ? (
        <div className="rounded-xl border border-accent/40 bg-accent/10 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {statusText}
          </div>
          <Progress value={undefined} className="mt-2 h-1.5 animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1 text-foreground">{error}</div>
            <Button size="sm" variant="outline" onClick={() => void analyze()} disabled={!material}>
              <RotateCw className="mr-1 h-3 w-3" /> Retry
            </Button>
          </div>
          <p className="mt-2 text-muted-foreground">
            No topic predictions for {courseCode} yet.
          </p>
        </div>
      ) : topics.length > 0 ? (
        <>
          <div className="space-y-3">
            {groupTopicsByCategory(topics, {
              code: courseCode,
              department: profile.department,
              faculty: profile.faculty,
            }).map((group) => (
              <div key={group.label}>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.topics.map((t) => (
                    <TopicPill key={t.topic} label={t.topic} strength={t.confidence} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {stale ? (
            <p className="mt-2 text-[11px] italic text-muted-foreground">
              Based on an earlier upload. Tap Re-analyze for your newest file.
            </p>
          ) : null}
        </>

      ) : (
        <p className="text-xs text-muted-foreground">
          {material
            ? "Tap Analyze Upload to see the topics most likely to come up."
            : `Upload a past paper or slides to unlock predictions for ${courseCode}.`}
        </p>
      )}

      <AiGeneratedLabel className="mt-3" />
    </div>
  );
}


/* -------- Upload button + duplicate dialog -------- */

/* The file input stays rendered (off-screen, not display:none) and the trigger
 * is a real <label>, because Android WebViews and in-app browsers frequently
 * refuse to open the picker for a display:none input clicked from script. */
const HIDDEN_INPUT_CLASS =
  "absolute h-px w-px overflow-hidden opacity-0 -z-10 left-0 top-0 pointer-events-none";

function UploadButton({ courseCode }: { courseCode: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `upload-${courseCode.replace(/[^a-zA-Z0-9-]/g, "")}`;
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const [lastError, setLastError] = useState<{ file: File } | null>(null);
  const [noResponse, setNoResponse] = useState(false);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWatchdog = () => {
    if (watchdog.current) {
      clearTimeout(watchdog.current);
      watchdog.current = null;
    }
  };

  useEffect(() => clearWatchdog, []);

  /* If the tap produces neither a file nor an error, say so instead of
   * looking like nothing happened. */
  const armWatchdog = () => {
    setNoResponse(false);
    clearWatchdog();
    watchdog.current = setTimeout(() => setNoResponse(true), 20000);
  };


  const runUpload = async (file: File) => {
    console.info("[upload] runUpload start", { name: file.name, courseCode });
    setLastError(null);
    try {
      const result = await uploadCourseMaterial({
        file,
        courseCode,
        onStage: (s) => {
          try { setStage(s); } catch (e) { console.error("[upload] setStage failed", e); }
        },
      });
      console.info("[upload] runUpload success", { id: result.id, status: result.extraction_status });
      const t = result.file_type;
      if (t === "pdf" || t === "docx" || t === "pptx") {
        if (result.extraction_status === "success") {
          toast.success(`Added to ${courseCode}. Text ready.`);
        } else if (t === "pdf" && result.extraction_status === "scanned_pdf") {
          toast.message(`Added to ${courseCode}`, {
            description: "This looks like a scanned document. For best results, upload it as an image instead so we can process it accurately.",
          });
        } else if (result.extraction_status === "failed" || result.extraction_status === "timeout") {
          toast.message(`Added to ${courseCode}`, {
            description: "We've saved your file, but couldn't process its content automatically yet.",
          });
        } else {
          toast.success(`Added to ${courseCode}`);
        }
      } else {
        toast.success(`Added to ${courseCode}`);
      }
      try { window.dispatchEvent(new Event("course-materials-refresh")); } catch (e) {
        console.error("[upload] refresh event dispatch failed", e);
      }
    } catch (err) {
      console.error("[upload] runUpload caught error", err);
      setLastError({ file });
      try {
        toast.error((err as Error)?.message || "Upload failed");
      } catch (toastErr) {
        console.error("[upload] toast.error failed", toastErr);
      }
    } finally {
      setTimeout(() => setStage(null), 1500);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    clearWatchdog();
    setNoResponse(false);
    try {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      console.info("[upload] file selected", { name: file.name, size: file.size, type: file.type });

      // Duplicate check (same user + course + filename).
      try {
        const dup = await findDuplicateMaterial({ courseCode, fileName: file.name });
        if (dup) {
          setPendingFile(file);
          setDupOpen(true);
          return;
        }
      } catch (dupErr) {
        console.error("[upload] duplicate check failed, proceeding with upload", dupErr);
      }

      void runUpload(file);
    } catch (outer) {
      console.error("[upload] onFile outer catch", outer);
      try { toast.error("Couldn't start the upload. Please try again."); } catch { /* ignore */ }
    }
  };

  const busy = stage !== null && stage.kind !== "done" && stage.kind !== "error";

  return (
    <>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_UPLOAD_MIME}
        className={HIDDEN_INPUT_CLASS}
        tabIndex={-1}
        onChange={onFile}
      />
      {busy ? (
        <Button size="lg" variant="outline" className="w-full" disabled>
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Uploading…
        </Button>
      ) : (
        <Button asChild size="lg" variant="outline" className="w-full">
          <label htmlFor={inputId} className="cursor-pointer" onClick={armWatchdog}>
            <Upload className="mr-1.5 h-4 w-4" /> Upload paper
          </label>
        </Button>
      )}

      {stage ? <StageBanner stage={stage} /> : null}

      {noResponse && !stage ? (
        <div className="col-span-2 mt-2 rounded-2xl border border-border bg-muted/40 p-3 text-xs">
          <div className="font-semibold text-foreground">Picker didn't open?</div>
          <p className="mt-0.5 text-muted-foreground">
            Some in-app browsers block file picking. Use the file box below, or open the app in Chrome or Safari.
          </p>
          <input
            type="file"
            accept={ACCEPTED_UPLOAD_MIME}
            onChange={onFile}
            className="mt-2 block w-full text-xs"
          />
        </div>
      ) : null}

      {lastError && !stage ? (
        <div className="col-span-2 mt-2 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-destructive">Upload didn't go through</div>
            <div className="text-muted-foreground">Try a smaller file or check your connection.</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => void runUpload(lastError.file)}>
            <RotateCw className="mr-1 h-3 w-3" /> Retry
          </Button>
        </div>
      ) : null}


      <AlertDialog open={dupOpen} onOpenChange={setDupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Already uploaded</AlertDialogTitle>
            <AlertDialogDescription>
              You've already uploaded "{pendingFile?.name}" for this course. Upload anyway, or skip?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>Skip</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const f = pendingFile;
                setPendingFile(null);
                if (f) void runUpload(f);
              }}
            >
              Upload anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* -------- Paste text as an upload alternative -------- */

function PasteTextButton({ courseCode }: { courseCode: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = stage !== null && stage.kind !== "done" && stage.kind !== "error";
  const tooShort = text.trim().length < MIN_PASTED_CHARS;

  const submit = async () => {
    if (tooShort) {
      setError(PASTED_TOO_SHORT_MESSAGE);
      return;
    }
    setError(null);
    try {
      await savePastedText({ text, courseCode, onStage: setStage });
      toast.success(`Added to ${courseCode}. Text ready.`);
      setText("");
      setOpen(false);
      try { window.dispatchEvent(new Event("course-materials-refresh")); } catch { /* ignore */ }
    } catch (e) {
      console.error("[paste] submit failed", e);
      setError((e as Error)?.message || "Couldn't save your text. Please try again.");
    } finally {
      setTimeout(() => setStage(null), 1200);
    }
  };

  if (!open) {
    return (
      <Button size="lg" variant="ghost" className="w-full" onClick={() => setOpen(true)}>
        <ClipboardPaste className="mr-1.5 h-4 w-4" /> Paste text instead
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Paste text for {courseCode}
        </span>
        <button
          onClick={() => { setOpen(false); setError(null); }}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <Textarea
        autoFocus
        rows={8}
        placeholder="Paste course content here, from a WhatsApp message, a Google Doc, or anywhere else."
        value={text}
        onChange={(e) => { setText(e.target.value); setError(null); }}
      />
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{text.trim().length} characters</span>
        <span>{MIN_PASTED_CHARS} minimum</span>
      </div>

      {error ? (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span>{error}</span>
        </div>
      ) : null}

      {stage ? <StageBanner stage={stage} /> : null}

      <Button className="mt-3 w-full" onClick={() => void submit()} disabled={busy}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        {busy ? "Saving…" : "Save pasted text"}
      </Button>
    </div>
  );
}


function StageBanner({ stage }: { stage: UploadStage }) {
  return (
    <div className="col-span-2 mt-2 rounded-2xl border border-accent/40 bg-accent/10 p-3 text-xs">
      {stage.kind === "compressing" && (
        <div>
          <div className="flex items-center justify-between font-semibold text-foreground">
            <span>Compressing image…</span>
            <span className="text-accent-foreground">
              {stage.originalKB}KB{stage.compressedKB != null ? ` → ${stage.compressedKB}KB` : ""}
            </span>
          </div>
          <Progress value={stage.compressedKB != null ? 100 : 40} className="mt-2 h-1.5" />
        </div>
      )}
      {stage.kind === "uploading" && (
        <div>
          <div className="font-semibold text-foreground">Uploading…</div>
          <Progress value={stage.pct} className="mt-2 h-1.5" />
        </div>
      )}
      {stage.kind === "extracting" && (
        <div>
          <div className="font-semibold text-foreground">Extracting content…</div>
          <Progress value={70} className="mt-2 h-1.5" />
        </div>
      )}
      {stage.kind === "done" && (
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" /> Uploaded
        </div>
      )}
      {stage.kind === "error" && (
        <div className="flex items-start gap-1.5 text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{stage.message}</span>
        </div>
      )}
    </div>
  );
}

/* -------- Materials list scoped to this course -------- */

function MaterialsList({ courseCode, items, loading }: {
  courseCode: string; items: CourseMaterial[] | null; loading: boolean;
}) {

  return (
    <div className="mt-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Uploaded materials · {courseCode}
      </h2>

      {loading && items === null ? (
        <Progress value={50} className="h-1.5" />
      ) : !items || items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
          No materials yet. Upload a past paper or slides to power predictions for {courseCode}.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <MaterialRow key={m.id} m={m} onDelete={async () => {
              await deleteMaterial(m);
              window.dispatchEvent(new Event("course-materials-refresh"));
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MaterialRow({
  m, onDelete, showCourse, isFromInactiveCourse,
}: {
  m: CourseMaterial;
  onDelete: () => void;
  showCourse?: boolean;
  isFromInactiveCourse?: boolean;
}) {
  const t = m.file_type;
  const isImage = t === "image";
  const isPasted = t === "pasted";
  const hasExtraction = t === "pdf" || t === "docx" || t === "pptx";
  const kb = Math.round(m.size_bytes / 1024);
  const [flag, setFlag] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const canRetry = isRetryableMaterial(m);

  useEffect(() => {
    setFlag(getMetadataFlag(m.id));
  }, [m.id]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const fresh = await retryExtraction(m.id);
      if (!fresh) {
        toast.error("We couldn't check that upload. Refresh and try again.");
      } else if (fresh.extraction_status === "success") {
        toast.success("Text extracted, this upload is ready to analyze.");
      } else {
        toast.error("Still couldn't read this file", {
          description: extractionToastMessage(fresh),
        });
      }
      window.dispatchEvent(new Event("course-materials-refresh"));
    } catch (e) {
      console.error("[materials] retry extraction failed", e);
      toast.error(e instanceof Error ? e.message : "Couldn't read that file. Please try again.");
      // The row already carries a terminal status from retryExtraction, so the
      // list must refresh even after a throw or it would keep showing "Extracting…".
      window.dispatchEvent(new Event("course-materials-refresh"));
    } finally {
      setRetrying(false);
    }
  };


  const iconMeta: { Icon: typeof FileText; tone: string } = (() => {
    if (t === "pdf") return { Icon: FileText, tone: "bg-primary text-primary-foreground" };
    if (t === "docx") return { Icon: FileType2, tone: "bg-[hsl(215_70%_45%)] text-white" };
    if (t === "pptx") return { Icon: Presentation, tone: "bg-[hsl(20_85%_50%)] text-white" };
    if (t === "pasted") return { Icon: ClipboardPaste, tone: "bg-secondary text-primary" };
    return { Icon: FileImage, tone: "bg-accent text-accent-foreground" };
  })();

  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", iconMeta.tone)}>
          <iconMeta.Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{m.file_name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {showCourse ? <span className="font-semibold text-foreground">{m.course_code}</span> : null}
            {showCourse ? <span>·</span> : null}
            {isPasted ? (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                Pasted text
              </span>
            ) : (
              <span className="uppercase">{isImage ? "IMG" : t}</span>
            )}
            <span>·</span>
            <span>{kb}KB</span>
            <span>·</span>
            <span>{new Date(m.created_at).toLocaleDateString()}</span>
            {hasExtraction ? <ExtractionBadge material={m} /> : null}
          </div>
          {isFromInactiveCourse ? (
            <div className="mt-1 text-[10px] italic text-muted-foreground">From a previous course selection</div>
          ) : null}
        </div>
        {canRetry ? (
          <button
            onClick={() => void handleRetry()}
            disabled={retrying}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary disabled:opacity-50"
            aria-label="Retry text extraction"
            title="Retry text extraction"
          >
            <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} />
          </button>
        ) : null}
        <button
          onClick={onDelete}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {flag ? (
        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-border bg-secondary/50 p-2.5 text-[11px] text-foreground">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p>{METADATA_NOTE}</p>
            <p className="mt-1 text-muted-foreground">{flag}</p>
          </div>
          <button
            onClick={() => { dismissMetadataFlag(m.id); setFlag(null); }}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label="Dismiss note"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}
    </div>
  );
}


function ExtractionBadge({ material }: { material: CourseMaterial }) {
  const summary = extractionSummary(material);
  if (!summary) return null;
  const tone =
    summary.tone === "ok"
      ? "bg-primary/10 text-primary"
      : summary.tone === "working"
        ? "bg-muted text-muted-foreground"
        : summary.tone === "warn"
          ? "bg-amber-100 text-amber-800"
          : "bg-destructive/10 text-destructive";
  return (
    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", tone)}>
      {summary.label}
    </span>
  );
}

/** Explains an unreadable upload and lists what the student can do next. */
function ExtractionGuidance({ material }: { material: CourseMaterial }) {
  const summary = extractionSummary(material);
  if (!summary || summary.nextSteps.length === 0) return null;
  const isWarn = summary.tone === "warn";
  return (
    <div
      className={cn(
        "mt-2.5 rounded-xl border p-2.5 text-[11px]",
        isWarn ? "border-amber-200 bg-amber-50 text-amber-900" : "border-destructive/20 bg-destructive/5 text-foreground",
      )}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold">{summary.reason}</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {summary.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

