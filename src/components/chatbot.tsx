/**
 * Chatbot tab — wired to the /chat backend endpoint (chat.py on Render).
 * Sends the student's message and shows the real AI reply. Each course chip
 * opens its own persistent, account-tied thread.
 * Cached messages paint immediately while the selected course revalidates.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Camera, Image as ImageIcon, Paperclip, Send, Volume2, VolumeX, X, Copy, Share2 } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { useEntitlement } from "@/hooks/use-entitlement";
import { HeaderLogo } from "@/components/brand";
import { LogoMark } from "@/components/logo-mark";
import { RichText, plainText } from "@/components/rich-text";
import { getCourseThread, sendChatMessage, type ChatAction, type ChatMessage } from "@/lib/chat-api";
import { supabase } from "@/integrations/supabase/client";
import { isAppView } from "@/lib/profile-store";
import { uploadChatImage } from "@/lib/chat-image";
import { consumeFeatureQuota } from "@/lib/entitlements.functions";
import { canonicalCourseCode } from "@/lib/course-code";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Message = {
  id: number;
  from: "student" | "assistant" | "notice";
  text: string;
  /** Source course when shown in history. */
  courseTag?: string;
  /** Feature shortcuts the assistant suggested under this reply. */
  actions?: ChatAction[];
  /** Local preview of a photo the student just sent (this session only). */
  imageUrl?: string;
  createdAt?: string;
};

/** Starter prompts per mode — what each tab actually does when you tap it. */
const STARTERS: Record<string, string[]> = {
  Explain: [
    "Explain the main ideas in my notes",
    "What should I focus on this week?",
    "Explain my weakest topic simply",
  ],
  "Quiz me": [
    "Quiz me on my weakest topic",
    "Test me on the most likely exam topics",
    "Ask me 1 question from my notes",
  ],
  "Work a problem": [
    "Give me a practice problem and guide me through it",
    "Walk me through a worked example from my notes",
    "Help me solve this step by step",
  ],
};

/* The thread is cached per-tab (sessionStorage, keyed by user + scope) purely
 * as a fallback for when the server can't be reached; the server is always the
 * source of truth when it answers. */
async function cacheKey(scope: string): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    return uid ? `tf-chat-v1:${uid}:${scope}` : null;
  } catch {
    return null;
  }
}

/** Sent to the backend as-is; chat.py validates against MODE_INSTRUCTIONS. */
const MODES = ["Explain", "Quiz me", "Work a problem"] as const;
type Mode = (typeof MODES)[number];

function displayCode(code: string) {
  return canonicalCourseCode(code);
}

function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function ChatbotScreen() {
  const { profile, activeCourseCode, navigate } = useProfile();
  const { access } = useEntitlement();

  const defaultCourse = profile.courses.some((course) => canonicalCourseCode(course.code) === canonicalCourseCode(activeCourseCode))
    ? canonicalCourseCode(activeCourseCode!)
    : canonicalCourseCode(profile.courses[0]?.code ?? "");
  const [selected, setSelected] = useState<string>(defaultCourse);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const threadCache = useRef(new Map<string, Message[]>());
  const clearedThreads = useRef(new Set<string>());
  const historyLoaded = useRef(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const imageUrls = useRef(new Set<string>());
  const [historyRows, setHistoryRows] = useState<{ course: string; date: string; title: string; messages: ChatMessage[] }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [mode, setMode] = useState<Mode>("Explain");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const nextId = useRef(1);
  const loadToken = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const courseOptions = profile.courses
    .map((course) => canonicalCourseCode(course.code))
    .filter((code, index, all) => all.indexOf(code) === index);

  const toUiMessages = (items: ChatMessage[]): Message[] => items.map((message) => ({
    id: nextId.current++,
    from: message.role === "user" ? "student" : "assistant",
    text: message.content,
    createdAt: message.created_at,
  }));

  const persistCache = (course: string, thread: Message[]) => {
    threadCache.current.set(canonicalCourseCode(course), thread);
    void cacheKey(canonicalCourseCode(course)).then((key) => {
      if (!key) return;
      try { sessionStorage.setItem(key, JSON.stringify(thread.slice(-60))); }
      catch { /* optional cache */ }
    });
  };

  const selectCourse = (course: string) => {
    const key = canonicalCourseCode(course);
    setSelected(key);
    setMessages(threadCache.current.get(key) ?? []);
    setDraft("");
    setPhotoFile(null);
    setPhotoName(null);
  };

  useEffect(() => {
    if (!selected) { setMessages([]); setIsLoadingThread(false); return; }
    let alive = true;
    const token = ++loadToken.current;
    const key = canonicalCourseCode(selected);
    const cached = threadCache.current.get(key);
    if (cached) setMessages(cached);
    setIsLoadingThread(!cached);
    if (clearedThreads.current.has(key)) {
      setIsLoadingThread(false);
      return () => { alive = false; };
    }
    void getCourseThread(key).then(({ messages: thread }) => {
      if (!alive || loadToken.current !== token) return;
      const painted = toUiMessages(thread);
      persistCache(key, painted);
      setMessages(painted);
    }).catch(async (error) => {
      if (!alive || loadToken.current !== token) return;
      if (!cached) {
        try {
          const storageKey = await cacheKey(key);
          const fallback = storageKey ? JSON.parse(sessionStorage.getItem(storageKey) || "[]") as Message[] : [];
          if (fallback.length && alive) {
            const restored = fallback.map((message) => ({
              ...message,
              id: nextId.current++,
              imageUrl: undefined,
            }));
            threadCache.current.set(key, restored);
            setMessages(restored);
          }
        } catch { /* unavailable cache */ }
      }
      toast.error(error instanceof Error ? error.message : "Couldn't load this conversation.");
    }).finally(() => {
      if (alive && loadToken.current === token) setIsLoadingThread(false);
    });
    return () => { alive = false; };
  }, [selected]);

  useEffect(() => {
    if (!historyOpen || historyLoaded.current) return;
    let alive = true;
    setHistoryError(null);
    setHistoryLoading(true);
    void Promise.all(courseOptions.map(async (course) => {
      const raw = (await getCourseThread(course)).messages;
      if (!threadCache.current.has(course)) persistCache(course, toUiMessages(raw));
      const grouped = new Map<string, ChatMessage[]>();
      for (const message of raw) {
        const date = message.created_at
          ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(new Date(message.created_at))
          : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(new Date());
        grouped.set(date, [...(grouped.get(date) ?? []), message]);
      }
      return [...grouped.entries()].map(([date, items]) => ({
        course,
        date,
        title: items.find((message) => message.role === "user")?.content ?? "Study chat",
        messages: items,
      }));
    })).then((rows) => {
      if (alive) {
        setHistoryRows(rows.flat());
        historyLoaded.current = true;
      }
    }).catch((error) => {
      if (alive) {
        const message = error instanceof Error ? error.message : "Couldn't load chat history.";
        setHistoryError(message);
        toast.error(message);
      }
    }).finally(() => {
      if (alive) setHistoryLoading(false);
    });
    return () => { alive = false; };
  }, [historyOpen, profile.courses]);

  useEffect(() => {
    const currentUrls = new Set(messages.flatMap((message) => message.imageUrl ? [message.imageUrl] : []));
    for (const url of imageUrls.current) {
      if (!currentUrls.has(url)) {
        URL.revokeObjectURL(url);
        imageUrls.current.delete(url);
      }
    }
    for (const url of currentUrls) imageUrls.current.add(url);
  }, [messages]);

  useEffect(() => () => {
    for (const url of imageUrls.current) URL.revokeObjectURL(url);
    imageUrls.current.clear();
  }, []);

  useEffect(() => {
    if (!speechSupported()) { setSpeechAvailable(false); return; }
    const synth = window.speechSynthesis;
    const refresh = () => setSpeechAvailable(synth.getVoices().length > 0);
    refresh();
    synth.addEventListener("voiceschanged", refresh);
    return () => synth.removeEventListener("voiceschanged", refresh);
  }, []);

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

  const send = async (override?: string) => {
    const text = (override ?? draft).trim();
    if (!selected || (!text && !photoFile)) return;
    if (isSending || isUploadingPhoto) return;

    if (!text && photoFile) {
      setPhotoFile(null);
      setPhotoName(null);
      notice("Photo questions are coming later|Add a text question for now. Your photo was not uploaded.");
      return;
    }

    // Free students out of replies: no POST, no quota spend.
    if (chatCapReached) {
      notice(`Out of replies today|You've used ${messagesUsed} of ${messageLimit} replies today.`);
      return;
    }

    const fileToSend = photoFile;
    const previewUrl = fileToSend ? URL.createObjectURL(fileToSend) : undefined;
    setDraft("");
    setPhotoFile(null);
    setPhotoName(null);
    setMessages((cur) => {
      const next = [...cur, {
        id: nextId.current++,
        from: "student" as const,
        text,
        createdAt: new Date().toISOString(),
        imageUrl: previewUrl,
      }];
      persistCache(selected, next);
      return next;
    });
    setIsSending(true);

    try {
      let imagePath: string | null = null;
      if (fileToSend) {
        setIsUploadingPhoto(true);
        try {
          imagePath = await uploadChatImage(fileToSend);
        } finally {
          setIsUploadingPhoto(false);
        }
      }

      const modePrefix: Record<Mode, string> = {
        Explain: "Explain from my notes. ",
        "Quiz me": "Ask me one question from my notes, then wait for my answer. Do not give the answer yet. ",
        "Work a problem": "Work this as steps from my notes. ",
      };
      const { reply, moderated, actions, saved } = await sendChatMessage(
        modePrefix[mode] + text,
        selected,
        mode,
        imagePath,
      );
      setMessages((cur) => {
        const next = [...cur,
          {
            id: nextId.current++,
            from: moderated ? "notice" as const : "assistant" as const,
            text: moderated ? `Can't help with that|${reply}` : reply,
            actions: moderated ? undefined : actions,
            createdAt: new Date().toISOString(),
          },
          ...(saved ? [] : [{
            id: nextId.current++,
            from: "notice" as const,
            text: "Not saved|This reply couldn't be saved to your history, so it may be gone after a refresh.",
          }]),
        ];
        persistCache(selected, next);
        clearedThreads.current.delete(canonicalCourseCode(selected));
        return next;
      });
      if (!moderated) {
        try { await consumeFeatureQuota({ data: { feature: "chatbot_messages" } }); }
        catch (quotaError) { console.warn("[chat] quota update failed after successful reply", quotaError); }
      }
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
    const text = plainText(m.text).trim();
    const chunks: string[] = [];
    let pending = "";
    for (const sentence of text.match(/[^.!?]+[.!?]*|.+/g) ?? [text]) {
      let rest = sentence.trim();
      while (rest.length > 200) {
        const split = rest.lastIndexOf(" ", 200);
        const cut = split > 0 ? split : 200;
        chunks.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      if ((pending + " " + rest).trim().length <= 200) pending = (pending + " " + rest).trim();
      else { if (pending) chunks.push(pending); pending = rest; }
    }
    if (pending) chunks.push(pending);
    const speakChunks = (remaining: string[]) => {
      const next = () => {
        const chunk = remaining.shift();
        if (!chunk) { setSpeakingId(null); return; }
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.onend = next;
        utterance.onerror = () => { synth.cancel(); setSpeakingId(null); };
        synth.speak(utterance);
      };
      next();
    };
    setSpeakingId(m.id);
    if (synth.getVoices().length > 0) { setSpeechAvailable(true); speakChunks(chunks); return; }
    setSpeechAvailable(false);
    let started = false;
    const onVoices = () => {
      if (started || synth.getVoices().length === 0) return;
      started = true;
      clearTimeout(timer);
      synth.removeEventListener("voiceschanged", onVoices);
      setSpeechAvailable(true);
      speakChunks(chunks);
    };
    const timer = setTimeout(() => {
      if (started) return;
      started = true;
      synth.removeEventListener("voiceschanged", onVoices);
      setSpeakingId(null);
      setSpeechAvailable(false);
    }, 3000);
    synth.addEventListener("voiceschanged", onVoices);
  };

  // Cap chip: lives in the header. Hidden when access is null to avoid a wrong count.
  const capText = (() => {
    if (!access) return null;
    if (access.fullAccess) return "Full access";
    return `${messagesUsed} of ${messageLimit} replies today`;
  })();

  const headerLabel = displayCode(selected);
  const placeholderCourse = displayCode(selected);

  return (
    <div className="min-h-screen bg-[#F7F3EA] text-[#1B2A4A]">
      <div className="mx-auto flex min-h-screen max-w-[640px] flex-col px-4 pb-24 pt-4 sm:px-5 md:pb-8 md:pt-6">
        {/* Header card: white, cream border, 4px navy left edge */}
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-border border-l-4 border-l-navy bg-white p-3.5">
          <HeaderLogo className="shrink-0 rounded-lg bg-navy p-1.5 shadow-none hover:opacity-90" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-semibold leading-tight text-navy">
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
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-navy">Course</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => {
              const key = canonicalCourseCode(selected);
              loadToken.current += 1;
              setIsLoadingThread(false);
              const empty: Message[] = [];
              clearedThreads.current.add(key);
              persistCache(key, empty);
              setMessages(empty);
              setDraft("");
              setPhotoFile(null);
              setPhotoName(null);
            }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-navy">New chat</button>
            <button type="button" onClick={() => setHistoryOpen(true)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-navy">History</button>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {courseOptions.map((code) => {
            const active = canonicalCourseCode(selected) === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => selectCourse(code)}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition " +
                  (active
                    ? "border-amber bg-amber text-cream"
                    : "border-border bg-white text-navy hover:border-amber/60")
                }
              >
                {displayCode(code)}
              </button>
            );
          })}
        </div>
        {isLoadingThread ? (
          <p className="mb-2 px-1 text-xs text-muted-foreground">Loading this conversation…</p>
        ) : null}

        {/* Thread */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
          {!isLoadingThread && messages.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-4 text-center">
              <p className="font-display text-[22px] font-semibold text-navy">
                {selected ? `Ask about ${placeholderCourse}` : "Add a course first."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Ask from this course’s notes. Not the open web.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {(STARTERS[mode] ?? []).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    disabled={isSending || isLoadingThread}
                    className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-navy transition hover:border-amber/60 disabled:opacity-60"
                  >
                    {q}
                  </button>
                ))}
              </div>
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
                    <div className="rounded-2xl border border-border bg-[#F3E6C8] p-3.5 text-sm text-[#1B2A4A]">
                      {m.imageUrl ? (
                        <img
                          src={m.imageUrl}
                          alt="Your attached photo"
                          className="mb-2 max-h-48 rounded-xl object-cover"
                        />
                      ) : null}
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
                    <div className="rounded-2xl border border-border bg-white p-4 text-sm text-navy">
                      <RichText>{m.text}</RichText>
                      {m.actions && m.actions.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.actions.map((a) => (
                            <button
                              key={a.key}
                              type="button"
                              onClick={() => {
                                if (isAppView(a.view)) navigate(a.view, { courseCode: selected });
                              }}
                              className="rounded-full border border-amber/60 bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber transition hover:bg-amber/20"
                            >
                              {a.label} →
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-[11px]">
                        <button type="button" onClick={() => void navigator.clipboard.writeText(plainText(m.text)).then(() => toast.success("Reply copied."), () => toast.error("Couldn't copy this reply."))} className="inline-flex items-center gap-1 font-medium text-navy">
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </button>
                        {speechAvailable ? (
                          <button type="button" onClick={() => toggleSpeak(m)} aria-label={speakingId === m.id ? "Stop reading" : "Read aloud"} className="inline-flex items-center gap-1 font-medium text-navy">
                            {speakingId === m.id ? <><VolumeX className="h-3.5 w-3.5" /> Stop</> : <><Volume2 className="h-3.5 w-3.5" /> Read aloud</>}
                          </button>
                        ) : null}
                        <span className="text-muted-foreground">Token use connects when metering is live.</span>
                        <button type="button" onClick={() => setShareOpen(true)} className="inline-flex items-center gap-1 font-medium text-navy">
                          <Share2 className="h-3.5 w-3.5" /> Share
                        </button>
                      </div>
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
                <div className="mr-auto flex max-w-[90%] items-center gap-3 rounded-2xl border border-border bg-white p-3 text-sm text-muted-foreground">
                  <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F7F3EA]">
                    <LogoMark className="sonic-mark-in h-8 w-8 rounded-md" />
                    <span className="sonic-flare sonic-flare-ambient left-1/2 top-1/2" />
                    <span className="sonic-particle left-1/2 top-1/2 h-1 w-1 bg-amber" style={{ "--dx": "18px", "--dy": "-14px", "--po": 0.8, animationDuration: "1400ms", animationDelay: "250ms" } as CSSProperties} />
                    <span className="sonic-particle left-1/2 top-1/2 h-1 w-1 bg-navy" style={{ "--dx": "-18px", "--dy": "13px", "--po": 0.65, animationDuration: "1400ms", animationDelay: "500ms" } as CSSProperties} />
                  </span>
                  <span>Working from your notes…</span>
                </div>
              ) : null}
              {!speechAvailable && messages.some((message) => message.from === "assistant") ? (
                <p className="text-[11px] text-muted-foreground">Read aloud isn't available in this browser.</p>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Composer — sits clear of the bottom tab bar */}
        <div className="mt-4 mb-3">
          <div className="relative mb-2">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={modeMenuOpen}
              onClick={() => setModeMenuOpen((open) => !open)}
              className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-navy"
            >
              {mode} ▾
            </button>
            {modeMenuOpen ? (
              <div role="menu" className="absolute bottom-full left-0 z-20 mb-1 min-w-40 rounded-xl border border-border bg-white p-1 shadow-lg">
                {MODES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="menuitem"
                    onClick={() => { setMode(item); setModeMenuOpen(false); }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-navy hover:bg-sand"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {photoName ? (
            <div className="mb-2 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-navy">
              <span className="truncate">
                {isUploadingPhoto ? "Uploading… " : "Photo · "}
                {photoName}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoName(null);
                }}
                aria-label="Remove photo"
              >
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
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setPhotoFile(f);
                setPhotoName(f?.name ?? null);
              }}
            />
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setPhotoFile(f);
                setPhotoName(f?.name ?? null);
              }}
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
              disabled={!selected || isSending || isLoadingThread || isUploadingPhoto}
              placeholder={selected ? `Ask about ${placeholderCourse}…` : "Add a course first."}
              className="h-12 min-w-0 flex-1 rounded-full border border-border bg-chat-card px-4 text-sm text-chat-foreground outline-none placeholder:text-muted-foreground focus:border-amber/60 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={!selected || isSending || isLoadingThread || isUploadingPhoto}
              aria-label="Send"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-navy text-cream transition hover:bg-navy/90 disabled:opacity-60"
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
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-[#F7F3EA] text-navy">
          <SheetHeader className="text-left">
            <SheetTitle>Study Chat history</SheetTitle>
            <SheetDescription>Saved conversations grouped by course and WAT date.</SheetDescription>
          </SheetHeader>
          {historyLoading ? <p className="py-6 text-sm text-muted-foreground">Loading history…</p> : historyError ? (
            <p className="py-6 text-sm text-muted-foreground">{historyError}</p>
          ) : historyRows.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No saved conversations yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {historyRows.map((row, index) => (
                <button key={row.course + row.date + index} type="button" onClick={() => {
                  const rowMessages = toUiMessages(row.messages);
                  persistCache(row.course, rowMessages);
                  clearedThreads.current.delete(canonicalCourseCode(row.course));
                  setSelected(row.course);
                  setMessages(rowMessages);
                  setHistoryOpen(false);
                }} className="block w-full rounded-xl border border-border border-l-4 border-l-navy bg-white p-3 text-left">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{displayCode(row.course)} · {row.date}</div>
                  <div className="mt-1 truncate text-sm font-semibold">{row.title}</div>
                </button>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Sheet open={shareOpen} onOpenChange={setShareOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-chat-card text-chat-foreground">
          <SheetHeader className="text-left">
            <SheetTitle className="text-chat-foreground">Share reply</SheetTitle>
            <SheetDescription>Share this reply as a link. The rest of the chat stays private.</SheetDescription>
          </SheetHeader>
          <fieldset disabled className="mt-4 space-y-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="reply-visibility" value="public" disabled />
              Public
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="reply-visibility" value="private" disabled />
              Only me
            </label>
          </fieldset>
          <button type="button" disabled className="mt-4 w-full rounded-xl bg-navy py-3 text-sm font-semibold text-cream opacity-50">
            Copy link
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Reply links connect when sharing is live.</p>
          <button type="button" onClick={() => setShareOpen(false)} className="mt-3 w-full rounded-xl border border-border py-3 text-sm font-semibold">
            Cancel
          </button>
        </SheetContent>
      </Sheet>
      <Sheet open={attachOpen} onOpenChange={setAttachOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-chat-card text-chat-foreground">
          <SheetHeader className="text-left">
            <SheetTitle className="text-chat-foreground">Attach a photo</SheetTitle>
            <SheetDescription>Choose a photo to attach to your question.</SheetDescription>
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
