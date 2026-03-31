import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushLineMessage } from "@/lib/line";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";

// GET /api/line/messages?line_user_id=xxx — Get message history with a user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const lineUserId = request.nextUrl.searchParams.get("line_user_id");
    if (!lineUserId) {
      return NextResponse.json({ error: "line_user_id is required" }, { status: 400 });
    }

    const { data: lineAccount } = await supabase
      .from("line_accounts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lineAccount) {
      return NextResponse.json({ messages: [] });
    }

    const admin = createAdminClient();
    const { data: messages } = await admin
      .from("line_messages")
      .select("id, direction, message_type, content, created_at")
      .eq("line_account_id", lineAccount.id)
      .eq("line_user_id", lineUserId)
      .order("created_at", { ascending: true })
      .limit(100);

    return NextResponse.json({ messages: messages ?? [] });
  } catch (err) {
    console.error("[GET /api/line/messages] Error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

// POST /api/line/messages — Send a reply (LINE and/or email)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { line_user_id, content, channel } = body as {
      line_user_id: string;
      content: string;
      channel: "line" | "email" | "both";
    };

    if (!line_user_id || !content?.trim()) {
      return NextResponse.json({ error: "メッセージを入力してください" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: lineAccount } = await admin
      .from("line_accounts")
      .select("id, channel_access_token, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lineAccount?.is_active || !lineAccount.channel_access_token) {
      return NextResponse.json({ error: "LINE連携が設定されていません" }, { status: 400 });
    }

    const results: { line?: boolean; email?: boolean } = {};

    // Send via LINE
    if (channel === "line" || channel === "both") {
      const lineResult = await pushLineMessage(
        lineAccount.channel_access_token,
        line_user_id,
        content.trim()
      );

      if (!lineResult.ok) {
        return NextResponse.json(
          { error: `LINE送信に失敗しました: ${lineResult.error}` },
          { status: 502 }
        );
      }
      results.line = true;

      // Save outgoing message
      await admin.from("line_messages").insert({
        line_account_id: lineAccount.id,
        line_user_id,
        direction: "outgoing",
        message_type: "text",
        content: content.trim(),
      });
    }

    // Send via email
    if (channel === "email" || channel === "both") {
      // Find the user's email from bookings or profiles
      const { data: follower } = await admin
        .from("line_followers")
        .select("line_user_id")
        .eq("line_account_id", lineAccount.id)
        .eq("line_user_id", line_user_id)
        .maybeSingle();

      if (follower) {
        // Try to find email via profiles.line_user_id → auth user email
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("line_user_id", line_user_id)
          .maybeSingle();

        if (profile) {
          const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
          if (authUser?.user?.email && process.env.RESEND_API_KEY) {
            await sendBatchEmails({
              to: [authUser.user.email],
              subject: "メッセージが届いています",
              html: wrapInHtml(content.trim(), "メッセージ"),
            });
            results.email = true;
          }
        }
      }

      if (!results.email) {
        // Email not available — if only email was requested, return error
        if (channel === "email") {
          return NextResponse.json(
            { error: "この方のメールアドレスが見つかりませんでした" },
            { status: 404 }
          );
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error("[POST /api/line/messages] Error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
