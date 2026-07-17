import { useEffect, useRef, useState } from "react";
import { useProfile, averageForCourse } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Zap, Upload, Sparkles, ChevronRight,
  FileImage, FileText, FileType2, Presentation, Trash2, AlertCircle, CheckCircle2, Loader2, RotateCw,
} from "lucide-react";
import { AiGeneratedLabel, TopicPill, scoreToStrength } from "@/components/common";
import {
  uploadCourseMaterial, listMaterialsForCourse, deleteMaterial,
  findDuplicateMaterial, ACCEPTED_UPLOAD_MIME,
  type CourseMaterial, type UploadStage,
} from "@/lib/course-materials";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { courseFeatureOrder } from "@/lib/personalization";

export function CourseDetailScreen() {
  const { profile, navigate, activeCourseCode } = useProfile();
  const course = profile.courses.find((c) => c.code === activeCourseCode);

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-5 pt-6">
          <Button variant="ghost" onClick={() => navigate("dashboard")}>← Back</Button>
          <p className="mt-6 text-sm text-muted-foreground">Course not found.</p>
        </div>
      </div>
    );
  }

  const avg = averageForCourse(profile, course.code);
  const relevantAttempts = profile.attempts.filter((a) => a.courseCode === course.code).slice(-3).reverse();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <button
          onClick={() => navigate("dashboard")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </button>

        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-5 text-primary-foreground shadow-sm">
          <div className="text-xs font-medium text-primary-foreground/70">{course.code}</div>
          <div className="mt-0.5 font-display text-2xl font-semibold leading-tight">{course.name}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-primary-foreground/60">
            {course.status} · {course.source === "manual" ? "Manually added" : "Verified"}
          </div>
        </div>

        <CoursePrimaryActions courseCode={course.code} />



        <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Predicted topics
          </div>
          <div className="flex flex-wrap gap-1.5">
            <TopicPill label="Core Concepts" strength={0.85} />
            <TopicPill label="Applications" strength={0.6} />
            <TopicPill label="Theory & Proofs" strength={0.4} />
            <TopicPill label="Edge cases" strength={0.2} />
          </div>
          <AiGeneratedLabel className="mt-3" />
        </div>

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
                <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{a.correct}/{a.total} correct</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(a.submittedAt).toLocaleDateString()} · {a.total} questions
                    </div>
                  </div>
                  <TopicPill label={`${a.score}%`} strength={scoreToStrength(a.score)} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------- Personalization-aware action section -------- */

function CoursePrimaryActions({ courseCode }: { courseCode: string }) {
  const { navigate, profile } = useProfile();
  const { order, flashcardsPlaceholderNote } = courseFeatureOrder(profile.studyPreference);

  const mockButton = (
    <Button size="lg" onClick={() => navigate("mock-gen", { courseCode })}>
      <Zap className="mr-1.5 h-4 w-4" /> Mock test
    </Button>
  );

  const readingFirst = order[0] === "materials";

  return (
    <>
      {readingFirst ? (
        <>
          <MaterialsList courseCode={courseCode} />
          <div className="mt-5 grid grid-cols-2 gap-2">
            <UploadButton courseCode={courseCode} />
            {mockButton}
          </div>
        </>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {mockButton}
            <UploadButton courseCode={courseCode} />
          </div>
          <MaterialsList courseCode={courseCode} />
        </>
      )}
      {flashcardsPlaceholderNote ? (
        <p className="mt-2 text-center text-[11px] italic text-muted-foreground">
          Flashcards coming soon, your preferred study method.
        </p>
      ) : null}
    </>
  );
}

/* -------- Upload button + duplicate dialog -------- */

function UploadButton({ courseCode }: { courseCode: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const [lastError, setLastError] = useState<{ file: File } | null>(null);

  const onPick = () => inputRef.current?.click();

  const runUpload = async (file: File) => {
    setLastError(null);
    try {
      const result = await uploadCourseMaterial({
        file,
        courseCode,
        onStage: (s) => setStage(s),
      });
      // Extraction status feedback for extractable types (pdf, docx, pptx).
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
      window.dispatchEvent(new Event("course-materials-refresh"));
    } catch (err) {
      setLastError({ file });
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setTimeout(() => setStage(null), 1500);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Duplicate check (same user + course + filename).
    try {
      const dup = await findDuplicateMaterial({ courseCode, fileName: file.name });
      if (dup) {
        setPendingFile(file);
        setDupOpen(true);
        return;
      }
    } catch { /* ignore, fall through to upload */ }

    void runUpload(file);
  };

  const busy = stage !== null && stage.kind !== "done" && stage.kind !== "error";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,application/pdf"
        className="hidden"
        onChange={onFile}
      />
      <Button size="lg" variant="outline" onClick={onPick} disabled={busy}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
        {busy ? "Uploading…" : "Upload paper"}
      </Button>

      {stage ? <StageBanner stage={stage} /> : null}

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

function MaterialsList({ courseCode }: { courseCode: string }) {
  const [items, setItems] = useState<CourseMaterial[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await listMaterialsForCourse(courseCode);
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const h = () => void load();
    window.addEventListener("course-materials-refresh", h);
    return () => window.removeEventListener("course-materials-refresh", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseCode]);

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
  const isPdf = m.file_type === "pdf";
  const kb = Math.round(m.size_bytes / 1024);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
      <div className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
        isPdf ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
      )}>
        {isPdf ? <FileText className="h-4 w-4" /> : <FileImage className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{m.file_name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {showCourse ? <span className="font-semibold text-foreground">{m.course_code}</span> : null}
          {showCourse ? <span>·</span> : null}
          <span>{kb}KB</span>
          <span>·</span>
          <span>{new Date(m.created_at).toLocaleDateString()}</span>
          {isPdf ? <ExtractionBadge status={m.extraction_status} /> : null}
        </div>
        {isFromInactiveCourse ? (
          <div className="mt-1 text-[10px] italic text-muted-foreground">From a previous course selection</div>
        ) : null}
      </div>
      <button
        onClick={onDelete}
        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function ExtractionBadge({ status }: { status: CourseMaterial["extraction_status"] }) {
  if (status === "success") return <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Text ready</span>;
  if (status === "pending") return <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Extracting…</span>;
  if (status === "scanned_pdf") return <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">Scanned, upload as image</span>;
  if (status === "timeout" || status === "failed") return <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">Couldn't read content</span>;
  return null;
}
