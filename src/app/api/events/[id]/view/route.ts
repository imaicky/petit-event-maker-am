import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { recordEventView } from "@/lib/analytics";
import {
  hasRecentView,
  recordInterestFromView,
} from "@/lib/user-interest";

export const dynamic = "force-dynamic";

const ANON_COOKIE = "pem_anon_id";

function makeAnonId(): string {
  // Compact random id (16 bytes hex). No PII.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Cookie で匿名IDを管理（30日）
  const cookieStore = await cookies();
  let anonId = cookieStore.get(ANON_COOKIE)?.value;
  let setCookie = false;
  if (!anonId) {
    anonId = makeAnonId();
    setCookie = true;
  }

  // Auth user (もしログインしていれば紐付け)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // F3-02 興味スコア加点判定（recordEventView の前にチェック）。
  // recordEventView 後だと自分の view が当たって常に「最近見た」になるため、
  // 「事前チェック→ recordEventView →条件成立時に加点」の順で実行する。
  let creditInterest = false;
  if (user?.id) {
    try {
      const recent = await hasRecentView(user.id, eventId);
      creditInterest = !recent;
    } catch {
      // 失敗時は安全側に倒して加点しない
    }
  }

  await recordEventView({
    event_id: eventId,
    user_id: user?.id ?? null,
    anon_id: anonId,
    referrer: typeof body.referrer === "string" ? body.referrer : null,
    utm_source: typeof body.utm_source === "string" ? body.utm_source : null,
    utm_medium: typeof body.utm_medium === "string" ? body.utm_medium : null,
    utm_campaign:
      typeof body.utm_campaign === "string" ? body.utm_campaign : null,
    user_agent: req.headers.get("user-agent"),
  });

  // 加点処理は fire-and-forget（ログだけ残す）
  if (creditInterest && user?.id) {
    recordInterestFromView(user.id, eventId).catch((e) => {
      console.warn(
        "[view] recordInterestFromView failed:",
        e instanceof Error ? e.message : String(e)
      );
    });
  }

  const res = NextResponse.json({ ok: true });
  if (setCookie) {
    res.cookies.set(ANON_COOKIE, anonId, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}
