import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLineSignature, getLineUserProfile, pushLineMessage } from "@/lib/line";

const NOTIFY_ON_TRIGGERS = [
  "通知ON",
  "通知オン",
  "通知開始",
  "通知をオン",
  "通知を有効",
  "notify on",
  "/notify on",
];
const NOTIFY_OFF_TRIGGERS = [
  "通知OFF",
  "通知オフ",
  "通知停止",
  "通知をオフ",
  "通知を無効",
  "notify off",
  "/notify off",
];

function matchesTrigger(text: string, triggers: string[]): boolean {
  const norm = text.trim().toLowerCase();
  return triggers.some((t) => norm === t.toLowerCase());
}

type LineEvent = {
  type: string;
  source?: { type: string; userId?: string };
  replyToken?: string;
  message?: {
    id: string;
    type: string;
    text?: string;
  };
};

type LineWebhookBody = {
  destination: string;
  events: LineEvent[];
};

// ─── POST /api/line/webhook ─────────────────────────────────
// LINE Platform sends webhook events here.
// Always returns 200 to prevent LINE from retrying.

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[webhook] SUPABASE_SERVICE_ROLE_KEY is not set");
      return NextResponse.json({ status: "ok" });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-line-signature") ?? "";

    let body: LineWebhookBody;
    try {
      body = JSON.parse(rawBody) as LineWebhookBody;
    } catch {
      console.error("[webhook] Invalid JSON body");
      return NextResponse.json({ status: "ok" });
    }

    const { destination, events } = body;
    if (!destination) {
      console.error("[webhook] No destination in body");
      return NextResponse.json({ status: "ok" });
    }

    // Look up the line_account by bot_user_id
    const admin = createAdminClient();
    const { data: lineAccount, error: laErr } = await admin
      .from("line_accounts")
      .select("id, channel_access_token, channel_secret, notify_line_user_ids")
      .eq("bot_user_id", destination)
      .maybeSingle();

    if (laErr || !lineAccount) {
      console.error("[webhook] line_account not found for destination:", destination, laErr);
      return NextResponse.json({ status: "ok" });
    }

    // Verify signature
    if (!lineAccount.channel_secret) {
      console.error("[webhook] channel_secret not set for account:", lineAccount.id);
      return NextResponse.json({ status: "ok" });
    }

    if (!verifyLineSignature(rawBody, signature, lineAccount.channel_secret)) {
      console.error("[webhook] Invalid signature");
      return NextResponse.json({ status: "ok" });
    }

    // Process events
    for (const event of events) {
      const userId = event.source?.userId;
      if (!userId) continue;

      if (event.type === "follow") {
        // Get user profile
        let displayName: string | null = null;
        let pictureUrl: string | null = null;

        const profile = await getLineUserProfile(lineAccount.channel_access_token, userId);
        if (profile.ok) {
          displayName = profile.data.displayName;
          pictureUrl = profile.data.pictureUrl ?? null;
        }

        // Upsert follower
        await admin
          .from("line_followers")
          .upsert(
            {
              line_account_id: lineAccount.id,
              line_user_id: userId,
              display_name: displayName,
              picture_url: pictureUrl,
              is_following: true,
              followed_at: new Date().toISOString(),
              unfollowed_at: null,
            },
            { onConflict: "line_account_id,line_user_id" }
          );
      } else if (event.type === "unfollow") {
        await admin
          .from("line_followers")
          .update({
            is_following: false,
            unfollowed_at: new Date().toISOString(),
          })
          .eq("line_account_id", lineAccount.id)
          .eq("line_user_id", userId);
      } else if (event.type === "message" && event.message) {
        // Save incoming message (skip duplicates from LINE retries)
        const msg = event.message;
        if (msg.id) {
          const { data: existing } = await admin
            .from("line_messages")
            .select("id")
            .eq("line_message_id", msg.id)
            .limit(1)
            .maybeSingle();
          if (existing) continue;
        }

        const content = msg.type === "text" && msg.text ? msg.text : `[${msg.type}]`;

        await admin.from("line_messages").insert({
          line_account_id: lineAccount.id,
          line_user_id: userId,
          direction: "incoming",
          message_type: msg.type,
          content,
          line_message_id: msg.id,
        });

        // Notification opt-in/out commands (multi-admin support)
        if (msg.type === "text" && msg.text && lineAccount.channel_access_token) {
          const text = msg.text;
          const currentIds: string[] = (
            (lineAccount as { notify_line_user_ids?: string[] | null })
              .notify_line_user_ids ?? []
          );

          if (matchesTrigger(text, NOTIFY_ON_TRIGGERS)) {
            if (!currentIds.includes(userId)) {
              const next = [...currentIds, userId];
              await admin
                .from("line_accounts")
                .update({ notify_line_user_ids: next })
                .eq("id", lineAccount.id);
              await pushLineMessage(
                lineAccount.channel_access_token,
                userId,
                "✅ 通知を有効化しました\n\n以後、新規予約や決済完了などの主催者通知がこのアカウントに届きます。\n\n停止するには「通知OFF」と送信してください。"
              ).catch(() => {});
            } else {
              await pushLineMessage(
                lineAccount.channel_access_token,
                userId,
                "ℹ️ すでに通知が有効です。"
              ).catch(() => {});
            }
          } else if (matchesTrigger(text, NOTIFY_OFF_TRIGGERS)) {
            if (currentIds.includes(userId)) {
              const next = currentIds.filter((id) => id !== userId);
              await admin
                .from("line_accounts")
                .update({ notify_line_user_ids: next })
                .eq("id", lineAccount.id);
              await pushLineMessage(
                lineAccount.channel_access_token,
                userId,
                "🔕 通知を停止しました\n\n再度有効にするには「通知ON」と送信してください。"
              ).catch(() => {});
            } else {
              await pushLineMessage(
                lineAccount.channel_access_token,
                userId,
                "ℹ️ 通知は元から無効です。"
              ).catch(() => {});
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[webhook] Unexpected error:", err);
    // Always return 200 to LINE
    return NextResponse.json({ status: "ok" });
  }
}
