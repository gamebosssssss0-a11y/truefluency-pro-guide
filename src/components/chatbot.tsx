/**
 * Chatbot tab — wired to the /chat backend endpoint (chat.py on Render).
 * Sends the student's message and shows the real AI reply. Each course chip
 * opens its own persistent, account-tied thread.
 * Cached messages paint immediately while the selected course revalidates.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Camera, ChevronDown, Image as ImageIcon, Plus, Send, Volume2, VolumeX, X, Copy, Share2, Trash2 } from "lucide-react";
import { useProfile } from "@/lib/profile-store";
import { useEntitlement } from "@/hooks/use-entitlement";
import { HeaderLogo } from "@/components/brand";
import { LogoMark } from "@/components/logo-mark";
import { RichText, plainText } from "@/components/rich-text";
import { getCourseThread, getCourseHistory, startNewChatThread, streamChatMessage, deleteChatConversation, resumeConversation, type ChatAction, type ChatMessage } from "@/lib/chat-api";
import { supabase } from "@/integrations/supabase/client";
import { isAppView } from "@/lib/profile-store";
import { uploadChatImage } from "@/lib/chat-image";
import { consumeFeatureQuota } from "@/lib/entitlements.functions";
import { canonicalCourseCode } from "@/lib/course-code";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Sent to the backend as-is; chat.py validates against MODE_INSTRUCTIONS. */
const MODES = ["Explain", "Quiz me", "Work a problem"] as const;
type Mode = (typeof MODES)[number];

export type PageAttachment = { courseCode: string; page: number; fileName: string; text: string };

function readPendingPageAttachment(): PageAttachment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("truefluency-chat-explain-page");
    if (!raw) return null;
    sessionStorage.removeItem("truefluency-chat-explain-page");
    const value = JSON.parse(raw) as Partial<PageAttachment>;
    if (typeof value.courseCode !== "string" || typeof value.fileName !== "string" ||
      typeof value.text !== "string" || typeof value.page !== "number") return null;
    return { courseCode: canonicalCourseCode(value.courseCode), page: value.page, fileName: value.fileName, text: value.text.slice(0, 4000) };
  } catch {
    return null;
  }
}

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
  sendError?: boolean;
  retryCourse?: string;
  retryMode?: Mode;
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

function displayCode(code: string) {
  return canonicalCourseCode(code);
}

function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function ChatbotScreen({ embedded = false, pageAttachment: suppliedPageAttachment, active = true }: { embedded?: boolean; pageAttachment?: PageAttachment | null; active?: boolean } = {}) {
  const { profile, activeCourseCode, navigate, view } = useProfile();
  const { access } = useEntitlement();
  const [attachedPage, setAttachedPage] = useState<PageAttachment | null>(() => suppliedPageAttachment ?? readPendingPageAttachment());

  const defaultCourse = profile.courses.some((course) => canonicalCourseCode(course.code) === canonicalCourseCode(activeCourseCode))
    ? canonicalCourseCode(activeCourseCode!)
    : canonicalCourseCode(profile.courses[0]?.code ?? "");
  const [selected, setSelected] = useState<string>(() => attachedPage?.courseCode ?? defaultCourse);
  // Bumped on every History-row click so the load effect below always
  // re-fetches, even for the course already on screen (setSelected alone is
  // a no-op there — same string in, same string out, React skips both the
  // re-render and the effect).
  const [reloadNonce, setReloadNonce] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const threadCache = useRef(new Map<string, Message[]>());
  // No auto-scroll existed anywhere in this screen before — messages just
  // appeared below the fold with no way to see them without scrolling
  // manually. Barely noticeable with instant replies; very noticeable now
  // that streaming grows a reply's height over several seconds while the
  // view doesn't follow it. Scrolls on every change to `messages` — new
  // array reference on every streamed chunk too (the update uses .map to
  // grow one message's text), so this re-fires smoothly as a reply streams in.
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);
  // SECURITY: every threadCache key is {uid}:{courseCode}, and the cache is
  // wiped outright on every auth change (see the effect below) — belt AND
  // suspenders. A course code alone is not unique to one student: shared
  // gen-ed codes like GST312/GES301 are common across completely unrelated
  // students, so a course-code-only cache key could show one student's
  // cached messages to a different student the moment this screen didn't
  // fully unmount between one session ending and another beginning on the
  // same device/tab. The explicit clear-on-auth-change below is the real
  // fix; the key scoping is the second layer in case a key is ever read
  // before that effect fires.
  const currentUid = useRef<string | null>(null);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUid = session?.user.id ?? null;
      if (nextUid !== currentUid.current) {
        threadCache.current.clear();
        setMessages([]);
      }
      currentUid.current = nextUid;
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const cacheMapKey = (course: string) => `${currentUid.current ?? "anon"}:${canonicalCourseCode(course)}`;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const imageUrls = useRef(new Set<string>());
  const [historyRows, setHistoryRows] = useState<{ course: string; date: string; title: string; conversationId: string; messages: ChatMessage[] }[]>([]);
  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [resumingConvId, setResumingConvId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => attachedPage ? `Explain page ${attachedPage.page} of ${attachedPage.fileName}.` : "");
  const [isSending, setIsSending] = useState(false);
  // Non-null once the first chunk of a reply has arrived — used only to hide
  // the "Thinking" indicator once there's a real, growing bubble to show
  // instead of it.
  const [streamingBubbleId, setStreamingBubbleId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("Explain");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const retryFiles = useRef(new Map<number, File>());
  const retryPageAttachments = useRef(new Map<number, PageAttachment>());
  const nextId = useRef(1);
  const loadToken = useRef(0);
  // SessionStorage-backed, not a plain useRef, and on purpose: this screen
  // can remount on a simple tab switch (navigating away and back), and a
  // plain useRef resets on every remount — which meant "start fresh" was
  // firing (and archiving a conversation you were actively having, plus
  // paying for an extra archive+fetch round trip) on every single return to
  // this tab, not once per real visit to the app. sessionStorage survives a
  // remount but still resets on a new browser tab/session, which is what
  // "fresh each time you open the app" actually means.
  function hasStartedFreshThisSession(): boolean {
    try {
      return sessionStorage.getItem(`tf-chat-fresh:${currentUid.current ?? "anon"}`) === "1";
    } catch {
      return false;
    }
  }
  function markStartedFreshThisSession(): void {
    try {
      sessionStorage.setItem(`tf-chat-fresh:${currentUid.current ?? "anon"}`, "1");
    } catch {
      /* sessionStorage unavailable — falls back to "always fresh", which is safe, just not optimal */
    }
  }
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const resizeComposer = () => {
    const composer = composerRef.current;
    if (!composer) return;
    const maxHeight = 160;
    composer.style.height = "auto";
    composer.style.height = `${Math.min(composer.scrollHeight, maxHeight)}px`;
    composer.style.overflowY = composer.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    resizeComposer();
  }, [draft]);

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
    threadCache.current.set(cacheMapKey(course), thread);
    void cacheKey(canonicalCourseCode(course)).then((key) => {
      if (!key) return;
      try { sessionStorage.setItem(key, JSON.stringify(thread.slice(-60))); }
      catch { /* optional cache */ }
    });
  };

  useEffect(() => {
    if (!suppliedPageAttachment) return;
    navigate(view, { courseCode: suppliedPageAttachment.courseCode });
    setAttachedPage(suppliedPageAttachment);
    setSelected(suppliedPageAttachment.courseCode);
    setDraft(`Explain page ${suppliedPageAttachment.page} of ${suppliedPageAttachment.fileName}.`);
  }, [suppliedPageAttachment]);

  const selectCourse = (course: string) => {
    const key = canonicalCourseCode(course);
    setSelected(key);
    navigate(view, { courseCode: key });
    setAttachedPage(null);
    setMessages(threadCache.current.get(cacheMapKey(key)) ?? []);
    setDraft("");
    setPhotoFile(null);
    setPhotoName(null);
  };

  useEffect(() => {
    if (!selected) { setMessages([]); setIsLoadingThread(false); return; }
    let alive = true;
    const token = ++loadToken.current;
    const key = canonicalCourseCode(selected);
    const isFirstLoadThisVisit = !hasStartedFreshThisSession();
    const cached = isFirstLoadThisVisit ? undefined : threadCache.current.get(cacheMapKey(key));
    if (cached) setMessages(cached);
    setIsLoadingThread(!cached);

    // Opening the chat screen should feel like opening a fresh conversation
    // — old content stays reachable in History, not sitting here waiting to
    // reappear. This fires exactly once per visit to this screen (not on
    // every course switch within the same visit, which would archive real
    // conversations just for tapping between course chips). archive_conversation
    // is a safe no-op when there's nothing active yet, so this never errors
    // out a normal load — best-effort, awaited so the fetch below sees the
    // fresh thread rather than racing it.
    const freshStart = hasStartedFreshThisSession()
      ? Promise.resolve()
      : startNewChatThread(key).catch(() => {
          /* best-effort — worst case this visit resumes the old thread, same as before */
        });
    markStartedFreshThisSession();

    void freshStart.then(() => getCourseThread(key)).then(({ messages: thread }) => {
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
            threadCache.current.set(cacheMapKey(key), restored);
            setMessages(restored);
          }
        } catch { /* unavailable cache */ }
      }
      toast.error(error instanceof Error ? error.message : "Couldn't load this conversation.");
    }).finally(() => {
      if (alive && loadToken.current === token) setIsLoadingThread(false);
    });
    return () => { alive = false; };
  }, [selected, reloadNonce]);

  useEffect(() => {
    // Re-fetches every time the sheet opens, on purpose — no "already loaded"
    // latch. One used to exist here (historyLoaded, a useRef set true after
    // the first successful load and never reset) which meant History showed
    // its first-ever snapshot for the rest of the session: every message
    // sent afterwards was genuinely saved server-side, just never visible
    // here, because this effect refused to run again.
    if (!historyOpen) return;
    let alive = true;
    setHistoryError(null);
    setHistoryLoading(true);
    void Promise.all(courseOptions.map(async (course) => {
      const raw = (await getCourseHistory(course)).messages;
      if (!threadCache.current.has(cacheMapKey(course))) persistCache(course, toUiMessages(raw));
      // Grouped by conversation_id, not date — a row is now exactly one real
      // conversation, so it can be opened or deleted precisely. Legacy
      // messages saved before conversation_id was exposed (shouldn't exist
      // going forward) fall back to a per-course bucket rather than crashing.
      const grouped = new Map<string, ChatMessage[]>();
      for (const message of raw) {
        const convKey = message.conversation_id ?? `legacy:${course}`;
        grouped.set(convKey, [...(grouped.get(convKey) ?? []), message]);
      }
      return [...grouped.entries()].map(([conversationId, items]) => {
        const first = items[0];
        const date = first?.created_at
          ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(new Date(first.created_at))
          : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(new Date());
        return {
          course,
          date,
          conversationId,
          title: items.find((message) => message.role === "user")?.content ?? "Study chat",
          messages: items,
        };
      });
    })).then((rows) => {
      if (alive) {
        setHistoryRows(rows.flat());
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

  const handleResumeConversation = async (conversationId: string) => {
    setResumingConvId(conversationId);
    try {
      const { courseCode } = await resumeConversation(conversationId);
      // Prevents the load effect's own "start fresh" step from immediately
      // archiving the conversation we just resumed — without this, opening
      // the live chat screen for the first time this session would
      // re-archive it right back the moment it loads, undoing the resume.
      markStartedFreshThisSession();
      threadCache.current.delete(cacheMapKey(courseCode)); // force a real fetch, not a stale cached view
      setSelected(courseCode);
      setReloadNonce((n) => n + 1);
      setExpandedConvId(null);
      setHistoryOpen(false);
      toast.success("Continuing that conversation.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't resume that conversation.");
    } finally {
      setResumingConvId(null);
    }
  };

  const handleDeleteConversation = async (conversationId: string, course: string) => {
    setDeletingConvId(conversationId);
    try {
      await deleteChatConversation(conversationId);
      setHistoryRows((cur) => cur.filter((row) => row.conversationId !== conversationId));
      if (expandedConvId === conversationId) setExpandedConvId(null);
      // If this was the course's currently-active conversation, the live
      // chat screen would otherwise keep showing now-deleted messages from
      // its own cache until the next real reload — force one.
      if (course === selected) {
        threadCache.current.delete(cacheMapKey(course));
        setReloadNonce((n) => n + 1);
      }
      toast.success("Conversation deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete that conversation.");
    } finally {
      setDeletingConvId(null);
    }
  };

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

  // Root tabs stay mounted once visited (index.tsx only hides them), so the
  // unmount cleanup above never runs on a tab switch — without this, a reply
  // kept being read aloud after the student moved to another tab.
  useEffect(() => {
    if (!active && speechSupported()) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    }
  }, [active]);

  const messagesUsed = access?.usageToday.chatbot_messages ?? 0;
  const messageLimit = access?.dailyLimits.chatbot_messages ?? 10;
  const chatCapReached = !!access && !access.fullAccess && messagesUsed >= messageLimit;

  const notice = (text: string) =>
    setMessages((cur) => [...cur, { id: nextId.current++, from: "notice", text }]);

  const send = async (
    override?: string,
    retry?: { messageId: number; course: string; mode: Mode },
  ) => {
    const text = (override ?? draft).trim();
    const course = retry?.course ?? selected;
    const sendMode = retry?.mode ?? mode;
    const fileToSend = retry ? retryFiles.current.get(retry.messageId) ?? null : photoFile;
    const pageToSend = retry ? retryPageAttachments.current.get(retry.messageId) ?? null : attachedPage;
    if (!course || (!text && !fileToSend)) return;
    if (isSending || isUploadingPhoto) return;

    if (!text && fileToSend) {
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

    const previewUrl = fileToSend ? URL.createObjectURL(fileToSend) : undefined;
    const messageId = retry?.messageId ?? nextId.current++;
    if (retry) {
      setMessages((cur) => cur.map((message) => message.id === messageId
        ? { ...message, sendError: undefined }
        : message));
    } else {
      setMessages((cur) => {
        const next = [...cur, {
          id: messageId,
          from: "student" as const,
          text,
          createdAt: new Date().toISOString(),
          imageUrl: previewUrl,
        }];
        persistCache(course, next);
        return next;
      });
    }
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

      // No per-mode prefix on the message any more: the backend already
      // applies each mode's instructions (chat.py MODE_INSTRUCTIONS). The old
      // "Ask me one question ... Do not give the answer yet" prefix was glued
      // to EVERY Quiz-mode message — including the student's answers — so the
      // bot asked a fresh question instead of marking the answer.
      // The attached page travels in its own field: inside the message it
      // pushed most real pages past the 2,000-character limit ("Couldn't send.").
      const pageContext = pageToSend
        ? `Attached PDF page ${pageToSend.page} from ${pageToSend.fileName}:\n${pageToSend.text.slice(0, 4000)}`
        : null;

      // Streams in as the model replies, rather than popping the whole
      // answer in at once — see chat.py's stream_chat_reply. A live bubble
      // is created on the FIRST chunk (replacing the "Thinking" indicator,
      // which only shows while no assistant message exists yet for this
      // turn) and grown in place as more text arrives.
      //
      // The bubble id is claimed HERE, outside the setMessages updater, and
      // both updaters below are pure. It used to be claimed inside the
      // updater (`streamId = nextId.current++` mid-updater), which broke under
      // React StrictMode — on by default in TanStack Start's client entry —
      // because StrictMode runs every updater twice and keeps only the second
      // result: the first (discarded) run claimed the id and added the
      // bubble, the second (kept) run saw the id already claimed and took the
      // "grow existing bubble" branch on a list that never had it. Every
      // chunk then grew a bubble that didn't exist, so the reply streamed in
      // successfully from the backend and never appeared on screen.
      let streamId: number | null = null;
      const { reply, moderated, actions, saved } = await streamChatMessage(
        text,
        course,
        sendMode,
        imagePath,
        (delta) => {
          if (streamId === null) {
            const id = nextId.current++;
            const createdAt = new Date().toISOString();
            streamId = id;
            setStreamingBubbleId(id);
            setMessages((cur) => [...cur, {
              id,
              from: "assistant" as const,
              text: delta,
              createdAt,
            }]);
            return;
          }
          const id = streamId;
          setMessages((cur) => cur.map((msg) => (msg.id === id ? { ...msg, text: msg.text + delta } : msg)));
        },
        pageContext,
      );

      // One corrective pass once the full reply is known: the moderation
      // short-circuit path (blocked message, image rejected) isn't streamed
      // at all — streamChatMessage's onDelta fires once with the whole
      // canned reply, so the bubble above was created as a plain assistant
      // message and needs restyling into a notice here, same as the old
      // non-streaming code did up front.
      setMessages((cur) => {
        const finalized = streamId === null
          ? cur
          : cur.map((msg) => (msg.id === streamId
            ? {
              ...msg,
              from: moderated ? ("notice" as const) : ("assistant" as const),
              text: moderated ? `Can't help with that|${reply}` : reply,
              actions: moderated ? undefined : actions,
            }
            : msg));
        const next = saved ? finalized : [...finalized, {
          id: nextId.current++,
          from: "notice" as const,
          text: "Not saved|This reply couldn't be saved to your history, so it may be gone after a refresh.",
        }];
        persistCache(course, next);
        return next;
      });
      if (draft.trim() === text) setDraft("");
      if (fileToSend && photoFile === fileToSend) {
        setPhotoFile(null);
        setPhotoName(null);
      }
      retryFiles.current.delete(messageId);
      retryPageAttachments.current.delete(messageId);
      if (pageToSend) setAttachedPage(null);
      if (!moderated) {
        try { await consumeFeatureQuota({ data: { feature: "chatbot_messages" } }); }
        catch (quotaError) { console.warn("[chat] quota update failed after successful reply", quotaError); }
      }
    } catch (error) {
      // Logged so a failed send is visible in DevTools → Console with the real
      // reason (backend error text, network failure) instead of only the
      // generic "Couldn't send." under the message.
      console.error("[chat] send failed", error);
      if (fileToSend) retryFiles.current.set(messageId, fileToSend);
      if (pageToSend) retryPageAttachments.current.set(messageId, pageToSend);
      setMessages((cur) => {
        const next = cur.map((message) => message.id === messageId
          ? { ...message, sendError: true, retryCourse: course, retryMode: sendMode }
          : message);
        persistCache(course, next);
        return next;
      });
    } finally {
      setIsSending(false);
      setStreamingBubbleId(null);
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
    <div className={`study-chat-screen min-h-0 overflow-hidden bg-background text-foreground ${embedded ? "study-chat-embedded h-full" : ""}`}>
      <div className={`mx-auto flex h-full min-h-0 flex-col pb-2 pt-3 ${embedded ? "w-full px-3" : "max-w-[640px] px-4 sm:px-5 md:pt-4"}`}>
        <div className="mb-3 flex shrink-0 items-center gap-3 rounded-2xl border border-border border-l-4 border-l-accent bg-card p-3.5">
          <HeaderLogo className="shrink-0 rounded-lg bg-navy p-1.5 shadow-none hover:opacity-90" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-semibold leading-tight text-foreground">
              Study Chat · {headerLabel}
            </h1>
            <p className="text-xs text-muted-foreground">
              Answers use this upload only. Not the open web.
            </p>
          </div>
          {capText ? (
            <span className="shrink-0 rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-foreground">
              {capText}
            </span>
          ) : null}
        </div>
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setCoursePickerOpen(true)}
            disabled={isSending || courseOptions.length === 0}
            aria-haspopup="dialog"
            className="inline-flex min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
          >
            <span className="text-muted-foreground">Course</span>
            <span className="truncate">{selected ? displayCode(selected) : "Choose a course"}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={isSending || isLoadingThread}
              onClick={async () => {
                const key = canonicalCourseCode(selected);
                const previous = messages;
                loadToken.current += 1; // supersede any in-flight load for this course
                setIsLoadingThread(false);
                setMessages([]); // optimistic — reverted below if the archive call fails
                setDraft("");
                setPhotoFile(null);
                setPhotoName(null);
                try {
                  await startNewChatThread(key);
                  persistCache(key, []); // now genuinely correct: the server thread is really empty
                } catch (error) {
                  setMessages(previous); // the old thread is still live server-side — don't hide it on a failed archive
                  toast.error(error instanceof Error ? error.message : "Couldn't start a new chat.");
                }
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-navy disabled:opacity-60"
            >
              New chat
            </button>
            <button type="button" onClick={() => setHistoryOpen(true)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-navy">History</button>
          </div>
        </div>
        {isLoadingThread ? (
          <p className="mb-2 px-1 text-xs text-muted-foreground">Loading this conversation…</p>
        ) : null}

        {/* Thread */}
        <div
          data-swipe-lock
          aria-label="Study Chat messages"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain py-2 touch-pan-y"
        >
          {!isLoadingThread && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 text-center">
              <p className="font-display text-[22px] font-semibold text-foreground">
                {selected ? `Ask about ${placeholderCourse}` : "Add a course first."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Ask from this course’s notes. Not the open web.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {(STARTERS[mode] ?? []).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setDraft(q)}
                    disabled={isSending || isLoadingThread}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground transition hover:border-accent/60 disabled:opacity-60"
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
                  <div key={m.id} className="ml-auto w-fit max-w-[85%]">
                    {m.courseTag ? (
                      <p className="mb-1 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {displayCode(m.courseTag)}
                      </p>
                    ) : null}
                    <div className="rounded-2xl border border-[#E4DCC8] bg-[#F3E6C8] p-3.5 text-sm text-[#1B2A4A]">
                      {m.imageUrl ? (
                        <img
                          src={m.imageUrl}
                          alt="Your attached photo"
                          className="mb-2 max-h-48 rounded-xl object-cover"
                        />
                      ) : null}
                      {m.text}
                    </div>
                    {m.sendError ? (
                      <div className="mt-1 flex items-center justify-end gap-3 text-xs">
                        <span className="font-medium text-destructive">Couldn't send.</span>
                        <button
                          type="button"
                          onClick={() => void send(m.text, {
                            messageId: m.id,
                            course: m.retryCourse ?? selected,
                            mode: m.retryMode ?? mode,
                          })}
                          className="font-semibold text-foreground underline underline-offset-2"
                        >Retry</button>
                        <button
                          type="button"
                          onClick={() => void navigator.clipboard.writeText(m.text).then(() => toast.success("Message copied."), () => toast.error("Couldn't copy this message."))}
                          className="font-semibold text-foreground underline underline-offset-2"
                        >Copy</button>
                      </div>
                    ) : null}
                  </div>
                ) : m.from === "assistant" ? (
                  <div key={m.id} className="w-full">
                    {m.courseTag ? (
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {displayCode(m.courseTag)}
                      </p>
                    ) : null}
                    <div className="text-base leading-6 text-foreground">
                      <RichText>{m.text}</RichText>
                    </div>
                    {m.actions && m.actions.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.actions.map((a) => (
                          <button
                            key={a.key}
                            type="button"
                            onClick={() => {
                              if (isAppView(a.view)) navigate(a.view, { courseCode: selected });
                            }}
                            className="rounded-full border border-accent/60 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
                          >
                            {a.label} →
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex w-full flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-[11px]">
                      <button type="button" onClick={() => void navigator.clipboard.writeText(plainText(m.text)).then(() => toast.success("Reply copied."), () => toast.error("Couldn't copy this reply."))} className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </button>
                      {speechAvailable ? (
                        <button type="button" onClick={() => toggleSpeak(m)} aria-label={speakingId === m.id ? "Stop reading" : "Read aloud"} className="inline-flex items-center gap-1 font-medium text-foreground">
                          {speakingId === m.id ? <><VolumeX className="h-3.5 w-3.5" /> Stop</> : <><Volume2 className="h-3.5 w-3.5" /> Read aloud</>}
                        </button>
                      ) : null}
                      <span className="text-muted-foreground">Token use connects when metering is live.</span>
                      <button type="button" onClick={() => setShareOpen(true)} className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Share2 className="h-3.5 w-3.5" /> Share
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={m.id}
                    className="w-full rounded-xl border border-border bg-card p-3 text-foreground"
                  >
                    <p className="font-display text-base font-semibold text-foreground">
                      {m.text.split("|")[0]}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{m.text.split("|")[1]}</p>
                  </div>
                ),
              )}
              {isSending && streamingBubbleId === null ? (
                <div className="flex w-full items-center gap-3 text-sm text-foreground">
                  <span className="relative grid h-8 w-8 shrink-0 place-items-center">
                    <LogoMark className="sonic-mark-loop h-8 w-8" />
                    <span className="sonic-flare-loop left-1/2 top-1/2" />
                    <span className="sonic-particle-loop left-1/2 top-1/2 h-1 w-1 bg-amber" style={{ "--dx": "0px", "--dy": "-20px", "--po": 0.9, animationDelay: "0ms" } as CSSProperties} />
                    <span className="sonic-particle-loop left-1/2 top-1/2 h-1 w-1 bg-navy" style={{ "--dx": "17px", "--dy": "-10px", "--po": 0.82, animationDelay: "65ms" } as CSSProperties} />
                    <span className="sonic-particle-loop left-1/2 top-1/2 h-1 w-1 bg-amber" style={{ "--dx": "17px", "--dy": "10px", "--po": 0.88, animationDelay: "130ms" } as CSSProperties} />
                    <span className="sonic-particle-loop left-1/2 top-1/2 h-1 w-1 bg-navy" style={{ "--dx": "0px", "--dy": "20px", "--po": 0.78, animationDelay: "195ms" } as CSSProperties} />
                    <span className="sonic-particle-loop left-1/2 top-1/2 h-1 w-1 bg-amber" style={{ "--dx": "-17px", "--dy": "10px", "--po": 0.9, animationDelay: "260ms" } as CSSProperties} />
                    <span className="sonic-particle-loop left-1/2 top-1/2 h-1 w-1 bg-navy" style={{ "--dx": "-17px", "--dy": "-10px", "--po": 0.82, animationDelay: "325ms" } as CSSProperties} />
                  </span>
                  <span className="thinking-shimmer font-medium text-navy">Thinking</span>
                </div>
              ) : null}
              {!speechAvailable && messages.some((message) => message.from === "assistant") ? (
                <p className="text-[11px] text-muted-foreground">Read aloud isn't available in this browser.</p>
              ) : null}
            </>
          ) : null}
          <div ref={scrollAnchorRef} />
        </div>

        {/* Composer — sits clear of the bottom tab bar */}
        <div className="mt-2 mb-2 shrink-0">
          {attachedPage ? (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground">
              <span className="min-w-0 flex-1 truncate">Page {attachedPage.page} · {attachedPage.fileName}</span>
              <button type="button" onClick={() => setAttachedPage(null)} className="shrink-0 underline underline-offset-2">Remove</button>
            </div>
          ) : null}
          <div className="relative mb-2">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={modeMenuOpen}
              onClick={() => setModeMenuOpen((open) => !open)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground"
            >
              {mode} ▾
            </button>
            {modeMenuOpen ? (
              <div role="menu" className="absolute bottom-full left-0 z-20 mb-1 min-w-40 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg">
                {MODES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="menuitem"
                    onClick={() => { setMode(item); setModeMenuOpen(false); }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-popover-foreground hover:bg-secondary"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {photoName ? (
            <div className="mb-2 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-card-foreground">
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
            <button type="button" onClick={() => setAttachOpen(true)} disabled={isSending || isUploadingPhoto} aria-label="Attach photo" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border bg-chat-card text-chat-foreground disabled:opacity-60">
              <Plus className="h-5 w-5" />
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
            <textarea
              ref={composerRef}
              rows={1}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                resizeComposer();
              }}
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={!selected || isSending || isLoadingThread || isUploadingPhoto}
              placeholder={selected ? `Ask about ${placeholderCourse}…` : "Add a course first."}
              className="max-h-40 min-h-12 min-w-0 flex-1 resize-none overflow-y-hidden rounded-2xl border border-border bg-chat-card px-4 py-3 text-sm leading-6 text-chat-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={!selected || isSending || isLoadingThread || isUploadingPhoto}
              aria-label="Send"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
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
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-popover text-popover-foreground">
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
              {historyRows.map((row) => {
                const isExpanded = expandedConvId === row.conversationId;
                return (
                  <div key={row.conversationId} className="rounded-xl border border-border border-l-4 border-l-accent bg-card text-card-foreground">
                    <div className="flex items-start gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => setExpandedConvId(isExpanded ? null : row.conversationId)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {displayCode(row.course)} · {row.date}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold">{row.title}</div>
                      </button>
                      <button
                        type="button"
                        aria-label="Delete this conversation"
                        disabled={deletingConvId === row.conversationId}
                        onClick={() => void handleDeleteConversation(row.conversationId, row.course)}
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {isExpanded ? (
                      <div className="space-y-2 border-t border-border p-3">
                        {row.messages.map((m, i) => (
                          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                            <div
                              className={
                                m.role === "user"
                                  ? "inline-block rounded-2xl bg-sand px-3 py-2 text-left text-xs text-navy"
                                  : "inline-block rounded-2xl border border-border bg-chat-card px-3 py-2 text-left text-xs text-chat-foreground"
                              }
                            >
                              <RichText>{m.content}</RichText>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          disabled={resumingConvId === row.conversationId}
                          onClick={() => void handleResumeConversation(row.conversationId)}
                          className="mt-2 w-full rounded-lg border border-accent/60 bg-accent/10 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20 disabled:opacity-60"
                        >
                          {resumingConvId === row.conversationId ? "Opening…" : "Continue this conversation →"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Sheet open={coursePickerOpen} onOpenChange={setCoursePickerOpen}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto rounded-t-2xl bg-popover text-popover-foreground">
          <SheetHeader className="text-left">
            <SheetTitle className="text-popover-foreground">Choose a course</SheetTitle>
            <SheetDescription>Study Chat uses the notes for the selected course.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {courseOptions.map((code) => {
              const active = canonicalCourseCode(selected) === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => { selectCourse(code); setCoursePickerOpen(false); }}
                  className={active
                    ? "flex w-full items-center justify-between rounded-xl bg-accent px-4 py-3 text-left text-sm font-semibold text-accent-foreground"
                    : "flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-card-foreground hover:bg-secondary"}
                >
                  {displayCode(code)}
                  {active ? <span className="text-xs">Active</span> : null}
                </button>
              );
            })}
          </div>
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
