/**
 * Small markdown renderer for assistant replies. Deliberately tiny — no new
 * markdown dependency — and it hands every text run to the existing
 * math-text.tsx so \( ... \) and \[ ... \] still render with KaTeX.
 * Handles: headings, bullet/numbered lists, **bold**, *italic*, `code`.
 */
import { MathText } from "@/components/math-text";

/** Markdown stripped down to speakable prose (used by text-to-speech). */
export function plainText(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**") && p.length > 4)
          return (
            <strong key={i} className="font-semibold">
              <MathText>{p.slice(2, -2)}</MathText>
            </strong>
          );
        if (p.startsWith("`") && p.endsWith("`") && p.length > 2)
          return (
            <code key={i} className="rounded bg-sand px-1 py-0.5 text-[0.9em]">
              {p.slice(1, -1)}
            </code>
          );
        if (p.startsWith("*") && p.endsWith("*") && p.length > 2)
          return (
            <em key={i}>
              <MathText>{p.slice(1, -1)}</MathText>
            </em>
          );
        return <MathText key={i}>{p}</MathText>;
      })}
    </>
  );
}

export function RichText({ children }: { children: string | null | undefined }) {
  const text = (children ?? "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");

  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-1 list-disc space-y-1 pl-5">
        {list.map((item, i) => (
          <li key={i}>
            <Inline text={item} />
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1] ?? "");
      return;
    }
    flushList();
    if (!line.trim()) return;
    const finalLine = line.match(/^\s*(final answer|answer)\s*:\s*(.*)$/i);
    if (finalLine) {
      blocks.push(
        <div key={idx} className="my-3 rounded-lg border border-border bg-background px-2 py-2 text-foreground">
          <span className="font-semibold">{finalLine[1]}:</span>{" "}
          <Inline text={finalLine[2] ?? ""} />
        </div>,
      );
      return;
    }
    const stepTitle = line.match(/^\s*((?:step\s+\d+)|therefore)\s*:?[\s]*$/i);
    if (stepTitle) {
      blocks.push(
        <p key={idx} className="mt-3 text-[15px] font-semibold text-foreground">
          {stepTitle[1]}
        </p>,
      );
      return;
    }
    const heading = line.match(/^#{1,6}\s*(.*)$/);
    if (heading) {
      blocks.push(
        <p key={idx} className="mt-2 font-semibold">
          <Inline text={heading[1] ?? ""} />
        </p>,
      );
      return;
    }
    blocks.push(
      <p key={idx} className="my-1 first:mt-0 last:mb-0">
        <Inline text={line} />
      </p>,
    );
  });
  flushList();

  return <div className="leading-relaxed">{blocks}</div>;
}
