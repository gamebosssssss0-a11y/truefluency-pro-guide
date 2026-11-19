import type { CSSProperties } from "react";
import { useNavigation, type AppView, type TabKey } from "@/lib/profile-store";
import { Home, ClipboardList, Library, User, Sun, Moon, MessageCircle } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

const TABS: { key: TabKey; label: string; icon: typeof Home; view: AppView }[] = [
  { key: "home", label: "Home", icon: Home, view: "home" },
  { key: "mock-tests", label: "Practice", icon: ClipboardList, view: "mock-tests" },
  { key: "library", label: "My Files", icon: Library, view: "library" },
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
    case "flashcards":
    case "flashcards-review":
      return "mock-tests";
    case "library":
    case "course-detail":
      return "library";
    case "chatbot":
    case "account":
    case "settings":
    case "all-uploads":
    case "cgpa":
    case "cgpa-goal":
    case "upgrade":
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
  return view === "mock-run" || view === "mock-gen" || view === "flashcards-review" || view === "chatbot" || view === "chat-history";
}

/**
 * Desktop (>= 768px) top navigation. Same four destinations as the mobile
 * tab bar, no extra items: this is a layout change, not a new feature.
 */
export function TopNavBar({ highlightedView }: { highlightedView?: AppView | null } = {}) {
  const { view, navigate } = useNavigation();
  const active = tabForView(highlightedView ?? view);
  const { theme, toggle } = useTheme();

  if (hidesTabBar(view)) return null;

  return (
    <nav
      aria-label="Desktop primary navigation"
      className="sticky top-0 z-40 hidden border-b border-border bg-background md:block"
    >
      <div className="mx-auto flex w-full max-w-[52rem] items-center gap-6 px-6 py-3">
        <button
          type="button"
          onClick={() => navigate("home", { replace: true })}
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
                onClick={() => navigate(t.view, { replace: true })}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 flex-col items-center justify-center rounded-lg px-3 py-2 text-sm transition",
                  on ? "font-semibold text-accent" : "font-medium text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <t.icon className={cn("h-4 w-4", on && "stroke-[2.5]")} />
                  {t.label}
                </span>
                <span
                  className={cn(
                    "mt-1 h-0.5 w-5 rounded-full",
                    on ? "bg-accent" : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
          <button
            type="button"
            data-verilo-entry=""
            onClick={() => navigate("chatbot")}
            aria-label="Open Verilo"
            className="ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-3 text-sm font-semibold text-foreground transition hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageCircle className="h-4 w-4 text-accent" aria-hidden="true" /> Verilo
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 transition-transform duration-200 motion-safe:animate-in motion-safe:spin-in-90" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </nav>
  );

}

export function BottomTabBar() {
  const { view, navigate } = useNavigation();
  const active = tabForView(view);
  const activeIndex = TABS.findIndex((tab) => tab.key === active);

  if (hidesTabBar(view)) return null;

  return (
    <nav
      aria-label="Mobile navigation"
      data-mobile-tab-bar=""
      style={{ "--tab-progress": activeIndex } as CSSProperties}
      className="mobile-tab-bar fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-40 h-[68px] rounded-3xl border border-border bg-card/90 shadow-[0_4px_16px_rgba(27,42,74,0.08)] backdrop-blur-[16px] md:hidden"
    >
      <div
        className="relative mx-auto flex h-full w-full items-stretch px-1 [container-type:inline-size]"
      >
        <span
          aria-hidden="true"
          data-tab-indicator
          data-tab-indicator-track=""
          className="pointer-events-none absolute bottom-[6px] left-[12.5%] z-10 h-[3px] w-7 -translate-x-1/2 rounded-full transition-[translate,transform] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            translate: "calc(var(--tab-progress, 0) * 25cqi) 0",
            opacity: 1,
            backgroundColor: "var(--tab-light-color)",
            boxShadow: "0 0 10px color-mix(in srgb, var(--tab-light-color) 45%, transparent)",
          }}
        />
        {TABS.map((t) => {
          const on = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => navigate(t.view, { replace: true })}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 pb-2 pt-1 transition",
                on ? "text-[var(--tf-gold-ink)] dark:text-[var(--tf-gold-bright)]" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className={cn("h-[22px] w-[22px]", on && "stroke-[2.5]")} />
              <span className={cn("text-xs leading-4", on ? "font-semibold" : "font-medium")}>
                {t.label}
              </span>
              <span aria-hidden="true" className="h-0.5 w-7 rounded-full bg-transparent" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
