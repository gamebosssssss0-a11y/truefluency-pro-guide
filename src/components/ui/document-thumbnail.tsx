import { useEffect, useRef, useState } from "react";
import { FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewSource } from "@/lib/document-preview.browser";

/** Lazy first-page rendering; protected files are re-authorized on each visit. */
export function DocumentThumbnail({ fileName, fileType, resolveSource, active = true, peer, className }: {
  fileName: string; fileType: string; resolveSource: () => Promise<PreviewSource>; active?: boolean;
  peer?: { alias: string; avatarUrl?: string | null }; className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef(resolveSource);
  sourceRef.current = resolveSource;
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => {
    const node = root.current;
    if (!node || !active) { setVisible(false); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { rootMargin: "120px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);
  useEffect(() => {
    if (!active || !visible) return;
    const controller = new AbortController();
    setStatus("loading");
    void (async () => {
      try {
        const source = await sourceRef.current();
        controller.signal.throwIfAborted();
        const { renderDocumentPreview } = await import("@/lib/document-preview.browser");
        const target = canvas.current;
        if (!target) return;
        await renderDocumentPreview(target, fileType.toLowerCase(), source, controller.signal);
        if (!controller.signal.aborted) setStatus("ready");
      } catch {
        if (!controller.signal.aborted) setStatus("fallback");
      }
    })();
    return () => {
      controller.abort();
      const target = canvas.current;
      if (target) { target.width = 0; target.height = 0; }
    };
  }, [active, visible, fileName, fileType]);
  return <div ref={root} className={cn("tf-document-thumbnail relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-card", className)}>
    <canvas ref={canvas} role="img" aria-label={`First-page preview of ${fileName}`} className={cn("h-full w-full object-cover object-top", status !== "ready" && "invisible")} />
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