import { describe, it, expect, vi } from "vitest";
import {
  isSuperAdmin,
  canManageEvent,
  isEventCreator,
} from "./check-event-access";

// Helper: build a mock Supabase client matching the SupabaseClient interface
type MockChain = Record<string, ReturnType<typeof vi.fn>> & {
  // terminal that returns a Promise-like
  then?: (cb: (r: unknown) => unknown) => unknown;
};

function makeChain(result: { data?: unknown; error?: unknown }): MockChain {
  const chain: MockChain = {};
  const fns = ["select", "eq", "single", "maybeSingle"];
  for (const fn of fns) {
    chain[fn] = vi.fn(() => chain);
  }
  // single / maybeSingle resolve to result
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeSupabase({
  user,
  eventCreatorId,
  isAdminAccepted,
}: {
  user: { id: string; email: string } | null;
  eventCreatorId?: string | null;
  isAdminAccepted?: boolean;
}) {
  const fromMap: Record<string, MockChain> = {
    events: makeChain({
      data: eventCreatorId !== undefined ? { creator_id: eventCreatorId } : null,
    }),
    event_admins: makeChain({
      data: isAdminAccepted ? { id: "admin-row" } : null,
    }),
  };
  return {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user } })),
    },
    from: vi.fn((table: string) => fromMap[table] ?? makeChain({})),
  } as unknown as Parameters<typeof isSuperAdmin>[0];
}

describe("isSuperAdmin", () => {
  it("returns true for known super-admin email", async () => {
    const supabase = makeSupabase({
      user: { id: "u1", email: "imatoru@gmail.com" },
    });
    expect(await isSuperAdmin(supabase, "u1")).toBe(true);
  });

  it("returns false for non-super-admin email", async () => {
    const supabase = makeSupabase({
      user: { id: "u2", email: "stranger@example.com" },
    });
    expect(await isSuperAdmin(supabase, "u2")).toBe(false);
  });

  it("returns false for unauthenticated user", async () => {
    const supabase = makeSupabase({ user: null });
    expect(await isSuperAdmin(supabase, "u1")).toBe(false);
  });

  it("returns false when userId mismatch (CSRF-like check)", async () => {
    const supabase = makeSupabase({
      user: { id: "real-user", email: "imatoru@gmail.com" },
    });
    expect(await isSuperAdmin(supabase, "spoofed-user")).toBe(false);
  });
});

describe("canManageEvent", () => {
  it("returns true when user is the event creator", async () => {
    const supabase = makeSupabase({
      user: { id: "u1", email: "u1@example.com" },
      eventCreatorId: "u1",
    });
    expect(await canManageEvent(supabase, "ev1", "u1")).toBe(true);
  });

  it("returns true when user is accepted co-admin", async () => {
    const supabase = makeSupabase({
      user: { id: "u2", email: "u2@example.com" },
      eventCreatorId: "u1",
      isAdminAccepted: true,
    });
    expect(await canManageEvent(supabase, "ev1", "u2")).toBe(true);
  });

  it("returns false when user has no relation to event", async () => {
    const supabase = makeSupabase({
      user: { id: "u3", email: "u3@example.com" },
      eventCreatorId: "u1",
      isAdminAccepted: false,
    });
    expect(await canManageEvent(supabase, "ev1", "u3")).toBe(false);
  });

  it("returns true for super-admin even when not creator nor admin", async () => {
    const supabase = makeSupabase({
      user: { id: "su", email: "imatoru@gmail.com" },
      eventCreatorId: "u1",
      isAdminAccepted: false,
    });
    expect(await canManageEvent(supabase, "ev1", "su")).toBe(true);
  });

  it("returns false when event does not exist", async () => {
    const supabase = makeSupabase({
      user: { id: "u1", email: "u1@example.com" },
      eventCreatorId: null, // event not found
    });
    expect(await canManageEvent(supabase, "ev-missing", "u1")).toBe(false);
  });
});

describe("isEventCreator", () => {
  it("returns true when user owns the event", async () => {
    const supabase = makeSupabase({
      user: { id: "u1", email: "u1@example.com" },
      eventCreatorId: "u1",
    });
    expect(await isEventCreator(supabase, "ev1", "u1")).toBe(true);
  });

  it("returns false when user does not own", async () => {
    const supabase = makeSupabase({
      user: { id: "u2", email: "u2@example.com" },
      eventCreatorId: "u1",
    });
    expect(await isEventCreator(supabase, "ev1", "u2")).toBe(false);
  });

  it("does not promote co-admin to creator", async () => {
    const supabase = makeSupabase({
      user: { id: "u2", email: "u2@example.com" },
      eventCreatorId: "u1",
      isAdminAccepted: true,
    });
    expect(await isEventCreator(supabase, "ev1", "u2")).toBe(false);
  });
});
