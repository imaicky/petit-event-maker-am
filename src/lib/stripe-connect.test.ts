import { describe, it, expect } from "vitest";
import { calcApplicationFee, buildConnectAuthorizeUrl } from "./stripe-connect";

describe("calcApplicationFee", () => {
  it("returns percentage of base amount when fixed=0", () => {
    expect(calcApplicationFee(10000, 5, 0)).toBe(500);
    expect(calcApplicationFee(3000, 5, 0)).toBe(150);
  });

  it("rounds down for fractional yen amounts", () => {
    // 5% of 199 = 9.95 → floor → 9
    expect(calcApplicationFee(199, 5, 0)).toBe(9);
    // 7% of 333 = 23.31 → floor → 23
    expect(calcApplicationFee(333, 7, 0)).toBe(23);
  });

  it("adds fixed fee on top of percentage", () => {
    expect(calcApplicationFee(10000, 5, 100)).toBe(600);
    expect(calcApplicationFee(0, 0, 99)).toBe(99);
  });

  it("returns 0 for zero base + zero fees", () => {
    expect(calcApplicationFee(0, 5, 0)).toBe(0);
  });

  it("handles 0% percentage correctly", () => {
    expect(calcApplicationFee(50000, 0, 200)).toBe(200);
  });

  it("handles edge: full 100% as theoretical case", () => {
    expect(calcApplicationFee(1000, 100, 0)).toBe(1000);
  });

  it("rejects no negative output (sanity check)", () => {
    // calcApplicationFee should never return negative
    const cases = [
      [10000, 5, 0],
      [1, 5, 0],
      [9999, 7.5, 50],
    ] as const;
    for (const [b, p, f] of cases) {
      expect(calcApplicationFee(b, p, f)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("buildConnectAuthorizeUrl", () => {
  const ORIGINAL_ENV = process.env.STRIPE_CONNECT_CLIENT_ID;

  it("throws when client_id is not set", () => {
    delete process.env.STRIPE_CONNECT_CLIENT_ID;
    expect(() =>
      buildConnectAuthorizeUrl({
        state: "abc",
        redirectUri: "https://example.com/callback",
      })
    ).toThrowError(/STRIPE_CONNECT_CLIENT_ID/);
    process.env.STRIPE_CONNECT_CLIENT_ID = ORIGINAL_ENV;
  });

  it("builds a properly encoded authorize URL", () => {
    process.env.STRIPE_CONNECT_CLIENT_ID = "ca_TEST123";
    const url = buildConnectAuthorizeUrl({
      state: "user-abc.random-uuid",
      redirectUri: "https://example.com/api/stripe/connect/callback",
    });
    expect(url).toContain("https://connect.stripe.com/oauth/authorize?");
    expect(url).toContain("response_type=code");
    expect(url).toContain("client_id=ca_TEST123");
    expect(url).toContain("scope=read_write");
    expect(url).toContain(
      "redirect_uri=https%3A%2F%2Fexample.com%2Fapi%2Fstripe%2Fconnect%2Fcallback"
    );
    expect(url).toContain("state=user-abc.random-uuid");
    process.env.STRIPE_CONNECT_CLIENT_ID = ORIGINAL_ENV;
  });

  it("URL-encodes special characters in state and redirect", () => {
    process.env.STRIPE_CONNECT_CLIENT_ID = "ca_X";
    const url = buildConnectAuthorizeUrl({
      state: "a&b=c",
      redirectUri: "https://x.com/?q=1&r=2",
    });
    // Either encoded once is fine, but query string must round-trip safely
    const parsed = new URL(url);
    expect(parsed.searchParams.get("state")).toBe("a&b=c");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://x.com/?q=1&r=2"
    );
    process.env.STRIPE_CONNECT_CLIENT_ID = ORIGINAL_ENV;
  });
});
