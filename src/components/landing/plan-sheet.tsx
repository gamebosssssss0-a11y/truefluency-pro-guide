import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  CORE_DAILY_LIMITS, CORE_MAX_QUESTIONS, EXAM_DAILY_LIMITS, EXAM_MAX_QUESTIONS, EXAM_PRICE_NAIRA,
  FOUNDING_PRICE_NAIRA, FOUNDING_USER_LIMIT, FREE_DAILY_LIMITS, FREE_MAX_QUESTIONS, STANDARD_PRICE_NAIRA, formatNaira,
} from "@/lib/entitlements";
import { SwipeCarousel, type Slide } from "./swipe-carousel";
import { ExplanationArt, LimitArt } from "./illustrations";

export type LandingPlan = "free" | "core" | "exam";

export const LANDING_PLANS: Record<LandingPlan, { name: string; price: string; priceNote: string; summary: string }> = {
  free: { name: "Free", price: formatNaira(0), priceNote: "always", summary: `${FREE_DAILY_LIMITS.mock_sets} mock sets a day · ${FREE_MAX_QUESTIONS} questions each` },
  core: {
    name: "Prep",
    price: formatNaira(FOUNDING_PRICE_NAIRA),
    priceNote: `first 30 days for the first ${FOUNDING_USER_LIMIT} paying students, then ${formatNaira(STANDARD_PRICE_NAIRA)} every 30 days`,
    summary: `Tutor mode, “why” explanations, up to ${CORE_MAX_QUESTIONS} questions`,
  },
  exam: { name: "Mastery", price: formatNaira(EXAM_PRICE_NAIRA), priceNote: "every 30 days", summary: `Exam-level difficulty, up to ${EXAM_MAX_QUESTIONS} questions` },
};

const n = (v: number | null) => String(v ?? 0);

const SLIDES: Record<LandingPlan, Slide[]> = {
  free: [
    { id: "f1", art: <LimitArt value={n(FREE_DAILY_LIMITS.mock_sets)} unit="mock sets a day" label="Free daily mocks" />, title: "Practise every day", body: `Up to ${FREE_MAX_QUESTIONS} questions per set, built from your own upload.` },
    { id: "f2", art: <LimitArt value={n(FREE_DAILY_LIMITS.flashcard_decks)} unit="flashcard decks a day" label="Free flashcards" />, title: "Flashcards included", body: "Turn key points into quick recall cards at no cost." },
    { id: "f3", art: <LimitArt value="Tutor" unit="needs Prep or Mastery" label="Tutor mode locked" locked />, title: "Tutor mode stays paid", body: "Free covers timed practice; step-by-step Tutor mode needs a paid plan." },
  ],
  core: [
    { id: "c1", art: <LimitArt value={String(CORE_MAX_QUESTIONS)} unit="questions per set" label="Prep set size" />, title: "Longer practice sets", body: `${n(CORE_DAILY_LIMITS.mock_sets)} mock sets daily with up to ${CORE_MAX_QUESTIONS} questions each.` },
    { id: "c2", art: <ExplanationArt />, title: "See why it’s right", body: "Clear explanations in review, plus Tutor mode while you practise." },
    { id: "c3", art: <LimitArt value={n(CORE_DAILY_LIMITS.flashcard_decks)} unit="flashcard decks a day" label="Prep flashcards" />, title: "More recall practice", body: "Twice the free flashcard decks, with peer-save for useful questions." },
  ],
  exam: [
    { id: "e1", art: <LimitArt value={String(EXAM_MAX_QUESTIONS)} unit="questions per set" label="Mastery set size" />, title: "Full exam-length sets", body: `${n(EXAM_DAILY_LIMITS.mock_sets)} mock sets daily with up to ${EXAM_MAX_QUESTIONS} questions each.` },
    { id: "e2", art: <ExplanationArt />, title: "Exam-level by default", body: "Harder questions, Tutor mode and clear explanations on every attempt." },
    { id: "e3", art: <LimitArt value={n(EXAM_DAILY_LIMITS.flashcard_decks)} unit="flashcard decks a day" label="Mastery flashcards" />, title: "The most recall room", body: "The largest flashcard allowance for heavy revision weeks." },
  ],
};

export function PlanSheet({ plan, onOpenChange, onContinue, audience = "public", price, priceNote }: {
  plan: LandingPlan | null;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  audience?: "public" | "account";
  price?: string;
  priceNote?: string;
}) {
  const info = plan ? LANDING_PLANS[plan] : null;
  return (
    <Sheet open={plan !== null} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="tf-plan-sheet flex flex-col">
        {info && plan ? (
          <>
            <SheetHeader className="shrink-0 text-left">
              <SheetTitle className="font-display">{info.name}</SheetTitle>
              <SheetDescription className="tabular-nums">
                <span className="text-base font-semibold text-foreground">{price ?? info.price}</span> · {priceNote ?? info.priceNote}
              </SheetDescription>
            </SheetHeader>
            <div className="-mx-1 mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1">
              <SwipeCarousel slides={SLIDES[plan]} key={plan} label={`What ${info.name} includes`} />
            </div>
            <div className="mt-4 border-t border-border pt-4 pb-[max(0px,env(safe-area-inset-bottom))]">
              <Button size="lg" className="h-12 w-full rounded-xl" onClick={onContinue}>Continue with {info.name}</Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">{audience === "public" ? "You’ll create your account first. No payment is taken here." : plan === "free" ? "Free needs no payment. Your current plan is unchanged." : "Review the price and payment terms next. Nothing is charged here."}</p>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
