/**
 * Plan B Library: My locker (own files) + Course shelf (peers' published files).
 * Read-only viewing, no downloads. Everything privileged goes through
 * library.functions.ts.
 */
import { ErrorCard } from "@/components/error-card";
import { PdfViewer } from "@/components/pdf-viewer";
import { ChatbotScreen } from "@/components/chatbot";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Copy, Eye, FolderOpen, Loader2, MoreHorizontal, Search, Share2, Trash2, Upload, X,
} from "lucide-react";
import { toast } from "sonner";
import { HeaderLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { getMyAvatar } from "@/lib/avatar";
import { deleteMaterial } from "@/lib/course-materials";
import { useProfile } from "@/lib/profile-store";
import { PRICE_LINE } from "@/lib/pricing-copy";
import { canonicalCourseCode } from "@/lib/course-code";
import { presignMaterialDownload } from "@/lib/storage.functions";
import {
  createOneFileLink, getShelfPreview, listShelfItems, revokeOneFileLink,
  savePeerFile, setMaterialPublished, SHARING_OFFLINE_MESSAGE,
} from "@/lib/library.functions";

const READY_MIN_CHARS = 50;

type Rail = "locker" | "shelf";

type LockerFile = {
  id: string;
  course_code: string;
  file_path: string;
  file_name: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
  published: boolean;
  is_peer_copy: boolean;
  peer_alias: string | null;
  readyForMocks: boolean;
};

let lockerDisplayCache: LockerFile[] | null = null;

type ShelfItem = {
  id: string;
  course_code: string;
  file_name: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
  peer_alias: string;
  avatar_url: string | null;
  readyForMocks: boolean;
};

function typeChip(fileType: string): { label: string; color: string; textColor: string } {
  const t = fileType.toLowerCase();
  if (t === "pdf") return { label: "PDF", color: "#8B2E2E", textColor: "#F7F3EA" };
  if (t === "docx" || t === "doc") return { label: "DOC", color: "#1D4E89", textColor: "#F7F3EA" };
  if (t === "pptx" || t === "ppt") return { label: "PPT", color: "#B86E0A", textColor: "#080D19" };
  return { label: "TXT", color: "#5C5C70", textColor: "#F7F3EA" };
}

function TypeChip({ fileType }: { fileType: string }) {
  const { label, color, textColor } = typeChip(fileType);
  return (
    <span
      className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: color, color: textColor }}
    >
      {label}
    </span>
  );
}

async function presignMaterialDownload({ data }: { data: { materialId: string } }): Promise<{ url?: string; reason?: string }> {
  const { data: row, error } = await supabase
    .from("course_materials")
    .select("file_path")
    .eq("id", data.materialId)
    .maybeSingle();
  if (error || !row?.file_path) return { reason: error?.message || "This file couldn't be opened." };

  const { data: signed, error: signedError } = await supabase.storage
    .from("course-materials")
    .createSignedUrl(row.file_path, 60 * 30);
  if (signedError || !signed?.signedUrl) return { reason: signedError?.message || "This file couldn't be opened." };
  return { url: signed.signedUrl };
}

function ReadyPill({ ready }: { ready: boolean }) {
  return ready ? (
    <span className="rounded-full bg-good/15 px-2 py-0.5 text-[10px] font-semibold text-good">
      Ready for mocks
    </span>
  ) : (
    <span className="rounded-full bg-[#B86E0A]/12 px-2 py-0.5 text-[10px] font-semibold text-accent">
      Reading only
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 text-card-foreground ${className}`}>{children}</div>
  );
}

export function LibraryScreen({ active = true }: { active?: boolean } = {}) {
  const { navigate, profile, activeCourseCode } = useProfile();
  const [rail, setRail] = useState<Rail>("locker");
  const [locker, setLocker] = useState<LockerFile[] | null>(() => lockerDisplayCache);
  const [lockerError, setLockerError] = useState(false);
  const [openFolder, setOpenFolder] = useState<string | null>(null);

  const [shelf, setShelf] = useState<{ items: ShelfItem[]; courses: { course_code: string; count: number }[] } | null>(null);
  const [shelfOffline, setShelfOffline] = useState(false);
  const [shelfCourse, setShelfCourse] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [shelfLoading, setShelfLoading] = useState(false);

  const [ownerSheet, setOwnerSheet] = useState<LockerFile | null>(null);
  const [publishTarget, setPublishTarget] = useState<LockerFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LockerFile | null>(null);
  const [linkSheet, setLinkSheet] = useState<
    { fileName: string; token: string; expiresAt: string; usesLeft: number; maxUses: number } | null
  >(null);
  const [preview, setPreview] = useState<
    { id: string; file_name: string; file_type: string; course_code: string; url: string | null; readyForMocks: boolean; peer: boolean; failed?: boolean; reason?: string } | null
  >(null);
  const [pageExplanation, setPageExplanation] = useState<{ courseCode: string; page: number; fileName: string; text: string } | null>(null);

  const [busy, setBusy] = useState(false);
  // Attribution choices for the publish confirmation. Both start off every time.
  const [publishName, setPublishName] = useState(false);
  const [publishPhoto, setPublishPhoto] = useState(false);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);

  const loadLocker = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) {
        lockerDisplayCache = [];
        setLocker([]);
        setLockerError(false);
        return;
      }
      const { data, error } = await supabase
        .from("course_materials")
        .select(
          "id, course_code, file_path, file_name, file_type, size_bytes, created_at, published, is_peer_copy, peer_alias, extracted_content",
        )
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const files = (data ?? []).map((r) => ({
        id: r.id,
        course_code: r.course_code,
        file_path: r.file_path,
        file_name: r.file_name,
        file_type: r.file_type,
        size_bytes: r.size_bytes,
        created_at: r.created_at ?? "",
        published: r.published,
        is_peer_copy: r.is_peer_copy,
        peer_alias: r.peer_alias,
        readyForMocks: (r.extracted_content ?? "").trim().length >= READY_MIN_CHARS,
      }));
      lockerDisplayCache = files;
      setLocker(files);
      setLockerError(false);
    } catch {
      setLockerError(true);
    }
  }, []);

  const loadShelf = useCallback(async () => {
    setShelfLoading(true);
    try {
      const result = await listShelfItems({
        data: { courseCode: shelfCourse ?? undefined, search: debouncedSearch || undefined },
      });
      setShelfOffline(result.offline);
      setShelf({ items: result.items, courses: result.courses });
    } catch {
      setShelfOffline(true);
    } finally {
      setShelfLoading(false);
    }
  }, [shelfCourse, debouncedSearch]);

  useEffect(() => { if (active) void loadLocker(); }, [active, loadLocker]);
  useEffect(() => {
    const refresh = () => { if (active) void loadLocker(); };
    window.addEventListener("course-materials-refresh", refresh);
    return () => window.removeEventListener("course-materials-refresh", refresh);
  }, [active, loadLocker]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => { if (active && rail === "shelf") void loadShelf(); }, [active, rail, loadShelf]);
  // Only used to decide whether the "show my photo" tick box can appear.
  useEffect(() => {
    let alive = true;
    void getMyAvatar()
      .then(({ url }) => { if (alive) setMyAvatarUrl(url); })
      .catch(() => { if (alive) setMyAvatarUrl(null); });
    return () => { alive = false; };
  }, []);

  const filteredShelfCourses = useMemo(() => {
    const courses = shelf?.courses ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return courses;
    const stripCoursePrefix = (value: string) => value.replace(/^(?:(?:c|ui)-)+/i, "").toLowerCase();
    return courses.filter((course) => {
      const visibleCode = course.course_code.toLowerCase();
      const plainCode = stripCoursePrefix(course.course_code);
      return visibleCode.includes(needle) || plainCode.includes(needle);
    });
  }, [shelf, search]);

  const folders = useMemo(() => {
    const map = new Map<string, LockerFile[]>();
    for (const f of locker ?? []) {
      const code = canonicalCourseCode(f.course_code);
      const list = map.get(code) ?? [];
      list.push(f);
      map.set(code, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [locker]);

  const doPublish = async (file: LockerFile, published: boolean) => {
    setBusy(true);
    const result = await setMaterialPublished({
      data: {
        materialId: file.id,
        published,
        showOwnerName: published ? publishName : false,
        showOwnerPhoto: published ? publishPhoto : false,
      },
    });
    setBusy(false);
    setPublishTarget(null);
    setOwnerSheet(null);
    setPublishName(false);
    setPublishPhoto(false);
    if (!result.ok) { toast.error(result.reason); return; }
    toast.success(published ? "On the shelf for your coursemates." : "Taken off the shelf.");
    void loadLocker();
  };

  const doCopyLink = async (file: LockerFile) => {
    setBusy(true);
    const result = await createOneFileLink({ data: { materialId: file.id } });
    setBusy(false);
    setOwnerSheet(null);
    if (!result.ok) { toast.error(result.reason); return; }
    const url = `${window.location.origin}/s/${result.token}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link copied."); } catch { /* clipboard blocked */ }
    setLinkSheet({
      fileName: result.fileName, token: result.token, expiresAt: result.expiresAt,
      usesLeft: result.usesLeft, maxUses: result.maxUses,
    });
  };

  const doRevoke = async (token: string) => {
    setBusy(true);
    const result = await revokeOneFileLink({ data: { token } });
    setBusy(false);
    if (!result.ok) { toast.error(result.reason); return; }
    setLinkSheet(null);
    toast.success("Link revoked.");
  };

  const doRemove = async (file: LockerFile) => {
    setBusy(true);
    try {
      await deleteMaterial({ id: file.id, file_path: file.file_path });
    } catch (error) {
      setBusy(false);
      toast.error("We couldn't remove that file.");
      console.error("[library] remove failed", error);
      return;
    }
    setBusy(false);
    const remaining = (locker ?? []).filter((item) => item.id !== file.id);
    lockerDisplayCache = remaining;
    setLocker(remaining);
    setDeleteTarget(null);
    setOwnerSheet(null);
    toast.success("Removed from your locker.");
    void loadLocker();
  };

  const openPreview = async (item: { id: string; file_name: string; file_type: string; course_code: string; readyForMocks: boolean }, peer: boolean) => {
    setBusy(true);
    const fallback = (failed: boolean, reason?: string) =>
      setPreview({
        id: item.id, file_name: item.file_name, file_type: item.file_type,
        course_code: item.course_code, url: null, readyForMocks: item.readyForMocks, peer,
        ...(failed ? { failed: true } : {}),
        ...(reason ? { reason } : {}),
      });
    try {
      if (!peer) {
        let signedReason: string | undefined;
        const sign = async (): Promise<{ url: string; reason?: string }> => {
          const signed = await presignMaterialDownload({ data: { materialId: item.id } });
          if (!signed.url) {
            signedReason = signed.reason || undefined;
            throw new Error("This file couldn't be opened.");
          }
          return { url: signed.url, reason: signed.reason };
        };
        let signed: { url: string; reason?: string };
        try {
          signed = await sign();
        } catch {
          try {
            signed = await sign();
          } catch (error) {
            throw new Error(signedReason || (error instanceof Error ? error.message : String(error)));
          }
        }
        setBusy(false);
        setPreview({
          id: item.id, file_name: item.file_name, file_type: item.file_type,
          course_code: item.course_code, url: signed.url,
          readyForMocks: item.readyForMocks, peer: false,
        });
        return;
      }
      const result = await getShelfPreview({ data: { materialId: item.id } });
      setBusy(false);
      if (!result.ok) { toast.error(result.reason); fallback(true); return; }
      setPreview({
        id: item.id, file_name: result.file_name, file_type: result.file_type,
        course_code: result.course_code, url: result.url, readyForMocks: result.readyForMocks, peer,
      });
    } catch (e) {
      // A real request failure (object gone, storage error): show the shared
      // error card, never a blank frame.
      console.warn("[library] preview failed", e);
      setBusy(false);
      fallback(true, e instanceof Error ? e.message : String(e));
    }
  };


  const explainPageInChat = (data: { page: number; fileName: string; text: string }) => {
    if (!preview) return;
    const attachment = {
      courseCode: canonicalCourseCode(preview.course_code),
      page: data.page,
      fileName: data.fileName,
      text: data.text.slice(0, 4000),
    };
    if (window.matchMedia("(min-width: 768px)").matches) {
      setPageExplanation(attachment);
      return;
    }
    sessionStorage.setItem("truefluency-chat-explain-page", JSON.stringify(attachment));
    setPageExplanation(null);
    setOwnerSheet(null);
    setPreview(null);
    navigate("chatbot", { courseCode: attachment.courseCode });
  };

  const retryPreview = async () => {
    if (!preview) return;
    await openPreview({
      id: preview.id,
      file_name: preview.file_name,
      file_type: preview.file_type,
      course_code: preview.course_code,
      readyForMocks: preview.readyForMocks,
    }, preview.peer);
  };

  const doSave = async (item: { id: string; course_code: string }) => {
    setBusy(true);
    const result = await savePeerFile({ data: { materialId: item.id, courseCode: item.course_code } });
    setBusy(false);
    if (!result.ok) { toast.error(result.reason); return; }
    toast.success("Saved to your locker.");
    setPreview(null);
    void loadLocker();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-5 pb-28 pt-6 md:max-w-3xl">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Files</span>
        </div>

        <h1 className="font-display text-2xl font-semibold text-foreground">My files</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload past papers and notes here. Your locker is private; the course shelf only shows
          what coursemates chose to publish.
        </p>

        {/* Rails */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-card p-1 ring-1 ring-border">
          {(["locker", "shelf"] as Rail[]).map((r) => (
            <button
              key={r}
              onClick={() => { setRail(r); setOpenFolder(null); }}
              className={rail === r ? "rounded-lg bg-amber py-2 text-sm font-semibold text-cream transition" : "rounded-lg py-2 text-sm font-semibold text-muted-foreground transition"}
            >
              {r === "locker" ? "My locker" : "Course shelf"}
            </button>
          ))}
        </div>

        {rail === "locker" ? (
          <div className="mt-4 space-y-3">
            <Button
              className="h-12 w-full bg-amber text-cream hover:bg-amber/90"
              onClick={() => {
                // Straight to the uploader for the course in front of the
                // student: the open folder, then their active course, then the
                // first course they added. No course yet: add one first.
                const code =
                  openFolder ??
                  activeCourseCode ??
                  profile.courses[0]?.code ??
                  null;
                if (code) navigate("course-detail", { courseCode: code });
                else navigate("add-course");
              }}
            >
              <Upload className="mr-2 h-4 w-4" /> Upload course material
            </Button>

            {locker === null ? (
              lockerError ? (
                <ErrorCard title="We couldn't load your locker." body="Your files are still saved. Try again to refresh the list." actionLabel="Retry" onAction={() => void loadLocker()} />
              ) : <Card><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></Card>
            ) : openFolder ? (
              <>
                {lockerError ? <Card><button type="button" className="text-sm font-medium text-foreground underline" onClick={() => void loadLocker()}>Couldn't refresh your files. Retry</button></Card> : null}
                <button
                  onClick={() => setOpenFolder(null)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> My locker
                </button>
                {(locker.filter((f) => canonicalCourseCode(f.course_code) === openFolder)).map((f) => (
                  <Card key={f.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <TypeChip fileType={f.file_type} />
                          <span className="break-words text-sm font-semibold text-foreground">{f.file_name}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <ReadyPill ready={f.readyForMocks} />
                          {f.published ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-foreground">On shelf</span>
                          ) : null}
                          {f.is_peer_copy ? (
                            <span className="rounded-full bg-doc-blue/10 px-2 py-0.5 text-[10px] font-semibold text-doc-blue">
                              Peer copy: {f.peer_alias ?? "A peer"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        aria-label="File actions"
                        onClick={() => setOwnerSheet(f)}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </Card>
                ))}
              </>
            ) : folders.length === 0 ? (
              lockerError ? (
                <ErrorCard title="We couldn't load your locker." body="Try again to refresh your files." actionLabel="Retry" onAction={() => void loadLocker()} />
              ) : (
                <Card>
                  <p className="text-sm text-muted-foreground">
                    Nothing in your locker yet. Upload a past paper or lecture note from a course to get started.
                  </p>
                </Card>
              )
            ) : (
              <>
                {lockerError ? <Card><button type="button" className="text-sm font-medium text-foreground underline" onClick={() => void loadLocker()}>Couldn't refresh your files. Retry</button></Card> : null}
                {folders.map(([code, files]) => (
                  <button key={code} onClick={() => setOpenFolder(code)} className="w-full text-left">
                    <Card>
                      <div className="flex items-center gap-3">
                        <div className="surface-icon-well grid h-10 w-10 shrink-0 place-items-center rounded-xl">
                          <FolderOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="break-words font-semibold text-foreground">{code}</div>
                          <div className="text-xs text-muted-foreground">
                            {files.length} file{files.length === 1 ? "" : "s"}
                            {files.some((f) => f.published) ? " · some on shelf" : ""}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </button>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a course code, e.g. PHY102"
                className="h-12 border-border bg-card pl-9 text-foreground"
              />
            </div>

            {shelfOffline && shelf === null ? (
              <Card><p className="text-sm text-muted-foreground">{SHARING_OFFLINE_MESSAGE}</p></Card>
            ) : shelf === null ? (
              <Card><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></Card>
            ) : (
              <>
                {shelfLoading ? <p className="text-xs text-muted-foreground" role="status">Updating course shelf…</p> : null}
                {shelfOffline ? <Card><p className="text-sm text-muted-foreground">Couldn't refresh the course shelf. Showing the last results.</p></Card> : null}
                {shelfCourse ? (
                  <button
                    onClick={() => setShelfCourse(null)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" /> Course shelf
                  </button>
                ) : (
                  filteredShelfCourses.map((c) => (
                    <button key={c.course_code} onClick={() => setShelfCourse(c.course_code)} className="w-full text-left">
                      <Card>
                        <div className="flex items-center justify-between gap-3">
                          <span className="break-words font-semibold text-foreground">{c.course_code}</span>
                          <span className="text-xs text-muted-foreground">{c.count} published</span>
                        </div>
                      </Card>
                    </button>
                  ))
                )}

                {(shelfCourse ? (shelf?.items ?? []) : []).map((it) => (
                  <Card key={it.id}>
                    <div className="flex items-center gap-2">
                      <TypeChip fileType={it.file_type} />
                      <span className="break-words text-sm font-semibold text-foreground">{it.file_name}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ReadyPill ready={it.readyForMocks} />
                      <span className="flex items-center gap-1.5 rounded-full bg-doc-blue/10 px-2 py-0.5 text-[10px] font-semibold text-doc-blue">
                        {it.avatar_url ? (
                          <img
                            src={it.avatar_url}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        ) : null}
                        Peer copy: {it.peer_alias}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" className="h-10 border-border" onClick={() => void openPreview(it, true)} disabled={busy}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                      <Button className="h-10 bg-amber text-cream hover:bg-amber/90" onClick={() => void doSave(it)} disabled={busy}>
                        Save to locker
                      </Button>
                    </div>
                  </Card>
                ))}

                {shelf && filteredShelfCourses.length === 0 ? (
                  <Card><p className="text-sm text-muted-foreground">
                    {search.trim() ? "No published courses match." : "Nothing published for your courses yet."}
                  </p></Card>
                ) : null}
              </>
            )}
          </div>
        )}

        <p className="mt-4 text-[11px] text-muted-foreground">
          Files are viewed in the app. There is no download, and you can unpublish at any time.
        </p>
      </div>

      {/* Owner actions */}
      <Sheet open={ownerSheet !== null} onOpenChange={(o) => !o && setOwnerSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-card text-card-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">{ownerSheet?.file_name}</SheetTitle>
            <SheetDescription className="text-muted-foreground">
              Your locker is private until you publish a file.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3 space-y-2 pb-4">
            <Button variant="outline" className="h-11 w-full justify-start border-border" onClick={() => ownerSheet && void openPreview(ownerSheet, false)} disabled={busy}>
              <Eye className="mr-2 h-4 w-4" /> View
            </Button>
            {ownerSheet && !ownerSheet.is_peer_copy ? (
              ownerSheet.published ? (
                <Button variant="outline" className="h-11 w-full justify-start border-border" onClick={() => void doPublish(ownerSheet, false)} disabled={busy}>
                  <X className="mr-2 h-4 w-4" /> Unpublish
                </Button>
              ) : (
                <Button className="h-11 w-full justify-start bg-amber text-cream hover:bg-amber/90" onClick={() => setPublishTarget(ownerSheet)} disabled={busy}>
                  <Share2 className="mr-2 h-4 w-4" /> Publish to course shelf
                </Button>
              )
            ) : null}
            {ownerSheet && !ownerSheet.is_peer_copy ? (
              <Button variant="outline" className="h-11 w-full justify-start border-border" onClick={() => void doCopyLink(ownerSheet)} disabled={busy}>
                <Copy className="mr-2 h-4 w-4" /> Copy one-file link
              </Button>
            ) : null}
            <Button variant="outline" className="h-11 w-full justify-start border-border text-wine" onClick={() => ownerSheet && setDeleteTarget(ownerSheet)} disabled={busy}>
              <Trash2 className="mr-2 h-4 w-4" /> Remove
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTarget?.is_peer_copy ? "Remove your saved copy?" : "Remove this file?"}</AlertDialogTitle>
            <AlertDialogDescription className="break-words">{deleteTarget?.file_name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => { event.preventDefault(); if (deleteTarget) void doRemove(deleteTarget); }}
              disabled={busy}
            >
              {deleteTarget?.is_peer_copy ? "Remove copy" : "Remove file"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish confirm */}
      <Dialog open={publishTarget !== null} onOpenChange={(o) => !o && setPublishTarget(null)}>
        <DialogContent className="bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Publish to your course shelf?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Coursemates will be able to view this file inside the app. There is no download. You can
              unpublish it at any time and it disappears from the shelf.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-xl border border-border bg-background p-3">
            <label className="flex items-start gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[#B86E0A]"
                checked={publishName}
                onChange={(e) => setPublishName(e.target.checked)}
              />
              <span>Show my first name on this file</span>
            </label>
            {myAvatarUrl ? (
              <label className="flex items-start gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[#B86E0A]"
                  checked={publishPhoto}
                  onChange={(e) => setPublishPhoto(e.target.checked)}
                />
                <span>Show my photo on this file</span>
              </label>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Both are off unless you tick them. Nothing else about you is shown.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setPublishTarget(null)}>Cancel</Button>
            <Button className="bg-amber text-cream hover:bg-amber/90" onClick={() => publishTarget && void doPublish(publishTarget, true)} disabled={busy}>
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-file link */}
      <Sheet open={linkSheet !== null} onOpenChange={(o) => !o && setLinkSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-card text-card-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">One-file link</SheetTitle>
            <SheetDescription className="text-muted-foreground">
              This link opens only this one file, nothing else in your locker. It expires in 7 days,
              works for {linkSheet?.maxUses ?? 5} saves, and you can revoke it now.
            </SheetDescription>
          </SheetHeader>
          {linkSheet ? (
            <div className="mt-3 space-y-3 pb-4">
              <div className="break-all rounded-xl border border-border bg-background p-3 text-xs text-foreground">
                {`${window.location.origin}/s/${linkSheet.token}`}
              </div>
              <div className="text-xs text-muted-foreground">
                {linkSheet.usesLeft} of {linkSheet.maxUses} saves left
              </div>
              <Button variant="outline" className="h-11 w-full border-border text-wine" onClick={() => void doRevoke(linkSheet.token)} disabled={busy}>
                Revoke link
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* In-app preview */}
      <Sheet open={preview !== null} onOpenChange={(o) => { if (!o) { setPreview(null); setPageExplanation(null); } }}>
        <SheetContent side="bottom" className="h-[92vh] min-w-0 w-full max-w-full overflow-x-hidden rounded-t-2xl bg-card text-card-foreground md:inset-4 md:flex md:h-auto md:w-auto md:max-w-none md:flex-col md:rounded-2xl">
          <SheetHeader>
            <SheetTitle className="break-words text-foreground">{preview?.file_name}</SheetTitle>
            <SheetDescription className="text-muted-foreground">
              {preview?.course_code} · viewing in app, no download
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3 flex h-[64vh] min-h-0 min-w-0 w-full max-w-full flex-col overflow-hidden rounded-xl border border-border bg-background md:flex-1 md:flex-row md:gap-3 md:overflow-hidden md:rounded-none md:border-0 md:bg-transparent">
            <div className="min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto rounded-xl border border-border bg-background md:min-w-0">
              {preview?.failed ? (
                <div data-swipe-lock="" className="grid h-full place-items-center p-4">
                  <ErrorCard
                    title={preview.file_type.toLowerCase() === "pdf" ? "We couldn't open this PDF here." : "We couldn't open this file."}
                    body="The file may have been removed or its link may have expired."
                    onAction={() => void retryPreview()}
                    linkLabel="Close"
                    onLink={() => { setPreview(null); setPageExplanation(null); }}
                  />
                </div>
              ) : preview?.url && preview.file_type.toLowerCase() === "image" ? (
                <img src={preview.url} alt={preview.file_name} className="mx-auto h-full object-contain" />
              ) : preview?.url && preview.file_type.toLowerCase() === "pdf" ? (
                <PdfViewer
                  url={preview.url}
                  fileName={preview.file_name}
                  fileKey={preview.id}
                  onClose={() => { setPreview(null); setPageExplanation(null); }}
                  onCancel={() => { setPreview(null); setPageExplanation(null); }}
                  onExplain={explainPageInChat}
                  onRetry={retryPreview}
                  explainPanelOpen={pageExplanation !== null}
                />
              ) : preview?.url ? (
                <div className="grid h-full place-items-center bg-background p-6 text-center">
                  <p className="text-sm text-foreground">Preview isn't available for this file type.</p>
                </div>
              ) : (
                <div data-swipe-lock="" className="grid h-full place-items-center p-4">
                  <ErrorCard
                    title={preview?.file_type.toLowerCase() === "pdf" ? "We couldn't open this PDF here." : "We couldn't open this file."}
                    body="Try again to refresh the file link."
                    onAction={() => void retryPreview()}
                    linkLabel="Close"
                    onLink={() => { setPreview(null); setPageExplanation(null); }}
                  />
                </div>
              )}
            </div>
            {pageExplanation ? (
              <div className="hidden min-h-0 w-[380px] shrink-0 overflow-hidden rounded-xl border border-border bg-background md:block">
                <ChatbotScreen embedded pageAttachment={pageExplanation} />
              </div>
            ) : null}
          </div>
          {preview?.peer ? (
            <Button
               className="mt-3 h-12 w-full bg-amber text-cream hover:bg-amber/90"
              onClick={() => preview && void doSave({ id: preview.id, course_code: preview.course_code })}
              disabled={busy}
            >
              Save to locker
            </Button>
          ) : (
            <p className="mt-3 text-center text-[12px] font-medium text-muted-foreground">View only</p>
          )}
          <p className="mt-2 break-words text-[11px] text-muted-foreground">{PRICE_LINE}</p>

        </SheetContent>
      </Sheet>
    </div>
  );
}
