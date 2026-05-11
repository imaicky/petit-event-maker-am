import { describe, it, expect } from "vitest";
import {
  signSurveyToken,
  verifySurveyToken,
} from "./format-survey-token";

const SECRET = "test-service-role-key-1234567890abcdef";

describe("signSurveyToken / verifySurveyToken", () => {
  it("ラウンドトリップで bookingId と format を取り出せる", () => {
    const t = signSurveyToken("b-1", "physical", { secret: SECRET });
    const p = verifySurveyToken(t, { secret: SECRET });
    expect(p).not.toBeNull();
    expect(p!.bookingId).toBe("b-1");
    expect(p!.format).toBe("physical");
  });

  it("online でも往復する", () => {
    const t = signSurveyToken("b-2", "online", { secret: SECRET });
    const p = verifySurveyToken(t, { secret: SECRET });
    expect(p!.format).toBe("online");
  });

  it("別の鍵で検証すると null", () => {
    const t = signSurveyToken("b-1", "physical", { secret: SECRET });
    expect(verifySurveyToken(t, { secret: "other-secret" })).toBeNull();
  });

  it("token を改ざんすると null（format を書き換え）", () => {
    const t = signSurveyToken("b-1", "physical", { secret: SECRET });
    // bookingId.format.exp.sig → format を online に差し替え
    const parts = t.split(".");
    parts[1] = "online";
    const tampered = parts.join(".");
    expect(verifySurveyToken(tampered, { secret: SECRET })).toBeNull();
  });

  it("token を改ざんすると null（bookingId を書き換え）", () => {
    const t = signSurveyToken("b-1", "physical", { secret: SECRET });
    const parts = t.split(".");
    parts[0] = "b-attacker";
    expect(verifySurveyToken(parts.join("."), { secret: SECRET })).toBeNull();
  });

  it("exp 切れは null", () => {
    const past = Date.now() - 60 * 60 * 1000; // 1時間前
    const t = signSurveyToken("b-1", "physical", {
      secret: SECRET,
      ttlSeconds: 1, // 1秒で切れる
      nowMs: past,
    });
    // 現在時刻で検証 → 既に exp 過ぎ
    expect(verifySurveyToken(t, { secret: SECRET })).toBeNull();
  });

  it("不正な format（攻撃者が無効な値を埋め込む）は null", () => {
    // 直接無効な format で署名できない
    expect(() =>
      // @ts-expect-error 意図的に型違反
      signSurveyToken("b-1", "trickster", { secret: SECRET })
    ).toThrow();
  });

  it("欠損した token は null", () => {
    expect(verifySurveyToken("", { secret: SECRET })).toBeNull();
    expect(verifySurveyToken("a.b.c", { secret: SECRET })).toBeNull();
    expect(verifySurveyToken("a.b.c.d.e", { secret: SECRET })).toBeNull();
  });

  it("無効な exp（数字でない）は null", () => {
    const t = signSurveyToken("b-1", "physical", { secret: SECRET });
    const parts = t.split(".");
    parts[2] = "notanumber";
    expect(verifySurveyToken(parts.join("."), { secret: SECRET })).toBeNull();
  });
});
