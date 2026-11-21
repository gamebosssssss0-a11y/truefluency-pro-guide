import { useEffect, useRef, useState } from "react";
import { FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewSource } from "@/lib/document-preview.browser";
import { getCachedThumbnail, setCachedThumbnail, thumbnailCacheKey } from "@/lib/document-preview-cache";
import { supabase } from "@/integrations/supabase/client";

/** Lazy first-page rendering; protected files are re-authorized on each visit. */
export function DocumentThumbnail({ fileName, fileType, resolveSource, active = true, peer, className, fileId, revision = "", persistent = false, textContent }: {
  fileName: string; fileType: string; resolveSource: () => Promise<PreviewSource>; active?: boolean;
  peer?: { alias: string; avatarUrl?: string | null }; className?: string;
  fileId?: string; revision?: string; persistent?: boolean; textContent?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef(resolveSource);
  sourceRef.current = resolveSource;
  const [visible, setVisible] = useState(false);
  const [requested, setRequested] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [accountEpoch, setAccountEpoch] = useState(0);
  const account = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (next !== account.current) { account.current = next; setImage(null); setAuthorized(false); setStatus("loading"); setAccountEpoch((value) => value + 1); }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const node = root.current;
    if (!node || !active) { setVisible(false); return; }
    const observer = new IntersectionObserver(([entry]) => {
      const intersects = Boolean(entry?.isIntersecting);
      setVisible(intersects);
      if (intersects) setRequested(true);
    }, { rootMargin: "120px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);
  const shouldRender = active && (persistent ? requested : visible);
  useEffect(() => {
    setImage(null);
    setAuthorized(false);
    setStatus("loading");
  }, [fileId, revision, fileName, fileType, textContent, accountEpoch]);
  useEffect(() => {
    if (!shouldRender) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const ownerId = data.session?.user.id;
        // Always re-authorize before using a saved private thumbnail.
        const source = await sourceRef.current();
        const key = persistent && source.cacheable === true && ownerId && fileId ? thumbnailCacheKey(ownerId, fileId, revision) : null;
        controller.signal.throwIfAborted();
        const cached = key ? await getCachedThumbnail(key) : null;
        controller.signal.throwIfAborted();
        if (cached) {
          const { data: current } = await supabase.auth.getSession();
          controller.signal.throwIfAborted();
          if (current.session?.user.id !== ownerId) return;
          setAuthorized(true); setImage(cached); setStatus("ready"); return;
        }
        const { renderDocumentPreview } = await import("@/lib/document-preview.browser");
        const target = canvas.current;
        if (!target) return;
        await renderDocumentPreview(target, fileType.toLowerCase(), source, controller.signal, textContent);
        const rendered = target.toDataURL("image/webp", 0.85);
        const { data: current } = await supabase.auth.getSession();
        controller.signal.throwIfAborted();
        if (current.session?.user.id !== ownerId) return;
        if (key) await setCachedThumbnail(key, rendered);
        if (!controller.signal.aborted) { setAuthorized(true); setImage(rendered); setStatus("ready"); }
      } catch {
        if (!controller.signal.aborted) { setImage(null); setStatus("fallback"); }
      }
    })();
    return () => {
      controller.abort();
      setAuthorized(false);
      if (!persistent) setImage(null);
      const target = canvas.current;
      if (target) { target.width = 0; target.height = 0; }
    };
  }, [shouldRender, fileName, fileType, fileId, revision, persistent, textContent, accountEpoch]);
  return <div ref={root} className={cn("tf-document-thumbnail relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-card", className)}>
    <canvas ref={canvas} className="hidden" />
    {image && authorized && active && (persistent || visible) ? <img src={image} alt={`First-page preview of ${fileName}`} className="h-full w-full object-cover object-top" /> : null}
    {status !== "ready" ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-2 text-center text-muted-foreground">
      <FileText className="size-6 text-accent" aria-hidden="true" />
      {status === "loading" ? <div aria-hidden="true" className="w-full space-y-1.5"><span className="loading-skeleton block h-1.5 w-4/5 rounded" /><span className="loading-skeleton block h-1.5 w-full rounded" /><span className="loading-skeleton block h-1.5 w-2/3 rounded" /></div>
        : <span className="text-xs leading-4">Preview unavailable</span>}
    </div> : null}
    {peer ? <span title={`Shared by ${peer.alias}`} aria-label={`Shared by ${peer.alias}`} className="tf-peer-badge absolute bottom-1 right-1 grid size-7 place-items-center overflow-hidden rounded-full border border-accent/50 bg-card text-xs font-semibold text-foreground ring-2 ring-card">
      {peer.avatarUrl && !avatarFailed ? <img src={peer.avatarUrl} alt="" onError={() => setAvatarFailed(true)} className="size-full object-cover" />
        : peer.alias && peer.alias !== "A peer" ? peer.alias.slice(0, 1).toUpperCase() : <User className="size-3.5" />}
    </span> : null}
  </div>;
}