import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";

const DAILY_LIMIT = 3;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: menuId } = await params;

  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // 2. Menu ownership check
  const { data: menu } = await supabase
    .from("menus")
    .select("id, title, creator_id")
    .eq("id", menuId)
    .single();

  if (!menu || menu.creator_id !== user.id) {
    return NextResponse.json(
      { error: "このメニューへのアクセス権がありません" },
      { status: 403 }
    );
  }

  // 3. Parse request body
  const body = await request.json();
  const { subject, message } = body as {
    subject?: string;
    message?: string;
  };

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: "件名と本文を入力してください" },
      { status: 400 }
    );
  }

  // 4. Rate limit check (3 messages/day/menu)
  const admin = createAdminClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await admin
    .from("menu_messages")
    .select("id", { count: "exact", head: true })
    .eq("menu_id", menuId)
    .eq("sender_id", user.id)
    .gte("created_at", todayStart.toISOString());

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `1日のメッセージ送信上限（${DAILY_LIMIT}通）に達しました。明日以降に再度お試しください。`,
      },
      { status: 429 }
    );
  }

  // 5. Get confirmed booking emails
  const { data: bookings } = await admin
    .from("menu_bookings")
    .select("guest_email")
    .eq("menu_id", menuId)
    .eq("status", "confirmed");

  const emails = [
    ...new Set((bookings ?? []).map((b) => b.guest_email).filter(Boolean)),
  ];

  if (emails.length === 0) {
    return NextResponse.json(
      { error: "送信先の申込者がいません" },
      { status: 400 }
    );
  }

  // 6. Send emails via Resend
  const html = wrapInHtml(message, menu.title);

  try {
    const sentCount = await sendBatchEmails({
      to: emails,
      subject,
      html,
    });

    // 7. Save send history
    await admin.from("menu_messages").insert({
      menu_id: menuId,
      sender_id: user.id,
      subject,
      body: message,
      recipient_count: sentCount,
    });

    return NextResponse.json({ sent: sentCount });
  } catch {
    return NextResponse.json(
      { error: "メール送信に失敗しました。しばらくしてから再度お試しください。" },
      { status: 500 }
    );
  }
}
