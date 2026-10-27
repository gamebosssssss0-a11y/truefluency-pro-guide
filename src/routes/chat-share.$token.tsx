import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { RichText } from "@/components/rich-text";
import { supabase } from "@/integrations/supabase/client";
import {
  CHAT_SHARE_OFFLINE_MESSAGE,
  readPrivateChatShare,
  readPublicChatShare,
  type SharedConversation,
} from "@/lib/chat-sharing.functions";

export const Route = createFileRoute("/chat-share/$token")({
  component: SharedChatPage,
  head: () => ({
    meta: [
      { title: "Shared Study Chat | TrueFluency Pro" },
      { name: "description", content: "A course conversation shared from TrueFluency Pro." },
      { property: "og:title", content: "Shared Study Chat | TrueFluency Pro" },
      { property: "og:description", content: "A course conversation shared from TrueFluency Pro." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type PageState = "loading" | "ready" | "unavailable" | "offline";

function formattedDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Africa/Lagos",
  }).format(date);
}

function SharedChatPage() {
  const { token } = Route.useParams();
  const [state, setState] = useState<PageState>("loading");
  const [conversation, setConversation] = useState<SharedConversation | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    setState("loading");
    setConversation(null);

    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!alive) return;
        setSignedIn(!!sessionData.session);

        const publicResult = await readPublicChatShare({ data: { token } });
        if (!alive) return;
        if (publicResult.ok) {
          setConversation(publicResult.conversation);
          setState("ready");
          return;
        }
        if (publicResult.reason === CHAT_SHARE_OFFLINE_MESSAGE) {
          setState("offline");
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (!alive) return;
        const hasSession = !!sessionData.session;
        setSignedIn(hasSession);
        if (!hasSession) {
          setState("unavailable");
          return;
        }

        const privateResult = await readPrivateChatShare({ data: { token } });
        if (!alive) return;
        if (privateResult.ok) {
          setConversation(privateResult.conversation);
          setState("ready");
        } else if (privateResult.reason === CHAT_SHARE_OFFLINE_MESSAGE) {
          setState("offline");
        } else {
          setState("unavailable");
        }
      } catch {
        if (alive) setState("unavailable");
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const goSignIn = () => {
    try {
      sessionStorage.setItem("returnTo", `/chat-share/${token}`);
    } catch {
      /* The link can still be reopened manually after sign-in. */
    }
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen px-4 pb-12 pt-6 text-foreground sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-7 flex items-center gap-3">
          <LogoMark className="h-8 w-8 shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F3E6C8]/90 drop-shadow-[0_1px_2px_rgba(27,42,74,0.95)]">
              TrueFluency Pro
            </p>
            <h1 className="font-display text-xl font-semibold text-[#F7F3EA] drop-shadow-[0_1px_2px_rgba(27,42,74,0.95)]">
              Shared Study Chat
            </h1>
          </div>
        </header>

        {state === "loading" ? (
          <div role="status" aria-live="polite" className="flex min-h-48 flex-col items-center justify-center text-center">
            <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-[#E4C46A] drop-shadow-[0_1px_2px_rgba(27,42,74,0.95)]" />
            <p className="mt-3 text-sm text-[#F3E6C8] drop-shadow-[0_1px_2px_rgba(27,42,74,0.95)]">Opening the shared conversation…</p>
          </div>
        ) : state === "offline" ? (
          <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
            <h2 className="font-display text-lg font-semibold">Sharing is temporarily unavailable</h2>
            <p className="mt-2 text-sm text-muted-foreground">{CHAT_SHARE_OFFLINE_MESSAGE}</p>
          </section>
        ) : state === "unavailable" ? (
          <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
            <h2 className="font-display text-lg font-semibold">
              {signedIn ? "This conversation isn't available to this account." : "This conversation link couldn't be opened."}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {signedIn
                ? "The link may have been revoked, or this private conversation belongs to another account. Ask the owner for a public link if you need access."
                : "If this is a private link, sign in with the account that created the conversation. Otherwise, ask the sender for a public link or a fresh link."}
            </p>
            {!signedIn ? (
              <button type="button" onClick={goSignIn} className="mt-4 w-full rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-cream transition hover:bg-navy/90">
                Sign in to TrueFluency Pro
              </button>
            ) : null}
          </section>
        ) : conversation ? (
          <main>
            <section className="mb-6 border-b border-[#E4DCC8]/35 pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F3E6C8]/90 drop-shadow-[0_1px_2px_rgba(27,42,74,0.95)]">
                {conversation.courseCode}
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-[#F7F3EA] drop-shadow-[0_1px_2px_rgba(27,42,74,0.95)]">
                Course conversation
              </h2>
              <p className="mt-2 text-sm text-[#F3E6C8] drop-shadow-[0_1px_2px_rgba(27,42,74,0.95)]">
                {conversation.visibility === "public"
                  ? "Public link · Anyone with this link can view the shared snapshot."
                  : "Private link · Only the account owner can view this conversation."}
                {formattedDate(conversation.createdAt) ? ` · ${formattedDate(conversation.createdAt)}` : ""}
              </p>
            </section>

            <div className="space-y-6">
              {conversation.messages.map((message, index) => message.role === "user" ? (
                <div key={`${message.createdAt ?? "user"}-${index}`} className="ml-auto w-fit max-w-[85%] rounded-2xl border border-[#E4DCC8] bg-[#F3E6C8] p-3.5 text-sm leading-6 text-[#1B2A4A] shadow-sm">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5C5C70]">You</p>
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              ) : (
                <article key={`${message.createdAt ?? "assistant"}-${index}`} className="text-base leading-6">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#F3E6C8]">TrueFluency</p>
                  <RichText tone="canvas">{message.content}</RichText>
                </article>
              ))}
            </div>
            <section className="mt-8 rounded-2xl border border-[#E4DCC8]/40 bg-card p-4 text-card-foreground shadow-sm">
              <h3 className="font-display text-base font-semibold">Continue with TrueFluency</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {signedIn
                  ? "Open the app to keep studying with your account."
                  : "Sign in to continue studying, save your work, and explore the rest of the app."}
              </p>
              <button
                type="button"
                onClick={goSignIn}
                className="mt-3 w-full rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-cream transition hover:bg-navy/90"
              >
                {signedIn ? "Open TrueFluency Pro" : "Continue to sign in"}
              </button>
            </section>
          </main>
        ) : null}
      </div>
    </div>
  );
}
