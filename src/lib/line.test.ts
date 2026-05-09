import { describe, it, expect } from "vitest";
import {
  buildBookingNotifyText,
  buildCancellationNotifyText,
  buildWaitlistNotifyText,
  buildWaitlistPromotionNotifyText,
  verifyLineSignature,
} from "./line";

describe("buildBookingNotifyText", () => {
  it("includes event title and guest name", () => {
    const r = buildBookingNotifyText("ヨガ教室", "山田 花子", 3, 10);
    expect(r).toContain("ヨガ教室");
    expect(r).toContain("山田 花子");
    expect(r).toContain("📩");
  });

  it("shows capacity when provided", () => {
    const r = buildBookingNotifyText("X", "Y", 5, 10);
    expect(r).toContain("現在5名／定員10名");
  });

  it("omits capacity when null", () => {
    const r = buildBookingNotifyText("X", "Y", 5, null);
    expect(r).toContain("現在5名");
    expect(r).not.toContain("定員");
  });
});

describe("buildCancellationNotifyText", () => {
  it("indicates cancellation", () => {
    const r = buildCancellationNotifyText("ヨガ", "Y", 2, 10);
    expect(r).toContain("キャンセル");
    expect(r).toContain("Y");
    expect(r).toContain("現在2名／定員10名");
  });

  it("handles null capacity", () => {
    const r = buildCancellationNotifyText("ヨガ", "Y", 2, null);
    expect(r).not.toContain("定員");
  });
});

describe("buildWaitlistNotifyText", () => {
  it("includes wait list count", () => {
    const r = buildWaitlistNotifyText("ヨガ", "Y", 3);
    expect(r).toContain("待ち3名");
    expect(r).toContain("📋");
  });
});

describe("buildWaitlistPromotionNotifyText", () => {
  it("indicates promotion", () => {
    const r = buildWaitlistPromotionNotifyText("ヨガ", "Y", 5, 10);
    expect(r).toContain("繰り上がり");
    expect(r).toContain("確定");
    expect(r).toContain("現在5名／定員10名");
  });
});

describe("verifyLineSignature", () => {
  // LINE webhook の HMAC-SHA256 署名検証
  // 既知の入力に対して正しい signature が通る/通らないことを確認

  it("accepts valid signature", () => {
    const secret = "test-secret";
    const body = '{"events":[]}';
    // 既知の正しい signature（手計算）
    // node -e "console.log(require('crypto').createHmac('sha256','test-secret').update('{\"events\":[]}').digest('base64'))"
    // 結果は環境固有なので、計算してから verify
    const crypto = require("node:crypto");
    const validSig = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("base64");
    expect(verifyLineSignature(body, validSig, secret)).toBe(true);
  });

  it("rejects tampered signature", () => {
    const secret = "test-secret";
    const body = '{"events":[]}';
    const wrongSig = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    expect(verifyLineSignature(body, wrongSig, secret)).toBe(false);
  });

  it("rejects when body is modified after signing", () => {
    const secret = "test-secret";
    const body = '{"events":[]}';
    const crypto = require("node:crypto");
    const sig = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("base64");
    // 本文を改ざん
    const tampered = '{"events":[{"type":"hack"}]}';
    expect(verifyLineSignature(tampered, sig, secret)).toBe(false);
  });

  it("rejects empty signature", () => {
    expect(verifyLineSignature("body", "", "secret")).toBe(false);
  });
});
