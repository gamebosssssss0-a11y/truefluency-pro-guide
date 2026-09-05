/**
 * Plan B Library: My locker (own files) + Course shelf (peers' published files).
 * Read-only viewing, no downloads. Everything privileged goes through
 * library.functions.ts.
 */
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
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/profile-store";
import { PRICE_LINE } from "@/lib/pricing-copy";
import {
  createOneFileLink, getShelfPreview, listShelfItems, revokeOneFileLink,
  savePeerFile, setMaterialPublished, SHARING_OFFLINE_MESSAGE,
} from "@/lib/library.functions";

const READY_MIN_CHARS = 50;

type Rail = "locker" | "shelf";

type LockerFile = {
  id: string;
  course_code: string;
  file_name: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
  published: boolean;
  is_peer_copy: boolean;
  peer_alias: string | null;
  readyForMocks: boolean;
};

type ShelfItem = {
  id: string;
  course_code: string;
  file_name: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
  peer_alias: string;
  readyForMocks: boolean;
};

function typeChip(fileType: string): { label: string; color: string } {
  const t = fileType.toLowerCase();
  if (t === "pdf") return { label: "PDF", color: "#8B2E2E" };
  if (t === "docx" || t === "doc") return { label: "DOC", color: "#1D4E89" };
  if (t === "pptx" || t === "ppt") return { label: "PPT", color: "#B86E0A" };
  return { label: "TXT", color: "#5C5C70" };
}

function TypeChip({ fileType }: { fileType: string }) {
  const { label, color } = typeChip(fileType);
  return (
    <span
      className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

function ReadyPill({ ready }: { ready: boolean }) {
  return ready ? (
    <span className="rounded-full bg-[#2F6B4F]/12 px-2 py-0.5 text-[10px] font-semibold text-[#2F6B4F]">
      Ready for mocks
    </span>
  ) : (
    <span className="rounded-full bg-[#B86E0A]/12 px-2 py-0.5 text-[10px] font-semibold text-[#B86E0A]">
      Reading only
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#E4DCC8] bg-white p-4 ${className}`}>{children}</div>
  );
}

export function LibraryScreen() {
  const { navigate } = useProfile();
  const [rail, setRail] = useState<Rail>("locker");
  const [locker, setLocker] = useState<LockerFile[] | null>(null);
  const [openFolder, setOpenFolder] = useState<string | null>(null);

  const [shelf, setShelf] = useState<{ items: ShelfItem[]; courses: { course_code: string; count: number }[] } | null>(null);
  const [shelfOffline, setShelfOffline] = useState(false);
  const [shelfCourse, setShelfCourse] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [shelfLoading, setShelfLoading] = useState(false);

  const [ownerSheet, setOwnerSheet] = useState<LockerFile | null>(null);
  const [publishTarget, setPublishTarget] = useState<LockerFile | null>(null);
  const [linkSheet, setLinkSheet] = useState<
    { fileName: string; token: string; expiresAt: string; usesLeft: number; maxUses: number } | null
  >(null);
  const [preview, setPreview] = useState<
    { id: string; file_name: string; file_type: string; course_code: string; url: string | null; readyForMocks: boolean; peer: boolean } | null
  >(null);
  const [busy, setBusy] = useState(false);

  const loadLocker = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user.id;
    if (!uid) {
      setLocker([]);
      return;
    }
    const { data, error } = await supabase
      .from("course_materials")
      .select(
        "id, course_code, file_name, file_type, size_bytes, created_at, published, is_peer_copy, peer_alias, extracted_content",
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) {
      setLocker([]);
      return;
    }
    setLocker(
      (data ?? []).map((r) => ({
        id: r.id,
        course_code: r.course_code,
        file_name: r.file_name,
        file_type: r.file_type,
        size_bytes: r.size_bytes,
        created_at: r.created_at,
        published: r.published,
        is_peer_copy: r.is_peer_copy,
        peer_alias: r.peer_alias,
        readyForMocks: (r.extracted_content ?? "").trim().length >= READY_MIN_CHARS,
      })),
    );
  }, []);

  const loadShelf = useCallback(async () => {
    setShelfLoading(true);
    try {
      const result = await listShelfItems({
        data: { courseCode: shelfCourse ?? undefined, search: search || undefined },
      });
      setShelfOffline(result.offline);
      setShelf({ items: result.items, courses: result.courses });
    } catch {
      setShelfOffline(true);
      setShelf({ items: [], courses: [] });
    } finally {
      setShelfLoading(false);
    }
  }, [shelfCourse, search]);

  useEffect(() => { void loadLocker(); }, [loadLocker]);
  useEffect(() => { if (rail === "shelf") void loadShelf(); }, [rail, loadShelf]);

  const folders = useMemo(() => {
    const map = new Map<string, LockerFile[]>();
    for (const f of locker ?? []) {
      const list = map.get(f.course_code) ?? [];
      list.push(f);
      map.set(f.course_code, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [locker]);

  const doPublish = async (file: LockerFile, published: boolean) => {
    setBusy(true);
    const result = await setMaterialPublished({ data: { materialId: file.id, published } });
    setBusy(false);
    setPublishTarget(null);
    setOwnerSheet(null);
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
    const { error } = await supabase.from("course_materials").delete().eq("id", file.id);
    setBusy(false);
    setOwnerSheet(null);
    if (error) { toast.error("We couldn't remove that file."); return; }
    toast.success("Removed from your locker.");
    void loadLocker();
  };

  const openPreview = async (item: { id: string; file_name: string; file_type: string; course_code: string; readyForMocks: boolean }, peer: boolean) => {
    setBusy(true);
    const result = await getShelfPreview({ data: { materialId: item.id } });
    setBusy(false);
    if (!result.ok) { toast.error(result.reason); return; }
    setPreview({
      id: item.id, file_name: result.file_name, file_type: result.file_type,
      course_code: result.course_code, url: result.url, readyForMocks: result.readyForMocks, peer,
    });
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
    <div className="min-h-screen bg-[#F7F3EA]">
      <div className="mx-auto max-w-md px-5 pb-28 pt-6 md:max-w-3xl">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5C5C70]">Library</span>
        </div>

        <h1 className="font-display text-2xl font-semibold text-[#1B2A4A]">Library</h1>
        <p className="mt-1 text-sm text-[#5C5C70]">
          Your locker is private. The course shelf only shows what coursemates chose to publish.
        </p>

        {/* Rails */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-white p-1 ring-1 ring-[#E4DCC8]">
          {(["locker", "shelf"] as Rail[]).map((r) => (
            <button
              key={r}
              onClick={() => { setRail(r); setOpenFolder(null); }}
              className="rounded-lg py-2 text-sm font-semibold transition"
              style={rail === r ? { backgroundColor: "#B86E0A", color: "#FFFFFF" } : { color: "#5C5C70" }}
            >
              {r === "locker" ? "My locker" : "Course shelf"}
            </button>
          ))}
        </div>

        {rail === "locker" ? (
          <div className="mt-4 space-y-3">
            <Button
              className="h-12 w-full text-white"
              style={{ backgroundColor: "#B86E0A" }}
              onClick={() => navigate("home")}
            >
              <Upload className="mr-2 h-4 w-4" /> Upload course material
            </Button>

            {locker === null ? (
              <Card><Loader2 className="h-4 w-4 animate-spin text-[#5C5C70]" /></Card>
            ) : openFolder ? (
              <>
                <button
                  onClick={() => setOpenFolder(null)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#1B2A4A]"
                >
                  <ArrowLeft className="h-4 w-4" /> My locker
                </button>
                {(locker.filter((f) => f.course_code === openFolder)).map((f) => (
                  <Card key={f.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <TypeChip fileType={f.file_type} />
                          <span className="break-words text-sm font-semibold text-[#1A1A2E]">{f.file_name}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <ReadyPill ready={f.readyForMocks} />
                          {f.published ? (
                            <span className="rounded-full bg-[#1B2A4A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1B2A4A]">On shelf</span>
                          ) : null}
                          {f.is_peer_copy ? (
                            <span className="rounded-full bg-[#1D4E89]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1D4E89]">
                              Peer copy: {f.peer_alias ?? "A peer"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        aria-label="File actions"
                        onClick={() => setOwnerSheet(f)}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#E4DCC8] text-[#5C5C70]"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </Card>
                ))}
              </>
            ) : folders.length === 0 ? (
              <Card>
                <p className="text-sm text-[#5C5C70]">
                  Nothing in your locker yet. Upload a past paper or lecture note from a course to get started.
                </p>
              </Card>
            ) : (
              folders.map(([code, files]) => (
                <button key={code} onClick={() => setOpenFolder(code)} className="w-full text-left">
                  <Card>
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#1B2A4A]/8 text-[#1B2A4A]">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="break-words font-semibold text-[#1A1A2E]">{code}</div>
                        <div className="text-xs text-[#5C5C70]">
                          {files.length} file{files.length === 1 ? "" : "s"}
                          {files.some((f) => f.published) ? " · some on shelf" : ""}
                        </div>
                      </div>
                    </div>
                  </Card>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C5C70]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a course code, e.g. PHY102"
                className="h-12 border-[#E4DCC8] bg-white pl-9"
              />
            </div>

            {shelfOffline ? (
              <Card><p className="text-sm text-[#5C5C70]">{SHARING_OFFLINE_MESSAGE}</p></Card>
            ) : shelfLoading ? (
              <Card><Loader2 className="h-4 w-4 animate-spin text-[#5C5C70]" /></Card>
            ) : (
              <>
                {shelfCourse ? (
                  <button
                    onClick={() => setShelfCourse(null)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-[#1B2A4A]"
                  >
                    <ArrowLeft className="h-4 w-4" /> Course shelf
                  </button>
                ) : (
                  (shelf?.courses ?? []).map((c) => (
                    <button key={c.course_code} onClick={() => setShelfCourse(c.course_code)} className="w-full text-left">
                      <Card>
                        <div className="flex items-center justify-between gap-3">
                          <span className="break-words font-semibold text-[#1A1A2E]">{c.course_code}</span>
                          <span className="text-xs text-[#5C5C70]">{c.count} published</span>
                        </div>
                      </Card>
                    </button>
                  ))
                )}

                {(shelfCourse ? (shelf?.items ?? []) : []).map((it) => (
                  <Card key={it.id}>
                    <div className="flex items-center gap-2">
                      <TypeChip fileType={it.file_type} />
                      <span className="break-words text-sm font-semibold text-[#1A1A2E]">{it.file_name}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ReadyPill ready={it.readyForMocks} />
                      <span className="rounded-full bg-[#1D4E89]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1D4E89]">
                        Peer copy: {it.peer_alias}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" className="h-10 border-[#E4DCC8]" onClick={() => void openPreview(it, true)} disabled={busy}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                      <Button className="h-10 text-white" style={{ backgroundColor: "#B86E0A" }} onClick={() => void doSave(it)} disabled={busy}>
                        Save to locker
                      </Button>
                    </div>
                  </Card>
                ))}

                {shelf && shelf.courses.length === 0 ? (
                  <Card><p className="text-sm text-[#5C5C70]">Nothing published for your courses yet.</p></Card>
                ) : null}
              </>
            )}
          </div>
        )}

        <p className="mt-4 text-[11px] text-[#5C5C70]">
          Files are viewed in the app. There is no download, and you can unpublish at any time.
        </p>
      </div>

      {/* Owner actions */}
      <Sheet open={ownerSheet !== null} onOpenChange={(o) => !o && setOwnerSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-white">
          <SheetHeader>
            <SheetTitle className="text-[#1B2A4A]">{ownerSheet?.file_name}</SheetTitle>
            <SheetDescription className="text-[#5C5C70]">
              Your locker is private until you publish a file.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3 space-y-2 pb-4">
            {ownerSheet?.published ? (
              <Button variant="outline" className="h-11 w-full justify-start border-[#E4DCC8]" onClick={() => ownerSheet && void openPreview(ownerSheet, false)} disabled={busy}>
                <Eye className="mr-2 h-4 w-4" /> View
              </Button>
            ) : null}
            {ownerSheet && !ownerSheet.is_peer_copy ? (
              ownerSheet.published ? (
                <Button variant="outline" className="h-11 w-full justify-start border-[#E4DCC8]" onClick={() => void doPublish(ownerSheet, false)} disabled={busy}>
                  <X className="mr-2 h-4 w-4" /> Unpublish
                </Button>
              ) : (
                <Button className="h-11 w-full justify-start text-white" style={{ backgroundColor: "#B86E0A" }} onClick={() => setPublishTarget(ownerSheet)} disabled={busy}>
                  <Share2 className="mr-2 h-4 w-4" /> Publish to course shelf
                </Button>
              )
            ) : null}
            {ownerSheet && !ownerSheet.is_peer_copy ? (
              <Button variant="outline" className="h-11 w-full justify-start border-[#E4DCC8]" onClick={() => void doCopyLink(ownerSheet)} disabled={busy}>
                <Copy className="mr-2 h-4 w-4" /> Copy one-file link
              </Button>
            ) : null}
            <Button variant="outline" className="h-11 w-full justify-start border-[#E4DCC8] text-[#8B2E2E]" onClick={() => ownerSheet && void doRemove(ownerSheet)} disabled={busy}>
              <Trash2 className="mr-2 h-4 w-4" /> Remove
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Publish confirm */}
      <Dialog open={publishTarget !== null} onOpenChange={(o) => !o && setPublishTarget(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#1B2A4A]">Publish to your course shelf?</DialogTitle>
            <DialogDescription className="text-[#5C5C70]">
              Coursemates will be able to view this file inside the app. There is no download. You can
              unpublish it at any time and it disappears from the shelf.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="border-[#E4DCC8]" onClick={() => setPublishTarget(null)}>Cancel</Button>
            <Button className="text-white" style={{ backgroundColor: "#B86E0A" }} onClick={() => publishTarget && void doPublish(publishTarget, true)} disabled={busy}>
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-file link */}
      <Sheet open={linkSheet !== null} onOpenChange={(o) => !o && setLinkSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-white">
          <SheetHeader>
            <SheetTitle className="text-[#1B2A4A]">One-file link</SheetTitle>
            <SheetDescription className="text-[#5C5C70]">
              This link opens only this one file, nothing else in your locker. It expires in 7 days,
              works for {linkSheet?.maxUses ?? 5} saves, and you can revoke it now.
            </SheetDescription>
          </SheetHeader>
          {linkSheet ? (
            <div className="mt-3 space-y-3 pb-4">
              <div className="break-all rounded-xl border border-[#E4DCC8] bg-[#F7F3EA] p-3 text-xs text-[#1A1A2E]">
                {`${window.location.origin}/s/${linkSheet.token}`}
              </div>
              <div className="text-xs text-[#5C5C70]">
                {linkSheet.usesLeft} of {linkSheet.maxUses} saves left
              </div>
              <Button variant="outline" className="h-11 w-full border-[#E4DCC8] text-[#8B2E2E]" onClick={() => void doRevoke(linkSheet.token)} disabled={busy}>
                Revoke link
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* In-app preview */}
      <Sheet open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl bg-white">
          <SheetHeader>
            <SheetTitle className="break-words text-[#1B2A4A]">{preview?.file_name}</SheetTitle>
            <SheetDescription className="text-[#5C5C70]">
              {preview?.course_code} · viewing in app, no download
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3 h-[64vh] overflow-hidden rounded-xl border border-[#E4DCC8] bg-[#F7F3EA]">
            {preview?.url ? (
              <iframe src={preview.url} title={preview.file_name} className="h-full w-full" />
            ) : (
              <div className="grid h-full place-items-center px-6 text-center text-sm text-[#5C5C70]">
                {SHARING_OFFLINE_MESSAGE}
              </div>
            )}
          </div>
          {preview?.peer ? (
            <Button
              className="mt-3 h-12 w-full text-white"
              style={{ backgroundColor: "#B86E0A" }}
              onClick={() => preview && void doSave({ id: preview.id, course_code: preview.course_code })}
              disabled={busy}
            >
              Save to my locker
            </Button>
          ) : null}
          <p className="mt-2 text-[11px] text-[#5C5C70]">{PRICE_LINE}</p>
        </SheetContent>
      </Sheet>
    </div>
  );
}
