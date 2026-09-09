/**
 * Public one-file landing page. A link opens exactly one file: title, course,
 * peer alias, expiry, in-app view and Save. No download, no locker browsing.
 * Every bad token (miss, expired, revoked, used up) shows the same line.
 */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo-mark";
import { readOneFileLink, savePeerFile, SHARING_OFFLINE_MESSAGE } from "@/lib/library.functions";

const GONE = "This link is no longer available.";

export const Route = createFileRoute("/s/$token")({
  component: SharedFilePage,
  head: () => ({
    meta: [
      { title: "Shared course file: TrueFluency Pro" },
      {
        name: "description",
        content:
          "A coursemate shared one course file with you on TrueFluency Pro. View it in the app and save it to your locker.",
      },
      { property: "og:title", content: "Shared course file: TrueFluency Pro" },
      {
        property: "og:description",
        content: "A coursemate shared one course file with you on TrueFluency Pro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Share = {
  file_name: string;
  file_type: string;
  course_code: string;
  peer_alias: string;
  previewUrl: string | null;
  usesLeft: number;
  maxUses: number;
  readyForMocks: boolean;
};

function typeColor(fileType: string): string {
  const t = fileType.toLowerCase();
  if (t === "pdf") return "#8B2E2E";
  if (t === "doc" || t === "docx") return "#1D4E89";
  if (t === "ppt" || t === "pptx") return "#B86E0A";
  return "#1B2A4A";
}

function SharedFilePage() {
  const { token } = Route.useParams();
  const [state, setState] = useState<"loading" | "ready" | "gone" | "signin">("loading");
  const [share, setShare] = useState<Share | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const result = await readOneFileLink({ data: { token } });
        if (!alive) return;
        if (!result.ok) {
          setState("gone");
          return;
        }
        setShare(result.share);
        setState("ready");
      } catch {
        if (alive) setState("signin");
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const onSave = async () => {
    setSaving(true);
    const result = await savePeerFile({ data: { token, courseCode: share?.course_code } });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    toast.success("Saved to your locker.");
  };

  return (
    <div className="min-h-screen bg-[#F7F3EA]">
      <div className="mx-auto max-w-md px-5 pb-16 pt-6 md:max-w-2xl">
        <div className="mb-5 flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5C5C70]">
            Shared file
          </span>
        </div>

        <div className="rounded-2xl border border-[#E4DCC8] bg-white p-4">
          {state === "loading" ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#5C5C70]" />
          ) : state === "gone" ? (
            <>
              <h1 className="font-display text-xl font-semibold text-[#1B2A4A]">{GONE}</h1>
              <p className="mt-2 text-sm text-[#5C5C70]">
                Ask your coursemate for a fresh link, or open your own Library in the app.
              </p>
            </>
          ) : state === "signin" ? (
            <>
              <h1 className="font-display text-xl font-semibold text-[#1B2A4A]">
                Sign in to open this file
              </h1>
              <p className="mt-2 text-sm text-[#5C5C70]">
                One-file links only open for TrueFluency Pro accounts. Sign in, then open this link
                again.
              </p>
              <Button
                className="mt-4 h-12 w-full text-white"
                style={{ backgroundColor: "#B86E0A" }}
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Go to TrueFluency Pro
              </Button>
            </>
          ) : share ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ backgroundColor: typeColor(share.file_type) }}
                >
                  {share.file_type.toUpperCase().slice(0, 4)}
                </span>
                <span className="text-xs font-semibold text-[#1B2A4A]">{share.course_code}</span>
              </div>
              <h1 className="mt-2 break-words font-display text-xl font-semibold text-[#1B2A4A]">
                {share.file_name}
              </h1>
              <p className="mt-1 text-sm text-[#5C5C70]">
                Shared by {share.peer_alias} · {share.usesLeft} of {share.maxUses} saves left ·
                expires within 7 days
              </p>
              <p className="mt-1 text-[11px] text-[#5C5C70]">This link is one file only.</p>

              <div className="mt-4 h-[52vh] overflow-hidden rounded-xl border border-[#E4DCC8] bg-[#F7F3EA]">
                {share.previewUrl ? (
                  <iframe src={share.previewUrl} title={share.file_name} className="h-full w-full" />
                ) : (
                  <div className="grid h-full place-items-center px-6 text-center text-sm text-[#5C5C70]">
                    {SHARING_OFFLINE_MESSAGE}
                  </div>
                )}
              </div>

              <Button
                className="mt-4 h-12 w-full text-white"
                style={{ backgroundColor: "#B86E0A" }}
                onClick={() => void onSave()}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save to my locker"}
              </Button>
              <p className="mt-2 text-[11px] text-[#5C5C70]">
                Viewing happens in the app. There is no download.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
