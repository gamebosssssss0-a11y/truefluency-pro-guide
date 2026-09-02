import { useProfile, type AppView, type TabKey } from "@/lib/profile-store";
import { Home, ClipboardList, Library, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: { key: TabKey; label: string; icon: typeof Home; view: AppView }[] = [
  { key: "home", label: "Home", icon: Home, view: "home" },
  { key: "mock-tests", label: "Mock Tests", icon: ClipboardList, view: "mock-tests" },
  { key: "library", label: "Library", icon: Library, view: "library" },
  { key: "chatbot", label: "Chatbot", icon: MessageCircle, view: "chatbot" },
  { key: "account", label: "Account", icon: User, view: "account" },
];

/** Which tab a given view belongs to, so the active state stays correct on sub-screens. */
export function tabForView(view: AppView): TabKey {
  switch (view) {
    case "mock-tests":
    case "mock-config":
    case "mock-gen":
    case "mock-run":
    case "mock-result":
    case "test-history":
    case "attempt-review":
      return "mock-tests";
    case "library":
      return "library";
    case "chatbot":
      return "chatbot";
    case "account":
    case "settings":
    case "all-uploads":
    case "cgpa":
    case "cgpa-goal":
    case "flashcards-soon":
    case "add-course":
    case "support":
    case "edit-identity":
    case "disclaimer-view":
      return "account";
    default:
      return "home";
  }
}

/** Views that hide the tab bar so nobody navigates away mid-task. */
export function hidesTabBar(view: AppView): boolean {
  return view === "mock-run" || view === "mock-gen";
}

/**
 * Desktop (>= 768px) top navigation. Same five destinations as the mobile
 * tab bar, no extra items: this is a layout change, not a new feature.
 */
export function TopNavBar() {
  const { view, navigate } = useProfile();
  const active = tabForView(view);

  if (hidesTabBar(view)) return null;

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-40 hidden border-b border-border bg-background/95 backdrop-blur md:block"
    >
      <div className="mx-auto flex w-full max-w-[60rem] items-center gap-6 px-6 py-3">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="flex shrink-0 items-center gap-2"
          aria-label="TrueFluency Pro home"
        >
          <LogoMark className="h-7 w-7" />
          <span className="font-display text-base font-semibold tracking-tight text-foreground">
            TrueFluency <span className="text-accent">Pro</span>
          </span>
        </button>
        <div className="ml-auto flex items-center gap-1">
          {TABS.map((t) => {
            const on = active === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => navigate(t.view)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm transition",
                  on
                    ? "bg-accent/10 font-semibold text-accent"
                    : "font-medium text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className={cn("h-4 w-4", on && "stroke-[2.5]")} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function BottomTabBar() {
  const { view, navigate } = useProfile();
  const active = tabForView(view);

  if (hidesTabBar(view)) return null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {TABS.map((t) => {
          const on = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => navigate(t.view)}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 px-1 pb-2.5 pt-2.5 transition",
                on ? "text-accent" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className={cn("h-5 w-5", on && "stroke-[2.5]")} />
              <span className={cn("text-[10px] leading-none", on ? "font-semibold" : "font-medium")}>
                {t.label}
              </span>
              <span
                className={cn(
                  "h-0.5 w-6 rounded-full transition-colors",
                  on ? "bg-accent" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
