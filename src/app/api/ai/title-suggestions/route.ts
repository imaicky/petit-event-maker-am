import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTitleSuggestions, isClaudeAvailable } from "@/lib/claude";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ─── POST /api/ai/title-suggestions ──────────────────────────
// イベント作成・編集中にAIタイトル案を3つ返す。
// 認証必須（誰でも叩けるとAPIキー消費が暴走するため）。
//
// Body: { description: string, category?: string | null }
// Response: { suggestions: [{ title, why }, ...] } | { error }

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  if (!isClaudeAvailable()) {
    return NextResponse.json(
      { error: "AI機能が利用できません（ANTHROPIC_API_KEY 未設定）" },
      { status: 503 }
    );
  }

  let body: { description?: string; category?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const description = (body.description ?? "").trim();
  if (description.length < 20) {
    return NextResponse.json(
      { error: "説明文を20文字以上入力してから生成してください" },
      { status: 400 }
    );
  }
  if (description.length > 4000) {
    return NextResponse.json(
      { error: "説明文が長すぎます（4000文字以内）" },
      { status: 400 }
    );
  }

  try {
    const suggestions = await generateTitleSuggestions({
      description,
      category: body.category ?? null,
    });
    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI生成に失敗しました" },
      { status: 500 }
    );
  }
}
