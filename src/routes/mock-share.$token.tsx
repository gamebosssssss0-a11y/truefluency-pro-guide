import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Loader2, ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/math-text";
import { supabase } from "@/integrations/supabase/client";
import { readPracticeMockShare, readPublicMockShare, MOCK_SHARE_OFFLINE_MESSAGE } from "@/lib/mock-sharing.functions";

export const Route = createFileRoute("/mock-share/$token")({
  component: SharedMockPage,
  head: () => ({
    meta: [
      { title: "Shared Practice Mock | TrueFluency Pro" },
      { name: "description", content: "Preview a practice mock shared from TrueFluency Pro." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Preview = { courseCode: string; courseTitle: string; questionCount: number; questions: { id?: number; topic?: string; question: string; options: string[] }[] };
type PageState = "loading" | "ready" | "unavailable" | "offline";

function SharedMockPage() {
  const { token } = Route.useParams();
  const [state, setState] = useState<PageState>("loading");
  const [mock, setMock] = useState<Preview | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        setSignedIn(!!data.session);
        const result = await readPublicMockShare({ data: { token } });
        if (!alive) return;
        if (result.ok) {
          setMock(result.mock);
          setState("ready");
        } else {
          setState(result.reason === MOCK_SHARE_OFFLINE_MESSAGE ? "offline" : "unavailable");
        }
      } catch {
        if (alive) setState("unavailable");
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const goSignIn = () => {
    try { sessionStorage.setItem("returnTo", "/mock-share/" + token); } catch { /* allow reopening link */ }
    window.location.href = "/";
  };

  const startPractice = async () => {
    setWorking(true);
    setError("");
    try {
      const result = await readPracticeMockShare({ data: { token } });
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      const full = result.mock;
      const questions = full.questions as { id: number; topic: string; question: string; options: string[]; correct_index: number; explanation: string }[];
      sessionStorage.setItem("sharedMockToPractice", JSON.stringify({
        courseCode: full.courseCode,
        courseTitle: full.courseTitle,
        questions,
      }));
      window.location.href = "/";
    } catch {
      setError("Couldn't open this mock. Please try again.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-7 text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-7 flex items-center gap-3">
          <LogoMark className="h-9 w-9 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">TrueFluency Pro</p>
            <h1 className="font-display text-xl font-semibold">Shared practice mock</h1>
          </div>
        </header>

        {state === "loading" ? (
          <section role="status" className="rounded-2xl border border-border bg-card p-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
            <p className="mt-3 text-sm text-muted-foreground">Opening the mock preview…</p>
          </section>
        ) : state === "offline" ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Sharing is temporarily unavailable</h2>
            <p className="mt-2 text-sm text-muted-foreground">{MOCK_SHARE_OFFLINE_MESSAGE}</p>
          </section>
        ) : state === "unavailable" || !mock ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">This mock link is no longer available</h2>
            <p className="mt-2 text-sm text-muted-foreground">Ask the student who shared it for a fresh link.</p>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{mock.courseCode}</p>
              <h2 className="mt-1 break-words font-display text-2xl font-semibold">{mock.courseTitle}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{mock.questionCount} questions · Practice at your own pace</p>
            </section>
            <section className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="font-display text-lg font-semibold">A quick preview</h3>
                <p className="mt-1 text-sm text-muted-foreground">A few sample questions, with answers hidden.</p>
              </div>
              <div className="space-y-4">
                {mock.questions.map((question, index) => (
                  <article key={question.id ?? index} className="rounded-xl border border-border bg-background p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Question {index + 1}{question.topic ? " · " + question.topic : ""}</p>
                    <div className="mt-2 text-sm font-medium leading-6"><MathText>{question.question}</MathText></div>
                    <ol className="mt-3 space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <li key={optionIndex} className="flex gap-2 text-sm leading-5 text-muted-foreground">
                          <span className="shrink-0 font-semibold">{String.fromCharCode(65 + optionIndex)}.</span>
                          <span><MathText>{option}</MathText></span>
                        </li>
                      ))}
                    </ol>
                  </article>
                ))}
              </div>
            </section>
            <section className="mt-4 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Sign in to practice this mock and save your progress.</p>
              {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
              {signedIn ? (
                <Button className="mt-3 w-full" size="lg" disabled={working} onClick={startPractice}>
                  <BookOpen className="mr-2 h-4 w-4" />{working ? "Preparing your mock…" : "Practice this mock"}<ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              ) : (
                <Button className="mt-3 w-full" size="lg" onClick={goSignIn}>Sign in to practice</Button>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
