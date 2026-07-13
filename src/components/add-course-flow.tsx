import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { flatCatalog, type CatalogEntry, type Level } from "@/lib/uni-data";
import type { UserCourse } from "@/lib/profile-store";
import { AlertTriangle, Check, PencilLine, Search, X } from "lucide-react";

/**
 * Browse-first manual course entry (spec Part 4).
 *
 * - As soon as the user types 2+ chars, we show live matches from the entire
 *   `uiCourseCatalog` (all departments, all levels) — matching against `code` OR `name`.
 * - Tapping a match adds it as a VERIFIED course (real status badge).
 * - "No match" → offer free-text (adds as source: "manual", status: "Elective"
 *   with a "Manually Added" visual badge).
 * - This is a self-contained inline form. It doesn't own the profile; the caller
 *   supplies `existing` and receives `onAdd` / `onRemove` for each course change.
 */
export function AddCourseFlow({
  existing,
  onAdd,
  onRemove,
  level,
  emptyStateMessage,
}: {
  existing: UserCourse[];
  onAdd: (c: UserCourse) => void;
  onRemove: (code: string) => void;
  level?: Level;
  emptyStateMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [freeCode, setFreeCode] = useState("");
  const [freeTitle, setFreeTitle] = useState("");
  const [showFreeText, setShowFreeText] = useState(false);

  const q = query.trim().toLowerCase();
  const active = q.length >= 2;

  const matches = useMemo(() => {
    if (!active) return [];
    const all = flatCatalog();
    const seen = new Set<string>();
    const out: (CatalogEntry & { department: string; level: Level })[] = [];
    for (const e of all) {
      if (e.code.toLowerCase().includes(q) || e.name.toLowerCase().includes(q)) {
        // Prefer catalog entries whose level matches the user's level.
        const key = `${e.code}::${e.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(e);
      }
      if (out.length > 60) break;
    }
    // Boost same-level matches to the top.
    if (level) {
      out.sort((a, b) => Number(b.level === level) - Number(a.level === level));
    }
    return out;
  }, [q, active, level]);

  const isAdded = (code: string) => existing.some((c) => c.code === code);

  const addVerified = (e: CatalogEntry) => {
    if (isAdded(e.code)) return;
    onAdd({ code: e.code, name: e.name, status: e.status, source: "verified" });
  };

  const addFreeText = () => {
    const code = (freeCode || query).trim();
    const name = (freeTitle || query).trim();
    if (!code || !name) return;
    if (isAdded(code)) return;
    onAdd({ code, name, status: "Elective", source: "manual" });
    setFreeCode("");
    setFreeTitle("");
    setQuery("");
    setShowFreeText(false);
  };

  return (
    <div className="space-y-4">
      {emptyStateMessage ? (
        <div className="flex items-start gap-2 rounded-2xl border border-dashed border-border bg-card/60 p-3.5 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>{emptyStateMessage}</span>
        </div>
      ) : null}

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Search the course catalogue
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowFreeText(false); }}
            placeholder="Type a course code or title…"
            className="h-11 pl-10 text-sm"
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          We search across every department and level in the catalogue — this isn't live
          verification against UI's records, just our local list.
        </p>
      </div>

      {active ? (
        matches.length > 0 ? (
          <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-2xl border border-border bg-card p-1.5">
            {matches.map((m) => {
              const added = isAdded(m.code);
              return (
                <button
                  key={`${m.code}-${m.department}-${m.level}`}
                  onClick={() => addVerified(m)}
                  disabled={added}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-3 text-left transition",
                    added ? "cursor-default bg-success/10" : "hover:bg-secondary"
                  )}
                >
                  <div className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-semibold",
                    added ? "bg-success text-primary-foreground" : "bg-secondary text-primary"
                  )}>
                    {added ? <Check className="h-4 w-4" /> : m.level + "L"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">{m.code}</span>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{m.name}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/80">
                      {m.department}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">No match</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">
              No match found in our verified catalog. You can still add “{query}” manually,
              but we can't confirm it's a real course code yet.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setQuery("")}>
                Keep searching
              </Button>
              <Button size="sm" className="flex-1" onClick={() => { setFreeCode(query); setFreeTitle(""); setShowFreeText(true); }}>
                <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                Add manually
              </Button>
            </div>
          </div>
        )
      ) : null}

      {showFreeText ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Manual entry
          </div>
          <div className="space-y-2">
            <Input
              placeholder="Course Code (e.g. STA 202)"
              value={freeCode}
              onChange={(e) => setFreeCode(e.target.value)}
              className="h-10 text-sm"
            />
            <Input
              placeholder="Course Title"
              value={freeTitle}
              onChange={(e) => setFreeTitle(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowFreeText(false)}>Cancel</Button>
            <Button size="sm" className="flex-1" onClick={addFreeText} disabled={!freeCode.trim() || !freeTitle.trim()}>Add Course</Button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Manually added courses are tagged as self-reported.
          </p>
        </div>
      ) : null}

      {/* List of added-so-far courses */}
      {existing.length > 0 ? (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Added ({existing.length})
          </div>
          <div className="space-y-2">
            {existing.map((c) => (
              <div key={c.code} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">{c.code}</span>
                    {c.source === "manual" ? (
                      <span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-warning">
                        Manually Added
                      </span>
                    ) : (
                      <StatusBadge status={c.status} />
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{c.name}</div>
                </div>
                <button
                  onClick={() => onRemove(c.code)}
                  aria-label={`Remove ${c.code}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: "Compulsory" | "Required" | "Elective" }) {
  const styles =
    status === "Compulsory" ? "bg-accent/15 text-accent" :
    status === "Required" ? "bg-primary/10 text-primary" :
    "bg-muted text-muted-foreground";
  return (
    <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", styles)}>
      {status}
    </span>
  );
}
