import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────
const mockAuth = { getUser: vi.fn() };
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: mockAuth,
    })
  ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Helper to make a chainable mock
function makeChainable(result: { count?: number; data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  const fns: Array<keyof typeof chain> = [
    "select",
    "eq",
    "neq",
    "in",
    "delete",
    "insert",
    "update",
  ];
  for (const fn of fns) {
    chain[fn] = vi.fn(() => chain);
  }
  // terminal methods
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  // when select() returns: it can be awaited directly OR chained then awaited
  // We attach `then` so `await chain.select(...).eq(...)` resolves
  (chain as { then: (cb: (r: unknown) => unknown) => unknown }).then = (cb) =>
    cb(result);
  return chain;
}

// ─── Tests ────────────────────────────────────────────────────────
import {
  getFollowerCount,
  getFollowState,
  follow,
  unfollow,
} from "./follows";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getFollowerCount", () => {
  it("returns count from supabase", async () => {
    const chain = makeChainable({ count: 42 });
    mockFrom.mockReturnValue(chain);

    const result = await getFollowerCount("org-1");
    expect(result).toBe(42);
    expect(mockFrom).toHaveBeenCalledWith("follows");
  });

  it("returns 0 when count is null", async () => {
    const chain = makeChainable({ count: null as unknown as number });
    mockFrom.mockReturnValue(chain);

    const result = await getFollowerCount("org-1");
    expect(result).toBe(0);
  });
});

describe("getFollowState", () => {
  it("returns isFollowing=false when user is anonymous", async () => {
    const chain = makeChainable({ count: 10 });
    mockFrom.mockReturnValue(chain);
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const state = await getFollowState("org-1");
    expect(state).toEqual({ isFollowing: false, followerCount: 10 });
  });

  it("returns isFollowing=false when user equals organizer (self)", async () => {
    const chain = makeChainable({ count: 5 });
    mockFrom.mockReturnValue(chain);
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "org-1" } },
    });

    const state = await getFollowState("org-1");
    expect(state).toEqual({ isFollowing: false, followerCount: 5 });
  });

  it("returns isFollowing=true when follow record exists", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      // First call: count query
      if (callCount === 1) return makeChainable({ count: 7 });
      // Second call: maybeSingle for follow record
      return makeChainable({ data: { id: "follow-uuid" } });
    });
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const state = await getFollowState("org-1");
    expect(state).toEqual({ isFollowing: true, followerCount: 7 });
  });

  it("returns isFollowing=false when no follow record", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChainable({ count: 3 });
      return makeChainable({ data: null });
    });
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const state = await getFollowState("org-1");
    expect(state).toEqual({ isFollowing: false, followerCount: 3 });
  });
});

describe("follow", () => {
  it("rejects self-follow attempt", async () => {
    const result = await follow("user-1", "user-1");
    expect(result).toEqual({
      ok: false,
      error: "自分自身をフォローすることはできません",
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns ok on successful insert", async () => {
    const chain = makeChainable({ error: null });
    mockFrom.mockReturnValue(chain);

    const result = await follow("user-1", "org-1");
    expect(result).toEqual({ ok: true });
  });

  it("treats unique_violation (23505) as success (idempotent)", async () => {
    const chain = makeChainable({
      error: { code: "23505", message: "duplicate" },
    });
    mockFrom.mockReturnValue(chain);

    const result = await follow("user-1", "org-1");
    expect(result).toEqual({ ok: true });
  });

  it("returns error for other DB errors", async () => {
    const chain = makeChainable({
      error: { code: "42501", message: "permission denied" },
    });
    mockFrom.mockReturnValue(chain);

    const result = await follow("user-1", "org-1");
    expect(result).toEqual({ ok: false, error: "permission denied" });
  });
});

describe("unfollow", () => {
  it("returns ok on successful delete", async () => {
    const chain = makeChainable({ error: null });
    mockFrom.mockReturnValue(chain);

    const result = await unfollow("user-1", "org-1");
    expect(result).toEqual({ ok: true });
  });

  it("returns error on DB failure", async () => {
    const chain = makeChainable({
      error: { code: "42501", message: "permission denied" },
    });
    mockFrom.mockReturnValue(chain);

    const result = await unfollow("user-1", "org-1");
    expect(result).toEqual({ ok: false, error: "permission denied" });
  });
});
