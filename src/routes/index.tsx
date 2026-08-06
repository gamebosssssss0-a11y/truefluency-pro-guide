import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ProfileProvider, useProfile } from "@/lib/profile-store";
import { ensureSupabaseSession } from "@/lib/supabase-session";
import { SplashScreen } from "@/components/onboarding/splash";
import { DisclaimerScreen, DisclaimerBlockedScreen } from "@/components/onboarding/disclaimer";
import { IdentityScreen } from "@/components/onboarding/identity";
import {
  FacultyScreen, DepartmentScreen, LevelScreen, CoursesScreen,
} from "@/components/onboarding/profile-setup";
import { GoalScreen, TimelineScreen, StudyPreferenceScreen } from "@/components/onboarding/personalization";
import { DashboardScreen } from "@/components/dashboard";
import { CourseDetailScreen } from "@/components/course-detail";
import {
  MockGenerationScreen, MockConfigScreen, MockRunScreen, MockResultScreen, AttemptReviewScreen,
} from "@/components/mock-test-flow";

import { SettingsScreen, AllUploadsScreen } from "@/components/settings";
import { AddCourseScreen, FlashcardsSoonScreen } from "@/components/misc-screens";
import { CgpaCalculatorScreen } from "@/components/cgpa-calculator";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <ProfileProvider>
      <Router />
    </ProfileProvider>
  );
}

function Router() {
  const { step, view, profile } = useProfile();
  useEffect(() => {
    if (profile.identity) void ensureSupabaseSession(profile);
  }, [profile.identity?.kind, profile.identity?.email]);
  if (step !== "dashboard") {
    switch (step) {
      case "splash": return <SplashScreen />;
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
    }
  }
  switch (view) {
    case "dashboard": return <DashboardScreen />;
    case "course-detail": return <CourseDetailScreen />;
    case "mock-gen": return <MockGenerationScreen />;
    case "mock-config": return <MockConfigScreen />;
    case "mock-run": return <MockRunScreen />;
    case "mock-result": return <MockResultScreen />;
    case "attempt-review": return <AttemptReviewScreen />;

    case "settings": return <SettingsScreen />;
    case "all-uploads": return <AllUploadsScreen />;
    case "flashcards-soon": return <FlashcardsSoonScreen />;
    case "add-course": return <AddCourseScreen />;
    case "cgpa": return <CgpaCalculatorScreen />;
    default: return <DashboardScreen />;

  }
}
