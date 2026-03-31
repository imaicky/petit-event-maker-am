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
    const accountId = lineAccount.id;

    // Get all followers
    const { data: followers, error: fErr } = await admin
      .from("line_followers")
      .select("id, line_user_id, display_name, picture_url, is_following")
      .eq("line_account_id", accountId)
      .order("followed_at", { ascending: false });

    if (fErr || !followers || followers.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Batch: get all messages for this account ordered by created_at desc
    const followerLineIds = followers.map((f) => f.line_user_id);
    const { data: allMessages } = await admin
      .from("line_messages")
      .select("line_user_id, content, direction, created_at")
      .eq("line_account_id", accountId)
      .in("line_user_id", followerLineIds)
      .order("created_at", { ascending: false });

    const messages = allMessages ?? [];

    // Group messages by line_user_id
    const msgByUser = new Map<string, typeof messages>();
    for (const m of messages) {
      const arr = msgByUser.get(m.line_user_id) ?? [];
      arr.push(m);
      msgByUser.set(m.line_user_id, arr);
    }

    // Build conversations
    const conversations = [];
    for (const f of followers) {
      const userMsgs = msgByUser.get(f.line_user_id);
      if (!userMsgs || userMsgs.length === 0) continue;

      const lastMsg = userMsgs[0]; // already sorted desc

      // Find last outgoing message time
      const lastOutgoing = userMsgs.find((m) => m.direction === "outgoing");
      const lastOutTime = lastOutgoing?.created_at ?? "1970-01-01T00:00:00Z";

      // Count unread: incoming messages after last outgoing
      const unreadCount = userMsgs.filter(
        (m) => m.direction === "incoming" && m.created_at > lastOutTime
      ).length;

      conversations.push({
        follower: f,
        last_message: {
          content: lastMsg.content,
          direction: lastMsg.direction,
          created_at: lastMsg.created_at,
        },
        unread_count: unreadCount,
      });
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
