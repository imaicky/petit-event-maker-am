import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";
import { canManageEvent } from "@/lib/check-event-access";

const DAILY_LIMIT = 3;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // 2. Event access check (creator or co-admin)
  const hasAccess = await canManageEvent(supabase, eventId, user.id);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "このイベントへのアクセス権がありません" },
      { status: 403 }
    );
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .single();

  if (!event) {
    return NextResponse.json(
      { error: "イベントが見つかりません" },
      { status: 404 }
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

  // 4. Rate limit check (3 messages/day/event)
  const admin = createAdminClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await admin
    .from("event_messages")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
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

  // 5. Get confirmed attendee emails
  const { data: bookings } = await admin
    .from("bookings")
    .select("guest_email")
    .eq("event_id", eventId)
    .eq("status", "confirmed");

  const emails = [
    ...new Set((bookings ?? []).map((b) => b.guest_email).filter(Boolean)),
  ];

  if (emails.length === 0) {
    return NextResponse.json(
      { error: "送信先の参加者がいません" },
      { status: 400 }
    );
  }

  // 6. Send emails via Resend
  const html = wrapInHtml(message, event.title);

  try {
    const sentCount = await sendBatchEmails({
      to: emails,
      subject,
      html,
    });

    // 7. Save send history
    await admin.from("event_messages").insert({
      event_id: eventId,
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
