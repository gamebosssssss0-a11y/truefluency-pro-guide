import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type CourseRow = { course_code: string; uploads: number; submitted_mocks: number; distinct_students: number };
type FailedRow = { material_id: string; course_code: string; status: string; created_at: string };
type Stats = {
  registered_students: number;
  active_today: number;
  trials_in_7_days: number;
  mock_sets_7_days: number;
  upload_to_practice: number;
  mock_started_7_days: number;
  mock_submitted_events_7_days: number;
  seven_day_depth: number;
  top_courses: CourseRow[];
  pipeline_usable: number;
  pipeline_failed: FailedRow[];
};
type Settings = { maintenance_mode: boolean; maintenance_message: string | null };
const GATES = ["mock_questions", "mock_sets", "flashcard_decks", "chat_messages", "upgrade_cta", "library_uploads"] as const;

function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [gateCounts, setGateCounts] = useState<Record<string, number>>({});
  const [gateCountsError, setGateCountsError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    void (async () => {
      const result = await supabase.rpc("admin_dashboard_stats");
      if (cancelled) return;
      if (result.error || !result.data) {
        const notAuthorized = /not authorized|permission denied/i.test(result.error?.message ?? "");
        setLoadError(notAuthorized
          ? "This signed-in account does not have confirmed admin access. Refresh your session and try again."
          : "The admin dashboard data could not load. Check your connection and retry.");
        return;
      }
      const data = result.data as unknown as Stats;
      setStats(data);
      const settingResult = await supabase
        .from("site_settings")
        .select("maintenance_mode, maintenance_message")
        .eq("id", true)
        .maybeSingle();
      if (cancelled) return;
      if (settingResult.error) {
        setSettingsError("Maintenance settings could not be loaded.");
      } else if (settingResult.data) {
        const next = settingResult.data as Settings;
        setSettings(next);
        setMessage(next.maintenance_message ?? "");
      }
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const counts = await Promise.all(GATES.map(async (gate) => {
        const countResult = await supabase.from("gate_hits").select("gate", { count: "exact", head: true }).eq("gate", gate).gte("created_at", since);
        return { gate, count: countResult.count ?? 0, error: countResult.error };
      }));
      if (!cancelled) {
        const failed = counts.some((item) => item.error);
        setGateCountsError(failed
          ? "Some paywall-hit counts could not be verified. Check admin permissions or the connection; unavailable counts are not shown as zero."
          : null);
        setGateCounts(Object.fromEntries(counts.filter((item) => !item.error).map((item) => [item.gate, item.count])));
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  async function saveSettings(nextMode = settings?.maintenance_mode) {
    if (!settings || nextMode === undefined) return;
    setBusy(true);
    setSettingsError("");
    const result = await supabase.from("site_settings").update({
      maintenance_mode: nextMode,
      maintenance_message: message,
    }).eq("id", true);
    setBusy(false);
    if (result.error) {
      setSettingsError("Could not save maintenance settings.");
      return;
    }
    setSettings({ ...settings, maintenance_mode: nextMode, maintenance_message: message });
  }

  if (!stats) {
    return (
      <main className="min-h-screen bg-background px-5 py-10 text-center text-foreground">
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-2xl font-semibold">
            {loadError ? "Admin dashboard unavailable" : "Checking admin access…"}
          </h1>
          {loadError ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
              <Button className="mt-5" onClick={() => setReloadKey((key) => key + 1)}>Try again</Button>
              <Button variant="outline" className="ml-2 mt-5" onClick={() => window.location.assign("/")}>Back to app</Button>
            </>
          ) : null}
        </div>
      </main>
    );
  }

  const cards = [
    ["Registered students", stats.registered_students],
    ["Active today, Africa/Lagos", stats.active_today],
    ["Trials started (7 days)", stats.trials_in_7_days],
    ["Submitted mocks (7 days)", stats.mock_sets_7_days],
  ] as const;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-5xl space-y-7">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Admin</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Operations overview</h1>
        </header>

        <section aria-label="Student counts" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-display text-3xl font-semibold">{value.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Engagement ratios">
          <article className="rounded-2xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Upload to practice</h2><p className="mt-2 text-2xl font-semibold tabular-nums">{stats.upload_to_practice.toLocaleString()}</p><p className="text-xs text-muted-foreground">Distinct uploads used to start practice in the last 7 days.</p></article>
          <article className="rounded-2xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Mock completion rate</h2><p className="mt-2 text-2xl font-semibold tabular-nums">{stats.mock_started_7_days > 0 ? Math.round((stats.mock_submitted_events_7_days / stats.mock_started_7_days) * 100) : 0}%</p><p className="text-xs text-muted-foreground">{stats.mock_submitted_events_7_days.toLocaleString()} submitted ÷ {stats.mock_started_7_days.toLocaleString()} started · last 7 days</p></article>
          <article className="rounded-2xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">7-day depth</h2><p className="mt-2 text-2xl font-semibold tabular-nums">{Number(stats.seven_day_depth ?? 0).toFixed(2)} days</p><p className="text-xs text-muted-foreground">Average active days per student with recorded activity.</p></article>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-xl font-semibold">Top courses</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="py-2 pr-3">Course</th><th className="py-2 pr-3">Uploads</th><th className="py-2 pr-3">Submitted mocks</th><th className="py-2">Students</th></tr></thead>
              <tbody>{stats.top_courses.map((row, index) => <tr key={row.course_code + index} className="border-t border-border"><td className="py-2.5 pr-3 font-medium">{row.course_code}</td><td className="py-2.5 pr-3">{row.uploads}</td><td className="py-2.5 pr-3">{row.submitted_mocks}</td><td className="py-2.5">{row.distinct_students}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Pipeline health</h2><span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{stats.pipeline_usable} usable</span></div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="py-2 pr-3">Course</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Created</th><th className="py-2">Material ID</th></tr></thead>
              <tbody>{stats.pipeline_failed.map((row) => <tr key={row.material_id} className="border-t border-border"><td className="py-2.5 pr-3">{row.course_code}</td><td className="py-2.5 pr-3">{row.status}</td><td className="py-2.5 pr-3">{new Date(row.created_at).toLocaleString()}</td><td className="py-2.5 font-mono text-xs">{row.material_id}</td></tr>)}</tbody>
            </table>
            {stats.pipeline_failed.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No failed items in the returned window.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-xl font-semibold">Paywall hits · last 7 days</h2>
          {gateCountsError ? <p role="alert" className="mt-2 text-sm text-destructive">{gateCountsError}</p> : null}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {GATES.map((gate) => <div key={gate} className="rounded-xl bg-background p-3"><p className="text-[10px] leading-tight text-muted-foreground">{gate.replaceAll("_", " ")}</p><p className="mt-1 text-xl font-semibold">{gate in gateCounts ? gateCounts[gate] : "—"}</p></div>)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Event metrics begin accumulating from this tracking update; historical events are not backfilled.</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-xl font-semibold">Maintenance notice</h2>
          {settingsError ? <p role="alert" className="mt-2 text-sm text-destructive">{settingsError}</p> : null}
          {settings ? <>
            <label className="mt-3 block text-sm font-medium" htmlFor="maintenance-message">Banner message</label>
            <textarea id="maintenance-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={3} maxLength={240} className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm" />
            <div className="mt-3 flex flex-wrap items-center gap-2"><Button disabled={busy} variant="outline" onClick={() => saveSettings(settings.maintenance_mode)}>{busy ? "Saving…" : "Save message"}</Button><Button disabled={busy} onClick={() => saveSettings(!settings.maintenance_mode)}>{settings.maintenance_mode ? "Turn notice off" : "Turn notice on"}</Button><span className="text-xs text-muted-foreground">Currently {settings.maintenance_mode ? "on" : "off"}</span></div>
          </> : <p className="mt-2 text-sm text-muted-foreground">Settings unavailable.</p>}
        </section>
      </div>
    </main>
  );
}
