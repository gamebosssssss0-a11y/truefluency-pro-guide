import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/profile-store";
import { AlertTriangle, ChevronDown, ChevronUp, ShieldCheck, XCircle } from "lucide-react";

const summary =
  "TrueFluency Pro is a study aid. It is not a substitute for lectures or coursework. Predictions are statistical estimates based on past papers, not confirmed exam content, and are not endorsed by any lecturer or the University. Only past, concluded exam material may be uploaded. Never upload live or in-progress exams. AI-generated content may contain errors, so always cross-check against your official material.";

const fullSections: { title: string; body: string }[] = [
  { title: "1. Study Aid Only", body: "Not a substitute for lectures, textbooks, or coursework; results are not a guarantee of actual exam performance." },
  { title: "2. Predictions Are Not Guarantees", body: "Statistical estimates from past-paper pattern analysis, subject to error, not endorsed by any lecturer, department, or the University of Ibadan examinations office." },
  { title: "3. Past Papers Only, Never Live Exams", body: "Only processes concluded past exams; uploading live or in-progress exam content is strictly prohibited." },
  { title: "4. Academic Integrity", body: "Legitimate study practice consistent with past-question compilations; does not enable examination malpractice." },
  { title: "5. User-Uploaded Content", body: "Users confirm they have rights to uploaded material and won't share copyrighted content beyond personal use." },
  { title: "6. AI-Generated Content", body: "Mock tests, flashcards, and predictions use AI and may contain errors; always cross-check against official material." },
  { title: "7. No Liability for Academic Outcomes", body: "App and creators not liable for exam performance, grades, or academic standing." },
  { title: "8. Data & Privacy", body: "Your uploaded past papers and slides are stored securely and are only accessible to your own account. We do not share your uploaded files with other students or make them public. Extracted text content from your uploads may be used to improve mock test predictions for your own courses. Your personal performance data (scores, streaks, test history) stays private to your account and is never shared with other users, including on the opt-in leaderboard, where only your relative standing (not raw scores or personal data) is shown. You can delete your account and all associated data at any time from Settings." },
  { title: "9. Eligibility", body: "Intended for university students' personal academic study." },
  { title: "10. Changes to This Disclaimer", body: "May be updated as the app evolves; continued use after an update means acceptance of revised terms." },
];

export function DisclaimerScreen() {
  const { update, go, navigate } = useProfile();
  const [expanded, setExpanded] = useState(false);

  return (
    <AppShell title="Before you begin" subtitle="A quick note on how TrueFluency Pro should be used.">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-accent">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Summary</span>
        </div>
        <p className="text-sm leading-relaxed text-foreground/85">{summary}</p>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent"
        >
          {expanded ? "Hide full version" : "Read full version"}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expanded ? (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            {fullSections.map((s) => (
              <div key={s.title}>
                <h2 className="text-sm font-semibold text-foreground">{s.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        <Button
          size="lg"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => { update({ disclaimerAccepted: true }); go("identity"); }}
        >
          I Agree
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full border-border"
          onClick={() => go("disclaimer-blocked")}
        >
          I Disagree
        </Button>
      </div>
    </AppShell>
  );
}

/** Read-only view of the disclaimer, reachable from Settings after onboarding. */
export function DisclaimerViewScreen() {
  const { navigate } = useProfile();
  const [expanded, setExpanded] = useState(false);

  return (
    <AppShell title="Disclaimer" subtitle="How TrueFluency Pro should be used.">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-accent">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Summary</span>
        </div>
        <p className="text-sm leading-relaxed text-foreground/85">{summary}</p>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent"
        >
          {expanded ? "Hide full version" : "Read full version"}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expanded ? (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            {fullSections.map((s) => (
              <div key={s.title}>
                <h2 className="text-sm font-semibold text-foreground">{s.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <Button
          size="lg"
          className="w-full"
          onClick={() => navigate("account")}
        >
          Got it, back to Settings
        </Button>
      </div>
    </AppShell>
  );
}

export function DisclaimerBlockedScreen() {
  const { go } = useProfile();
  return (
    <AppShell title="Disclaimer acceptance required" subtitle="Agree to the disclaimer to continue using TrueFluency Pro.">
      <div className="mt-10 rounded-2xl border border-destructive/30 bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-foreground">Acceptance required</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          TrueFluency Pro requires you to agree to the disclaimer in order to function. You can review it again or exit the app.
        </p>
        <div className="mt-6 space-y-3">
          <Button className="w-full" onClick={() => go("disclaimer")}>Review disclaimer again</Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => { if (typeof window !== "undefined") window.close(); }}
          >
            <XCircle className="mr-2 h-4 w-4" /> Exit app
          </Button>
        </div>
      </div>
    </AppShell>
  );
          }
