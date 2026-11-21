import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { ProfileProvider, SwipePreviewProvider, useProfile, type AppView } from "@/lib/profile-store";
import { ensureSupabaseSession } from "@/lib/supabase-session";
import { SplashScreen } from "@/components/onboarding/splash";
import { SigningInScreen } from "@/components/signing-in";
import { LandingScreen } from "@/components/onboarding/landing";
import { DisclaimerScreen, DisclaimerBlockedScreen, DisclaimerViewScreen } from "@/components/onboarding/disclaimer";
import { IdentityScreen } from "@/components/onboarding/identity";
import { GoogleProfileScreen } from "@/components/onboarding/google-profile";
import {
  FacultyScreen, DepartmentScreen, LevelScreen, CoursesScreen,
} from "@/components/onboarding/profile-setup";
import { GoalScreen, TimelineScreen, StudyPreferenceScreen } from "@/components/onboarding/personalization";
import { CgpaIntroScreen } from "@/components/onboarding/cgpa-intro";
import { TrialWelcomeScreen } from "@/components/onboarding/trial-welcome";
import { HomeScreen } from "@/components/dashboard";
import { DailyFeaturePrompt } from "@/components/daily-feature-prompt";
import { CourseDetailScreen } from "@/components/course-detail";
import {
  MockGenerationScreen, MockConfigScreen, MockRunScreen, MockResultScreen, AttemptReviewScreen,
} from "@/components/mock-test-flow";
import { MockTestsScreen, TestHistoryScreen } from "@/components/mock-tests-tab";
import { ChatbotScreen } from "@/components/chatbot";
import { LibraryScreen } from "@/components/library";
import { AccountScreen, AllUploadsScreen } from "@/components/settings";
import { AddCourseScreen } from "@/components/misc-screens";
import { FlashcardsScreen, FlashcardsReviewScreen } from "@/components/flashcards";
import { CgpaCalculatorScreen } from "@/components/cgpa-calculator";
import { CgpaGoalSetterScreen } from "@/components/cgpa-goal-setter";
import { SupportScreen } from "@/components/support";
import { UpgradeScreen } from "@/components/upgrade";
import { EditIdentityScreen } from "@/components/edit-identity";
import { ThemeProvider } from "@/lib/theme";
import { BottomTabBar, TopNavBar, hidesTabBar } from "@/components/tab-bar";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSwipeTabs } from "@/hooks/use-swipe-tabs";
import { readPaymentReturn } from "@/lib/billing-api";
import { warmBackend } from "@/lib/backend-api";

const MemoHomeScreen = memo(HomeScreen);
const MemoMockTestsScreen = memo(MockTestsScreen);
const MemoLibraryScreen = memo(LibraryScreen);
const MemoChatbotScreen = memo(ChatbotScreen);
const MemoAccountScreen = memo(AccountScreen);

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "TrueFluency Pro: AI Exam Prep for UI Students" },
      {
        name: "description",
        content:
          "AI-powered past-paper predictions, mock tests, study plans and CGPA tools for University of Ibadan students.",
      },
      { property: "og:title", content: "TrueFluency Pro: AI Exam Prep for UI Students" },
      {
        property: "og:description",
        content:
          "AI-powered past-paper predictions, mock tests, study plans and CGPA tools for University of Ibadan students.",
      },
      { property: "og:url", content: "https://truefluency.app/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://truefluency.app/" }],
  }),
});

function Index() {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <Router />
      </ProfileProvider>
    </ThemeProvider>
  );
}


const ROOT_TABS: AppView[] = ["home", "mock-tests", "library", "account"];

function rootTabFor(view: AppView): AppView | null {
  if (view === "home" || view === "dashboard") return "home";
  if (ROOT_TABS.includes(view)) return view;
  if (view === "settings") return "account";
  return null;
}

const RootTabs = memo(function RootTabs({
  view,
  previewTab,
  previewSide,
}: {
  view: AppView;
  previewTab: AppView | null;
  previewSide: "left" | "right" | null;
}) {
  const activeTab = rootTabFor(view);
  const [visited, setVisited] = useState<AppView[]>(() => {
    const initial = activeTab ?? "home";
    const index = ROOT_TABS.indexOf(initial);
    return [initial, ROOT_TABS[index - 1], ROOT_TABS[index + 1]].filter((tab): tab is AppView => Boolean(tab));
  });

  useEffect(() => {
    if (!activeTab) return;
    const index = ROOT_TABS.indexOf(activeTab);
    const neighbors = [ROOT_TABS[index - 1], ROOT_TABS[index + 1]].filter(
      (tab): tab is AppView => Boolean(tab),
    );
    const warmNeighbors = () => {
      setVisited((tabs) => neighbors.every((tab) => tabs.includes(tab))
        ? tabs
        : [...tabs, ...neighbors.filter((tab) => !tabs.includes(tab))]);
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(warmNeighbors, { timeout: 900 });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(warmNeighbors, 250);
    return () => window.clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab && !visited.includes(activeTab)) setVisited((tabs) => [...tabs, activeTab]);
  }, [activeTab, visited]);

  const activeIndex = activeTab ? ROOT_TABS.indexOf(activeTab) : -1;
  const adjacentTabs = activeIndex < 0 ? [] : [ROOT_TABS[activeIndex - 1], ROOT_TABS[activeIndex + 1]].filter((tab): tab is AppView => Boolean(tab));
  const tabsToRender = [...new Set([...visited, ...adjacentTabs, ...(activeTab ? [activeTab] : []), ...(previewTab ? [previewTab] : [])])];

  return (
    <>
      {tabsToRender.map((tab) => {
        const active = activeTab === tab;
        const preview = !active && previewTab === tab;
        const adjacent = !active && adjacentTabs.includes(tab);
        const side = ROOT_TABS.indexOf(tab) < activeIndex ? "left" : "right";
        return (
          <div
            key={tab}
            hidden={!active && !preview && !adjacent}
            aria-hidden={!active}
            inert={!active ? true : undefined}
            data-root-tab={tab}
            data-screen-scroll
            className={cn("tab-swipe-pane", !active ? "pointer-events-none absolute left-0 top-0 z-0 w-full bg-background" : "tf-root-entry w-full")}
            style={!active ? { transform: `translate3d(${(preview ? previewSide : side) === "right" ? "100%" : "-100%"}, 0, 0)` } : undefined}
          >
            <SwipePreviewProvider enabled={!active}>
              {tab === "home" ? <MemoHomeScreen active={active} />
                : tab === "mock-tests" ? <MemoMockTestsScreen active={active} />
                  : tab === "library" ? <MemoLibraryScreen active={active} />
                    : <MemoAccountScreen />}
            </SwipePreviewProvider>
          </div>
        );
      })}
      <div hidden={view !== "chatbot" && view !== "chat-history"} aria-hidden={view !== "chatbot" && view !== "chat-history"} inert={view !== "chatbot" && view !== "chat-history" ? true : undefined} data-chat-fullscreen="">
        <MemoChatbotScreen active={view === "chatbot" || view === "chat-history"} />
      </div>
    </>
  );
});

function Router() {
  const { step, view, profile, authPending, hydrated, go, navigate } = useProfile();
  const swipePreview = useSwipeTabs(step === "dashboard");
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [leaveTestOpen, setLeaveTestOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [veriloIntroOpen, setVeriloIntroOpen] = useState(false);
  const veriloIntroChecked = useRef(false);

  useEffect(() => {
    if (step !== "dashboard" || !hydrated || veriloIntroChecked.current) return;
    veriloIntroChecked.current = true;
    try {
      if (localStorage.getItem("truefluency-verilo-intro-seen") === "true") return;
    } catch { /* show the intro when storage is unavailable */ }
    setVeriloIntroOpen(true);
  }, [hydrated, step]);

  const dismissVeriloIntro = () => {
    setVeriloIntroOpen(false);
    try { localStorage.setItem("truefluency-verilo-intro-seen", "true"); } catch { /* session can still continue */ }
  };

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateKeyboardState = () => setKeyboardOpen(window.innerHeight - viewport.height > 160);
    updateKeyboardState();
    viewport.addEventListener("resize", updateKeyboardState);
    viewport.addEventListener("scroll", updateKeyboardState);
    return () => {
      viewport.removeEventListener("resize", updateKeyboardState);
      viewport.removeEventListener("scroll", updateKeyboardState);
    };
  }, []);

  // Wake the chat backend as soon as the signed-in shell is available, rather
  // than waiting for the student to tap Study Chat and then watching a blank
  // loading state.
  useEffect(() => {
    if (step !== "dashboard" || !hydrated) return;
    void warmBackend();
  }, [step, hydrated]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.viewDirection = root.dataset.nextViewDirection ?? "forward";
    delete root.dataset.nextViewDirection;
    const stage = document.querySelector<HTMLElement>("[data-tab-swipe-stage]");
    if (stage) {
      // The destination is committed before this layout effect runs. Resetting
      // here keeps the atomic screen swap off-screen until the new view exists.
      stage.style.transition = "none";
      stage.style.transform = "translate3d(0, 0, 0)";
      stage.style.willChange = "";
      stage.dataset.swipeActive = "false";
    }

    // Reset document and nested screen scroll. Root tabs stay mounted for fast
    // switching, so window.scrollTo alone does not reset the active screen.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    stage?.querySelectorAll<HTMLElement>("[data-screen-scroll], [data-chat-thread], [data-pdf-scroll], [data-cgpa-scroll], [data-root-scroll], .overflow-y-auto, .overflow-auto").forEach((node) => {
      node.scrollTop = 0;
      node.scrollLeft = 0;
    });
    // Chat history opens at the top; the live chatbot positions itself on the
    // newest message after its thread loads, so it must not be pinned here.
    const chat = document.querySelector<HTMLElement>("[data-chat-thread]");
    if (chat && view === "chat-history") chat.scrollTop = 0;
  }, [view, step]);

  useEffect(() => {
    const onBack = () => { document.documentElement.dataset.nextViewDirection = "back"; };
    const onMockLeave = () => setLeaveTestOpen(true);
    window.addEventListener("popstate", onBack, { capture: true });
    window.addEventListener("truefluency-request-mock-leave", onMockLeave);
    return () => {
      window.removeEventListener("popstate", onBack, { capture: true });
      window.removeEventListener("truefluency-request-mock-leave", onMockLeave);
    };
  }, []);

  // Keep one leave guard across generation and the active attempt. Transitioning
  // from mock-gen to mock-run must not tear down and recreate the history entry.
  const inExamView = view === "mock-run" || view === "mock-gen";
  useEffect(() => {
    if (!inExamView) {
      setLeaveTestOpen(false);
      return;
    }

    const historyState =
      window.history.state && typeof window.history.state === "object" ? window.history.state : {};
    const guardState = { ...historyState, __trueFluencyMockBackGuard: true };
    window.history.pushState(guardState, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(guardState, "", window.location.href);
      setLeaveTestOpen(true);
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.__trueFluencyMockBackGuard) window.history.back();
    };
  }, [inExamView]);
  // Squad sends the student back to /?payment_ref=...: show the payment check instead of the home screen.
  useEffect(() => {
    if (authPending || step !== "dashboard") return;
    if (readPaymentReturn()) navigateRef.current("upgrade");
  }, [authPending, step]);

  useEffect(() => {
    if (!profile.identity) return;
    void ensureSupabaseSession(profile).then((result) => {
      if (result.ok) return;
      // An email account whose session lapsed can't upload, open My Files or
      // generate a mock, so it is sent back to sign in instead of looking
      // signed in and failing on every action.
      if (result.reason === "sign-in-required") {
        toast.message("Please sign in again", {
          description: "Your session expired, so we need your password once more.",
        });
        go("identity");
        return;
      }
      if (result.reason !== "oauth-or-missing-account") {
        toast.message("You're working offline", {
          id: "offline-status",
          description: "We couldn't reach your account, so changes are saved on this device for now.",
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.identity?.kind, profile.identity?.email]);


  // A session must finish identity restore and local hydration before any
  // onboarding or dashboard screen can render.
  const sessionRestoring = authPending;
  if (sessionRestoring) return <SigningInScreen />;

  if (step !== "dashboard") {
    switch (step) {
      case "splash": return <SplashScreen />;
      case "landing": return <LandingScreen />;
      case "disclaimer": return <DisclaimerScreen />;
      case "disclaimer-blocked": return <DisclaimerBlockedScreen />;
      case "identity": return <IdentityScreen />;
      case "google-profile": return <GoogleProfileScreen />;
      case "goal": return <GoalScreen />;
      case "timeline": return <TimelineScreen />;
      case "study-pref": return <StudyPreferenceScreen />;
      case "faculty": return <FacultyScreen />;
      case "department": return <DepartmentScreen />;
      case "level": return <LevelScreen />;
      case "courses": return <CoursesScreen />;
      case "cgpa-intro": return <CgpaIntroScreen />;
      case "trial-welcome": return <TrialWelcomeScreen />;
    }
  }

  const screen = (() => {
    switch (view) {
      case "home":
      case "dashboard": return null;
      case "course-detail": return <CourseDetailScreen />;
      case "mock-tests": return null;
      case "test-history": return <TestHistoryScreen />;
      case "mock-gen": return <MockGenerationScreen />;
      case "mock-config": return <MockConfigScreen />;
      case "mock-run": return <MockRunScreen />;
      case "mock-result": return <MockResultScreen />;
      case "attempt-review": return <AttemptReviewScreen />;
      case "library": return null;
      case "chatbot": return null;
      case "chat-history": return null;
      case "account":
      case "settings": return null;
      case "all-uploads": return <AllUploadsScreen />;
      case "flashcards": return <FlashcardsScreen />;
      case "flashcards-review": return <FlashcardsReviewScreen />;
      case "add-course": return <AddCourseScreen />;
      case "cgpa": return <CgpaCalculatorScreen />;
      case "cgpa-goal": return <CgpaGoalSetterScreen />;
      case "support": return <SupportScreen />;
      case "upgrade": return <UpgradeScreen />;
      case "edit-identity": return <EditIdentityScreen />;
      case "disclaimer-view": return <DisclaimerViewScreen />;
      default: return <HomeScreen />;
    }
  })();

  // Mock run and review stay a focused single column at every width.
  const examFocus = view === "mock-run" || view === "mock-gen" || view === "attempt-review";
  // Each mock-flow screen sizes its own column and gutter.
  const flowScreen = examFocus || view === "mock-config" || view === "mock-result";
  const currentRootTab = rootTabFor(view);
  const showVeriloButton = step === "dashboard" && !keyboardOpen && !["chatbot", "chat-history", "account", "settings", "mock-run", "mock-gen", "flashcards-review"].includes(view);

  return (
    <div data-app-viewport className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <TopNavBar highlightedView={swipePreview?.highlightedTab} />
      {/* Padding keeps the persistent mobile tab bar from covering content. */}
      <div className="tab-swipe-clip overflow-x-clip">
        <div
          data-tab-swipe-stage
          className={cn(
            // With the floating Verilo button on screen the page needs more room under its last row, or the button sits on top of it.
            hidesTabBar(view) ? undefined : showVeriloButton ? "pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-8" : "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8",
            !flowScreen && "app-stage-wide",
            "tab-swipe-stage relative overflow-visible",
          )}
        >
          <RootTabs view={view} previewTab={swipePreview?.tab ?? null} previewSide={swipePreview?.side ?? null} />
          {!currentRootTab && view !== "chatbot" && view !== "chat-history" ? <div key={view} data-subview-scroll data-screen-scroll className="view-transition-enter">{screen}</div> : null}
        </div>
      </div>
      {showVeriloButton ? (
        <button
          type="button"
          data-verilo-entry=""
          aria-label="Open Verilo"
          onClick={() => navigate("chatbot")}
          className="verilo-fab fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 z-30 grid h-14 w-14 place-items-center rounded-full border border-border bg-[var(--tf-navy)] text-[var(--tf-cream)] shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-[var(--tf-cream)] dark:text-[var(--tf-navy)] md:hidden"
        >
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
          <span className="sr-only">Verilo</span>
        </button>
      ) : null}
      <BottomTabBar />
      {step === "dashboard" && view === "home" ? <DailyFeaturePrompt /> : null}
      <AlertDialog open={leaveTestOpen} onOpenChange={setLeaveTestOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this test? Your answers stay.</AlertDialogTitle>
            <AlertDialogDescription>
              Your in-progress answers are saved on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on test</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigateRef.current("mock-tests")}>
              Leave test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={veriloIntroOpen} onOpenChange={(open) => { if (!open) dismissVeriloIntro(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Meet Verilo</AlertDialogTitle>
            <AlertDialogDescription>
              Verilo is your dedicated AI chatbot, built to help you study from your own notes and materials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={dismissVeriloIntro}>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
