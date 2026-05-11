// ─── 参加形式アンケートのトークン (Issue #5 / Phase 3) ───────
// hybrid イベントで主催者が予約者に「リアルかオンラインか」を
// 1クリックで答えてもらうための署名付きトークン。
//
// トークン構造: `${bookingId}.${format}.${exp}.${sig}` (base64url)
//   - bookingId : 対象booking
//   - format    : "physical" | "online" (押されたボタン)
//   - exp       : Unix秒の有効期限
//   - sig       : HMAC-SHA256(payload, secret)
//
// 鍵は SUPABASE_SERVICE_ROLE_KEY から派生（追加 env なし）。
// 派生は sha256(SERVICE_ROLE_KEY + ":format-survey-v1") で固定化。
//
// 1クリック完結のため、format は URL に直接含めて署名で改竄を防ぐ。
// ──────────────────────────────────────────────

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type SurveyFormat = "physical" | "online";

export type SurveyPayload = {
  bookingId: string;
  format: SurveyFormat;
  exp: number;
};

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 60; // 60日

function getSecret(serviceRoleKey?: string | null): Buffer {
  const base = serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!base) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to sign survey tokens"
    );
  }
  return createHash("sha256").update(base + ":format-survey-v1").digest();
}

function b64u(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64uDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return Buffer.from(b64, "base64");
}

export function signSurveyToken(
  bookingId: string,
  format: SurveyFormat,
  options?: { ttlSeconds?: number; nowMs?: number; secret?: string | null }
): string {
  if (format !== "physical" && format !== "online") {
    throw new Error(`Invalid format: ${format}`);
  }
  const ttl = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const now = options?.nowMs ?? Date.now();
  const exp = Math.floor(now / 1000) + ttl;
  const payload = `${bookingId}.${format}.${exp}`;
  const sig = createHmac("sha256", getSecret(options?.secret ?? null))
    .update(payload)
    .digest();
  return `${payload}.${b64u(sig)}`;
}

export function verifySurveyToken(
  token: string,
  options?: { nowMs?: number; secret?: string | null }
): SurveyPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [bookingId, format, expStr, sig] = parts;
  if (!bookingId || !format || !expStr || !sig) return null;
  if (format !== "physical" && format !== "online") return null;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= 0) return null;
  const nowSec = Math.floor((options?.nowMs ?? Date.now()) / 1000);
  if (nowSec >= exp) return null;

  const payload = `${bookingId}.${format}.${exp}`;
  const expected = createHmac("sha256", getSecret(options?.secret ?? null))
    .update(payload)
    .digest();

  const got = b64uDecode(sig);
  if (got.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(got, expected)) return null;
  } catch {
    return null;
  }

  return { bookingId, format, exp };
}
