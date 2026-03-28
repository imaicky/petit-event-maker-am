import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@supabase/supabase-js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) return null;

  // Prefer service_role key (bypasses RLS), fall back to anon key
  const key = serviceRoleKey || anonKey;
  if (!key) return null;

  return createBrowserClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  const storageClient = getStorageClient();
  if (!storageClient) {
    return NextResponse.json(
      { error: "Supabase環境変数が設定されていません" },
      { status: 503 }
    );
  }

  try {
    // Use cookie-based client for auth check
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが選択されていません" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "対応形式: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズは5MB以下にしてください" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await storageClient.storage
      .from("event-images")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[POST /api/upload] Storage error:", uploadError.message);
      // Return specific error for debugging
      const msg = uploadError.message.includes("not found")
        ? "Storageバケット 'event-images' が存在しません。Supabaseダッシュボードで作成してください。"
        : uploadError.message.includes("security") ||
            uploadError.message.includes("policy") ||
            uploadError.message.includes("permission")
          ? "Storageのアクセス権限エラーです。SUPABASE_SERVICE_ROLE_KEYを設定してください。"
          : `アップロードエラー: ${uploadError.message}`;
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = storageClient.storage.from("event-images").getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/upload] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
