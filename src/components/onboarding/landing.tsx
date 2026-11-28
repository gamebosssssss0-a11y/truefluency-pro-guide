import { PlanStatusDiamond } from "@/components/plan-status-diamond";
import { useState } from "react";
import { BookOpenCheck, Lightbulb, ShieldCheck } from "lucide-react";
import { PolicyLinks } from "@/components/legal-policies-dialog";
import { useProfile } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { SUPPORT_RESPONSE_HOURS } from "@/lib/support-policy";
import { CgpaGaugeArt, ExplanationArt, FlashcardArt, NotesToMockArt, SavedMockArt } from "@/components/landing/illustrations";
import { SwipeCarousel, type Slide } from "@/components/landing/swipe-carousel";
import { LANDING_PLANS, PlanSheet, type LandingPlan } from "@/components/landing/plan-sheet";

/**
 * Public landing page. Honesty contract: no exam-probability percentages, no
 * guaranteed questions, no invented testimonials, counts or discounts. Prices
 * and limits come only from the shared entitlement constants.
 */

const VALUES = [
  { icon: BookOpenCheck, title: "Your syllabus, not random questions", body: "Every question is built from the handouts and slides you upload." },
  { icon: ShieldCheck, title: "Mocks that stay saved if you leave", body: "Step away mid-attempt and pick up where you stopped." },
  { icon: Lightbulb, title: "Explanations that show why", body: "Review each answer with the reasoning, not just a tick or cross." },
];

const STEPS = [
  { n: "01", title: "Upload your material", body: "PDFs, slides or photos of your notes." },
  { n: "02", title: "Practise in timed or tutor mode", body: "Sit a timed mock, or learn step by step." },
  { n: "03", title: "Review weak spots and track CGPA", body: "Revisit misses and plan toward your target class." },
];

const FEATURES: Slide[] = [
  { id: "notes", art: <NotesToMockArt />, title: "Notes become real mocks", body: "Your handout turns into clean multiple-choice questions in minutes." },
  { id: "why", art: <ExplanationArt />, title: "Clear structured explanations", body: "See the key concept and the reasoning behind every correct answer." },
  { id: "saved", art: <SavedMockArt />, title: "Timed mocks that stay saved", body: "Exam-style timing, and your progress is kept if you step away." },
  { id: "cards", art: <FlashcardArt />, title: "Instant active-recall flashcards", body: "Flip through key terms made from your own material." },
  { id: "cgpa", art: <CgpaGaugeArt />, title: "Built-in UI CGPA tracker", body: "Calculated on the 5.00 scale, with First Class from 4.50." },
];

const PLAN_ORDER: LandingPlan[] = ["free", "core", "exam"];

export function LandingScreen() {
  const { go } = useProfile();
  const [openPlan, setOpenPlan] = useState<LandingPlan | null>(null);
  const start = () => go("disclaimer");
  const scrollTo = (id: string) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  const logIn = () => {
    try { sessionStorage.setItem("truefluency-open-identity-auth", "1"); } catch { /* identity screen still offers sign-in */ }
    go("identity");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-5">
          <div className="flex min-w-0 items-center gap-2">
            <LogoMark className="h-8 w-8 shrink-0" />
            <span className="truncate font-display text-base font-semibold">TrueFluency <span className="text-accent-ink">Pro</span></span>
          </div>
          <nav aria-label="Landing sections" className="ml-auto hidden items-center gap-1 md:flex">
            <Button variant="ghost" onClick={() => scrollTo("features")}>Features</Button>
            <Button variant="ghost" onClick={() => scrollTo("plans")}>Plans</Button>
          </nav>
          <Button variant="ghost" onClick={logIn} className="ml-auto min-h-11 md:ml-0">Log in</Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5">
        {/* 1 · Hero */}
        <section className="grid items-center gap-8 pb-14 pt-10 md:grid-cols-12 md:pt-16">
          <div className="md:col-span-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">Built for University of Ibadan students</p>
            <h1 className="mt-3 font-display text-[2.1rem] font-semibold leading-[1.1] tracking-tight md:text-5xl">Turn your lecture notes into exam-ready practice</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">Upload PDFs or notes. Get timed mocks, clear explanations, and flashcards grounded in your own material.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 rounded-xl px-6" onClick={start}>Start studying free</Button>
              <Button size="lg" variant="outline" className="h-12 rounded-xl px-6" onClick={() => scrollTo("plans")}>See how plans work</Button>
            </div>
          </div>
          <div className="md:col-span-6">
            <div className="rounded-[24px] border border-border bg-card p-3 shadow-sm"><NotesToMockArt /></div>
          </div>
        </section>

        {/* 2 · Core value */}
        <section aria-labelledby="value-h" className="pb-14">
          <h2 id="value-h" className="sr-only">Why TrueFluency Pro</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-[20px] border border-border bg-card p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent-ink"><v.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-display text-base font-semibold text-card-foreground">{v.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3 · How it works */}
        <section aria-labelledby="how-h" className="pb-14">
          <h2 id="how-h" className="font-display text-2xl font-semibold">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4 border-t border-border pt-4 md:block">
                <span className="font-display text-2xl font-semibold tabular-nums text-accent-ink">{s.n}</span>
                <div className="md:mt-3">
                  <h3 className="text-base font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 4 · Feature carousel */}
        <section id="features" aria-labelledby="feat-h" className="scroll-mt-20 pb-14">
          <h2 id="feat-h" className="font-display text-2xl font-semibold">What you get</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">Swipe through the five core tools.</p>
          <SwipeCarousel slides={FEATURES} label="TrueFluency Pro features" layout="split" />
        </section>

        {/* Plans */}
        <section id="plans" aria-labelledby="plans-h" className="scroll-mt-20 pb-14">
          <h2 id="plans-h" className="font-display text-2xl font-semibold">Plans</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tap a plan to see what’s inside.</p>
          <h3 className="mt-5 mb-4 text-sm font-semibold">Plans at a glance</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {PLAN_ORDER.map((p) => {
              const info = LANDING_PLANS[p];
              return (
                <Button key={p} type="button" variant="ghost" onClick={() => setOpenPlan(p)} className="group block h-auto w-full whitespace-normal rounded-[20px] border border-border bg-card p-5 text-left font-normal transition-colors hover:border-accent hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg font-semibold text-card-foreground">{info.name}</h3>
                        <PlanStatusDiamond tier={p} />
                      </div>
                      {p !== "free" ? <span aria-hidden="true" className={`tf-plan-accent tf-plan-accent--${p} mt-2 block h-0.5 w-8`} /> : null}
                    </div>
                    <span className="font-display text-2xl font-semibold tabular-nums text-card-foreground">{info.price}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{info.priceNote}</p>
                  <p className="mt-4 text-sm text-card-foreground">{info.summary}</p>
                  <span className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-accent-ink underline-offset-4 group-hover:underline">See what’s inside →</span>
                </Button>
              );
            })}
          </div>
        </section>

        {/* 5 · Academic fit */}
        <section aria-labelledby="fit-h" className="pb-14">
          <div className="grid gap-6 rounded-[24px] border border-border bg-card p-6 md:grid-cols-2 md:items-center md:p-10">
            <div>
              <h2 id="fit-h" className="font-display text-2xl font-semibold text-card-foreground">Made for how UI grades you</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">CGPA follows the University of Ibadan 5.00 scale (A = 5 … F = 0), with First Class from 4.50 to 5.00. Courses are organised by faculty, department and level, including GES, from 100 Level to final year.</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">It’s a study aid, not a replacement for lectures, and it never promises which questions will appear.</p>
            </div>
            <CgpaGaugeArt />
          </div>
        </section>
      </main>

      {/* 6 · Final CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-5 py-14 md:flex-row md:items-center md:justify-between">
          <h2 className="font-display text-2xl font-semibold">Start with the notes you already have.</h2>
          <div>
            <Button size="lg" variant="secondary" className="h-12 rounded-xl px-6" onClick={start}>Start studying free</Button>
            <p className="mt-2 text-xs opacity-80">Free to start · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* 7 · Footer */}
      <footer className="mx-auto w-full max-w-6xl px-5 py-8 text-xs text-muted-foreground">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2"><LogoMark className="h-6 w-6" /><span>TrueFluency Pro · University of Ibadan</span></div>
          <PolicyLinks />
        </div>
        <p className="mt-3">Need help? Support replies within {SUPPORT_RESPONSE_HOURS} hours.</p>
      </footer>

      <PlanSheet plan={openPlan} onOpenChange={(o) => { if (!o) setOpenPlan(null); }} onContinue={() => { setOpenPlan(null); start(); }} />
    </div>
  );
}
