import { useProfile } from "@/lib/profile-store";
import { HeaderLogo } from "@/components/brand";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Mail, MessageCircle, LifeBuoy } from "lucide-react";
import { PRICE_LINE, TRIAL_LINE } from "@/lib/pricing-copy";

/**
 * Founder contact details. Single source of truth, update here when they change.
 */
const CONTACTS = [
  {
    name: "TrueFluency support",
    role: "Bugs, payments, account issues",
    detail: "support@truefluency.app",
    href: "mailto:support@truefluency.app",
    icon: Mail,
  },
  {
    name: "Feedback and feature requests",
    role: "Tell us what to build next",
    detail: "hello@truefluency.app",
    href: "mailto:hello@truefluency.app",
    icon: MessageCircle,
  },
];

const FAQS = [
  {
    q: "How does TrueFluency predict exam topics?",
    a: "It reads the material you upload, past papers, slides and notes, then ranks the topics that come up most often and most recently. The prediction is based on your own course material, not on a general question bank.",
  },
  {
    q: "Are the predictions guaranteed to appear in my exam?",
    a: "No. TrueFluency is a study aid. It shows you where the weight has historically been so you can prioritise, but it is not a leak and it is not a substitute for lectures or your lecturer's guidance.",
  },
  {
    q: "What files can I upload?",
    a: "PDF, DOCX and PPTX files, plus plain text you paste in directly. If a scanned PDF has no selectable text, paste the text instead so the analysis has something to read.",
  },
  {
    q: "Is my data private?",
    a: "Your uploads and results are tied to your account and are only visible to you. You can delete any single file, or wipe everything from Account, Danger zone.",
  },
  {
    q: "Will I lose my data if I sign out or change phone?",
    a: "No. Once you are signed in, your profile, courses, uploads, attempts and streak are saved to your account and restored when you sign back in on any device.",
  },
  {
    q: "How is the CGPA calculated?",
    a: "On the University of Ibadan 5.00 scale. The calculator uses the real scores and credit units you enter to give a semester GPA and a cumulative CGPA; the goal setter works backwards from a target to the grades it needs.",
  },
  {
    q: "What does it cost?",
    // Price and trial wording come from pricing-copy.ts so they can never drift.
    a: `Every account starts with a ${TRIAL_LINE}. After that: ${PRICE_LINE} Full access covers unlimited analysis, longer mock sets and the WHY behind every answer.`,
  },
];

export function SupportScreen() {
  const { navigate } = useProfile();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <button
            onClick={() => navigate("account")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Account
          </button>
        </div>

        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answers to the usual questions, and a direct line to us if they don't cover it.
        </p>

        <h2 className="mb-2 mt-7 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Frequently asked
        </h2>
        <div className="rounded-2xl border border-border bg-card px-4 shadow-sm">
          <Accordion type="single" collapsible>
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`} className={i === FAQS.length - 1 ? "border-b-0" : ""}>
                <AccordionTrigger className="text-left text-sm font-semibold text-foreground">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <h2 className="mb-2 mt-7 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contact us
        </h2>
        <div className="space-y-2">
          {CONTACTS.map((c) => (
            <a
              key={c.detail}
              href={c.href}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-accent/50"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <c.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">{c.role}</div>
                <div className="mt-0.5 truncate text-[11px] font-medium text-accent">{c.detail}</div>
              </div>
            </a>
          ))}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          We read everything. Include your course code and what you were doing when something broke,
          it makes fixes much faster.
        </p>
      </div>
    </div>
  );
}
