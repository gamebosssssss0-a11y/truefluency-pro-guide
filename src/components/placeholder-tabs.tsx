import { useProfile } from "@/lib/profile-store";
import { HeaderLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Library, MessageCircle, Sparkles } from "lucide-react";

function ComingSoonTab({
  title, tagline, icon: Icon, bullets,
}: {
  title: string;
  tagline: string;
  icon: typeof Library;
  bullets: string[];
}) {
  const { navigate } = useProfile();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-8 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <HeaderLogo />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
        </div>

        <div className="mt-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold text-foreground">{title}</h1>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="h-3 w-3" /> Coming soon
          </span>
          <p className="mx-auto mt-3 max-w-xs text-sm text-muted-foreground">{tagline}</p>
        </div>

        <div className="mt-8 space-y-2">
          {bullets.map((b) => (
            <div key={b} className="rounded-2xl border border-dashed border-border bg-card/60 p-3.5 text-xs text-muted-foreground">
              {b}
            </div>
          ))}
        </div>

        <Button variant="outline" className="mt-8 w-full" onClick={() => navigate("home")}>
          Back to Home
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          This tab is a placeholder. Nothing here is functional yet, and we would rather say so than
          fake it.
        </p>
      </div>
    </div>
  );
}

export function LibrarySoonScreen() {
  return (
    <ComingSoonTab
      title="Library"
      icon={Library}
      tagline="One place for your uploaded material, saved summaries, and shared past papers."
      bullets={[
        "Browse everything you've uploaded by course, semester, and file type.",
        "Saved topic summaries generated from your own material.",
        "For now, your uploads live under Account, then All my uploads.",
      ]}
    />
  );
}

export function ChatbotSoonScreen() {
  return (
    <ComingSoonTab
      title="Chatbot"
      icon={MessageCircle}
      tagline="Ask questions about your own course material and get answers grounded in it."
      bullets={[
        "Answers cite the slide or past paper they came from.",
        "Follow-up questions on anything you got wrong in a mock test.",
        "For now, the explanation on each reviewed question is your best guide.",
      ]}
    />
  );
}
