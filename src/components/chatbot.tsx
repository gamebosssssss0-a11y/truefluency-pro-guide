/**
 * Chatbot tab — wired to the /chat backend endpoint (chat.py on Render).
 * Sends the student's message and shows the real AI reply. Each course chip
 * opens its own persistent, account-tied thread.
 * Cached messages paint immediately while the selected course revalidates.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BookOpen, CalendarDays, Calculator, Camera, Check, ChevronDown, CircleHelp, FileText, History as HistoryIcon, Image as ImageIcon, Lightbulb, ListChecks, Loader2, Mic, Plus, Send, Sparkles, Target, Volume2, VolumeX, X, Copy, Share2, Trash2, RotateCcw, Square } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { isChatAtBottom, tutorPrompt, tutorSnapshotMatches } from "@/lib/study-continuity";
import { clearChatMirrors, flushChatMirrors, readChatMirror, reconcileThread, writeChatMirror } from "@/lib/chat-cache";
import { useNavigation, useProfileData } from "@/lib/profile-store";
import { cn } from "@/lib/utils";
import { useEntitlement } from "@/hooks/use-entitlement";
import { LogoMark } from "@/components/logo-mark";
import { RichText, plainText } from "@/components/rich-text";
import { cachedCourseHistory, invalidateChatReads, getCourseThread, getCourseHistory, getChatUsage, startNewChatThread, streamChatMessage, deleteChatConversation, resumeConversation, type ChatAction, type ChatMessage, type ChatSource, type ChatUsage } from "@/lib/chat-api";
import { ChatUsageRing } from "@/components/chat-usage-ring";
import { LoadingStatus, SkeletonBlock } from "@/components/loading-state";
import { createOrUpdateChatShare, getChatShareState, revokeChatShare, type ChatShareVisibility } from "@/lib/chat-sharing.functions";
import { supabase } from "@/integrations/supabase/client";
import { isAppView } from "@/lib/profile-store";
import { preparePhoto, uploadChatImage } from "@/lib/chat-image";
import { warmBackend } from "@/lib/backend-api";
import { canonicalCourseCode } from "@/lib/course-code";
import { formatResetTime, nextChatReset } from "@/lib/entitlements";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

/** Sent to the backend as-is; chat.py validates against MODE_INSTRUCTIONS. */
const MODES = ["Explain", "Quiz me", "Work a problem"] as const;
type Mode = (typeof MODES)[number];
/** One plain line under each mode in the menu, so students know what each choice changes. */
const MODE_HINTS: Record<Mode, string> = {
  Explain: "Teach me this topic",
  "Quiz me": "Ask me one question at a time",
  "Work a problem": "Solve one together, step by step",
};

type DictationResultList = ArrayLike<ArrayLike<{ transcript: string }>>;
type DictationEvent = { resultIndex: number; results: DictationResultList };
type DictationRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: DictationEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type DictationConstructor = new () => DictationRecognition;

function createDictationRecognition(): DictationRecognition | null {
  if (typeof window === "undefined") return null;
  const host = window as unknown as {
    SpeechRecognition?: DictationConstructor;
    webkitSpeechRecognition?: DictationConstructor;
  };
  const Recognition = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  return Recognition ? new Recognition() : null;
}

export type PageAttachment = { courseCode: string; page: number; fileName: string; text: string; previewUrl?: string };

function readPendingPageAttachment(): PageAttachment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("truefluency-chat-explain-page");
    if (!raw) return null;
    sessionStorage.removeItem("truefluency-chat-explain-page");
    const value = JSON.parse(raw) as Partial<PageAttachment>;
    if (typeof value.courseCode !== "string" || typeof value.fileName !== "string" ||
      typeof value.text !== "string" || typeof value.page !== "number") return null;
    const previewUrl = typeof value.previewUrl === "string" && value.previewUrl.startsWith("data:image/") && value.previewUrl.length <= 300_000 ? value.previewUrl : undefined;
    return { courseCode: canonicalCourseCode(value.courseCode), page: value.page, fileName: value.fileName, text: value.text.slice(0, 4000), previewUrl };
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
  /** Why the last send failed (shown under "Couldn't send."). */
  sendErrorText?: string;
  retryCourse?: string;
  retryMode?: Mode;
  /** Stable across a retry so the service can safely de-duplicate the send. */
  requestId?: string;
  sources?: ChatSource[];
  grounded?: boolean;
};

// The app mounts a hidden ChatbotScreen to warm the backend before the user
// opens Study Chat. Share its successful snapshot with the visible instance.
const preloadedThreadCache = new Map<string, Message[]>();

/** Starter prompts per mode — titles are display copy; values remain the submitted drafts. */
const STARTERS: Record<Mode, { title: string; subtitle: string; value: string; icon: typeof BookOpen }[]> = {
  Explain: [
    { title: "Make my notes make sense", subtitle: "Explain the main ideas in my notes", value: "Explain the main ideas in my notes", icon: BookOpen },
    { title: "Plan my next study session", subtitle: "Find a useful focus for this week", value: "What should I focus on this week?", icon: CalendarDays },
    { title: "Untangle a tricky topic", subtitle: "Get a simpler explanation of what feels hard", value: "Explain my weakest topic simply", icon: Lightbulb },
  ],
  "Quiz me": [
    { title: "Targeted quiz", subtitle: "Test me on my weakest topic", value: "Quiz me on my weakest topic", icon: Target },
    { title: "Exam prediction", subtitle: "Test me on the most likely exam topics", value: "Test me on the most likely exam topics", icon: Sparkles },
    { title: "Quick check", subtitle: "Ask me 1 question from my notes", value: "Ask me 1 question from my notes", icon: CircleHelp },
  ],
  "Work a problem": [
    { title: "Practice problem", subtitle: "Guide me through a practice problem", value: "Give me a practice problem and guide me through it", icon: Calculator },
    { title: "Worked example", subtitle: "Walk through an example from my notes", value: "Walk me through a worked example from my notes", icon: FileText },
    { title: "Step-by-step help", subtitle: "Help me solve a problem step by step", value: "Help me solve this step by step", icon: ListChecks },
  ],
};

function displayCode(code: string) {
  return canonicalCourseCode(code);
}

/** Hide isolated page-number artifacts immediately before a heading or bullet. */
function cleanAssistantArtifacts(text: string) {
  const lines = text.split(/\r?\n/);
  const visible = lines.filter((line, index) => {
    if (!/^\s*\d{1,4}\s*$/.test(line)) return true;
    let next = index + 1;
    while (next < lines.length && !lines[next].trim()) next += 1;
    const following = lines[next]?.trim() ?? "";
    return !/^(?:#{1,6}\s|[-*•]\s|\d+[.)]\s)/.test(following);
  });
  return visible.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function ChatbotScreen({ embedded = false, pageAttachment: suppliedPageAttachment, active = true }: { embedded?: boolean; pageAttachment?: PageAttachment | null; active?: boolean } = {}) {
  const { profile, activeCourseCode, navigate, back, update, tutorSnapshot, setTutorSnapshot, recordStudyActivity } = useProfileData();
  const { view } = useNavigation();
  const { access, refresh: refreshAccess } = useEntitlement();
  // Opening the chat is the moment to wake a sleeping (free-plan) backend, so
  // it is already up by the time the first message is sent.
  useEffect(() => {
    warmBackend();
  }, []);
  const [attachedPage, setAttachedPage] = useState<PageAttachment | null>(() => suppliedPageAttachment ?? null);

  const defaultCourse = profile.courses.some((course) => canonicalCourseCode(course.code) === canonicalCourseCode(activeCourseCode))
    ? canonicalCourseCode(activeCourseCode ?? "")
    : canonicalCourseCode(profile.courses[0]?.code ?? "");
  const [selected, setSelected] = useState<string>(() => attachedPage?.courseCode ?? defaultCourse);
  // Bumped on every History-row click so the load effect below always
  // re-fetches, even for the course already on screen (setSelected alone is
  // a no-op there — same string in, same string out, React skips both the
  // re-render and the effect).
  const [reloadNonce, setReloadNonce] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(() => Boolean(attachedPage?.courseCode ?? defaultCourse));
  const [threadLoadTimedOut, setThreadLoadTimedOut] = useState(false);
  const threadCache = useRef(new Map<string, Message[]>());
  // No auto-scroll existed anywhere in this screen before — messages just
  // appeared below the fold with no way to see them without scrolling
  // manually. Barely noticeable with instant replies; very noticeable now
  // that streaming grows a reply's height over several seconds while the
  // view doesn't follow it. Scrolls on every change to `messages` — new
  // array reference on every streamed chunk too (the update uses .map to
  // grow one message's text), so this re-fires smoothly as a reply streams in.
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const thread = threadScrollRef.current;
    if (!thread) return;
    // Reset the chat's own scroll position when leaving a screen.
    // scrollIntoView() can also scroll the outer document, making the chat
    // appear to float or leaving the next screen positioned halfway down.
    // Entering is handled by the land-at-bottom effect below: a conversation
    // must open on its newest message, not the oldest.
    if (!active) {
      thread.scrollTop = 0;
      isNearBottomRef.current = false;
      setIsAtBottom(true);
    }
  }, [active, view]);

  // Follow a streaming reply only while the student is already near the bottom;
  // if they scrolled up to read, leave their position alone.
  const isNearBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const continueAtBottom = useRef(false);
  const snapshotIngested = useRef<string | null>(null);
  // Header hides while reading downward and returns after a deliberate upward scroll.
  const [headerVisible, setHeaderVisible] = useState(true);
  const headerVisibleRef = useRef(true);
  headerVisibleRef.current = headerVisible;
  const headerScrollAnchor = useRef(0);
  const handleThreadScroll = () => {
    const el = threadScrollRef.current;
    if (!el) return;
    const top = el.scrollTop;
    const delta = top - headerScrollAnchor.current;
    if (top < 60) { setHeaderVisible(true); headerScrollAnchor.current = top; }
    else if (delta > 40) { setHeaderVisible(false); headerScrollAnchor.current = top; }
    else if (delta < -160) { setHeaderVisible(true); headerScrollAnchor.current = top; }
    if (delta > 0 && !headerVisibleRef.current) headerScrollAnchor.current = top;
    const atBottom = isChatAtBottom(el.scrollHeight, el.scrollTop, el.clientHeight);
    setIsAtBottom(atBottom);
    isNearBottomRef.current = atBottom;
  };
  useEffect(() => {
    const thread = threadScrollRef.current;
    if (!thread || !isNearBottomRef.current) return;
    thread.scrollTop = thread.scrollHeight;
  }, [messages]);
  useEffect(() => {
    if (!active) return;
    const thread = threadScrollRef.current;
    if (!thread) return;
    const observer = new ResizeObserver(() => {
      if (isNearBottomRef.current) thread.scrollTop = thread.scrollHeight;
      setIsAtBottom(isChatAtBottom(thread.scrollHeight, thread.scrollTop, thread.clientHeight));
    });
    for (const child of Array.from(thread.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [active, messages]);
  useEffect(() => {
    if (!continueAtBottom.current || !active || isLoadingThread) return;
    continueAtBottom.current = false;
    const frame = requestAnimationFrame(() => {
      const thread = threadScrollRef.current;
      if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      isNearBottomRef.current = true;
      setIsAtBottom(true);
      composerRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [active, isLoadingThread, messages]);
  // Land on the newest message whenever a conversation finishes loading or the
  // screen opens with one already cached. Opening at the oldest message hid
  // fresh questions and streaming replies below the fold. The rAF runs after
  // the route's scroll reset, so this final position wins. The history-resume
  // path (continueAtBottom) scrolls smoothly itself — skip it here.
  useEffect(() => {
    if (!active || isLoadingThread || continueAtBottom.current) return;
    const thread = threadScrollRef.current;
    if (!thread) return;
    const frame = requestAnimationFrame(() => {
      thread.scrollTop = thread.scrollHeight;
      isNearBottomRef.current = true;
      setIsAtBottom(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [active, isLoadingThread]);
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
  const authEpoch = useRef(0);
  const [accountEpoch, setAccountEpoch] = useState(0);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUid = session?.user.id ?? null;
      if (nextUid !== currentUid.current) {
        if (currentUid.current) clearChatMirrors(currentUid.current);
        authEpoch.current += 1;
        loadToken.current += 1;
        streamAbortRef.current?.abort();
        streamAbortRef.current = null;
        stopRequestedRef.current = false;
        threadCache.current.clear();
        preloadedThreadCache.clear();
        setMessages([]);
        setIsSending(false);
        setStreamingBubbleId(null);
        setHistoryRows([]);
        setDraft("");
        setAttachedPage(null);
        setUsage(null);
        snapshotIngested.current = null;
        setAccountEpoch((value) => value + 1);
      }
      currentUid.current = nextUid;
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const cacheMapKey = (course: string) => `${currentUid.current ?? "anon"}:${canonicalCourseCode(course)}`;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareGenerating, setShareGenerating] = useState(false);
  const [shareRevoking, setShareRevoking] = useState(false);
  const [shareConversationId, setShareConversationId] = useState<string | null>(null);
  const [shareMessageCount, setShareMessageCount] = useState(0);
  const [shareVisibility, setShareVisibility] = useState<ChatShareVisibility>("private");
  const [savedShareVisibility, setSavedShareVisibility] = useState<ChatShareVisibility | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const imageUrls = useRef(new Set<string>());
  const [historyRows, setHistoryRows] = useState<{ course: string; date: string; title: string; conversationId: string; messages: ChatMessage[] }[]>([]);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ conversationId: string; course: string; title: string } | null>(null);
  const [resumingConvId, setResumingConvId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  useEffect(() => setHistoryOpen(view === "chat-history"), [view]);
  const [draft, setDraft] = useState(() => attachedPage ? `Explain page ${attachedPage.page} of ${attachedPage.fileName}.` : "");
  const [isSending, setIsSending] = useState(false);
  // Non-null once the first chunk of a reply has arrived — used only to hide
  // the "Thinking" indicator once there's a real, growing bubble to show
  // instead of it.
  const [streamingBubbleId, setStreamingBubbleId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("Explain");
  useEffect(() => {
    if (!active || !activeCourseCode) return;
    const course = canonicalCourseCode(activeCourseCode);
    if (profile.courses.some((entry) => canonicalCourseCode(entry.code) === course)) setSelected(course);
  }, [active, activeCourseCode]);
  const activeTutorSnapshot = tutorSnapshot && profile.inProgressTest?.isPaused && tutorSnapshotMatches(tutorSnapshot, currentUid.current, profile.inProgressTest) ? tutorSnapshot : null;
  useEffect(() => {
    if (!active || !activeTutorSnapshot || snapshotIngested.current === `${activeTutorSnapshot.sessionId}:${activeTutorSnapshot.question.id}`) return;
    snapshotIngested.current = `${activeTutorSnapshot.sessionId}:${activeTutorSnapshot.question.id}`;
    setSelected(canonicalCourseCode(activeTutorSnapshot.courseCode));
    setAttachedPage(null);
    setMode("Explain");
    setDraft(tutorPrompt(activeTutorSnapshot).slice(0, 2000));
  }, [active, activeTutorSnapshot]);

  useEffect(() => {
    if (suppliedPageAttachment) {
      setAttachedPage(suppliedPageAttachment);
      setSelected(canonicalCourseCode(suppliedPageAttachment.courseCode));
      setMode("Explain");
      setDraft(`Explain page ${suppliedPageAttachment.page} of ${suppliedPageAttachment.fileName}.`);
      return;
    }
    if (view !== "chatbot") return;
    const pendingPage = readPendingPageAttachment();
    if (!pendingPage) return;
    setAttachedPage(pendingPage);
    setSelected(pendingPage.courseCode);
    setMode("Explain");
    setDraft(`Explain page ${pendingPage.page} of ${pendingPage.fileName}.`);
  }, [view, suppliedPageAttachment]);

  useEffect(() => {
    if (view !== "chatbot") return;
    let raw: string | null = null;
    try { raw = sessionStorage.getItem("truefluency-verilo-pending-prompt"); } catch { return; }
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as { courseCode?: unknown; prompt?: unknown };
      if (typeof pending.courseCode !== "string" || typeof pending.prompt !== "string") {
        sessionStorage.removeItem("truefluency-verilo-pending-prompt");
        return;
      }
      if (canonicalCourseCode(pending.courseCode) !== canonicalCourseCode(selected)) return;
      sessionStorage.removeItem("truefluency-verilo-pending-prompt");
      if (!draft.trim()) {
        setDraft(pending.prompt.slice(0, 2_000));
        setMode("Explain");
      }
    } catch {
      try { sessionStorage.removeItem("truefluency-verilo-pending-prompt"); } catch { /* storage is optional */ }
    }
  }, [draft, selected, view]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const dictationRef = useRef<DictationRecognition | null>(null);
  const retryFiles = useRef(new Map<number, File>());
  const retryPageAttachments = useRef(new Map<number, PageAttachment>());
  const streamAbortRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);
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

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  const courseOptions = profile.courses
    .map((course) => canonicalCourseCode(course.code))
    .filter((code, index, all) => all.indexOf(code) === index);

  const toUiMessages = (items: ChatMessage[]): Message[] => items.map((message) => ({
    id: nextId.current++,
    from: message.role === "user" ? "student" : "assistant",
    text: message.content,
    createdAt: message.created_at,
    sources: message.sources,
    grounded: message.grounded,
  }));

  const persistCache = (course: string, thread: Message[]) => {
    const expectedUid = currentUid.current;
    const scope = canonicalCourseCode(course);
    threadCache.current.set(cacheMapKey(scope), thread);
    if (!expectedUid) return;
    if (currentUid.current !== expectedUid) return;
    // The bounded mirror never stores transient photos, bearer tokens or URLs.
    writeChatMirror(expectedUid, scope, thread.slice(-60).map(({ imageUrl: _imageUrl, ...message }) => message));
  };

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === "hidden") flushChatMirrors(); };
    window.addEventListener("pagehide", flushChatMirrors);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flushChatMirrors);
      document.removeEventListener("visibilitychange", onVisibility);
      flushChatMirrors();
    };
  }, []);

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
    if (active && (view === "chatbot" || view === "chat-history")) navigate(view, { courseCode: key });
    setAttachedPage(null);
    setMessages(threadCache.current.get(cacheMapKey(key)) ?? []);
    setDraft("");
    setPhotoFile(null);
    setPhotoName(null);
  };

  useEffect(() => {
    if (!selected) { setMessages([]); setIsLoadingThread(false); return; }
    let alive = true;
    const key = canonicalCourseCode(selected);
    const owner = currentUid.current;
    if (!owner) { setIsLoadingThread(false); return; }
    const expectedEpoch = authEpoch.current;
    const canPaint = () => alive && authEpoch.current === expectedEpoch && currentUid.current === owner;
    const memoryKey = cacheMapKey(key);
    const mirror = readChatMirror<Message[]>(owner, key);
    const cached = threadCache.current.get(memoryKey) ?? preloadedThreadCache.get(memoryKey) ??
      (Array.isArray(mirror) ? mirror.filter((message) => typeof message.id === "number" && typeof message.text === "string" && ["student", "assistant", "notice"].includes(message.from)) : undefined);
    if (cached) {
      nextId.current = Math.max(nextId.current, ...cached.map((message) => message.id + 1));
      setMessages(cached);
      threadCache.current.set(memoryKey, cached);
      setIsLoadingThread(false);
    }

    // Warm the API and prefetch the selected thread while the chatbot tab is
    // hidden. Do not archive/create a fresh thread until the student opens it.
    if (!active) {
      void warmBackend();
      void getCourseThread(key).then(({ messages: thread }) => {
        if (!canPaint()) return;
        const painted = toUiMessages(thread);
        persistCache(key, painted);
        preloadedThreadCache.set(memoryKey, painted);
      }).catch(() => {
        // Background prefetch is opportunistic; foreground loading handles errors.
      });
      return () => { alive = false; };
    }

    const token = ++loadToken.current;
    setThreadLoadTimedOut(false);
    const timeoutId = window.setTimeout(() => {
      if (alive && loadToken.current === token) {
        setThreadLoadTimedOut(true);
        setIsLoadingThread(false);
      }
    }, 10000);
    // Use the hidden-tab prefetch immediately. The foreground refresh below
    // still revalidates after the fresh-thread operation, but the student no
    // longer waits on a blank loading screen while that request completes.
    setIsLoadingThread(!cached);

    // Opening Study Chat is read-only. Do not archive/start a thread here:
    // that extra round trip was the main reason the loading screen was slower
    // than History. Archiving is explicit through New chat.
    void getCourseThread(key).then(({ messages: thread }) => {
      if (!canPaint() || loadToken.current !== token || streamAbortRef.current) return;
      setThreadLoadTimedOut(false);
      const painted = reconcileThread(threadCache.current.get(memoryKey) ?? [], toUiMessages(thread));
      persistCache(key, painted);
      preloadedThreadCache.set(memoryKey, painted);
      setMessages(painted);
    }).catch((error) => {
      if (!canPaint() || loadToken.current !== token) return;
      setThreadLoadTimedOut(true);
      toast.error(error instanceof Error ? error.message : "Couldn't load this conversation.");
    }).finally(() => {
      window.clearTimeout(timeoutId);
      if (alive && loadToken.current === token) setIsLoadingThread(false);
    });
    return () => { alive = false; window.clearTimeout(timeoutId); };
  }, [selected, reloadNonce, active, accountEpoch]);

  useEffect(() => {
    // Refresh whenever the history sheet opens. Render each course as soon as
    // it arrives instead of waiting for the slowest course's network request.
    if (!historyOpen) return;
    let alive = true;
    const epoch = authEpoch.current;
    const owner = currentUid.current;
    if (!owner) return;
    setHistoryError(null);
    setHistoryLoading(true);
    const historyTimeoutId = window.setTimeout(() => {
      if (alive) {
        setHistoryLoading(false);
        setHistoryError("History is taking too long to load. Please retry.");
      }
    }, 10000);

    const groupCourse = (course: string, raw: ChatMessage[]) => {
      const grouped = new Map<string, ChatMessage[]>();
      for (const message of raw) {
        const convKey = message.conversation_id ?? `legacy:${course}`;
        const group = grouped.get(convKey);
        if (group) group.push(message);
        else grouped.set(convKey, [message]);
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
          title: items.find((message) => message.role === "user")?.content ?? "Verilo",
          messages: items,
        };
      });
    };

    const cachedRows = courseOptions.flatMap((course) => {
      const snapshot = cachedCourseHistory(owner, course);
      return snapshot && Array.isArray(snapshot.messages) ? groupCourse(course, snapshot.messages) : [];
    });
    setHistoryRows(cachedRows);
    const loadCourse = async (course: string) => groupCourse(course, (await getCourseHistory(course)).messages);

    let failureCount = 0;
    const requests = courseOptions.map((course) =>
      loadCourse(course).then((rows) => {
        if (!alive || authEpoch.current !== epoch) return;
        setHistoryRows((current) => [
          ...current.filter((row) => row.course !== course),
          ...rows,
        ]);
      }).catch((error: unknown) => {
        failureCount += 1;
        if (alive && failureCount === courseOptions.length) {
          const message = error instanceof Error ? error.message : "Couldn't load chat history.";
          setHistoryError(message);
          toast.error(message);
        }
      })
    );

    void Promise.all(requests).then(() => {
      if (!alive) return;
      if (failureCount > 0 && failureCount < courseOptions.length) {
        toast.error("Some course histories couldn't load. The available conversations are shown.");
      }
    }).finally(() => {
      window.clearTimeout(historyTimeoutId);
      if (alive) setHistoryLoading(false);
    });

    return () => { alive = false; window.clearTimeout(historyTimeoutId); };
  }, [historyOpen, profile.courses, accountEpoch]);

  const handleResumeConversation = async (conversationId: string) => {
    if (resumingConvId) return;
    const owner = currentUid.current;
    const epoch = authEpoch.current;
    setResumingConvId(conversationId);
    try {
      const { courseCode } = await resumeConversation(conversationId);
      if (authEpoch.current !== epoch || currentUid.current !== owner) return;
      // Prevents the load effect's own "start fresh" step from immediately
      // archiving the conversation we just resumed — without this, opening
      // the live chat screen for the first time this session would
      // re-archive it right back the moment it loads, undoing the resume.
      markStartedFreshThisSession();
      invalidateChatReads(courseCode);
      const resumedRow = historyRows.find((row) => row.conversationId === conversationId);
      if (currentUid.current) clearChatMirrors(currentUid.current, canonicalCourseCode(courseCode));
      threadCache.current.delete(cacheMapKey(courseCode)); // force a real fetch, not a stale cached view
      preloadedThreadCache.delete(cacheMapKey(courseCode));
      if (resumedRow) {
        const resumedMessages = toUiMessages(resumedRow.messages);
        persistCache(courseCode, resumedMessages);
        setMessages(resumedMessages);
      }
      continueAtBottom.current = true;
      isNearBottomRef.current = true;
      setSelected(courseCode);
      setReloadNonce((n) => n + 1);
      setHistoryOpen(false);
      navigate("chatbot", { courseCode: canonicalCourseCode(courseCode), replace: true });
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
      invalidateChatReads(course);
      setHistoryRows((cur) => cur.filter((row) => row.conversationId !== conversationId));
      // If this was the course's currently-active conversation, the live
      // chat screen would otherwise keep showing now-deleted messages from
      // its own cache until the next real reload — force one.
      if (course === selected) {
        threadCache.current.delete(cacheMapKey(course));
        preloadedThreadCache.delete(cacheMapKey(course));
        if (currentUid.current) clearChatMirrors(currentUid.current, canonicalCourseCode(course));
        setMessages([]);
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
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
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

  // Allowance dates come from the server; no optimistic local resets.
  const [usage, setUsage] = useState<ChatUsage | null>(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    const refresh = () => { void getChatUsage().then((u) => { if (live) setUsage(u); }); };
    refresh();
    const untilReset = usage?.resets_at ? Date.parse(usage.resets_at) - Date.now() + 100 : 60_000;
    const timer = window.setTimeout(refresh, Math.min(60_000, Math.max(1000, untilReset)));
    const polling = window.setInterval(refresh, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { live = false; clearTimeout(timer); clearInterval(polling); document.removeEventListener("visibilitychange", onVisible); };
  }, [active, accountEpoch, usage?.resets_at]);
  const chatCapReached = !!usage && usage.remaining_tokens <= 0;

  const notice = (text: string) =>
    setMessages((cur) => [...cur, { id: nextId.current++, from: "notice", text }]);

  // A picked photo is checked and shrunk right away (not when Send is pressed): a file that cannot be used is explained at
  // once, and the upload that follows is a few hundred KB instead of a 10 MB camera original.
  const pickPhoto = async (picked: File | null) => {
    if (!picked) return;
    setIsPreparingPhoto(true);
    try {
      const ready = await preparePhoto(picked);
      setPhotoFile(ready);
      setPhotoName(ready.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't use that photo. Try another one.");
    } finally {
      setIsPreparingPhoto(false);
    }
  };

  const send = async (
    override?: string,
    retry?: { messageId: number; course: string; mode: Mode; requestId?: string },
  ) => {
    const text = (override ?? draft).trim();
    const course = retry?.course ?? selected;
    const sendMode = retry?.mode ?? mode;
    const fileToSend = retry ? retryFiles.current.get(retry.messageId) ?? null : photoFile;
    const pageToSend = retry ? retryPageAttachments.current.get(retry.messageId) ?? null : attachedPage;
    if (!course || (!text && !fileToSend)) return;
    if (isSending || streamAbortRef.current || isUploadingPhoto || isPreparingPhoto) return;
    const sendAuthEpoch = authEpoch.current;

    // A photo on its own is a complete message: the AI reads it and helps with what is on it.

    // Free students out of replies: no POST, no quota spend.
    if (chatCapReached) {
      notice(`Chat usage used up|It resets ${formatResetTime(usage?.resets_at ? new Date(usage.resets_at) : nextChatReset())}.`);
      return;
    }

    const requestId = retry?.requestId ?? crypto.randomUUID();
    const controller = new AbortController();
    streamAbortRef.current = controller;
    stopRequestedRef.current = false;

    const previewUrl = fileToSend ? URL.createObjectURL(fileToSend) : pageToSend?.previewUrl;
    const messageId = retry?.messageId ?? nextId.current++;
    // Sending means the student wants to see the reply: follow the thread to
    // the bottom even if they had scrolled up to read earlier messages.
    isNearBottomRef.current = true;
    if (retry) {
      setMessages((cur) => cur.map((message) => message.id === messageId
        ? { ...message, requestId, sendError: undefined, sendErrorText: undefined }
        : message));
    } else {
      setMessages((cur) => {
        const next = [...cur, {
          id: messageId,
          from: "student" as const,
          text,
          createdAt: new Date().toISOString(),
          imageUrl: previewUrl,
          requestId,
        }];
        persistCache(course, next);
        return next;
      });
    }
    setIsSending(true);
    // Shared with catch so partial assistant text can be removed after a stream failure.
    let streamId: number | null = null;
    // Create an optimistic assistant placeholder without waiting for the API.
    // Buffer streaming updates to one render per frame, not one per token.
    const placeholderId = nextId.current++;
    streamId = placeholderId;
    setMessages((cur) => [...cur, { id: placeholderId, from: "assistant", text: "", createdAt: new Date().toISOString() }]);
    let accumulated = "";
    let frame = 0;
    const paintDelta = () => {
      frame = 0;
      if (authEpoch.current !== sendAuthEpoch || streamId === null) return;
      const content = accumulated;
      const id = streamId;
      setStreamingBubbleId(id);
      setMessages((cur) => {
        const next = cur.map((msg) => msg.id === id ? { ...msg, text: content } : msg);
        persistCache(course, next);
        return next;
      });
    };

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
      const pageContext = activeTutorSnapshot && canonicalCourseCode(course) === canonicalCourseCode(activeTutorSnapshot.courseCode)
        ? `${tutorPrompt(activeTutorSnapshot)}\nSaved explanation: ${activeTutorSnapshot.question.explanation.slice(0, 4000)}`
        : pageToSend
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
      const { reply, moderated, actions, saved, usage: usageAfter, stopped, sources, grounded } = await streamChatMessage(
        text,
        course,
        sendMode,
        imagePath,
        (delta) => {
          if (authEpoch.current !== sendAuthEpoch) return;
          accumulated += delta;
          if (!frame) frame = window.requestAnimationFrame(paintDelta);
        },
        pageContext,
        { signal: controller.signal, idempotencyKey: requestId },
      );
      if (authEpoch.current !== sendAuthEpoch) return;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      invalidateChatReads(course);

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
              sources: moderated ? undefined : sources,
              grounded: moderated ? undefined : grounded,
            }
            : msg));
        const next = saved ? finalized : [...finalized, {
          id: nextId.current++,
          from: "notice" as const,
          text: stopped
            ? "Partial answer|Generation stopped before the server saved a complete reply. This partial answer is kept in this session."
            : "Not saved|This reply couldn't be saved to your history, so it may be gone after a refresh.",
        }];
        persistCache(course, next);
        return next;
      });
      if (stopped) toast.message("Response stopped", { description: "The partial answer is kept in this conversation." });
      if (draft.trim() === text) setDraft("");
      if (fileToSend && photoFile === fileToSend) {
        setPhotoFile(null);
        setPhotoName(null);
      }
      retryFiles.current.delete(messageId);
      retryPageAttachments.current.delete(messageId);
      if (pageToSend) setAttachedPage(null);
      // The backend counts the reply itself (it is the authoritative gate). This
      // used to call the website's own counter as well, so every reply cost a
      // free student TWO of their daily replies. Just re-read the count.
      if (usageAfter) setUsage(usageAfter);
      void getChatUsage().then((value) => { if (authEpoch.current === sendAuthEpoch && value) setUsage(value); });
      if (!moderated) {
        recordStudyActivity();
        void refreshAccess().catch((e) => console.warn("[chat] couldn't refresh access", e));
      }
    } catch (error) {
      if (authEpoch.current !== sendAuthEpoch) return;
      if (stopRequestedRef.current) {
        setMessages((cur) => {
          const next = cur.map((message) => message.id === messageId
            ? { ...message, sendError: undefined, sendErrorText: undefined }
            : message);
          persistCache(course, next);
          return next;
        });
        if (draft.trim() === text) setDraft("");
        retryFiles.current.delete(messageId);
        retryPageAttachments.current.delete(messageId);
        if (pageToSend) setAttachedPage(null);
        toast.message("Response stopped", { description: "Any partial answer stays in this conversation." });
        return;
      }
      // Logged so a failed send is visible in DevTools → Console with the real
      // reason (backend error text, network failure) instead of only the
      // generic "Couldn't send." under the message.
      console.error("[chat] send failed", error);
      // e.g. "allowance used up": re-read the ring so it shows the truth instead of its last value
      void getChatUsage().then((u) => { if (u) setUsage(u); });
      if (fileToSend) retryFiles.current.set(messageId, fileToSend);
      if (pageToSend) retryPageAttachments.current.set(messageId, pageToSend);
      setMessages((cur) => {
        // If the stream failed after emitting one or more chunks, discard its
        // incomplete assistant bubble. Leaving it in the transcript makes a
        // retry look like a second answer and can present truncated text as
        // complete. The failed student message remains available to retry.
        const withoutPartialReply = streamId === null
          ? cur
          : cur.filter((message) => message.id !== streamId);
        const next = withoutPartialReply.map((message) => message.id === messageId
          ? {
            ...message,
            sendError: true,
            sendErrorText: error instanceof Error ? error.message : undefined,
            retryCourse: course,
            retryMode: sendMode,
            requestId,
          }
          : message);
        persistCache(course, next);
        return next;
      });
    } finally {
      if (frame) window.cancelAnimationFrame(frame);
      flushChatMirrors();
      if (authEpoch.current === sendAuthEpoch) {
        setIsSending(false);
        setStreamingBubbleId(null);
        if (streamAbortRef.current === controller) streamAbortRef.current = null;
        stopRequestedRef.current = false;
      }
    }
  };

  const stopGeneration = () => {
    if (!isSending || isUploadingPhoto) return;
    stopRequestedRef.current = true;
    streamAbortRef.current?.abort();
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
    const text = plainText(cleanAssistantArtifacts(m.text)).trim();
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

  const handleOpenShare = async () => {
    setShareOpen(true);
    setShareLoading(true);
    setShareError(null);
    setShareConversationId(null);
    setShareUrl(null);
    setSavedShareVisibility(null);
    setShareVisibility("private");
    try {
      // Always read fresh so the link includes the message you just sent; a reply that is still
      // being saved gets one short retry before we ask the student to wait.
      invalidateChatReads(selected);
      let thread = await getCourseThread(selected);
      if (!thread.messages.length && messages.length) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        invalidateChatReads(selected);
        thread = await getCourseThread(selected);
      }
      if (!thread.messages.length) throw new Error(messages.length ? "Your latest message is still saving. Try again in a moment." : "Send a message before sharing.");
      setShareMessageCount(thread.messages.length);
      setShareConversationId(thread.conversationId);
      const current = await getChatShareState({ data: { conversationId: thread.conversationId } });
      if (!current.ok) throw new Error(current.reason);
      if (current.share && !current.share.isRevoked && current.share.token) {
        setShareVisibility(current.share.visibility);
        setSavedShareVisibility(current.share.visibility);
        setShareUrl(new URL(`/chat-share/${current.share.token}`, window.location.origin).toString());
      }
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Couldn't load share settings.");
    } finally {
      setShareLoading(false);
    }
  };

  const handleGenerateShare = async () => {
    if (!shareConversationId) return;
    setShareGenerating(true);
    setShareError(null);
    try {
      invalidateChatReads(selected);
      const latest = await getCourseThread(selected).catch(() => null);
      if (latest?.messages.length) setShareMessageCount(latest.messages.length);
      const result = await createOrUpdateChatShare({
        data: { conversationId: shareConversationId, visibility: shareVisibility },
      });
      if (!result.ok) throw new Error(result.reason);
      if (!result.share.token) throw new Error("Couldn't create this share link. Try again.");
      setShareUrl(new URL(`/chat-share/${result.share.token}`, window.location.origin).toString());
      setShareVisibility(result.share.visibility);
      setSavedShareVisibility(result.share.visibility);
      toast.success(`${result.share.visibility === "public" ? "Public" : "Private"} link updated with your latest messages.`);
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Couldn't create this share link.");
    } finally {
      setShareGenerating(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Conversation link copied.");
    } catch {
      toast.error("Couldn't copy this link.");
    }
  };

  const handleRevokeShare = async () => {
    if (!shareConversationId) return;
    setShareRevoking(true);
    setShareError(null);
    try {
      const result = await revokeChatShare({ data: { conversationId: shareConversationId } });
      if (!result.ok) throw new Error(result.reason);
      setShareUrl(null);
      setSavedShareVisibility(null);
      setShareVisibility("private");
      toast.success("Conversation link revoked.");
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Couldn't revoke this link.");
    } finally {
      setShareRevoking(false);
    }
  };

  const stopDictation = (insert: boolean) => {
    const rec = dictationRef.current;
    dictationRef.current = null;
    rec?.stop();
    setIsListening(false);
    if (insert && voiceTranscript.trim()) {
      const transcript = voiceTranscript.trim();
      setDraft((current) => {
        const separator = current && !/\s$/.test(current) ? " " : "";
        const remaining = Math.max(0, 2000 - current.length - separator.length);
        return current + separator + transcript.slice(0, remaining);
      });
      requestAnimationFrame(resizeComposer);
    }
    setVoiceTranscript("");
  };

  const toggleDictation = () => {
    if (dictationRef.current) {
      stopDictation(true);
      return;
    }
    setVoiceTranscript("");

    const recognition = createDictationRecognition();
    if (!recognition) {
      toast.error("Voice input isn't supported in this browser.");
      return;
    }

    recognition.lang = navigator.language || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let full = "";
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i]?.[0]?.transcript ?? "";
      }
      setVoiceTranscript(full.trim());
    };
    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        toast.error("Couldn't use the microphone. Check browser permission and try again.");
      }
      setIsListening(false);
      dictationRef.current = null;
    };
    recognition.onend = () => {
      // Browsers end recognition after a pause. Keep recording until the
      // student taps Insert or Cancel.
      if (dictationRef.current === recognition) {
        try { recognition.start(); return; } catch { /* fall through */ }
      }
      if (dictationRef.current === recognition) {
        dictationRef.current = null;
        setIsListening(false);
      }
    };

    dictationRef.current = recognition;
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      dictationRef.current = null;
      setIsListening(false);
      toast.error("Couldn't start voice input. Try again.");
    }
  };

  useEffect(() => () => {
    dictationRef.current?.abort();
    dictationRef.current = null;
  }, []);

  // Cap chip: lives in the header. Hidden when access is null to avoid a wrong count.
  // (The old "x of 10 today" chip is gone: the allowance is shown as the ring under the message box.)
  const capText: string | null = null;

  const placeholderCourse = displayCode(selected);
  const latestAssistantReply = [...messages].reverse().find((message) => message.from === "assistant");
  const sourcePanelVisible = !embedded && Boolean(latestAssistantReply?.sources?.length);
  const sourceLocation = (source: ChatSource) => source.page ? `Page ${source.page}` : source.section || source.location || "Page unavailable";
  const startFreshConversation = async () => {
    if (isSending) return;
    const key = canonicalCourseCode(selected);
    const epoch = authEpoch.current;
    const previous = messages;
    loadToken.current += 1;
    setIsLoadingThread(false);
    setThreadLoadTimedOut(false);
    setMessages([]);
    setDraft("");
    setPhotoFile(null);
    setPhotoName(null);
    try {
      await startNewChatThread(key);
      if (authEpoch.current !== epoch) return;
      invalidateChatReads(key);
      preloadedThreadCache.delete(cacheMapKey(key));
      persistCache(key, []);
      flushChatMirrors();
      setMode("Explain");
    } catch (error) {
      if (authEpoch.current !== epoch) return;
      setMessages(previous);
      toast.error(error instanceof Error ? error.message : "Couldn't start a new chat.");
    }
  };

  return (
    <div className={`study-chat-screen tf-visual-phase2 min-h-0 overflow-hidden text-foreground ${embedded ? "study-chat-embedded h-full" : ""}`}>
      <div className={cn("chat-layout mx-auto grid h-full min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] pb-2 pt-3", embedded ? "w-full px-3" : "w-full px-3 sm:px-4 md:pt-4", sourcePanelVisible && "md:grid-cols-[minmax(0,1fr)_17rem] md:gap-4")}>
        <div className={cn("flex shrink-0 flex-wrap items-center gap-2 overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none", headerVisible || activeTutorSnapshot ? "mb-2 max-h-72 border-b border-border pb-2 opacity-100" : "pointer-events-none mb-0 max-h-0 -translate-y-2 border-b border-transparent pb-0 opacity-0")} aria-hidden={!(headerVisible || activeTutorSnapshot)} inert={!(headerVisible || activeTutorSnapshot)}>
          {!embedded ? (
            <BackButton onBack={back} />
          ) : null}
          <button type="button" onClick={() => { setHistoryOpen(true); navigate("chat-history", { courseCode: selected }); }} aria-label="Open conversation history" title="Conversation history" className="chat-history-button inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-xs font-semibold leading-3 text-foreground transition hover:bg-muted">
            <HistoryIcon aria-hidden="true" className="h-4 w-4" />
            <span><span className="block">History</span><span className="block">Chat</span></span>
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-base font-semibold leading-6 text-foreground">Verilo</p>
            <Button variant="ghost" type="button" onClick={() => setCoursePickerOpen(true)} disabled={isSending || courseOptions.length === 0} aria-haspopup="dialog" aria-label="Change course" title="Choose a course" className="inline-flex h-11 max-w-full items-center justify-center gap-1 rounded-md px-2 text-xs leading-4 text-muted-foreground disabled:opacity-60">
              <span className="truncate">{selected ? displayCode(selected) : "Choose a course"}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </Button>
          </div>
          <button
            type="button"
            disabled={isSending}
            onClick={() => void startFreshConversation()}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border border-border bg-card px-2.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />New chat
          </button>
          {activeTutorSnapshot ? <div role="status" className="basis-full rounded-lg border border-accent/40 bg-accent/10 p-2 text-xs text-foreground">
            <span>Mock test paused at Question {activeTutorSnapshot.questionIndex}. Your timer is stopped.</span>
            <Button variant="outline" size="sm" className="mt-2 min-h-11 w-full" onClick={() => {
              const test = profile.inProgressTest;
              if (!test || !tutorSnapshotMatches(activeTutorSnapshot, currentUid.current, test)) { setTutorSnapshot(null); return; }
              update({ inProgressTest: { ...test, isPaused: false, resumedAt: Date.now() } });
              setTutorSnapshot(null);
              navigate("mock-run", { courseCode: test.courseCode });
            }}>Resume Test →</Button>
          </div> : null}
        </div>        {sourcePanelVisible && latestAssistantReply ? (
          <aside aria-label="Sources for the latest answer" className="hidden min-h-0 overflow-y-auto rounded-2xl border border-border bg-card p-4 md:col-start-2 md:row-start-1 md:row-span-3 md:block">
            <h2 className="font-display text-sm font-semibold text-foreground">Sources</h2>
            <p className="mt-1 text-xs text-muted-foreground">Course material used for the latest answer.</p>
            <ul className="mt-3 space-y-2">
              {latestAssistantReply.sources?.map((source, index) => (
                <li key={`${source.fileName}-${sourceLocation(source)}-${index}`} className="rounded-xl border border-border bg-background p-3">
                  <p className="break-words text-xs font-semibold text-foreground">{source.fileName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{sourceLocation(source)}</p>
                  {source.excerpt ? <p className="mt-2 break-words text-xs leading-relaxed text-foreground">{source.excerpt}</p> : null}
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
        {/* Thread */}
        <div
          ref={threadScrollRef}
          onScroll={handleThreadScroll}
          data-chat-thread
          data-screen-scroll
          data-swipe-lock
          role="log"
          aria-label="Verilo conversation"
          aria-live="polite"
          aria-relevant="additions text"
          aria-busy={isLoadingThread || isSending}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-none py-3 touch-pan-y [overflow-anchor:none]"
        >
          {threadLoadTimedOut && messages.length === 0 ? (
            <div role="alert" aria-live="assertive" className="chat-load-state flex min-h-full flex-col items-center justify-center px-6 text-center">
              <span className="chat-load-icon mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--tf-sand-chip)] text-[var(--tf-navy)]"><RotateCcw aria-hidden="true" className="h-7 w-7" /></span>
              <p className="text-base font-semibold text-foreground">Conversation is taking too long</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">Your saved chat is safe. Retry the connection or open a fresh conversation.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => { setThreadLoadTimedOut(false); setReloadNonce((n) => n + 1); }} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Retry loading</button>
                <button type="button" onClick={() => void startFreshConversation()} className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground">Start new chat</button>
              </div>
            </div>
          ) : isLoadingThread && messages.length === 0 ? (
            <LoadingStatus
              className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6 text-center"
              label={`Loading your ${placeholderCourse} conversation…`}
              slowMessage="Your saved conversation is taking longer than usual to open."
              longMessage="The conversation is still loading. Check your connection or start a new chat."
            >
              <SkeletonBlock className="h-5 w-44" />
              <SkeletonBlock className="mt-2 h-4 w-64 max-w-full" />
              <SkeletonBlock className="mt-6 h-12 w-full max-w-sm rounded-xl" />
            </LoadingStatus>
          ) : !isLoadingThread && messages.length === 0 ? (
            <div className="flex min-h-full w-full flex-col items-center justify-center px-4 text-center">
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--tf-sand-chip)]" />
                Verilo
              </div>
              <p className="text-xl font-semibold tracking-tight text-foreground">
                {selected ? `Ask Verilo about ${placeholderCourse}` : "Start a study conversation"}
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {selected ? `Ask a question based on your uploaded ${placeholderCourse} notes, past questions, or slides.` : "Add a course and upload study materials to get grounded explanations."}
              </p>
              {selected ? (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--tf-border-warm)]/40 bg-[var(--tf-sand-chip)]/15 px-2.5 py-1 text-xs text-foreground">
                  <Check aria-hidden="true" className="h-3 w-3 text-[var(--tf-sand-chip)]" />
                  Grounded in course notes
                </span>
              ) : null}
              <div className="mt-4 grid w-full gap-2">
                {(STARTERS[mode] ?? []).map((card) => {
                  const StarterIcon = card.icon;
                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => setDraft(card.value)}
                      disabled={isSending || isLoadingThread}
                      className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left text-foreground transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                        <StarterIcon aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block whitespace-normal break-words text-xs font-bold">{card.title}</span>
                        <span className="mt-1 block whitespace-normal break-words text-xs text-muted-foreground">{card.subtitle}</span>
                      </span>
                      <span aria-hidden="true" className="px-0.5 text-lg leading-none text-[var(--tf-sand-muted)]">›</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : messages.length > 0 ? (
            <>
              {messages.filter((message) => message.from !== "assistant" || message.text.length > 0).map((m) =>
                m.from === "student" ? (
                  <div key={m.id} className="ml-auto w-fit min-w-0 max-w-[96%] break-words [overflow-wrap:anywhere]">
                    {m.courseTag ? (
                      <p className="mb-1 inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                        {displayCode(m.courseTag)}
                      </p>
                    ) : null}
                    <div className="whitespace-pre-wrap rounded-2xl border border-border bg-card p-3.5 text-sm text-card-foreground [overflow-wrap:anywhere]">
                      {m.imageUrl ? (
                        <img
                          src={m.imageUrl}
                          alt="Preview of attached page or photo"
                          className="mb-2 max-h-48 rounded-xl object-cover"
                        />
                      ) : null}
                      {m.text}
                    </div>
                    <div className="mt-1 flex items-center justify-end gap-3 text-xs">
                      {m.sendError ? (
                        <span role="status" className="mr-auto min-w-0 break-words font-medium text-destructive">
                          {m.sendErrorText || "Couldn't send."}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        disabled={isSending || isUploadingPhoto}
                        onClick={() => void send(m.text, {
                          messageId: m.id,
                          course: m.retryCourse ?? selected,
                          mode: m.retryMode ?? mode,
                          requestId: m.requestId,
                        })}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Retry message"
                        title="Retry message"
                      >
                        <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                        <span>Retry</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard.writeText(m.text).then(() => toast.success("Message copied."), () => toast.error("Couldn't copy this message."))}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="Copy message"
                        title="Copy message"
                      >
                        <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                ) : m.from === "assistant" ? (
                  <div key={m.id} className="w-full min-w-0 max-w-full break-words [overflow-wrap:anywhere]">
                    {m.courseTag ? (
                      <p className="mb-1 inline-flex rounded-full bg-[var(--tf-sand-chip)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--tf-navy)]">
                        {displayCode(m.courseTag)}
                      </p>
                    ) : null}
                    <div className="chat-message-content text-[16px] sm:text-[17px] font-semibold leading-[1.65] text-foreground">
                      <RichText tone="canvas">{cleanAssistantArtifacts(m.text)}</RichText>
                    </div>
                    {m.sources?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5 md:hidden" aria-label="Answer sources">
                        {m.sources.map((source, index) => (
                          <span key={`${source.fileName}-${sourceLocation(source)}-${index}`} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-xs text-foreground">
                            <FileText aria-hidden="true" className="h-3 w-3 shrink-0 text-accent" />
                            <span className="truncate">{source.fileName} · {sourceLocation(source)}</span>
                          </span>
                        ))}
                      </div>
                    ) : m.grounded === false ? (
                      <p role="note" className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-2 text-xs text-foreground">
                        General explanation · your selected course files don’t cover this answer.
                      </p>
                    ) : m.grounded === true ? (
                      <p role="note" className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-2 text-xs text-foreground">
                        No file or page citation was returned for this answer.
                      </p>
                    ) : null}
                    {m.actions && m.actions.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.actions.map((a) => (
                          <button
                            key={a.key}
                            type="button"
                            onClick={() => {
                              if (isAppView(a.view)) navigate(a.view, { courseCode: selected });
                            }}
                            className={cn(
                              "min-h-11 rounded-full px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              a.label.toLowerCase().includes("mock test") || a.view === "mock-gen"
                                ? "border border-amber bg-amber text-white hover:bg-amber/90"
                                : "border border-border bg-card text-card-foreground hover:bg-muted",
                            )}
                          >
                            {a.label} →
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="chat-assistant-actions mt-2 flex w-full items-center gap-3 text-xs font-semibold">
                      <button type="button" aria-label="Copy reply" title="Copy reply" onClick={() => void navigator.clipboard.writeText(plainText(cleanAssistantArtifacts(m.text))).then(() => toast.success("Reply copied."), () => toast.error("Couldn't copy this reply."))} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </button>
                      <button type="button" onClick={() => toggleSpeak(m)} disabled={!speechAvailable} aria-label={speechAvailable ? (speakingId === m.id ? "Stop reading" : "Read aloud") : "Read aloud isn't available in this browser"} title={speechAvailable ? (speakingId === m.id ? "Stop reading" : "Read aloud") : "Read aloud isn't available in this browser"} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
                        {speakingId === m.id ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                        <span>{speakingId === m.id ? "Stop" : "Listen"}</span>
                      </button>
                      <button type="button" aria-label="Share conversation" title="Share conversation" disabled={isSending} onClick={() => void handleOpenShare()} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Share</span>
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
              {!speechAvailable && messages.some((message) => message.from === "assistant") ? (
                <p className="text-xs text-muted-foreground">Read aloud isn't available in this browser.</p>
              ) : null}
            </>
          ) : null}
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
              <span className="chat-thinking-label font-medium">Thinking</span>
              <span className="chat-thinking-dots" aria-hidden="true"><i /><i /><i /></span>
            </div>
          ) : null}
          <div ref={scrollAnchorRef} hidden={messages.length === 0 && !isSending} />
        </div>

        {/* Composer — sits clear of the bottom tab bar */}
        <div className="chat-composer mt-1 mb-1 shrink-0">
          {attachedPage ? (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground">
              {attachedPage.previewUrl ? (
                <img src={attachedPage.previewUrl} alt={`Preview of page ${attachedPage.page}`} className="h-16 w-12 shrink-0 rounded-md border border-border object-cover" />
              ) : null}
              <span className="min-w-0 flex-1 truncate">Page {attachedPage.page} · {attachedPage.fileName}</span>
              <button type="button" onClick={() => setAttachedPage(null)} className="shrink-0 underline underline-offset-2">Remove</button>
            </div>
          ) : null}
          {isPreparingPhoto && !photoName ? (
            <div role="status" className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Preparing your photo…
            </div>
          ) : null}
          {photoName ? (
            <div className="mb-2 flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground">
              {photoPreviewUrl ? <img src={photoPreviewUrl} alt="Selected photo preview" className="h-14 w-14 shrink-0 rounded-md border border-border object-cover" /> : null}
              <span className="min-w-0 flex-1 truncate">
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
                className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
          {isListening ? (
            <div role="status" className="mb-2 rounded-xl border border-accent/40 bg-accent/10 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="flex h-4 items-center gap-0.5">
                    <span className="h-2.5 w-1 animate-pulse rounded-full bg-accent" />
                    <span className="h-4 w-1 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
                    <span className="h-3 w-1 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
                    <span className="h-2 w-1 animate-pulse rounded-full bg-accent [animation-delay:75ms]" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">Recording voice…</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => stopDictation(false)} className="min-h-11 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-secondary">Cancel</button>
                  <button type="button" onClick={() => stopDictation(true)} className="min-h-11 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">OK</button>
                </div>
              </div>
              <p className="mt-2 min-h-5 text-sm text-foreground">{voiceTranscript || <span className="text-muted-foreground">Start speaking…</span>}</p>
            </div>
          ) : null}
          {!isAtBottom ? <Button type="button" variant="outline" size="icon" aria-label="Scroll to newest messages" title="Newest messages" className="absolute -top-12 right-1 size-11 rounded-full bg-card shadow-md" onClick={() => {
            const thread = threadScrollRef.current;
            if (!thread) return;
            isNearBottomRef.current = true;
            thread.scrollTo({ top: thread.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
            setIsAtBottom(true);
          }}><ChevronDown className="size-5 text-accent" />{isSending ? <span aria-hidden="true" className="absolute right-0 top-0 size-2 rounded-full bg-accent motion-safe:animate-pulse" /> : null}</Button> : null}
          <div className="rounded-[20px] border border-[var(--tf-composer-border)] bg-card p-1.5 shadow-[0_7px_17px_rgba(27,42,74,0.08),inset_0_0_0_1px_rgba(255,255,255,0.55)]">
            <div className="chat-composer-meta mb-1 flex min-w-0 items-center justify-between gap-2 px-1">
              <div className="relative shrink-0">
                <Button variant="ghost"
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={modeMenuOpen}
                  onClick={() => setModeMenuOpen((open) => !open)}
                  aria-label={`Reply mode: ${mode}`}
                  className="inline-flex h-11 min-w-[84px] items-center justify-center gap-1 rounded-full border border-border bg-secondary px-2 text-xs font-semibold text-foreground"
                >
                  <span>{mode === "Work a problem" ? "Work" : mode}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                {modeMenuOpen ? (
                  <div role="menu" className="absolute bottom-full left-0 z-20 mb-1 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg">
                    {MODES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        role="menuitemradio"
                        aria-checked={item === mode}
                        onClick={() => { setMode(item); setModeMenuOpen(false); }}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-popover-foreground hover:bg-secondary ${item === mode ? "bg-secondary" : ""}`}
                      >
                        <span className="block text-xs font-semibold">{item}</span>
                        <span className="block text-xs font-normal text-muted-foreground">{MODE_HINTS[item]}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <span className="chat-connected-context flex min-w-0 flex-1 items-center justify-end gap-1 text-xs text-[var(--tf-muted-ink)]">
                <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--tf-success-muted)]" />
                <span className="truncate">{selected ? `Using ${placeholderCourse} notes` : "Add a course to connect notes"}</span>
              </span>
              {/* The usage ring lives inside the message box, in this row, so it never takes space from the text area. */}
              <ChatUsageRing usage={usage} className="shrink-0" />
            </div>
            <div className="flex min-w-0 items-end gap-1">
              <Button variant="outline" size="icon" type="button" onClick={() => setAttachOpen(true)} disabled={isSending || isUploadingPhoto || isPreparingPhoto} aria-label="Attach photo" className="size-11 shrink-0 rounded-full bg-secondary text-foreground disabled:opacity-60">
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ""; void pickPhoto(f); }} />
              <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ""; void pickPhoto(f); }} />
              <textarea
                ref={composerRef}
                rows={1}
                value={draft}
                onChange={(e) => { setDraft(e.target.value); resizeComposer(); }}
                maxLength={2000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={!selected || isSending || isLoadingThread || isUploadingPhoto}
                placeholder={selected ? `Ask about ${placeholderCourse}…` : "Add a course first."}
                className="chat-composer-textarea max-h-40 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2 text-sm leading-6 text-chat-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[var(--tf-amber-strong)]/45 disabled:opacity-60"
              />
              <Button variant="ghost" size="icon" type="button" onClick={toggleDictation} disabled={!selected || isSending || isLoadingThread || isUploadingPhoto} aria-label={isListening ? "Stop voice input" : "Start voice input"} aria-pressed={isListening} title={isListening ? "Stop voice input" : "Voice input"} className={`size-11 shrink-0 rounded-full transition ${isListening ? "bg-primary text-primary-foreground" : "text-primary hover:bg-secondary"}`}>
                <Mic className="h-4 w-4" />
              </Button>
              {isSending ? (
                <Button variant="destructive" size="icon" type="button" onClick={stopGeneration} disabled={isUploadingPhoto} aria-label="Stop response generation" title="Stop generation" className="size-11 shrink-0 rounded-full disabled:opacity-50">
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              ) : (
                <Button size="icon" type="button" onClick={() => send()} disabled={!selected || isLoadingThread || isUploadingPhoto || isPreparingPhoto} aria-label="Send" className="size-11 shrink-0 rounded-full disabled:opacity-60">
                  <Send className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
          {chatCapReached ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {usage?.window_hours === 4 ? "Your 4-hour chat allowance resets at" : "Your current chat allowance resets at"} {formatResetTime(usage?.resets_at ? new Date(usage.resets_at) : nextChatReset())}.
            </p>
          ) : null}
        </div>
      </div>
      <Sheet open={historyOpen} onOpenChange={(open) => {
        setHistoryOpen(open);
        if (!open && view === "chat-history") navigate("chatbot", { courseCode: selected, replace: true });
      }}>
        <SheetContent side="bottom" size="fullscreen" className="overflow-y-auto overscroll-y-none bg-popover px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-popover-foreground">
          <SheetHeader className="text-left">
            <SheetTitle>Conversation history</SheetTitle>
            <SheetDescription>Saved conversations grouped by course and WAT date.</SheetDescription>
          </SheetHeader>
          <button type="button" onClick={() => navigate("chatbot", { courseCode: selected })} className="mt-4 min-h-11 rounded-lg px-3 text-left text-sm font-semibold text-foreground hover:bg-secondary">Back to Verilo</button>
          {historyRows.length === 0 && historyLoading ? (
            <p className="py-6 text-sm text-muted-foreground">Loading history…</p>
          ) : historyRows.length === 0 && historyError ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">{historyError}</p>
              <button type="button" onClick={() => { setHistoryOpen(false); window.setTimeout(() => setHistoryOpen(true), 0); }} className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Retry history</button>
            </div>
          ) : historyRows.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No saved conversations yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {historyLoading ? <p role="status" className="text-xs text-muted-foreground">Loading more conversations…</p> : null}
              {historyRows.map((row) => {
                const previewText = plainText(row.messages[row.messages.length - 1]?.content ?? "");
                return (
                  <div key={row.conversationId} className="rounded-xl border border-border border-l-4 border-l-accent bg-card text-card-foreground">
                    <div className="flex items-start gap-2 p-3">
                      <Button variant="ghost"
                        type="button"
                        disabled={resumingConvId !== null}
                        onClick={() => void handleResumeConversation(row.conversationId)}
                        className="h-auto min-w-0 flex-1 flex-col items-start whitespace-normal p-0 text-left"
                      >
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {displayCode(row.course)} · {row.date}
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm font-semibold">{row.title}</div>
                        {previewText ? <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{previewText}</div> : null}
                        <div className="mt-1 text-xs text-muted-foreground">{row.messages.length} messages</div>
                      </Button>
                      <Button variant="ghost" size="icon"
                        type="button"
                        aria-label="Delete this conversation"
                        disabled={deletingConvId === row.conversationId}
                        onClick={() => setDeleteTarget({ conversationId: row.conversationId, course: row.course, title: row.title })}
                        className="size-11 shrink-0 rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="border-t border-border p-3">
                      <Button type="button" variant="outline" disabled={resumingConvId !== null}
                        onClick={() => void handleResumeConversation(row.conversationId)}
                        className="min-h-11 w-full whitespace-normal border-accent/40 bg-accent/10 text-foreground hover:bg-accent/20">
                        {resumingConvId === row.conversationId ? "Opening conversation…" : "Continue to this conversation →"}
                      </Button>
                    </div>
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
            <SheetDescription>Questions are grounded in notes for the selected course.</SheetDescription>
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
            <SheetTitle className="text-chat-foreground">Share this conversation</SheetTitle>
            <SheetDescription>Create a snapshot of the full conversation. Future messages are not included unless you update the link.</SheetDescription>
          </SheetHeader>
          <fieldset disabled={shareLoading || shareGenerating || shareRevoking} className="mt-4 space-y-2 text-sm">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground">
              <input type="radio" name="chat-visibility" value="public" checked={shareVisibility === "public"} onChange={() => setShareVisibility("public")} className="mt-0.5 accent-[var(--tf-amber-strong)]" />
              <span><span className="block font-semibold">Public</span><span className="mt-0.5 block text-xs text-muted-foreground">Anyone with the link can view it. It is unlisted, but recipients can forward the URL.</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground">
              <input type="radio" name="chat-visibility" value="private" checked={shareVisibility === "private"} onChange={() => setShareVisibility("private")} className="mt-0.5 accent-[var(--tf-amber-strong)]" />
              <span><span className="block font-semibold">Private</span><span className="mt-0.5 block text-xs text-muted-foreground">Only the signed-in account that created this conversation can view it. New links start private.</span></span>
            </label>
          </fieldset>
          {shareError ? <p role="alert" className="mt-3 text-sm text-destructive">{shareError}</p> : null}
          {shareLoading ? <p role="status" className="mt-3 text-sm text-muted-foreground">Loading your conversation link…</p> : null}
          {!shareLoading && shareMessageCount > 0 ? <p className="mt-3 text-sm text-foreground">Snapshot includes all {shareMessageCount} saved messages, up to your latest one.</p> : null}
          {shareUrl ? (
            <div className="mt-4 space-y-2">
              <label htmlFor="chat-share-url" className="text-xs font-semibold text-muted-foreground">Active {savedShareVisibility === "public" ? "public" : "private"} link</label>
              <input id="chat-share-url" readOnly value={shareUrl} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground" />
              <button type="button" onClick={() => void handleCopyShareLink()} className="w-full rounded-xl border border-accent/60 bg-accent/10 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/20">
                Copy link
              </button>
              {savedShareVisibility !== shareVisibility ? <p className="text-xs text-muted-foreground">Access changes only after you update the link below.</p> : null}
            </div>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
            {shareVisibility === "public" ? "Anyone who receives a public link can view the shared snapshot." : "Private links work only for you while signed in to the account that created the conversation."}
          </p>
          <button type="button" disabled={shareLoading || shareGenerating || shareRevoking || !shareConversationId} onClick={() => void handleGenerateShare()} className="mt-4 w-full rounded-xl bg-navy py-3 text-sm font-semibold text-cream transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50">
            {shareGenerating ? "Preparing link…" : shareUrl ? (savedShareVisibility !== shareVisibility ? "Update access and snapshot" : "Update shared snapshot") : "Generate link"}
          </button>
          {shareUrl ? (
            <button type="button" disabled={shareLoading || shareGenerating || shareRevoking} onClick={() => void handleRevokeShare()} className="mt-2 w-full rounded-xl border border-destructive/40 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50">
              {shareRevoking ? "Revoking…" : "Revoke link"}
            </button>
          ) : null}
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
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open && !deletingConvId) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title || "Verilo"}” will be permanently removed from your saved Conversation history. This only deletes this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingConvId !== null}>Keep conversation</AlertDialogCancel>
            <AlertDialogAction
              disabled={!deleteTarget || deletingConvId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                const target = deleteTarget;
                setDeleteTarget(null);
                void handleDeleteConversation(target.conversationId, target.course);
              }}
            >
              Delete conversation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
