/**
 * In-app PDF viewer. The signed URL is fetched with pdf.js and painted onto a
 * canvas: the browser never navigates to the storage URL, and no third party
 * viewer is involved. Files are capped at the first 800 pages.
 *
 * Big files stay usable because only the visible page is painted, the next page
 * is prefetched, stale paints are cancelled, and the loading step can be
 * cancelled outright. The last page viewed is remembered per file, and the
 * viewer can expand to fill the whole screen.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorCard } from "@/components/error-card";

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

export function PdfViewer({
  url,
  fileName,
  fileKey,
  onClose,
  onCancel,
}: {
  url: string;
  fileName: string;
  fileKey?: string;
  onClose?: () => void;
  onCancel?: () => void;
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

  const load = useCallback(() => {
    let alive = true;
    setStatus("loading");
    setDoc(null);
    void (async () => {
      try {
        const pdfjs = await loadPdfjs();
        // Range requests only: page one paints without downloading the whole file.
        const task = pdfjs.getDocument({
          url,
          disableAutoFetch: true,
          disableStream: false,
          rangeChunkSize: 524288,
        }) as unknown as LoadingTask;
        taskRef.current = task;
        const loaded = (await task.promise) as unknown as PdfDoc;
        if (!alive) {
          void loaded.destroy?.();
          return;
        }
        const cap = Math.min(loaded.numPages, MAX_PREVIEW_PAGES);
        const start = Math.min(Math.max(1, readLastPage(fileKey)), cap);
        // Warm the page we are about to paint before showing the canvas, so the
        // remembered page appears directly with no page-1 flash.
        void loaded.getPage(start).catch(() => undefined);
        setDoc(loaded);
        setTotal(cap);
        setPage(start);
        setPageInput(String(start));
        setStatus("ready");
      } catch (e) {
        if (!alive) return;
        console.warn("[pdf-viewer] failed", e);
        setStatus("failed");
      }
    })();
    return () => {
      alive = false;
      void taskRef.current?.destroy();
      taskRef.current = null;
    };
  }, [url, fileKey]);

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
  }, [status]);

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

  // Paint the current page only, then warm the next one so Next feels instant.
  useEffect(() => {
    if (!doc || status !== "ready") return;
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
        const scale = Math.max(0.4, Math.min(2.5, (box - 8) / base.width));
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
  }, [doc, page, status, total, width]);

  useEffect(() => {
    if (status === "ready") writeLastPage(fileKey, page);
  }, [fileKey, page, status]);

  const go = (n: number) => {
    const next = Math.min(Math.max(1, n), total || 1);
    setPage(next);
    setPageInput(String(next));
  };

  const cancelLoad = () => {
    void taskRef.current?.destroy();
    taskRef.current = null;
    setExpanded(false);
    (onCancel ?? onClose)?.();
  };

  if (status === "failed") {
    return (
      <div className="grid h-full place-items-center bg-[#F7F3EA] p-4">
        <ErrorCard
          title="We couldn't open this PDF here"
          body={HEAVY_PDF_MESSAGE}
          onAction={() => load()}
          {...(onClose ? { linkLabel: "Close", onLink: onClose } : {})}
        />
      </div>
    );
  }

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-50 flex h-screen w-screen flex-col bg-[#F7F3EA]"
          : "flex h-full flex-col bg-[#F7F3EA]"
      }
    >
      <div className="flex items-center gap-2 border-b border-[#E4DCC8] px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#1B2A4A]">
          {fileName}
        </span>
        <span className="shrink-0 text-[11px] text-[#5C5C70]">
          {status === "ready" ? `page ${page} / ${total}` : ""}
        </span>
        <button
          type="button"
          aria-label={expanded ? "Exit full screen" : "Full screen"}
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-md p-1 text-[#5C5C70]"
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        {onClose ? (
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              setExpanded(false);
              onClose();
            }}
            className="shrink-0 rounded-md p-1 text-[#5C5C70]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div ref={wrapRef} className="flex-1 overflow-auto p-1">
        {status === "loading" ? (
          <div className="grid h-full place-content-center justify-items-center gap-2 px-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#B86E0A]" />
            <p className="text-sm font-medium text-[#1B2A4A]">Opening your file…</p>
            {onCancel ?? onClose ? (
              <Button
                size="sm"
                variant="outline"
                className="mt-1 border-[#E4DCC8] text-[#1B2A4A]"
                onClick={cancelLoad}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        ) : null}
        <canvas ref={canvasRef} className="mx-auto block rounded-md bg-white shadow-sm" />
      </div>

      {status === "ready" ? (
        <div className="flex items-center justify-between gap-2 border-t border-[#E4DCC8] px-3 py-2">
          <Button
            size="sm"
            variant="outline"
            className="border-[#E4DCC8] text-[#1B2A4A]"
            onClick={() => go(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              go(Number(pageInput) || page);
            }}
          >
            <Input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={() => go(Number(pageInput) || page)}
              inputMode="numeric"
              aria-label="Go to page"
              className="h-8 w-14 border-[#E4DCC8] bg-white text-center text-[12px] text-[#1B2A4A]"
            />
            <span className="text-[11px] text-[#5C5C70]">/ {total}</span>
          </form>
          <Button
            size="sm"
            variant="outline"
            className="border-[#E4DCC8] text-[#1B2A4A]"
            onClick={() => go(page + 1)}
            disabled={page >= total}
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
