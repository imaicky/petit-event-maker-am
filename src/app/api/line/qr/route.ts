import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

// GET /api/line/qr?u=<encoded URL>
// 主催者の LINE 友だち追加URLを QR コードPNGで返す。イベントページの
// 「友だち追加」カードに img タグで埋め込んで利用する。
// 任意のURLを受け付けるため、line.me 系のホストだけに制限してSSRF/濫用を防ぐ。

const ALLOWED_HOSTS = new Set([
  "line.me",
  "lin.ee",
  "page.line.me",
]);

export async function GET(request: NextRequest) {
  const u = request.nextUrl.searchParams.get("u");
  if (!u) {
    return NextResponse.json({ error: "u (url) is required" }, { status: 400 });
  }

  // URL を検証
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(parsed.host)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 400 });
  }

  try {
    const buffer = await QRCode.toBuffer(u, {
      type: "png",
      width: 320,
      margin: 1,
      color: { dark: "#1A1A1A", light: "#FFFFFF" },
    });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        // QRは固定URLなので長めにキャッシュ
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    console.error("[line/qr] failed:", err);
    return NextResponse.json({ error: "QR生成に失敗しました" }, { status: 500 });
  }
}
