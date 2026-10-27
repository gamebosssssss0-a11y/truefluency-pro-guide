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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
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
      { rel: "icon", href: "/favicon.png", type: "image/png" },
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
        <script dangerouslySetInnerHTML={{ __html: `try { const dark = window.matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.classList.toggle('dark', dark); document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; } catch {}` }} />
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
    </QueryClientProvider>
  );
}
