import { describe, it, expect } from "vitest";
import { bucket, shortenReferrer } from "./analytics";

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
