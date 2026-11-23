import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsentBanner } from "@/components/cookie-consent";

function NotFoundComponent() {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/index")) {
    window.location.replace("/" + window.location.search);
    return null;
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {errorMessage || "Something went wrong on our end. You can try refreshing or head back home."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// Consent Mode defaults; must run before any tag loads.
const CONSENT_DEFAULTS = 'window.dataLayer = window.dataLayer || [];\nfunction gtag() {\n  dataLayer.push(arguments);\n}\ngtag("consent", "default", {\n  analytics_storage: "granted",\n  ad_storage: "granted",\n  ad_user_data: "granted",\n  ad_personalization: "granted",\n});\ngtag("consent", "default", {\n  analytics_storage: "denied",\n  ad_storage: "denied",\n  ad_user_data: "denied",\n  ad_personalization: "denied",\n  wait_for_update: 500,\n  region:\n    "AT,BE,BG,HR,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IE,IT,LV,LT,LU,MT,NL,PL,PT,RO,SK,SI,ES,SE,IS,LI,NO,GB,CH,RE,GP,MQ,GF,YT,MF,AX,CA-QC".split(\n      ",",\n    ),\n});\n(function () {\n  var signals = {\n    analytics: ["analytics_storage"],\n    advertising: ["ad_storage", "ad_user_data", "ad_personalization"],\n  };\n  for (var purpose in signals) {\n    var choice = null;\n    try {\n      var saved = JSON.parse(localStorage.getItem("cookie_consent_" + purpose) || "null");\n      if (\n        saved &&\n        (saved.choice === "denied" || (saved.choice === "granted" && Date.now() - saved.at < 365 * 86400000))\n      ) {\n        choice = saved.choice;\n      }\n    } catch (e) {}\n    if (navigator.globalPrivacyControl === true) choice = "denied";\n    if (!choice) continue;\n    var update = {};\n    signals[purpose].forEach(function (signal) {\n      update[signal] = choice;\n    });\n    gtag("consent", "update", update);\n  }\n})();\n';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/index" || location.pathname === "/index/") {
      throw redirect({
        to: "/",
        search: location.search,
        replace: true,
      });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, interactive-widget=resizes-content" },
      { name: "google-site-verification", content: "xEvr3Eu6d1Zjae6BP1Anhv20kYksnNs2OyDCdUv6v28" },
      { title: "TrueFluency Pro: AI Exam Prep for UI Students" },
      { name: "description", content: "AI-powered past-paper predictions, mock tests, study plans and CGPA tools for University of Ibadan students." },
      { property: "og:title", content: "TrueFluency Pro: AI Exam Prep for UI Students" },
      { property: "og:description", content: "AI-powered past-paper predictions, mock tests, study plans and CGPA tools for University of Ibadan students." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "TrueFluency Pro" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TrueFluency Pro: AI Exam Prep for UI Students" },
    ],
    scripts: [
      { children: CONSENT_DEFAULTS },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://truefluency.app/#organization",
              name: "TrueFluency Pro",
              url: "https://truefluency.app",
              description:
                "AI-powered exam preparation for University of Ibadan students, with past-paper topic predictions, mock tests and CGPA planning tools.",
            },
            {
              "@type": "WebSite",
              "@id": "https://truefluency.app/#website",
              name: "TrueFluency Pro",
              url: "https://truefluency.app",
              description:
                "AI exam prep for University of Ibadan students: predicted topics, AI mock tests and study plans built from your own course materials.",
              publisher: { "@id": "https://truefluency.app/#organization" },
              inLanguage: "en",
            },
          ],
        }),
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/truefluency-mark.jpg", type: "image/jpeg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: `try { const dark = localStorage.getItem('truefluency-theme') === 'dark'; document.documentElement.classList.toggle('dark', dark); document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; } catch {}` }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function MaintenanceBanner() {
  const location = useRouterState({ select: (state) => state.location.href });
  const [settings, setSettings] = useState<{ maintenance_mode: boolean; maintenance_message: string | null } | null>(null);
  useEffect(() => {
    let active = true;
    void supabase.from("site_settings").select("maintenance_mode, maintenance_message").eq("id", true).maybeSingle()
      .then(({ data }) => { if (active && data) setSettings(data); });
    return () => { active = false; };
  }, [location]);
  if (!settings?.maintenance_mode) return null;
  return (
    <div aria-live="polite">
      <div role="status" className="flex min-h-[56px] items-center justify-center bg-[#B86E0A] px-4 py-3 text-center text-sm font-medium text-[#1B2A4A]">
        {settings.maintenance_message?.trim() || "We’re doing some maintenance. You can keep using the app."}
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <MaintenanceBanner />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      {/* Mounted once: without it every toast() call in the app is silent. */}
      <Toaster />
      <CookieConsentBanner />
    </QueryClientProvider>
  );
}
