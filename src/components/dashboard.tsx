import { useEffect, useMemo, useState } from "react";
import { useProfile, hasQualifyingActivityToday } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, Flame, Zap, Quote as QuoteIcon, Lightbulb, Calculator, Target,
  Layers, GraduationCap, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TopicPill } from "@/components/common";
import { HeaderLogo } from "@/components/brand";
import { greetingSubline } from "@/lib/personalization";
import { buildRotatingDeck, type Rotating } from "@/lib/study-quotes";
import { useEntitlement } from "@/hooks/use-entitlement";
import { PRICE_LINE, TRIAL_LINE } from "@/lib/pricing-copy";
import { listAllUserMaterials, type CourseMaterial } from "@/lib/course-materials";

/* ================= Tab 1: Home ================= */

const ROTATE_MS = 8000;

/** One chip only: the live trial, paid access, or the founding price line. */
function PlanChip() {
  const { access } = useEntitlement();
  if (!access) return null;

  if (access.tier === "trial" && access.trialEndsAt) {
    const msLeft = new Date(access.trialEndsAt).getTime() - Date.now();
    if (msLeft > 0) {
      const days = Math.max(1, Math.ceil(msLeft / 86_400_000));
      return (
        <ChipShell>
          {TRIAL_LINE} · {days} {days === 1 ? "day" : "days"} left
        </ChipShell>
      );
    }
  }
  if (access.tier === "paid") return <ChipShell>Full access, this semester</ChipShell>;
  return <ChipShell>{PRICE_LINE}</ChipShell>;
}

function ChipShell({ children }: { children: React.ReactNode }) {
  const { navigate } = useProfile();
  return (
    <button
      onClick={() => navigate("upgrade")}
      className="mb-5 flex w-full items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-left"
    >
      <span className="min-w-0 flex-1 text-xs font-medium leading-relaxed text-foreground">
        {children}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

const TYPE_CHIP: Record<string, { label: string; color: string }> = {
  pdf: { label: "PDF", color: "#8B2E2E" },
  docx: { label: "DOC", color: "#1D4E89" },
  pptx: { label: "PPT", color: "#B86E0A" },
  image: { label: "IMG", color: "#1B2A4A" },
  pasted: { label: "TXT", color: "#1B2A4A" },
};

/** Latest file this student uploaded themselves. Peer copies never appear here. */
function ContinueFileCard() {
  const { navigate } = useProfile();
  const [latest, setLatest] = useState<CourseMaterial | null>(null);

  useEffect(() => {
    let live = true;
    listAllUserMaterials()
      .then((items) => {
        const own = items.filter(
          (m) => !(m as CourseMaterial & { is_peer_copy?: boolean }).is_peer_copy,
        );
        if (live) setLatest(own[0] ?? null);
      })
      .catch((e) => console.warn("[home] couldn't read uploads", e));
    return () => {
      live = false;
    };
  }, []);

  if (!latest) return null;
  const chip = TYPE_CHIP[latest.file_type] ?? TYPE_CHIP.pasted;

  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[10px] font-bold text-white"
          style={{ backgroundColor: chip.color }}
        >
          {chip.label}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Continue your file</div>
          <div className="break-words text-[11px] text-muted-foreground">
            {latest.course_code} · {latest.file_name}
          </div>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => navigate("course-detail", { courseCode: latest.course_code })}
      >
        Continue <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/** Cached prediction for the student's own uploads. Never triggers an analyze run. */
function StrengthsCard() {
  const { profile, navigate } = useProfile();
  const entry = profile.courses
    .map((c) => ({ code: c.code, analysis: profile.courseTopicAnalysis[c.code] }))
    .find((x) => (x.analysis?.topics.length ?? 0) > 0);

  if (!entry?.analysis) return null;
  const topics = entry.analysis.topics.slice(0, 5);

  return (
    <div className="mb-5 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Your strengths</h2>
        <button
          onClick={() => navigate("course-detail", { courseCode: entry.code })}
          className="shrink-0 text-[11px] font-medium text-accent hover:text-accent/80"
        >
          Refresh topics
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {topics.map((t) => (
          <TopicPill key={t.topic} label={t.topic} strength={t.confidence} />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {entry.code} · from your own uploads, not official exam forecasts.
      </p>
    </div>
  );
}

export function HomeScreen() {
  const { profile, navigate } = useProfile();
  /** First name only, in title case: never the full legal name, never ALL-CAPS. */
  const name = (() => {
    const raw = (profile.identity?.name ?? "").trim();
    const first = raw.split(/\s+/)[0] ?? "";
    if (!first) return "there";
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  })();

  const activeToday = hasQualifyingActivityToday(profile);
  const subline = greetingSubline(profile.goal);
  const hasStreak = profile.streakDays > 0;

  const meta = useMemo(
    () =>
      [profile.department ?? profile.faculty, profile.level ? `${profile.level} level` : null]
        .filter(Boolean)
        .join(" · "),
    [profile.department, profile.faculty, profile.level],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-8 pt-6">
        {/* Header */}
        <div className="mb-5">
          <div className="mb-3 flex items-center gap-2">
            <HeaderLogo />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Home
            </span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold leading-tight text-foreground">
                Welcome back, {name}
              </h1>
              {meta ? <p className="mt-1 text-sm text-muted-foreground">{meta}</p> : null}
              {subline ? (
                <p className="mt-1 text-[12px] text-muted-foreground">{subline}</p>
              ) : null}
            </div>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/15 font-display text-lg font-semibold text-foreground">
              {name.charAt(0)}
            </div>
          </div>
        </div>

        <PlanChip />

        {/* Streak: real data only */}
        {hasStreak ? (
          <div className="mb-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
              <Flame className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">Current streak</div>
              <div className="text-[11px] text-muted-foreground">
                {activeToday ? "Nice, you've qualified for today." : "Keep it going!"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-xl font-semibold text-accent">
                {profile.streakDays}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">days</div>
            </div>
          </div>
        ) : null}

        {/* Single amber CTA */}
        <Button size="lg" className="mb-5 w-full" onClick={() => navigate("mock-tests")}>
          <Zap className="mr-1.5 h-4 w-4" /> Take a mock
        </Button>

        <ContinueFileCard />
        <StrengthsCard />

        {/* Two columns from CGPA down where there's room. */}
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
          <div className="min-w-0">
            <CgpaStatusCard />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <QuickLink icon={<Calculator className="h-4 w-4" />} label="Calculator" onClick={() => navigate("cgpa")} />
              <QuickLink icon={<Target className="h-4 w-4" />} label="Goal setter" onClick={() => navigate("cgpa-goal")} />
            </div>
          </div>

          <div className="min-w-0">
            {/* Flashcards: link only, no generator. */}
            <button
              onClick={() => navigate("flashcards-soon")}
              className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left lg:mt-0"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">Flashcards</div>
                <div className="text-[11px] text-muted-foreground">
                  Coming soon, spaced cards from your predicted topics.
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            <RotatingWisdomCard />
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
          Predictions are statistical estimates. Always cross-check against your official material.
        </p>
      </div>
    </div>
  );
}

function QuickLink({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3.5 text-left"
    >
      <span className="shrink-0 text-primary">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function CgpaStatusCard() {
  const { profile, navigate } = useProfile();
  const actual = profile.cgpaActual;
  const plan = profile.cgpaPlan;

  return (
    <button
      onClick={() => navigate("cgpa")}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <GraduationCap className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">Your CGPA</div>
        {actual ? (
          <div className="font-display text-2xl font-semibold leading-tight text-foreground">
            {actual.cumulativeCgpa.toFixed(2)}
            {plan ? (
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                / {plan.targetCgpa.toFixed(2)}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">
            Work out where you stand, then set a target.
          </div>
        )}
      </div>
      {actual && plan ? (
        <span
          className={cn(
            "shrink-0 text-[11px] font-semibold",
            actual.cumulativeCgpa >= plan.targetCgpa ? "text-success" : "text-destructive",
          )}
        >
          {actual.cumulativeCgpa >= plan.targetCgpa ? "On target" : "Behind target"}
        </span>
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}

function RotatingWisdomCard() {
  const [deck] = useState<Rotating[]>(() => buildRotatingDeck());
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setI((c) => (c + 1) % deck.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [deck.length]);

  const item = deck[i];
  if (!item) return null;

  return (
    <figure className="mt-5 rounded-2xl border border-border bg-card p-4">
      {item.kind === "quote" ? (
        <>
          <QuoteIcon className="h-4 w-4 text-accent" aria-hidden="true" />
          <blockquote className="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
            {item.quote.quote}
          </blockquote>
          <figcaption className="mt-1.5 text-[11px] text-muted-foreground">
            {item.quote.author}
          </figcaption>
        </>
      ) : (
        <>
          <Lightbulb className="h-4 w-4 text-accent" aria-hidden="true" />
          <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
            Study tip
          </div>
          <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">{item.tip}</p>
        </>
      )}
    </figure>
  );
}

export { FileText as _HomeIconUnused };
