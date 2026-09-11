import { useEffect } from "react";
import { toast } from "sonner";
import { createFileRoute } from "@tanstack/react-router";
import { ProfileProvider, useProfile } from "@/lib/profile-store";
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

function Router() {
  const { step, view, profile, authPending, go } = useProfile();
  useSwipeTabs();
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


  // All in-app screens render on this same "/" route, so the router's scroll
  // restoration never fires on a view switch. Without this, opening a screen
  // from a scrolled position (e.g. the Flashcards card partway down Home)
  // keeps the old scroll offset and the new screen looks truncated at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, step]);

  // Post-auth gap: a confirmed sign-in whose profile sync is still resolving.
  // Never stacked on the splash, landing or disclaimer screens: those come
  // before any sign-in attempt, so a pending session there is not this screen's
  // business.
  const preAuthStep = step === "splash" || step === "landing" || step === "disclaimer" || step === "disclaimer-blocked";
  if (authPending && !preAuthStep) return <SigningInScreen />;

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
      case "dashboard": return <HomeScreen />;
      case "course-detail": return <CourseDetailScreen />;
      case "mock-tests": return <MockTestsScreen />;
      case "test-history": return <TestHistoryScreen />;
      case "mock-gen": return <MockGenerationScreen />;
      case "mock-config": return <MockConfigScreen />;
      case "mock-run": return <MockRunScreen />;
      case "mock-result": return <MockResultScreen />;
      case "attempt-review": return <AttemptReviewScreen />;
      case "library": return <LibraryScreen />;
      case "chatbot": return <ChatbotScreen />;
      case "account":
      case "settings": return <AccountScreen />;
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
  const wideHome = view === "home" || view === "dashboard";

  return (
    <>
      <TopNavBar />
      {/* Padding keeps the persistent mobile tab bar from covering content. */}
      <div
        className={cn(
          hidesTabBar(view) ? undefined : "pb-20 md:pb-8",
          !examFocus && "app-stage",
          !examFocus && wideHome && "app-stage-wide",
        )}
      >
        {screen}
      </div>
      <BottomTabBar />
    </>
  );
}
