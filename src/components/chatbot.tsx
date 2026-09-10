/**
 * Chatbot tab — UI ONLY. Nothing here is wired to a model, a backend
 * endpoint, or RAG. Sending a message shows the student's bubble plus an
 * in-thread "not sent" notice; it never produces a fake AI reply and never
 * calls consumeQuota or any network fetch beyond the entitlement read the
 * app already performs on Home (useEntitlement).
 */
import { useRef, useState } from "react";
import { FileText, Send } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { useEntitlement } from "@/hooks/use-entitlement";
import { HeaderLogo } from "@/components/brand";

type Message = { id: number; from: "student" | "notice"; text: string };

const EXAMPLE_PROMPTS = [
  "Explain this in simpler words",
  "What should I revise first",
  "Quiz me on one idea",
];

function displayCode(code: string) {
  return code.replace(/^C-/, "");
}

export function ChatbotScreen() {
  const { profile, activeCourseCode } = useProfile();
  const { access } = useEntitlement();

  // Optional course scope. Default is "all my notes"; course chips just
  // change the context, they are never required to type a message.
  const [selected, setSelected] = useState<"all" | string>(activeCourseCode ?? "all");

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const nextId = useRef(1);

  const courseOptions = [
    "all" as const,
    ...profile.courses.map((c) => c.code).filter((code, i, arr) => arr.indexOf(code) === i),
  ];

  const send = () => {
    const text = draft.trim();
    if (!text) return; // empty → do nothing
    setDraft("");
    setMessages((cur) => [
      ...cur,
      { id: nextId.current++, from: "student", text },
      {
        id: nextId.current++,
        from: "notice",
        text: "Chat isn't live yet|This message was not sent. Study chat connects later.",
      },
    ]);
  };

  // Cap chip: lives in the header. Hidden when access is null to avoid a wrong count.
  const capText = (() => {
    if (!access) return null;
    if (access.fullAccess) return "Full access";
    const used = access.usageToday.chatbot_messages ?? 0;
    const limit = access.dailyLimits.chatbot_messages ?? 10;
    return `${used} of ${limit} messages today`;
  })();

  const headerLabel = selected === "all" ? "All my notes" : displayCode(selected);
  const placeholderCourse = selected === "all" ? "your notes" : displayCode(selected);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-24 pt-6 md:pb-8">
        {/* Header card: white, cream border, 4px navy left edge */}
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border border-l-4 border-l-navy bg-card p-4">
          <HeaderLogo className="shrink-0 rounded-lg bg-navy p-1.5 shadow-none hover:opacity-90" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-semibold leading-tight text-navy">
              Chatbot · {headerLabel}
            </h1>
            <p className="text-xs text-muted-foreground">
              Answers use this upload only. Not the open web.
            </p>
          </div>
          {capText ? (
            <span className="shrink-0 rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-navy">
              {capText}
            </span>
          ) : null}
        </div>

        {/* Optional course scope chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          {courseOptions.map((code) => {
            const isAll = code === "all";
            const active = selected === code;
            const label = isAll ? "All my notes" : displayCode(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSelected(code)}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition " +
                  (active
                    ? "border-amber bg-sand text-amber"
                    : "border-border bg-card text-navy hover:border-navy/30")
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Thread */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="mt-10 flex flex-col items-center text-center">
              <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-sand">
                <FileText className="h-7 w-7 text-navy" />
              </div>
              <p className="mb-4 font-display text-lg font-semibold text-navy">
                Ask from your notes
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {EXAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setDraft(prompt)}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs font-medium text-navy transition " +
                      (idx === 0
                        ? "border-transparent bg-sand"
                        : "border-border bg-card hover:border-navy/30")
                    }
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) =>
              m.from === "student" ? (
                <div
                  key={m.id}
                  className="ml-auto max-w-[85%] rounded-2xl border border-border bg-card p-3.5 text-sm text-foreground"
                >
                  {m.text}
                </div>
              ) : (
                <div
                  key={m.id}
                  className="mr-auto max-w-[90%] rounded-2xl border border-border bg-sand/40 p-4"
                >
                  <p className="font-display text-base font-semibold text-navy">
                    {m.text.split("|")[0]}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {m.text.split("|")[1]}
                  </p>
                </div>
              ),
            )
          )}
        </div>

        {/* Composer */}
        <div className="mt-4 flex items-center gap-2 mb-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Ask about ${placeholderCourse}…`}
            className="h-12 flex-1 rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-amber/60"
          />
          <button
            type="button"
            onClick={send}
            aria-label="Send"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber text-cream transition hover:bg-amber/90"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
