/**
 * In-app PDF viewer. The signed URL is fetched with pdf.js and painted onto a
 * canvas: the browser never navigates to the storage URL, and no third party
 * viewer is involved. Heavy files are capped at the first 15 pages.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorCard } from "@/components/error-card";

export const MAX_PREVIEW_PAGES = 15;
export const HEAVY_PDF_MESSAGE =
  "This PDF is too heavy to preview here. Save it to your locker and try a smaller export.";

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getViewport: (o: { scale: number }) => { width: number; height: number };
    render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => {
      promise: Promise<void>;
      cancel: () => void;
    };
  }>;
  destroy?: () => void;
};

export function PdfViewer({
  url,
  fileName,
  onClose,
}: {
  url: string;
  fileName: string;
  onClose?: () => void;
}) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(() => {
    let alive = true;
    setStatus("loading");
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default as string;
        const loaded = (await pdfjs.getDocument({ url, disableAutoFetch: true, disableStream: false })
          .promise) as unknown as PdfDoc;
        if (!alive) return;
        setDoc(loaded);
        setTotal(Math.min(loaded.numPages, MAX_PREVIEW_PAGES));
        setPage(1);
        setStatus("ready");
      } catch (e) {
        console.warn("[pdf-viewer] failed", e);
        if (alive) setStatus("failed");
      }
    })();
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => load(), [load]);

  useEffect(() => {
    if (!doc || status !== "ready") return;
    let cancelled = false;
    void (async () => {
      try {
        const p = await doc.getPage(page);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || cancelled) return;
        const base = p.getViewport({ scale: 1 });
        const width = wrapRef.current?.clientWidth ?? 340;
        const scale = Math.max(0.4, Math.min(2.5, (width - 8) / base.width));
        const viewport = p.getViewport({ scale });
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        await p.render({ canvasContext: ctx, viewport }).promise;
      } catch (e) {
        console.warn("[pdf-viewer] render failed", e);
        if (!cancelled) setStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, page, status]);

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
    <div className="flex h-full flex-col bg-[#F7F3EA]">
      <div className="flex items-center gap-2 border-b border-[#E4DCC8] px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#1B2A4A]">
          {fileName}
        </span>
        <span className="shrink-0 text-[11px] text-[#5C5C70]">
          {status === "ready" ? `page ${page} / ${total}` : ""}
        </span>
        {onClose ? (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-[#5C5C70]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div ref={wrapRef} className="flex-1 overflow-auto p-1">
        {status === "loading" ? (
          <div className="grid h-full place-items-center gap-2 px-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#B86E0A]" />
            <p className="text-sm font-medium text-[#1B2A4A]">Opening your file…</p>
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
            onClick={() => setPage((n) => Math.max(1, n - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <span className="text-[11px] text-[#5C5C70]">
            {doc && doc.numPages > MAX_PREVIEW_PAGES
              ? `First ${MAX_PREVIEW_PAGES} pages shown`
              : "View only, no download"}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-[#E4DCC8] text-[#1B2A4A]"
            onClick={() => setPage((n) => Math.min(total, n + 1))}
            disabled={page >= total}
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
