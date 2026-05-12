import { describe, it, expect } from "vitest";
import {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./unsubscribe-token";

const SECRET = "test-key-for-unsub-1234567890";

describe("signUnsubscribeToken / verifyUnsubscribeToken", () => {
  it("round-trip preserves followerId, organizerId, channel", () => {
    const t = signUnsubscribeToken("f-1", "o-2", "email", { secret: SECRET });
    const p = verifyUnsubscribeToken(t, { secret: SECRET });
    expect(p).not.toBeNull();
    expect(p!.followerId).toBe("f-1");
    expect(p!.organizerId).toBe("o-2");
    expect(p!.channel).toBe("email");
  });

  it("line channel also works", () => {
    const t = signUnsubscribeToken("f-1", "o-2", "line", { secret: SECRET });
    const p = verifyUnsubscribeToken(t, { secret: SECRET });
    expect(p!.channel).toBe("line");
  });

  it("rejects token signed with different secret", () => {
    const t = signUnsubscribeToken("f-1", "o-2", "email", { secret: SECRET });
    expect(verifyUnsubscribeToken(t, { secret: "other" })).toBeNull();
  });

  it("rejects channel tampering", () => {
    const t = signUnsubscribeToken("f-1", "o-2", "email", { secret: SECRET });
    const parts = t.split(".");
    parts[2] = "line";
    expect(verifyUnsubscribeToken(parts.join("."), { secret: SECRET })).toBeNull();
  });

  it("rejects organizerId tampering", () => {
    const t = signUnsubscribeToken("f-1", "o-2", "email", { secret: SECRET });
    const parts = t.split(".");
    parts[1] = "o-attacker";
    expect(verifyUnsubscribeToken(parts.join("."), { secret: SECRET })).toBeNull();
  });

  it("rejects expired tokens", () => {
    const past = Date.now() - 60 * 60 * 1000;
    const t = signUnsubscribeToken("f-1", "o-2", "email", {
      secret: SECRET,
      ttlSeconds: 1,
      nowMs: past,
    });
    expect(verifyUnsubscribeToken(t, { secret: SECRET })).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyUnsubscribeToken("", { secret: SECRET })).toBeNull();
    expect(verifyUnsubscribeToken("a.b.c", { secret: SECRET })).toBeNull();
    expect(
      verifyUnsubscribeToken("a.b.c.d.e.f", { secret: SECRET })
    ).toBeNull();
  });

  it("rejects invalid channel value", () => {
    expect(() =>
      // @ts-expect-error 意図的に型違反
      signUnsubscribeToken("f-1", "o-2", "sms", { secret: SECRET })
    ).toThrow();
  });
});
