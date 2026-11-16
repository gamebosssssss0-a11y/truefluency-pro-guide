import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MOCK_SHARE_OFFLINE_MESSAGE = "Mock sharing isn't available right now.";
const cleanToken = (value: unknown) => {
  const token = typeof value === "string" ? value.trim() : "";
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error("This mock link is no longer available.");
  return token;
};
const cleanAttemptId = (value: unknown) => {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id || id.length > 128) throw new Error("This completed mock could not be found.");
  return id;
};
function sharingReady() {
  return Boolean(process.env["SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"]);
}

export const createMockShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string; visibility: "public" | "private" }) => {
    const visibility: "public" | "private" | null = input?.visibility === "public" ? "public" : input?.visibility === "private" ? "private" : null;
    if (!visibility) throw new Error("Choose who can view this mock.");
    return { attemptId: cleanAttemptId(input?.attemptId), visibility };
  })
  .handler(async ({ data, context }) => {
    if (!sharingReady()) return { ok: false as const, reason: MOCK_SHARE_OFFLINE_MESSAGE };
    try {
      const { createOwnedMockShare } = await import("@/lib/mock-sharing.server");
      const share = await createOwnedMockShare(context.userId, data.attemptId, data.visibility);
      return { ok: true as const, ...share };
    } catch (error) {
      return { ok: false as const, reason: error instanceof Error ? error.message : "Couldn't create this share link." };
    }
  });

export const readPublicMockShare = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => ({ token: cleanToken(input?.token) }))
  .handler(async ({ data }) => {
    if (!sharingReady()) return { ok: false as const, reason: MOCK_SHARE_OFFLINE_MESSAGE };
    try {
      const { readMockShare } = await import("@/lib/mock-sharing.server");
      const mock = await readMockShare(data.token, false);
      return mock ? { ok: true as const, mock } : { ok: false as const, reason: "This mock link is no longer available." };
    } catch {
      return { ok: false as const, reason: "This mock link is no longer available." };
    }
  });

export const readPracticeMockShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => ({ token: cleanToken(input?.token) }))
  .handler(async ({ data, context }) => {
    if (!sharingReady()) return { ok: false as const, reason: MOCK_SHARE_OFFLINE_MESSAGE };
    try {
      const { readMockShare } = await import("@/lib/mock-sharing.server");
      const mock = await readMockShare(data.token, true, context.userId);
      return mock ? { ok: true as const, mock } : { ok: false as const, reason: "This mock link is no longer available." };
    } catch {
      return { ok: false as const, reason: "This mock link is no longer available." };
    }
  });

export const readSignedInMockShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => ({ token: cleanToken(input?.token) }))
  .handler(async ({ data, context }) => {
    if (!sharingReady()) return { ok: false as const, reason: MOCK_SHARE_OFFLINE_MESSAGE };
    try {
      const { readMockShare } = await import("@/lib/mock-sharing.server");
      const mock = await readMockShare(data.token, false, context.userId);
      return mock ? { ok: true as const, mock } : { ok: false as const, reason: "This mock link is no longer available." };
    } catch {
      return { ok: false as const, reason: "This mock link is no longer available." };
    }
  });

export const getMockShareStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string }) => ({ attemptId: cleanAttemptId(input?.attemptId) }))
  .handler(async ({ data, context }) => {
    if (!sharingReady()) return { ok: false as const, reason: MOCK_SHARE_OFFLINE_MESSAGE };
    try {
      const { getOwnedMockShareStatus } = await import("@/lib/mock-sharing.server");
      return { ok: true as const, share: await getOwnedMockShareStatus(context.userId, data.attemptId) };
    } catch {
      return { ok: false as const, reason: "Couldn't load this mock link." };
    }
  });

export const revokeMockShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attemptId: string }) => ({ attemptId: cleanAttemptId(input?.attemptId) }))
  .handler(async ({ data, context }) => {
    if (!sharingReady()) return { ok: false as const, reason: MOCK_SHARE_OFFLINE_MESSAGE };
    try {
      const { revokeOwnedMockShare } = await import("@/lib/mock-sharing.server");
      return { ok: true as const, share: await revokeOwnedMockShare(context.userId, data.attemptId) };
    } catch {
      return { ok: false as const, reason: "Couldn't revoke this mock link." };
    }
  });
