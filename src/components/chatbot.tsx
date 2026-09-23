/**
 * Chatbot tab — wired to the /chat backend endpoint (chat.py on Render).
 * Sends the student's message, shows the real AI reply. Each course chip
 * (and "All my notes") is its own persistent, account-tied thread: opening
 * a scope loads that thread's real history from the backend instead of
 * starting from an empty in-memory array, so switching tabs or courses
 * never loses anything.
 */
import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, Paperclip, Send, Volume2, VolumeX, X } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { useEntitlement } from "@/hooks/use-entitlement";
import { HeaderLogo } from "@/components/brand";
import { RichText, plainText } from "@/components/rich-text";
import { ALL_SCOPE, getAllMergedThread, getCourseThread, sendChatMessage } from "@/lib/chat-api";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Message = {
  id: number;
  from: "student" | "assistant" | "notice";
  text: string;
  /** Set only on messages loaded into the merged "All my notes" feed. */
  courseTag?: string;
};

/** UI field only — the backend has no mode parameter, so nothing is invented here. */
const MODES = ["Explain", "Quiz me", "Work a problem"] as const;
type Mode = (typeof MODES)[number];

function displayCode(code: string) {
  return code.replace(/^C-/, "");
}

function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function ChatbotScreen() {
  const { profile, activeCourseCode } = useProfile();
  const { access } = useEntitlement();

  // Optional course scope. Default is "all my notes"; course chips just
  // change the context, they are never required to type a message.
  const [selected, setSelected] = useState<string>(activeCourseCode ?? ALL_SCOPE);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [mode, setMode] = useState<Mode>("Explain");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const nextId = useRef(1);
  const loadToken = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const courseOptions = [
    ALL_SCOPE,
    ...profile.courses.map((c) => c.code).filter((code, i, arr) => arr.indexOf(code) === i),
  ];

  // Load the real thread for whichever scope is selected — a course chip
  // gets its own persistent thread; "all" shows every course's messages
  // merged into one feed.
  useEffect(() => {
    const token = ++loadToken.current;
    setIsLoadingThread(true);
    const run = async () => {
      try {
        const loaded =
          selected === ALL_SCOPE
            ? (await getAllMergedThread()).map((m) => ({ ...m, courseTag: m.course_code }))
            : (await getCourseThread(selected)).messages;
        if (loadToken.current !== token) return; // a newer scope switch already superseded this
        setMessages(
          loaded.map((m) => ({
            id: nextId.current++,
            from: m.role === "user" ? "student" : "assistant",
            text: m.content,
            courseTag: (m as { courseTag?: string }).courseTag,
          })),
        );
      } catch (e) {
        if (loadToken.current !== token) return;
        setMessages([
          {
            id: nextId.current++,
            from: "notice",
            text: `Couldn't load this chat|${(e as Error)?.message || "Something went wrong. Try again."}`,
          },
        ]);
      } finally {
        if (loadToken.current === token) setIsLoadingThread(false);
      }
    };
    run();
  }, [selected]);

  // Stop any reading aloud when leaving the screen.
  useEffect(() => {
    return () => {
      if (speechSupported()) window.speechSynthesis.cancel();
    };
  }, []);

  const messagesUsed = access?.usageToday.chatbot_messages ?? 0;
  const messageLimit = access?.dailyLimits.chatbot_messages ?? 10;
  const chatCapReached = !!access && !access.fullAccess && messagesUsed >= messageLimit;

  const notice = (text: string) =>
    setMessages((cur) => [...cur, { id: nextId.current++, from: "notice", text }]);

  const send = async () => {
    const text = draft.trim();

    // A photo with no words never reaches the backend and never costs a reply.
    if (!text && photoName) {
      notice("Photo notes|Photo notes connect when chat OCR is live.");
      setPhotoName(null);
      return;
    }
    if (!text || isSending) return;

    // Free students out of replies: no POST, no quota spend.
    if (chatCapReached) {
      notice(`Out of replies today|You've used ${messagesUsed} of ${messageLimit} replies today.`);
      return;
    }

    setDraft("");
    setPhotoName(null);
    setMessages((cur) => [...cur, { id: nextId.current++, from: "student", text }]);
    setIsSending(true);

    try {
      const { reply } = await sendChatMessage(text, selected);
      setMessages((cur) => [...cur, { id: nextId.current++, from: "assistant", text: reply }]);
    } catch (e) {
      notice(
        `Couldn't send that|${(e as Error)?.message || "Something went wrong. Try again."}`,
      );
    } finally {
      setIsSending(false);
    }
  };

  const toggleSpeak = (m: Message) => {
    if (!speechSupported()) return;
    const synth = window.speechSynthesis;
    if (speakingId === m.id) {
      synth.cancel();
      setSpeakingId(null);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(plainText(m.text));
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(m.id);
    synth.speak(utterance);
  };

  // Cap chip: lives in the header. Hidden when access is null to avoid a wrong count.
  const capText = (() => {
    if (!access) return null;
    if (access.fullAccess) return "Full access";
    return `${messagesUsed} of ${messageLimit} replies today`;
  })();

  const headerLabel = selected === ALL_SCOPE ? "All my notes" : displayCode(selected);
  const placeholderCourse = selected === ALL_SCOPE ? "your notes" : displayCode(selected);

  return (
    <div className="min-h-screen bg-chat-page text-chat-foreground">
      <div className="mx-auto flex min-h-screen max-w-[640px] flex-col px-4 pb-24 pt-4 sm:px-5 md:pb-8 md:pt-6">
        {/* Header card: white, cream border, 4px navy left edge */}
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-border border-l-4 border-l-amber bg-chat-card p-3.5">
          <HeaderLogo className="shrink-0 rounded-lg bg-navy p-1.5 shadow-none hover:opacity-90" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-semibold leading-tight text-chat-foreground">
              Study Chat · {headerLabel}
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
        {isLoadingThread ? (
          <p className="mb-2 px-1 text-xs text-muted-foreground">Loading this conversation…</p>
        ) : null}

        {/* Optional course scope chips */}
        <p className="mb-1.5 text-sm font-semibold text-chat-foreground">Course</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {courseOptions.map((code) => {
            const isAll = code === ALL_SCOPE;
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
                    ? "border-amber bg-amber text-cream"
                    : "border-border bg-chat-card text-chat-foreground hover:border-amber/60")
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* How the student wants the reply framed. */}
        <p className="mb-1.5 text-sm font-semibold text-chat-foreground">Modes</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {MODES.map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition " +
                  (active
                    ? "border-amber bg-amber text-cream"
                    : "border-border bg-chat-card text-chat-foreground")
                }
              >
                {m}
              </button>
            );
          })}
        </div>

        {/* Thread */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
          {!isLoadingThread && messages.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-4 text-center">
              <p className="font-display text-[22px] font-semibold text-chat-foreground">
                Ask about {placeholderCourse}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">From your notes. Not the open web.</p>
            </div>
          ) : messages.length > 0 ? (
            <>
              {messages.map((m) =>
                m.from === "student" ? (
                  <div key={m.id} className="ml-auto max-w-[85%]">
                    {m.courseTag ? (
                      <p className="mb-1 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {displayCode(m.courseTag)}
                      </p>
                    ) : null}
                    <div className="rounded-2xl border border-border bg-sand p-3.5 text-sm text-navy">
                      {m.text}
                    </div>
                  </div>
                ) : m.from === "assistant" ? (
                  <div key={m.id} className="mr-auto max-w-[90%]">
                    {m.courseTag ? (
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {displayCode(m.courseTag)}
                      </p>
                    ) : null}
                    <div className="rounded-2xl border border-border bg-chat-card p-4 text-sm text-chat-foreground">
                      <RichText>{m.text}</RichText>
                      {speechSupported() ? (
                        <button
                          type="button"
                          onClick={() => toggleSpeak(m)}
                          aria-label={speakingId === m.id ? "Stop reading" : "Read aloud"}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber"
                        >
                          {speakingId === m.id ? (
                            <>
                              <VolumeX className="h-3.5 w-3.5" /> Stop
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3.5 w-3.5" /> Read aloud
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div
                    key={m.id}
                    className="mr-auto max-w-[90%] rounded-2xl border border-border bg-sand/40 p-4"
                  >
                    <p className="font-display text-base font-semibold text-navy">
                      {m.text.split("|")[0]}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{m.text.split("|")[1]}</p>
                  </div>
                ),
              )}
              {isSending ? (
                <div className="mr-auto max-w-[90%] rounded-2xl border border-border bg-sand/40 p-4 text-sm text-muted-foreground">
                  Thinking…
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Composer — sits clear of the bottom tab bar */}
        <div className="mt-4 mb-3">
          {photoName ? (
            <div className="mb-2 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-navy">
              <span className="truncate">Note · {photoName}</span>
              <button type="button" onClick={() => setPhotoName(null)} aria-label="Remove photo">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setAttachOpen(true)} aria-label="Attach photo" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border bg-chat-card text-chat-foreground">
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
            />
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
            />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={isSending || isLoadingThread}
              placeholder={`Ask about ${placeholderCourse}…`}
              className="h-12 min-w-0 flex-1 rounded-full border border-border bg-chat-card px-4 text-sm text-chat-foreground outline-none placeholder:text-muted-foreground focus:border-amber/60 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={send}
              disabled={isSending || isLoadingThread}
              aria-label="Send"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber text-cream transition hover:bg-amber/90 disabled:opacity-60"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          {chatCapReached ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              You've used {messagesUsed} of {messageLimit} replies today.
            </p>
          ) : null}
        </div>
      </div>
      <Sheet open={attachOpen} onOpenChange={setAttachOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-chat-card text-chat-foreground">
          <SheetHeader className="text-left">
            <SheetTitle className="text-chat-foreground">Attach a photo</SheetTitle>
            <SheetDescription>Photos attach when chat OCR is live.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 divide-y divide-border border-y border-border">
            <button type="button" className="flex h-14 w-full items-center gap-3 text-left font-semibold" onClick={() => { setAttachOpen(false); cameraInput.current?.click(); }}>
              <Camera className="h-5 w-5" /> Camera
            </button>
            <button type="button" className="flex h-14 w-full items-center gap-3 text-left font-semibold" onClick={() => { setAttachOpen(false); fileInput.current?.click(); }}>
              <ImageIcon className="h-5 w-5" /> Gallery
            </button>
          </div>
          <button type="button" onClick={() => setAttachOpen(false)} className="mt-4 w-full rounded-xl border border-border py-3 text-sm font-semibold">Close</button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
