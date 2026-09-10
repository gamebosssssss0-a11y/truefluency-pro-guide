/**
 * Chatbot tab — UI ONLY. Nothing here is wired to a model, a backend
 * endpoint, or RAG. Sending a message shows the student's bubble plus an
 * in-thread "not sent" line; it never produces a fake AI reply and never
 * calls consumeQuota or any network fetch beyond the entitlement read the
 * app already performs on Home (useEntitlement).
 */
import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { useEntitlement } from "@/hooks/use-entitlement";
import { HeaderLogo } from "@/components/brand";

type Message = { id: number; from: "student" | "notice"; text: string };

export function ChatbotScreen() {
  const { profile, activeCourseCode } = useProfile();
  const { access } = useEntitlement();

  // Active course only: prefer the course the student was last looking at,
  // fall back to the first enrolled course. No switcher.
  const courseCode =
    activeCourseCode ??
    profile.courses[0]?.code ??
    "your course";

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const nextId = useRef(1);

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
        text: "Chat connects when study chat is live. This message was not sent.",
      },
    ]);
  };

  // Cap line: full access → label; free → n of 10 today; access null → hide.
  const capLine = (() => {
    if (!access) return null; // never crash, never show a wrong count
    if (access.fullAccess) return "Full access";
    const used = access.usageToday.chatbot_messages ?? 0;
    const limit = access.dailyLimits.chatbot_messages ?? 10;
    return `${used} of ${limit} messages today`;
  })();

  const examplePrompt = `What does ${courseCode} say about the main exam topics?`;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-24 pt-6 md:pb-8">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <div>
            <h1 className="font-display text-xl font-semibold leading-tight text-foreground">
              Chatbot · {courseCode}
            </h1>
            <p className="text-xs text-muted-foreground">
              Answers use this upload only. Not the open web.
            </p>
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl">
          {messages.length === 0 ? (
            <div className="mt-10 text-center">
              <p className="text-sm text-muted-foreground">
                Ask something in {courseCode} from your notes.
              </p>
              <button
                type="button"
                onClick={() => setDraft(examplePrompt)}
                className="mt-3 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-accent/50"
              >
                {examplePrompt}
              </button>
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
                <p
                  key={m.id}
                  className="mx-auto max-w-[90%] text-center text-[11px] italic text-muted-foreground"
                >
                  {m.text}
                </p>
              ),
            )
          )}
        </div>

        {/* Composer */}
        <div className="mt-4">
          {capLine ? (
            <p className="mb-2 text-center text-[11px] text-muted-foreground">{capLine}</p>
          ) : null}
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={`Ask about ${courseCode}…`}
              className="h-12 flex-1 rounded-2xl border border-border bg-card px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
            />
            <button
              type="button"
              onClick={send}
              aria-label="Send"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground transition hover:bg-accent/90"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
