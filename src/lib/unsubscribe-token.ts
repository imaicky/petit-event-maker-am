// ─── 通知オプトアウトのトークン ─────────────────────────────
// 特定電子メール法・GDPR 等を意識し、配信メール内のワンクリック
// 購読停止リンクで使う署名トークン。
//
// トークン構造: `${followerId}.${organizerId}.${channel}.${exp}.${sig}` (base64url)
// 鍵は SUPABASE_SERVICE_ROLE_KEY 派生（format-survey-token と派生キーは別物）。
// ──────────────────────────────────────────────────────────

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type UnsubscribeChannel = "email" | "line";

export type UnsubscribePayload = {
  followerId: string;
  organizerId: string;
  channel: UnsubscribeChannel;
  exp: number;
};

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 180; // 180日

function getSecret(serviceRoleKey?: string | null): Buffer {
  const base = serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!base) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to sign unsubscribe tokens"
    );
  }
  return createHash("sha256").update(base + ":unsubscribe-v1").digest();
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

export function signUnsubscribeToken(
  followerId: string,
  organizerId: string,
  channel: UnsubscribeChannel,
  options?: { ttlSeconds?: number; nowMs?: number; secret?: string | null }
): string {
  if (channel !== "email" && channel !== "line") {
    throw new Error(`Invalid channel: ${channel}`);
  }
  const ttl = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const now = options?.nowMs ?? Date.now();
  const exp = Math.floor(now / 1000) + ttl;
  const payload = `${followerId}.${organizerId}.${channel}.${exp}`;
  const sig = createHmac("sha256", getSecret(options?.secret ?? null))
    .update(payload)
    .digest();
  return `${payload}.${b64u(sig)}`;
}

export function verifyUnsubscribeToken(
  token: string,
  options?: { nowMs?: number; secret?: string | null }
): UnsubscribePayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [followerId, organizerId, channel, expStr, sig] = parts;
  if (!followerId || !organizerId || !channel || !expStr || !sig) return null;
  if (channel !== "email" && channel !== "line") return null;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= 0) return null;
  const nowSec = Math.floor((options?.nowMs ?? Date.now()) / 1000);
  if (nowSec >= exp) return null;

  const payload = `${followerId}.${organizerId}.${channel}.${exp}`;
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

  return { followerId, organizerId, channel, exp };
}
