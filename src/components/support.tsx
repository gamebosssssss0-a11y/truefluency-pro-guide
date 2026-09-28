import { useState } from "react";
import { useProfile } from "@/lib/profile-store";
import { HeaderLogo } from "@/components/brand";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { PRICE_LINE, TRIAL_LINE } from "@/lib/pricing-copy";
import { SUPPORT_ISSUES } from "@/lib/support-issues";

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

function getIssueHref(issue: (typeof SUPPORT_ISSUES)[number]) {
  const message = `TrueFluency Pro support — #${issue.id} · ${issue.area}: ${issue.text}`;
  return `https://wa.me/${issue.phone}?text=${encodeURIComponent(message)}`;
}

export function SupportScreen() {
  const { navigate } = useProfile();
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredIssues = normalizedSearch
    ? SUPPORT_ISSUES.filter((issue) =>
        issue.text.toLowerCase().includes(normalizedSearch) ||
        issue.area.toLowerCase().includes(normalizedSearch),
      )
    : SUPPORT_ISSUES;
  const areas = [...new Set(filteredIssues.map((issue) => issue.area))];
  const somethingElseIssue = SUPPORT_ISSUES.find((issue) => issue.id === 100)!;

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
          Report an issue
        </h2>
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search for your issue"
          aria-label="Search for your issue"
        />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Tap the issue closest to yours — it opens WhatsApp with your issue already filled in. Just hit send.
        </p>

        {normalizedSearch && filteredIssues.length === 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">No matching issue. Try different words.</p>
            <a
              href={getIssueHref(somethingElseIssue)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center rounded-2xl border border-border bg-card p-4 text-sm text-foreground shadow-sm transition hover:border-accent/50"
            >
              Something else
            </a>
          </div>
        ) : (
          <div className="mt-4">
            {areas.map((area) => (
              <section key={area} className="mb-5">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {area}
                </h3>
                <div className="space-y-2">
                  {filteredIssues.filter((issue) => issue.area === area).map((issue) => (
                    <a
                      key={issue.id}
                      href={getIssueHref(issue)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center rounded-2xl border border-border bg-card p-4 text-sm text-foreground shadow-sm transition hover:border-accent/50"
                    >
                      {issue.text}
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
