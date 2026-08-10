import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ProfileProvider, useProfile } from "@/lib/profile-store";
import { ensureSupabaseSession } from "@/lib/supabase-session";
import { SplashScreen } from "@/components/onboarding/splash";
import { LandingScreen } from "@/components/onboarding/landing";
import { DisclaimerScreen, DisclaimerBlockedScreen, DisclaimerViewScreen } from "@/components/onboarding/disclaimer";
import { IdentityScreen } from "@/components/onboarding/identity";
import {
  FacultyScreen, DepartmentScreen, LevelScreen, CoursesScreen,
} from "@/components/onboarding/profile-setup";
import { GoalScreen, TimelineScreen, StudyPreferenceScreen } from "@/components/onboarding/personalization";
import { CgpaIntroScreen } from "@/components/onboarding/cgpa-intro";
import { HomeScreen } from "@/components/dashboard";
import { CourseDetailScreen } from "@/components/course-detail";
import {
  MockGenerationScreen, MockConfigScreen, MockRunScreen, MockResultScreen, AttemptReviewScreen,
} from "@/components/mock-test-flow";
import { MockTestsScreen, TestHistoryScreen } from "@/components/mock-tests-tab";
import { LibrarySoonScreen, ChatbotSoonScreen } from "@/components/placeholder-tabs";
import { AccountScreen, AllUploadsScreen } from "@/components/settings";
import { AddCourseScreen, FlashcardsSoonScreen } from "@/components/misc-screens";
import { CgpaCalculatorScreen } from "@/components/cgpa-calculator";
import { CgpaGoalSetterScreen } from "@/components/cgpa-goal-setter";
import { SupportScreen } from "@/components/support";
import { EditIdentityScreen } from "@/components/edit-identity";
import { ThemeProvider } from "@/lib/theme";
import { BottomTabBar, hidesTabBar } from "@/components/tab-bar";

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
  const { step, view, profile } = useProfile();
  useEffect(() => {
    if (!profile.identity) return;
    void ensureSupabaseSession(profile).then((result) => {
      // Failing silently used to leave uploads and sync broken with no signal.
      if (!result.ok && result.reason !== "oauth-or-missing-account") {
        toast.message("You're working offline", {
          description: "We couldn't reach your account, so changes are saved on this device for now.",
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.identity?.kind, profile.identity?.email]);

  if (step !== "dashboard") {
    switch (step) {
      case "splash": return <SplashScreen />;
      case "landing": return <LandingScreen />;
      case "disclaimer": return <DisclaimerScreen />;
      case "disclaimer-blocked": return <DisclaimerBlockedScreen />;
      case "identity": return <IdentityScreen />;
      case "goal": return <GoalScreen />;
      case "timeline": return <TimelineScreen />;
      case "study-pref": return <StudyPreferenceScreen />;
      case "faculty": return <FacultyScreen />;
      case "department": return <DepartmentScreen />;
      case "level": return <LevelScreen />;
      case "courses": return <CoursesScreen />;
      case "cgpa-intro": return <CgpaIntroScreen />;
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
      case "library": return <LibrarySoonScreen />;
      case "chatbot": return <ChatbotSoonScreen />;
      case "account":
      case "settings": return <AccountScreen />;
      case "all-uploads": return <AllUploadsScreen />;
      case "flashcards-soon": return <FlashcardsSoonScreen />;
      case "add-course": return <AddCourseScreen />;
      case "cgpa": return <CgpaCalculatorScreen />;
      case "cgpa-goal": return <CgpaGoalSetterScreen />;
      case "support": return <SupportScreen />;
      case "edit-identity": return <EditIdentityScreen />;
      case "disclaimer-view": return <DisclaimerViewScreen />;
      default: return <HomeScreen />;
    }
  })();

  return (
    <>
      {/* Padding keeps the persistent tab bar from covering page content. */}
      <div className={hidesTabBar(view) ? undefined : "pb-20"}>{screen}</div>
      <BottomTabBar />
    </>
  );
}
