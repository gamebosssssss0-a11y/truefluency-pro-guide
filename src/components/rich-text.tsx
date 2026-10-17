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

function parseTableCells(line: string): string[] | null {
  if (!line.includes("|")) return null;
  const trimmed = line.trim().replace(/^\\|/, "").replace(/\\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableDivider(line: string): boolean {
  const cells = parseTableCells(line);
  return Boolean(cells?.length && cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
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

export function RichText({ children, tone = "default" }: { children: string | null | undefined; tone?: "default" | "canvas" }) {
  const canvas = tone === "canvas";
  const text = (children ?? "").replace(/\r\n/g, "\n");
  const normalizedText = text.replace(/\\\[([\s\S]+?)\\\]/g, (_match, formula: string) => "\\[" + formula.replace(/\s+/g, " ").trim() + "\\]");
  const lines = normalizedText.split("\n");

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

  const consumedTableLines = new Set<number>();
  lines.forEach((raw, idx) => {
    if (consumedTableLines.has(idx)) return;
    const line = raw.trimEnd();
    const tableHeader = parseTableCells(line);
    const dividerLine = lines[idx + 1];
    const dividerCells = dividerLine ? parseTableCells(dividerLine) : null;
    if (
      tableHeader?.length &&
      dividerCells?.length === tableHeader.length &&
      isTableDivider(dividerLine ?? "")
    ) {
      flushList();
      consumedTableLines.add(idx + 1);
      const tableRows: string[][] = [];
      let nextRow = idx + 2;
      while (nextRow < lines.length) {
        const row = parseTableCells(lines[nextRow] ?? "");
        if (!row) break;
        tableRows.push(row);
        consumedTableLines.add(nextRow);
        nextRow += 1;
      }
      const tableTone = canvas
        ? "w-full min-w-[32rem] border-collapse bg-[#1B2A4A] text-left text-sm text-[#F7F3EA]"
        : "w-full min-w-[32rem] border-collapse bg-card text-left text-sm text-card-foreground";
      const headerTone = canvas ? "bg-[#3D5278]" : "bg-secondary";
      blocks.push(
        <div key={`table-${idx}`} role="region" aria-label="Scrollable response table" className="my-3 w-full overflow-x-auto rounded-lg border border-[#B86E0A]/45">
          <table className={tableTone}>
            <thead className={headerTone}>
              <tr>
                {tableHeader.map((cell, cellIndex) => (
                  <th key={cellIndex} scope="col" className="border-b border-border px-3 py-2 text-left font-semibold align-top">
                    <Inline text={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {tableHeader.map((_, cellIndex) => (
                    <td key={cellIndex} className="border-b border-border/70 px-3 py-2 align-top leading-relaxed">
                      <Inline text={row[cellIndex] ?? ""} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      return;
    }
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1] ?? "");
      return;
    }
    flushList();
    if (!line.trim()) return;
    const finalDisplayFormula = line.match(/^\s*\\\[([\s\S]+?)\\\]\s*$/);
    const lastContentLine = lines.map((candidate) => candidate.trim()).lastIndexOf(lines.slice().reverse().find((candidate) => candidate.trim())?.trim() ?? "");
    if (finalDisplayFormula && line.trim() === lines[lastContentLine]?.trim()) {
      blocks.push(<div key={idx} className={canvas ? "my-3 max-w-full overflow-x-auto px-2 py-2 text-center text-[1.15em] text-[#E4C46A]" : "my-3 border border-[#E4DCC8] px-2 py-2 text-navy"}><MathText>{line}</MathText></div>);
      return;
    }
    const finalLine = line.match(/^\s*(final answer|answer)\s*:\s*(.*)$/i);
    if (finalLine) {
      blocks.push(
        <div key={idx} className={canvas ? "my-3 px-2 py-2 text-[#E4C46A]" : "my-3 rounded-lg border border-border bg-background px-2 py-2 text-foreground"}>
          <span className="font-semibold">{finalLine[1]}:</span>{" "}
          <Inline text={finalLine[2] ?? ""} />
        </div>,
      );
      return;
    }
    const stepTitle = line.match(/^\s*((?:step\s+\d+)|therefore|hence|formula summary)\s*:?\s*$/i);
    if (stepTitle) {
      blocks.push(
        <p key={idx} className={canvas ? "mt-3 text-[15px] font-semibold text-[#E4C46A]" : "mt-3 text-[15px] font-semibold text-navy"}>
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
