import { describe, it, expect } from "vitest";
import { bucket, shortenReferrer, aggregateViews, type RawView } from "./analytics";

describe("bucket", () => {
  it("counts and sorts by frequency desc", () => {
    const result = bucket(["a", "b", "a", "c", "b", "a"]);
    expect(result).toEqual([
      { source: "a", count: 3 },
      { source: "b", count: 2 },
      { source: "c", count: 1 },
    ]);
  });

  it("ignores null and undefined", () => {
    const result = bucket(["a", null, undefined, "a", null]);
    expect(result).toEqual([{ source: "a", count: 2 }]);
  });

  it("returns empty for all-null input", () => {
    expect(bucket([null, null, undefined])).toEqual([]);
  });

  it("limits to top 8 by default", () => {
    const items = Array.from({ length: 20 }, (_, i) => `s${i}`);
    const result = bucket(items);
    expect(result.length).toBe(8);
  });

  it("preserves count for high-frequency items even at limit", () => {
    const items = ["a", "a", "a", ...Array.from({ length: 15 }, (_, i) => `s${i}`)];
    const result = bucket(items);
    expect(result[0]).toEqual({ source: "a", count: 3 });
  });
});

describe("shortenReferrer", () => {
  it("extracts hostname and removes www.", () => {
    expect(shortenReferrer("https://www.example.com/path?q=1")).toBe("example.com");
    expect(shortenReferrer("http://example.com/")).toBe("example.com");
    expect(shortenReferrer("https://twitter.com/imatoru/status/123")).toBe("twitter.com");
  });

  it("preserves subdomains other than www", () => {
    expect(shortenReferrer("https://blog.example.com/article")).toBe("blog.example.com");
    expect(shortenReferrer("https://t.co/abc")).toBe("t.co");
  });

  it("returns the original string for non-URL input", () => {
    expect(shortenReferrer("not-a-url")).toBe("not-a-url");
    expect(shortenReferrer("just text")).toBe("just text");
  });

  it("handles null / empty / undefined", () => {
    expect(shortenReferrer(null)).toBeNull();
    expect(shortenReferrer(undefined)).toBeNull();
    expect(shortenReferrer("")).toBeNull();
  });
});

describe("aggregateViews", () => {
  function v(overrides: Partial<RawView> = {}): RawView {
    return {
      user_id: null,
      anon_id: null,
      referrer: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      viewed_at: "2026-05-01T10:00:00Z",
      ...overrides,
    };
  }

  it("returns all-zero for empty input", () => {
    const r = aggregateViews([], []);
    expect(r.total_views).toBe(0);
    expect(r.unique_views).toBe(0);
    expect(r.bookings_confirmed).toBe(0);
    expect(r.conversion_rate).toBe(0);
    expect(r.views_by_day).toEqual([]);
    expect(r.top_referrers).toEqual([]);
  });

  it("counts unique by user_id first", () => {
    const r = aggregateViews(
      [v({ user_id: "u1" }), v({ user_id: "u1" }), v({ user_id: "u2" })],
      []
    );
    expect(r.total_views).toBe(3);
    expect(r.unique_views).toBe(2);
  });

  it("falls back to anon_id when no user_id", () => {
    const r = aggregateViews(
      [v({ anon_id: "a1" }), v({ anon_id: "a1" }), v({ anon_id: "a2" })],
      []
    );
    expect(r.unique_views).toBe(2);
  });

  it("counts views without IDs separately (each as unique)", () => {
    const r = aggregateViews([v({}), v({}), v({})], []);
    // No user_id, no anon_id → each counts as anonymous unique view
    expect(r.unique_views).toBe(3);
  });

  it("aggregates views by day (sorted ascending)", () => {
    const r = aggregateViews(
      [
        v({ viewed_at: "2026-05-03T10:00:00Z" }),
        v({ viewed_at: "2026-05-01T10:00:00Z" }),
        v({ viewed_at: "2026-05-01T15:00:00Z" }),
        v({ viewed_at: "2026-05-02T11:00:00Z" }),
      ],
      []
    );
    expect(r.views_by_day).toEqual([
      { date: "2026-05-01", count: 2 },
      { date: "2026-05-02", count: 1 },
      { date: "2026-05-03", count: 1 },
    ]);
  });

  it("counts bookings by status", () => {
    const r = aggregateViews(
      [],
      [
        { status: "confirmed" },
        { status: "confirmed" },
        { status: "waitlisted" },
        { status: "cancelled" },
        { status: "cancelled" },
        { status: "cancelled" },
      ]
    );
    expect(r.bookings_confirmed).toBe(2);
    expect(r.bookings_waitlisted).toBe(1);
    expect(r.bookings_cancelled).toBe(3);
  });

  it("computes CVR correctly (confirmed / unique_views)", () => {
    const r = aggregateViews(
      [v({ user_id: "u1" }), v({ user_id: "u2" }), v({ user_id: "u3" })],
      [{ status: "confirmed" }, { status: "confirmed" }]
    );
    // 2 confirmed / 3 unique = 66.7%
    expect(r.unique_views).toBe(3);
    expect(r.bookings_confirmed).toBe(2);
    expect(r.conversion_rate).toBeCloseTo(66.7, 1);
  });

  it("CVR is 0 when no views", () => {
    const r = aggregateViews([], [{ status: "confirmed" }]);
    expect(r.conversion_rate).toBe(0);
  });

  it("aggregates referrers and UTM sources", () => {
    const r = aggregateViews(
      [
        v({ referrer: "https://twitter.com/abc", utm_source: "twitter" }),
        v({ referrer: "https://twitter.com/xyz", utm_source: "twitter" }),
        v({ referrer: "https://line.me", utm_source: "line" }),
      ],
      []
    );
    expect(r.top_referrers[0].source).toBe("twitter.com");
    expect(r.top_referrers[0].count).toBe(2);
    expect(r.top_utm_sources[0].source).toBe("twitter");
    expect(r.top_utm_sources[0].count).toBe(2);
  });
});
