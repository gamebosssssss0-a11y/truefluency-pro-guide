/**
 * In-app PDF viewer. The signed URL is fetched with pdf.js and painted onto a
 * canvas: the browser never navigates to the storage URL, and no third party
 * viewer is involved. Files are capped at the first 800 pages.
 *
 * Once a file has been opened, its bytes are kept on the device (and briefly in
 * memory) so re-opening skips the download entirely. Normal size shows one page
 * with Back/Next; full screen stacks the pages in a continuous scroll.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Maximize2, Sparkles, Minimize2, ZoomIn, ZoomOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorCard } from "@/components/error-card";
import { deleteCachedPdf, getCachedPdf, putCachedPdf } from "@/lib/pdf-cache";
import { toast } from "sonner";

export const MAX_PREVIEW_PAGES = 800;
export const HEAVY_PDF_MESSAGE =
  "This PDF is too heavy to preview here. Save it to your locker and try a smaller export.";

type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => {
    promise: Promise<void>;
    cancel: () => void;
  };
  cleanup?: () => void;
  getTextContent?: () => Promise<{ items: { str?: string }[] }>;
};

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
  destroy?: () => void;
};

type LoadingTask = { promise: Promise<unknown>; destroy: () => Promise<void> | void };

type PdfjsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (o: Record<string, unknown>) => unknown;
};

/**
 * The engine and its worker are loaded once per session: the second file a
 * student opens skips the import entirely.
 */
let pdfjsPromise: Promise<PdfjsModule> | null = null;
function loadPdfjs(): Promise<PdfjsModule> {
  pdfjsPromise ??= (async () => {
    const [pdfjs, worker] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    const mod = pdfjs as unknown as PdfjsModule;
    mod.GlobalWorkerOptions.workerSrc = worker.default as string;
    return mod;
  })();
  return pdfjsPromise;
}

export function isSameOrigin(url: string): boolean {
  if (typeof window === "undefined") return false;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Last file opened in this session, so close-and-reopen is instant. */
let memoryCache: { key: string; buffer: ArrayBuffer } | null = null;

const pageKey = (fileKey?: string) => (fileKey ? `tf.pdf.page.${fileKey}` : null);

function readLastPage(fileKey?: string): number {
  const key = pageKey(fileKey);
  if (!key || typeof window === "undefined") return 1;
  const raw = Number(window.localStorage.getItem(key));
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

function writeLastPage(fileKey: string | undefined, page: number) {
  const key = pageKey(fileKey);
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(page));
  } catch {
    /* storage full or blocked: remembering the page is a nicety, not a must */
  }
}

/** One page inside the full-screen scroll column. */
function ScrollPage({
  doc,
  pageNumber,
  width,
  active,
  distance,
  estimatedPageHeight,
  zoom,
  register,
}: {
  doc: PdfDoc;
  pageNumber: number;
  width: number;
  active: boolean;
  distance: number;
  estimatedPageHeight: number;
  zoom: number;
  register: (n: number, el: HTMLDivElement | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const distanceRef = useRef(distance);
  distanceRef.current = distance;
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const [hasPainted, setHasPainted] = useState(false);
  const boxWidth = Math.max(120, width - 8);

  useEffect(() => {
    let cancelled = false;
    void doc.getPage(pageNumber).then((p) => {
      if (cancelled) return;
      const base = p.getViewport({ scale: 1 });
      const scale = Math.max(0.4, Math.min(3, (boxWidth / base.width) * zoom));
      setPageHeight(Math.floor(p.getViewport({ scale }).height));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [boxWidth, doc, pageNumber, zoom]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;
    let current: PdfPage | null = null;
    void (async () => {
      try {
        const p = await doc.getPage(pageNumber);
        current = p;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || cancelled) return;
        const base = p.getViewport({ scale: 1 });
        const scale = Math.max(0.4, Math.min(3, (boxWidth / base.width) * zoom));
        const viewport = p.getViewport({ scale });
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        setPageHeight(Math.floor(viewport.height));
        const task = p.render({ canvasContext: ctx, viewport });
        renderTask = task;
        renderTaskRef.current = task;
        await task.promise;
        setHasPainted(true);
        renderTaskRef.current = null;
      } catch (e) {
        const name = (e as { name?: string } | null)?.name ?? "";
        if (cancelled || name === "RenderingCancelledException") return;
        console.warn("[pdf-viewer] page render failed", pageNumber, e);
      }
    })();
    return () => {
      cancelled = true;
      if (distanceRef.current > 8) {
        try {
          renderTaskRef.current?.cancel();
        } catch {
          /* already finished */
        }
        renderTaskRef.current = null;
        current?.cleanup?.();
      }
    };
  }, [active, boxWidth, doc, pageNumber, zoom]);

  useEffect(() => {
    if (distance <= 8) return;
    try { renderTaskRef.current?.cancel(); } catch { /* already finished */ }
    renderTaskRef.current = null;
  }, [distance]);

  return (
    <div
      ref={(el) => register(pageNumber, el)}
      data-page={pageNumber}
      className="mx-auto mb-2 flex w-full min-w-0 justify-center px-1"
      style={active || (distance <= 8 && hasPainted) ? undefined : { height: pageHeight ?? estimatedPageHeight }}
    >
      {active || (distance <= 8 && hasPainted) ? (
        <canvas ref={canvasRef} className="tf-pdf-paper block max-w-full rounded-lg bg-white" />
      ) : (
        <div
          className="tf-pdf-paper animate-pulse rounded-lg bg-card"
          style={{ width: boxWidth, height: pageHeight ?? estimatedPageHeight }}
        />
      )}
    </div>
  );
}

export function PdfViewer({
  url,
  fileName,
  fileKey,
  onClose,
  onCancel,
  onExplain,
  onRetry,
  explainPanelOpen = false,
  disableCache = false,
  httpHeaders,
}: {
  url: string;
  fileName: string;
  fileKey?: string;
  onClose?: () => void;
  onCancel?: () => void;
  onExplain?: (data: { page: number; fileName: string; text: string; previewUrl?: string }) => void;
  onRetry?: () => void | Promise<void>;
  explainPanelOpen?: boolean;
  /** Revocation-aware same-origin previews must be re-authorized for every range request. */
  disableCache?: boolean;
  httpHeaders?: Record<string, string>;
}) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [expanded, setExpanded] = useState(false);
  const [width, setWidth] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const taskRef = useRef<LoadingTask | null>(null);
  const pageNodes = useRef(new Map<number, HTMLDivElement>());
  const pageRef = useRef(1);
  const lastPageUpdateRef = useRef(0);
  const ignoreObserverUntilRef = useRef(0);
  const pageNavPointerRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [pageAspect, setPageAspect] = useState(Math.SQRT2);
  const [zoom, setZoom] = useState(1);
  const [scannedNotice, setScannedNotice] = useState(false);
  useEffect(() => { setScannedNotice(false); }, [page]);

  pageRef.current = page;

  const registerPage = useCallback((n: number, el: HTMLDivElement | null) => {
    if (el) pageNodes.current.set(n, el);
    else pageNodes.current.delete(n);
  }, []);

  const load = useCallback(() => {
    let alive = true;
    const sameOrigin = isSameOrigin(url);
    const cacheController = new AbortController();
    setStatus("loading");
    setDoc(null);
    void (async () => {
      try {
        const pdfjs = await loadPdfjs();
        if (disableCache && fileKey) {
          await deleteCachedPdf(fileKey);
          if (memoryCache?.key === fileKey) memoryCache = null;
        }
        const cached = disableCache ? null :
          memoryCache && fileKey && memoryCache.key === fileKey
            ? memoryCache.buffer
            : await getCachedPdf(fileKey);
        if (!alive) return;
        // A cached file skips the network completely; otherwise stream by range
        // so page one paints before the whole file has arrived.
        const task = pdfjs.getDocument(
          cached
            ? { data: new Uint8Array(cached.slice(0)) }
            : {
                url,
                httpHeaders: sameOrigin ? httpHeaders : undefined,
                // Cloudflare R2 presigned URLs answer with a wildcard origin, which browsers reject for credentialed requests.
                withCredentials: sameOrigin,
                disableAutoFetch: true,
                disableStream: false,
                rangeChunkSize: 524288,
              },
        ) as unknown as LoadingTask;
        taskRef.current = task;
        const loaded = (await task.promise) as unknown as PdfDoc;
        if (!alive) {
          void loaded.destroy?.();
          return;
        }
        if (cached && fileKey && !disableCache) memoryCache = { key: fileKey, buffer: cached };
        const cap = Math.min(loaded.numPages, MAX_PREVIEW_PAGES);
        const start = Math.min(Math.max(1, readLastPage(fileKey)), cap);
        // Warm the page we are about to paint before showing the canvas, so the
        // remembered page appears directly with no page-1 flash.
        void loaded
          .getPage(start)
          .then((p) => {
            if (!alive) return;
          })
          .catch(() => undefined);
        setDoc(loaded);
        setTotal(cap);
        setPage(start);
        setPageInput(String(start));
        setStatus("ready");

        // Keep the bytes for next time, without delaying this open.
        if (!cached && fileKey && !disableCache) {
          void (async () => {
            try {
              const res = await fetch(url, { signal: cacheController.signal });
              if (!res.ok) return;
              const declaredSize = Number(res.headers.get("content-length") ?? 0);
              // Avoid retaining or caching oversized documents in the secondary byte cache.
              if (declaredSize > 60 * 1024 * 1024) return;
              const buffer = await res.arrayBuffer();
              if (buffer.byteLength > 60 * 1024 * 1024) return;
              if (!alive) return;
              memoryCache = { key: fileKey, buffer };
              await putCachedPdf(fileKey, buffer);
            } catch {
              /* offline or blocked: nothing to cache, streaming still works */
            }
          })();
        }
      } catch (e) {
        if (!alive) return;
        console.warn("[pdf-viewer] failed", e);
        setStatus("failed");
      }
    })();
    return () => {
      alive = false;
      cacheController.abort();
      void taskRef.current?.destroy();
      taskRef.current = null;
    };
  }, [url, fileKey, disableCache, httpHeaders]);

  useEffect(load, [load]);

  // Track the available width so expanding/shrinking repaints at the new size.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(measure, 120);
    });
    ro.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      ro.disconnect();
    };
  }, [status, expanded]);

  // Full screen: keep the page behind still and let Escape bring the file back.
  useEffect(() => {
    if (!expanded || typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  // Normal size: paint the current page only, then warm the next one.
  useEffect(() => {
    if (!doc || status !== "ready" || expanded) return;
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;
    let current: PdfPage | null = null;
    void (async () => {
      try {
        const p = await doc.getPage(page);
        current = p;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || cancelled) return;
        const base = p.getViewport({ scale: 1 });
        const box = width || wrapRef.current?.clientWidth || 340;
        const scale = Math.max(0.4, Math.min(3, ((box - 8) / base.width) * zoom));
        const viewport = p.getViewport({ scale });
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const task = p.render({ canvasContext: ctx, viewport });
        renderTask = task;
        await task.promise;
        if (cancelled) return;
        if (page < total) void doc.getPage(page + 1).catch(() => undefined);
      } catch (e) {
        // A cancelled paint is normal when the student pages quickly.
        const name = (e as { name?: string } | null)?.name ?? "";
        if (cancelled || name === "RenderingCancelledException") return;
        console.warn("[pdf-viewer] render failed", e);
        setStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        /* already finished */
      }
      current?.cleanup?.();
    };
  }, [doc, page, status, total, width, expanded, zoom]);

  // Full screen: follow the page the student has scrolled to.
  useEffect(() => {
    if (!expanded || status !== "ready" || typeof IntersectionObserver === "undefined") return;
    const root = wrapRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (Date.now() < ignoreObserverUntilRef.current) return;
        let best: { n: number; r: number } | null = null;
        for (const entry of entries) {
          const n = Number((entry.target as HTMLElement).dataset.page);
          if (!n || !entry.isIntersecting) continue;
          if (!best || entry.intersectionRatio > best.r) best = { n, r: entry.intersectionRatio };
        }
        if (best && best.n !== pageRef.current) {
          const now = Date.now();
          if (now - lastPageUpdateRef.current < 500) return;
          lastPageUpdateRef.current = now;
          pageRef.current = best.n;
          setPage(best.n);
          setPageInput(String(best.n));
        }
      },
      { root, threshold: [0.1, 0.5, 0.9] },
    );
    pageNodes.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [expanded, status, total]);

  // Land on the current page when entering full screen.
  useEffect(() => {
    if (!expanded || status !== "ready") return;
    ignoreObserverUntilRef.current = Date.now() + 800;
    const timer = setTimeout(() => {
      pageNodes.current.get(pageRef.current)?.scrollIntoView({ block: "start" });
    }, 60);
    return () => clearTimeout(timer);
  }, [expanded, status]);

  useEffect(() => {
    if (!doc || !expanded) return;
    let cancelled = false;
    void doc.getPage(pageRef.current).then((current) => {
      if (cancelled) return;
      const viewport = current.getViewport({ scale: 1 });
      if (viewport.width > 0 && viewport.height > 0) setPageAspect(viewport.height / viewport.width);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [doc, expanded, width]);

  useEffect(() => {
    if (status === "ready") writeLastPage(fileKey, page);
  }, [fileKey, page, status]);

  const pages = useMemo(
    () => Array.from({ length: total }, (_, i) => i + 1),
    [total],
  );

  const explainCurrentPage = async () => {
    if (!doc || !onExplain) return;
    const currentPageNumber = pageRef.current;
    try {
      const currentPage = await doc.getPage(currentPageNumber);
      const content = await currentPage.getTextContent?.();
      const text = (content?.items ?? []).map((item) => item.str ?? "").join(" ").replace(/\s+/g, " ").trim();
      if (!text || text.length < 50) {
        setScannedNotice(true);
        return;
      }
      let previewUrl: string | undefined;
      try {
        const renderedCanvas = canvasRef.current ?? pageNodes.current.get(currentPageNumber)?.querySelector("canvas") ?? null;
        if (renderedCanvas && renderedCanvas.width > 0 && renderedCanvas.height > 0) {
          const thumbnail = document.createElement("canvas");
          const scale = Math.min(1, 420 / renderedCanvas.width);
          thumbnail.width = Math.max(1, Math.round(renderedCanvas.width * scale));
          thumbnail.height = Math.max(1, Math.round(renderedCanvas.height * scale));
          const context = thumbnail.getContext("2d");
          context?.drawImage(renderedCanvas, 0, 0, thumbnail.width, thumbnail.height);
          previewUrl = thumbnail.toDataURL("image/jpeg", 0.6);
          if (previewUrl.length > 300_000) previewUrl = undefined;
        }
      } catch {
        // Keep the text handoff working if a browser cannot create a thumbnail.
      }
      onExplain({ page: currentPageNumber, fileName, text: text.slice(0, 4000), previewUrl });
    } catch {
      toast.error("Couldn't read selectable text from this page.");
    }
  };

  const go = (n: number) => {
    const next = Math.min(Math.max(1, n), total || 1);
    pageRef.current = next;
    if (expanded) ignoreObserverUntilRef.current = Date.now() + 500;
    setPage(next);
    setPageInput(String(next));
    if (expanded) {
      pageNodes.current.get(next)?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  };

  // Horizontal swipes page through the PDF on touch devices. Vertical gestures
  // remain native scrolling, and the expanded continuous reader keeps its scroll UX.
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (expanded || status !== "ready" || event.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || expanded || status !== "ready") return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // Require a clear horizontal intent to avoid accidental page turns while scrolling.
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
    if (dx < 0 && pageRef.current < total) go(pageRef.current + 1);
    else if (dx > 0 && pageRef.current > 1) go(pageRef.current - 1);
  };

  useEffect(() => {
    if (status !== "ready" || expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        go(pageRef.current + 1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go(pageRef.current - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, expanded, total]);

  const cancelLoad = () => {
    void taskRef.current?.destroy();
    taskRef.current = null;
    setExpanded(false);
    (onCancel ?? onClose)?.();
  };

  if (status === "failed") {
    return (
      <div data-swipe-lock="" className="grid h-full place-items-center bg-background p-4">
        <ErrorCard
          title="We couldn't open this PDF here."
          body="Try again to refresh the file link."
          onAction={() => { if (onRetry) void onRetry(); else load(); }}
          {...(onClose ? { linkLabel: "Close", onLink: onClose } : {})}
        />
      </div>
    );
  }

  const iconBtn =
    "grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";
  const progress = total ? Math.round((page / total) * 100) : 0;

  const reader = (
    <div
      data-swipe-lock=""
      className={
        expanded
          ? "fixed inset-0 z-[60] flex min-w-0 flex-col overflow-hidden bg-background"
          : "flex h-full min-w-0 w-full max-w-full flex-col overflow-hidden bg-background"
      }
      style={expanded && explainPanelOpen ? { left: 16, right: 396, top: 16, bottom: 16, width: "auto", height: "auto" } : undefined}
    >
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/90 px-3 py-1.5 shadow-xs backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-ink">PDF · Handout</span>
          <p className="mt-0.5 max-w-[180px] truncate text-xs font-medium text-foreground sm:max-w-xs sm:text-sm">{fileName}</p>
        </div>
        {status === "ready" ? (
          <div className="hidden shrink-0 items-center rounded-full border border-border bg-background min-[420px]:flex">
            <button type="button" aria-label="Zoom out" title="Zoom out" disabled={zoom <= 0.6} onClick={() => setZoom((v) => Math.max(0.6, Math.round((v - 0.2) * 10) / 10))} className={iconBtn}>
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-10 text-center text-xs tabular-nums text-foreground">{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" title="Zoom in" disabled={zoom >= 2} onClick={() => setZoom((v) => Math.min(2, Math.round((v + 0.2) * 10) / 10))} className={iconBtn}>
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <button type="button" aria-label={expanded ? "Exit full screen" : "Full screen"} onClick={() => setExpanded((v) => !v)} className={iconBtn}>
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        {onClose ? (
          <button type="button" aria-label="Close" onClick={() => { setExpanded(false); onClose(); }} className={iconBtn}>
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      <div
        ref={wrapRef}
        data-pdf-scroll
        data-screen-scroll
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="tf-pdf-desk min-w-0 flex-1 overflow-y-auto p-3 pb-[calc(96px+env(safe-area-inset-bottom))] transition-colors sm:p-6 sm:pb-[calc(96px+env(safe-area-inset-bottom))]"
        style={!expanded && status === "ready" ? { touchAction: "pan-y pinch-zoom" } : undefined}
      >
        {status === "loading" ? (
          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 pt-2" role="status" aria-label="Opening your file">
            <div className="tf-pdf-paper w-full animate-pulse rounded-lg bg-card p-6" style={{ aspectRatio: "1 / 1.414" }}>
              <div className="h-3 w-2/3 rounded bg-muted" />
              <div className="mt-4 space-y-2">
                {[92, 86, 95, 70, 88, 60].map((w, n) => <div key={n} className="h-2 rounded bg-muted" style={{ width: `${w}%` }} />)}
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">Opening your file…</p>
            {onCancel ?? onClose ? (
              <Button size="sm" variant="outline" className="border-border text-foreground" onClick={cancelLoad}>Cancel</Button>
            ) : null}
          </div>
        ) : null}

        {status === "ready" && expanded && doc ? (
          pages.map((n) => (
            <ScrollPage
              key={n}
              doc={doc}
              pageNumber={n}
              width={width || 340}
              distance={Math.abs(n - page)}
              active={Math.abs(n - page) <= 4}
              estimatedPageHeight={Math.max(1, Math.round(Math.max(120, (width || 340) - 8) * pageAspect * zoom))}
              zoom={zoom}
              register={registerPage}
            />
          ))
        ) : (
          <canvas ref={canvasRef} className={expanded || status !== "ready" ? "hidden" : "tf-pdf-paper mx-auto block max-w-full rounded-lg bg-white"} />
        )}

        {scannedNotice ? (
          <div role="status" className="mx-auto mt-3 max-w-md rounded-2xl border border-accent/30 bg-card p-4 text-sm text-foreground shadow-sm">
            This page is a scanned image with no selectable text. Verilo can transcribe it for you.
          </div>
        ) : null}
      </div>

      {status === "ready" ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-sm flex-col items-center gap-2">
          {onExplain ? (
            <button
              type="button"
              data-page-nav=""
              onClick={() => void explainCurrentPage()}
              className="pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-accent/30 bg-accent/15 px-4 text-xs font-semibold text-accent-ink shadow-sm backdrop-blur-md transition-colors hover:bg-accent/25"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Ask Tutor about this page
            </button>
          ) : null}
          <div className="pointer-events-auto flex h-14 w-full items-center justify-between rounded-full border border-border/80 bg-card/90 px-2 shadow-lg backdrop-blur-xl">
            <button type="button" aria-label="Previous page" data-page-nav="" onPointerDown={() => { pageNavPointerRef.current = true; }} onClick={() => go(pageRef.current - 1)} disabled={page <= 1} className={iconBtn}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <form
              className="flex items-center gap-1 text-xs text-muted-foreground"
              onSubmit={(e) => { e.preventDefault(); go(Number(pageInput) || pageRef.current); }}
            >
              <span>Page</span>
              <Input
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={() => {
                  if (pageNavPointerRef.current) { pageNavPointerRef.current = false; setPageInput(String(pageRef.current)); return; }
                  const target = Number(pageInput) || pageRef.current;
                  if (target !== pageRef.current) go(target);
                }}
                inputMode="numeric"
                aria-label="Go to page"
                className="h-9 w-12 rounded-full border-border bg-background text-center text-xs tabular-nums text-foreground"
              />
              <span className="whitespace-nowrap tabular-nums">of {total} · {progress}%</span>
            </form>
            <button type="button" aria-label="Next page" data-page-nav="" onPointerDown={() => { pageNavPointerRef.current = true; }} onClick={() => go(pageRef.current + 1)} disabled={page >= total} className={iconBtn}>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="relative h-full min-w-0 w-full">
      {expanded && typeof document !== "undefined" ? createPortal(reader, document.body) : reader}
    </div>
  );
}
