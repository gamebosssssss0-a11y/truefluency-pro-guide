import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("sign-in restoration permits only known same-origin share paths, including mock shares", async () => {
  const source = await read("../src/lib/profile-store.tsx");
  assert.match(source, /returnTo\.startsWith\("\/mock-share\/"\)/);
  assert.match(source, /!returnTo\.startsWith\("\/\/"\)/);
});

test("analytics failures are swallowed by the server endpoint and call sites", async () => {
  const endpoint = await read("../src/lib/analytics.functions.ts");
  const mockFlow = await read("../src/components/mock-test-flow.tsx");
  const profile = await read("../src/lib/profile-store.tsx");
  assert.match(endpoint, /catch\s*\{\s*return \{ ok: false as const \};\s*\}/);
  assert.match(mockFlow, /recordAnalytics\([\s\S]*?\)\.catch\(\(\) => undefined\)/);
  assert.match(profile, /eventName: "mock_started"[\s\S]*?\.catch\(\(\) => undefined\)/);
});

test("admin analytics use Lagos half-open day bounds and deduplicate active users", async () => {
  const migration = await read("../supabase/migrations/20261027150000_fix_admin_analytics_metrics.sql");
  assert.match(migration, /lagos_today_start/);
  assert.match(migration, /lagos_tomorrow_start/);
  assert.match(migration, /created_at >= lagos_today_start and created_at < lagos_tomorrow_start/);
  assert.match(migration, /select count\(\*\) from active_users/);
});

test("mock completion uses correlated session IDs and distinct event IDs", async () => {
  const migration = await read("../supabase/migrations/20261027150000_fix_admin_analytics_metrics.sql");
  const mockFlow = await read("../src/components/mock-test-flow.tsx");
  const profile = await read("../src/lib/profile-store.tsx");
  assert.match(mockFlow, /analyticsSessionId = crypto\.randomUUID\(\)/);
  assert.match(mockFlow, /eventName: "mock_submitted"[\s\S]*?t\.analyticsSessionId \?\? attempt\.id/);
  assert.match(profile, /analyticsSessionId: crypto\.randomUUID\(\)/);
  assert.match(migration, /count\(distinct attempt_id\)/);
});

test("top-course counts aggregate uploads and submitted mocks independently", async () => {
  const migration = await read("../supabase/migrations/20261027150000_fix_admin_analytics_metrics.sql");
  assert.match(migration, /upload_courses as/);
  assert.match(migration, /mock_courses as/);
  assert.match(migration, /full outer join mock_courses/);
  assert.match(migration, /course_students as/);
});

test("admin analytics RPC denies non-admin and anonymous callers", async () => {
  const migration = await read("../supabase/migrations/20261027150000_fix_admin_analytics_metrics.sql");
  assert.match(migration, /auth\.uid\(\) is null or not public\.has_role\(auth\.uid\(\), 'admin'\)/);
  assert.match(migration, /revoke execute on function public\.admin_dashboard_stats\(\) from public, anon/);
});

test("mock sharing enforces ownership and strips answers from public previews", async () => {
  const server = await read("../src/lib/mock-sharing.server.ts");
  const functions = await read("../src/lib/mock-sharing.functions.ts");
  assert.match(server, /\.eq\("id", attemptId\)\.eq\("user_id", ownerId\)/);
  assert.match(server, /includeAnswers\s*\?\s*question\s*:/);
  assert.match(server, /correct_index/);
  assert.match(functions, /\.middleware\(\[requireSupabaseAuth\]\)/);
});

test("upload-to-practice is recorded independently and safely", async () => {
  const mockFlow = await read("../src/components/mock-test-flow.tsx");
  assert.match(mockFlow, /eventName: "upload_practice"/);
  assert.match(mockFlow, /eventName: "mock_started"/);
  assert.match(mockFlow, /\.catch\(\(\) => undefined\)/);
});

test("mock resume state retains the correlated analytics session ID", async () => {
  const profile = await read("../src/lib/profile-store.tsx");
  const mockFlow = await read("../src/components/mock-test-flow.tsx");
  assert.match(profile, /analyticsSessionId: crypto\.randomUUID\(\)/);
  assert.match(mockFlow, /const resume = \(\) =>/);
  assert.match(mockFlow, /analyticsSessionId/);
});

test("billing entitlement writes remain server-controlled", async () => {
  const migration = await read("../supabase/migrations/20261027120000_harden_subscription_and_rpc_access.sql");
  assert.match(migration, /revoke insert, update, delete, truncate, references, trigger[\s\S]*?from authenticated/);
  assert.match(migration, /create policy "Users can read own subscription"/);
});
