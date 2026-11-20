/** Thumbnail rendering stays browser-only. No file bytes/URLs are persisted. */
import { unzipSync, strFromU8 } from "fflate";

export type PreviewSource = { url: string; headers?: Record<string, string>; cacheable?: boolean; textContent?: string };
let running = 0;
const waiters: Array<() => void> = [];

async function withPreviewSlot<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
  if (running >= 2) await new Promise<void>((resolve) => waiters.push(resolve));
  running += 1;
  try {
    signal.throwIfAborted();
    return await work();
  } finally {
    running -= 1;
    waiters.shift()?.();
  }
}

export async function renderDocumentPreview(canvas: HTMLCanvasElement, type: string, source: PreviewSource, signal: AbortSignal, textContent?: string) {
  return withPreviewSlot(signal, async () => {
    let buffer: ArrayBuffer;
    if (type === "pasted" && (source.textContent ?? textContent)) buffer = new TextEncoder().encode((source.textContent ?? textContent ?? "").slice(0, 4000)).buffer;
    else {
      const response = await fetch(source.url, { headers: source.headers, signal, cache: "no-store" });
      if (!response.ok) throw new Error("This file is no longer available.");
      const size = Number(response.headers.get("content-length") || 0);
      if (size > 25 * 1024 * 1024) throw new Error("Open this large file to preview it.");
      buffer = await response.arrayBuffer();
    }
    signal.throwIfAborted();
    if (buffer.byteLength > 25 * 1024 * 1024) throw new Error("Open this large file to preview it.");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Document preview is unavailable.");
    if (type === "image") {
      const bitmap = await createImageBitmap(new Blob([buffer]));
      try { signal.throwIfAborted(); canvas.width = 300; canvas.height = Math.round(300 * bitmap.height / bitmap.width); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); }
      finally { bitmap.close(); }
      return;
    }
    if (type === "pdf") {
      const [pdfjs, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
      signal.throwIfAborted();
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const task = pdfjs.getDocument({ data: buffer });
      const abort = () => { void task.destroy(); };
      signal.addEventListener("abort", abort, { once: true });
      try {
        const pdf = await task.promise;
        const page = await pdf.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 300 / base.width });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        signal.throwIfAborted();
      } finally {
        signal.removeEventListener("abort", abort);
        await task.destroy();
      }
      return;
    }
    // Word has no browser pagination engine. Render its actual leading text,
    // stopping at an explicit page break; never pretend a fake sheet is a scan.
    let paragraphs: string[];
    if (type === "docx") {
      const zip = unzipSync(new Uint8Array(buffer), { filter: (entry) => entry.name === "word/document.xml" && entry.originalSize <= 2 * 1024 * 1024 });
      const xml = zip["word/document.xml"];
      if (!xml) throw new Error("Open this document to preview it.");
      const documentXml = new DOMParser().parseFromString(strFromU8(xml), "application/xml");
      paragraphs = [];
      for (const paragraph of Array.from(documentXml.getElementsByTagNameNS("*", "p"))) {
        const text = Array.from(paragraph.getElementsByTagNameNS("*", "t")).map((node) => node.textContent ?? "").join("");
        if (text.trim()) paragraphs.push(text.trim());
        if (paragraph.getElementsByTagNameNS("*", "lastRenderedPageBreak").length ||
          Array.from(paragraph.getElementsByTagNameNS("*", "br")).some((node) => node.getAttribute("w:type") === "page")) break;
        if (paragraphs.join(" ").length > 4_000) break;
      }
    } else if (type === "pptx") {
      const zip = unzipSync(new Uint8Array(buffer), { filter: (entry) => entry.name === "ppt/slides/slide1.xml" && entry.originalSize <= 2 * 1024 * 1024 });
      const xml = zip["ppt/slides/slide1.xml"];
      if (!xml) throw new Error("Open this presentation to preview it.");
      const slide = new DOMParser().parseFromString(strFromU8(xml), "application/xml");
      paragraphs = Array.from(slide.getElementsByTagNameNS("*", "t")).map((node) => node.textContent ?? "").filter(Boolean);
    } else if (type === "txt" || type === "text" || type === "pasted") {
      paragraphs = new TextDecoder().decode(buffer).split(/\r?\n/).filter((line) => line.trim());
    } else {
      throw new Error("Open this document to preview it.");
    }
    if (!paragraphs.length) throw new Error("Open this document to preview it.");
    canvas.width = 300;
    canvas.height = 400;
    const tokens = getComputedStyle(document.documentElement);
    context.fillStyle = tokens.getPropertyValue("--tf-preview-paper").trim();
    context.fillRect(0, 0, 300, 400);
    context.fillStyle = tokens.getPropertyValue("--tf-preview-ink").trim();
    context.textBaseline = "top";
    let y = 25;
    for (const [index, paragraph] of paragraphs.entries()) {
      context.font = index === 0 ? "bold 14px sans-serif" : "11px sans-serif";
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (context.measureText(next).width > 250 && line) {
          context.fillText(line, 25, y, 250);
          y += 16;
          line = word;
        } else line = next;
        if (y > 370) break;
      }
      if (y > 370) break;
      context.fillText(line, 25, y, 250);
      y += index === 0 ? 28 : 24;
    }
  });
}