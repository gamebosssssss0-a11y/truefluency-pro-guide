import { useMemo, useState } from "react";
import { useProfile } from "@/lib/profile-store";
import { HeaderLogo } from "@/components/brand";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ChevronRight, LifeBuoy } from "lucide-react";
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

type FaqGroup = { label: string; matches: (question: string) => boolean };

const ACCOUNT_TERMS = ["pay", "plan", "upgrade", "price", "₦"];
const STUDY_TERMS = ["mock", "flash", "chat", "file", "pdf", "upload"];

const matches = (question: string): boolean => {
  const normalized = question.toLocaleLowerCase();
  return !ACCOUNT_TERMS.some((word) => normalized.includes(word)) &&
    !STUDY_TERMS.some((word) => normalized.includes(word));
};

const FAQ_GROUPS: FaqGroup[] = [
  {
    label: "Account and payment",
    matches: (question: string): boolean =>
      ACCOUNT_TERMS.some((word) => question.toLocaleLowerCase().includes(word)),
  },
  {
    label: "Study tools",
    matches: (question: string): boolean =>
      STUDY_TERMS.some((word) => question.toLocaleLowerCase().includes(word)),
  },
  {
    label: "Everything else",
    matches,
  },
];

export function SupportScreen() {
  const { navigate } = useProfile();
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredFaqs = useMemo(
    () => normalizedSearch
      ? FAQS.filter((faq) =>
          faq.q.toLocaleLowerCase().includes(normalizedSearch) ||
          faq.a.toLocaleLowerCase().includes(normalizedSearch),
        )
      : FAQS,
    [normalizedSearch],
  );
  const filteredIssues = useMemo(
    () => normalizedSearch
      ? SUPPORT_ISSUES.filter((issue) =>
          issue.text.toLocaleLowerCase().includes(normalizedSearch) ||
          issue.area.toLocaleLowerCase().includes(normalizedSearch),
        )
      : SUPPORT_ISSUES,
    [normalizedSearch],
  );
  const faqSections = FAQ_GROUPS.map((group) => ({
    label: group.label,
    faqs: filteredFaqs.filter((faq) => group.matches(faq.q)),
  })).filter((group) => group.faqs.length > 0);
  const issueAreas = [...new Set(filteredIssues.map((issue) => issue.area))];
  const noMatches = normalizedSearch.length > 0 && filteredFaqs.length === 0 && filteredIssues.length === 0;

  return (
    <div className="study-utility-page study-page-blend min-h-screen">
      <div className="mx-auto max-w-md px-5 pb-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <button
            type="button"
            onClick={() => navigate("account")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Account
          </button>
        </div>

        <div className="surface-icon-well grid h-12 w-12 place-items-center rounded-2xl">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">HELP</p>
        <h1 className="font-display text-3xl font-semibold text-foreground">How can we help?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search answers or choose an issue to message us on WhatsApp.
        </p>

        <Input
          className="mt-5"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search questions or issues"
          aria-label="Search questions or issues"
        />

        {noMatches ? (
          <p className="mt-5 text-sm text-muted-foreground">
            No matches. Try a different word or report an issue.
          </p>
        ) : (
          <>
            {faqSections.map((group) => (
              <section key={group.label} className="mt-6">
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h2>
                <div className="surface-key-card px-4">
                  <Accordion type="single" collapsible>
                    {group.faqs.map((faq) => {
                      const index = FAQS.indexOf(faq);
                      return (
                        <AccordionItem
                          key={faq.q}
                          value={`faq-${index}`}
                          className={faq === group.faqs[group.faqs.length - 1] ? "border-b-0" : ""}
                        >
                          <AccordionTrigger className="text-left text-sm font-semibold text-foreground">
                            {faq.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-xs leading-relaxed text-muted-foreground">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              </section>
            ))}

            {filteredIssues.length > 0 ? (
              <section className="mt-7">
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Report an issue
                </h2>
                {issueAreas.map((area) => (
                  <div key={area} className="mb-5">
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
                          className="surface-list-row flex items-center gap-3 p-4 text-sm text-foreground transition hover:border-accent/50"
                        >
                          <span className="min-w-0 flex-1">{issue.text}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
