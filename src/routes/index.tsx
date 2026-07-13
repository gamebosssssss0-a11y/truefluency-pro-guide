import { createFileRoute } from "@tanstack/react-router";
import { ProfileProvider, useProfile } from "@/lib/profile-store";
import { SplashScreen } from "@/components/onboarding/splash";
import { DisclaimerScreen, DisclaimerBlockedScreen } from "@/components/onboarding/disclaimer";
import { IdentityScreen } from "@/components/onboarding/identity";
import {
  FacultyScreen,
  DepartmentScreen,
  LevelScreen,
  CoursesScreen,
} from "@/components/onboarding/profile-setup";
import { DashboardScreen } from "@/components/dashboard";

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
  const { step } = useProfile();
  switch (step) {
    case "splash": return <SplashScreen />;
    case "disclaimer": return <DisclaimerScreen />;
    case "disclaimer-blocked": return <DisclaimerBlockedScreen />;
    case "identity": return <IdentityScreen />;
    case "faculty": return <FacultyScreen />;
    case "department": return <DepartmentScreen />;
    case "level": return <LevelScreen />;
    case "courses": return <CoursesScreen />;
    case "dashboard": return <DashboardScreen />;
  }
}
