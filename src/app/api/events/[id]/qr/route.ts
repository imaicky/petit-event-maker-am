import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/events/[id]/qr ─────────────────────────────────
// イベント詳細URLのQRコード画像 (PNG) を返す。
//
// クエリ:
//   size: PNG縦横ピクセル数 (default 512, max 2048)
//   download: 1 を付けるとブラウザがダウンロードする
//
// 公開エンドポイント（限定公開イベントの URL も入るが、URL自体が秘匿前提なのでOK）。

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const url = new URL(request.url);
  const sizeParam = url.searchParams.get("size");
  const downloadFlag = url.searchParams.get("download") === "1";
  const size = Math.min(2048, Math.max(128, Number(sizeParam) || 512));

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "サーバー設定エラー" },
      { status: 500 }
    );
  }

  // shortcode を確認して、なければ /events/[id] を使う
  const admin = createAdminClient();
  const { data } = await admin
    .from("events")
    .select("short_code, title")
    .eq("id", eventId)
    .maybeSingle();
  if (!data) {
    return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  }
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://petit-event-maker-am.vercel.app";
  const eventUrl = data.short_code
    ? `${baseUrl}/e/${data.short_code}`
    : `${baseUrl}/events/${eventId}`;

  try {
    const buffer = await QRCode.toBuffer(eventUrl, {
      errorCorrectionLevel: "M",
      width: size,
      margin: 2,
      color: {
        dark: "#1A1A1A",
        light: "#FFFFFF",
      },
    });

    const filenameSafe = (data.title || "event")
      .replace(/[^a-zA-Z0-9\u3000-\u9FFF]/g, "_")
      .slice(0, 30);
    const headers: HeadersInit = {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    };
    if (downloadFlag) {
      headers["Content-Disposition"] = `attachment; filename="${filenameSafe}_qr.png"`;
    }
    // Buffer → Uint8Array に変換（Next.js の Response 型は BodyInit を要求）
    const body = new Uint8Array(buffer);
    return new NextResponse(body, { headers });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "QR生成失敗" },
      { status: 500 }
    );
  }
}
