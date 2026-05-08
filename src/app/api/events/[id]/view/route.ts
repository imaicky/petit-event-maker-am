import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { recordEventView } from "@/lib/analytics";

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
