import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/line/conversations — List conversations (grouped by follower)
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { data: lineAccount } = await supabase
      .from("line_accounts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lineAccount) {
      return NextResponse.json({ conversations: [] });
    }

    const admin = createAdminClient();

    // Get all followers with their latest message
    const { data: followers } = await admin
      .from("line_followers")
      .select("id, line_user_id, display_name, picture_url, is_following")
      .eq("line_account_id", lineAccount.id)
      .order("followed_at", { ascending: false });

    if (!followers || followers.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Get latest message for each follower
    const conversations = [];
    for (const f of followers) {
      const { data: lastMsg } = await admin
        .from("line_messages")
        .select("content, direction, created_at")
        .eq("line_account_id", lineAccount.id)
        .eq("line_user_id", f.line_user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get unread count (incoming messages we haven't replied to)
      const { count: unreadCount } = await admin
        .from("line_messages")
        .select("*", { count: "exact", head: true })
        .eq("line_account_id", lineAccount.id)
        .eq("line_user_id", f.line_user_id)
        .eq("direction", "incoming")
        .gt(
          "created_at",
          // Get the latest outgoing message time, or epoch
          await (async () => {
            const { data: lastOut } = await admin
              .from("line_messages")
              .select("created_at")
              .eq("line_account_id", lineAccount.id)
              .eq("line_user_id", f.line_user_id)
              .eq("direction", "outgoing")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            return lastOut?.created_at ?? "1970-01-01T00:00:00Z";
          })()
        );

      // Only include followers who have at least one message
      if (lastMsg) {
        conversations.push({
          follower: f,
          last_message: lastMsg,
          unread_count: unreadCount ?? 0,
        });
      }
    }

    // Sort by latest message time
    conversations.sort(
      (a, b) =>
        new Date(b.last_message.created_at).getTime() -
        new Date(a.last_message.created_at).getTime()
    );

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("[GET /api/line/conversations] Error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
