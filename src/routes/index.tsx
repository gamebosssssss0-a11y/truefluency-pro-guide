import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createFileRoute } from "@tanstack/react-router";
import { ProfileProvider, useProfile, type AppView } from "@/lib/profile-store";
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


const ROOT_TABS: AppView[] = ["home", "mock-tests", "library", "chatbot", "account"];

function rootTabFor(view: AppView): AppView | null {
  if (view === "home" || view === "dashboard") return "home";
  if (ROOT_TABS.includes(view)) return view;
  if (view === "settings") return "account";
  return null;
}

function SwipePreviewScreen({ view, side }: { view: AppView; side: "left" | "right" }) {
  const title = view === "mock-tests" ? "Practice"
    : view === "library" ? "My Files"
      : view === "chatbot" ? "Study Chat"
        : view === "account" ? "Account" : "Home";
  return (
    <div
      aria-hidden="true"
      data-swipe-lock=""
      className="pointer-events-none absolute inset-y-0 z-0 w-full overflow-hidden bg-background"
      style={{ left: side === "right" ? "100%" : "-100%" }}
    >
      <div className="mx-auto max-w-md px-5 pt-6">
        <div className="mb-5 h-4 w-24 rounded bg-muted" />
        <h2 className="mb-3 font-display text-xl font-semibold text-foreground">{title}</h2>
        <div className="space-y-3">
          <div className="h-28 rounded-2xl border border-border bg-card" />
          <div className="h-16 rounded-2xl border border-border bg-card" />
          <div className="h-16 rounded-2xl border border-border bg-card" />
        </div>
      </div>
    </div>
  );
}

function RootTabs({ view }: { view: AppView }) {
  const activeTab = rootTabFor(view);
  const [visited, setVisited] = useState<AppView[]>(() => [activeTab ?? "home"]);

  useEffect(() => {
    if (activeTab && !visited.includes(activeTab)) setVisited((tabs) => [...tabs, activeTab]);
  }, [activeTab, visited]);

  return (
    <>
      {(activeTab && !visited.includes(activeTab) ? [...visited, activeTab] : visited).map((tab) => {
        const active = activeTab === tab;
        return (
          <div key={tab} hidden={!active} aria-hidden={!active} data-root-tab={tab}>
            {tab === "home" ? <HomeScreen active={active} />
              : tab === "mock-tests" ? <MockTestsScreen active={active} />
                : tab === "library" ? <LibraryScreen active={active} />
                  : tab === "chatbot" ? <ChatbotScreen active={active} />
                    : <AccountScreen />}
          </div>
        );
      })}
    </>
  );
}

function Router() {
  const { step, view, profile, authPending, hydrated, go, navigate } = useProfile();
  const swipePreview = useSwipeTabs(step === "dashboard");
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [leaveTestOpen, setLeaveTestOpen] = useState(false);
  const previousView = useRef(view);
  const rootScroll = useRef(new Map<AppView, number>());

  useLayoutEffect(() => {
    const stage = document.querySelector<HTMLElement>("[data-tab-swipe-stage]");
    if (stage) {
      // The destination is committed before this layout effect runs. Resetting
      // here keeps the atomic screen swap off-screen until the new view exists.
      stage.style.transition = "none";
      stage.style.transform = "translate3d(0, 0, 0)";
      stage.style.willChange = "";
      stage.dataset.swipeActive = "false";
    }

    const oldRoot = rootTabFor(previousView.current);
    if (oldRoot) rootScroll.current.set(oldRoot, window.scrollY);
    const nextRoot = rootTabFor(view);
    if (nextRoot) window.scrollTo(0, rootScroll.current.get(nextRoot) ?? 0);
    else window.scrollTo(0, 0);
    previousView.current = view;
  }, [view]);

  useEffect(() => {
    if (view !== "mock-run" && view !== "mock-gen") {
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
  }, [view]);
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

  // Mock run and review stay a narrow single column at every width so the
  // exam surface matches mobile exactly.
  const examFocus = view === "mock-run" || view === "mock-gen" || view === "attempt-review";
  const currentRootTab = rootTabFor(view);

  return (
    <>
      <TopNavBar highlightedView={swipePreview?.highlightedTab} />
      {/* Padding keeps the persistent mobile tab bar from covering content. */}
      <div
        data-tab-swipe-stage
        className={cn(
          hidesTabBar(view) ? undefined : view === "chatbot" ? "overflow-hidden" : "pb-20 md:pb-8 overflow-x-hidden",
          !examFocus && "app-stage-wide",
          "tab-swipe-stage relative overflow-x-hidden",
        )}
      >
        <RootTabs view={view} />
        {!currentRootTab ? screen : null}
        {swipePreview ? (
          <SwipePreviewScreen view={swipePreview.tab} side={swipePreview.side} />
        ) : null}
      </div>
      <BottomTabBar highlightedView={swipePreview?.highlightedTab} />
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
    </>
  );
}
