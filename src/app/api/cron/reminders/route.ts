import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBatchEmails } from "@/lib/email";
import { buildReminderEmailHtml } from "@/lib/email-templates";
import {
  buildReminderFlexBubble,
  multicastFlexMessage,
} from "@/lib/line";

// ─── GET /api/cron/reminders ────────────────────────────────
// Called daily by Vercel cron. Sends 24h and 2h reminders.
// Since Hobby plan only supports daily crons, we widen windows:
// - "24h reminder": events happening 24-48h from now
// - "2h reminder": events happening 0-24h from now

export async function GET(request: Request) {
  // Verify cron secret (Vercel sets this header)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Missing service role key" }, { status: 500 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://petit-event-maker-am.vercel.app";

  let sent24h = 0;
  let sent2h = 0;

  // ─── 24-hour reminders (events in 24-48h) ──────────────
  const from24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const to24h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: events24h } = await admin
    .from("events")
    .select("id, title, datetime, location, price, capacity, image_url, short_code, creator_id")
    .eq("is_published", true)
    .eq("reminder_24h_sent", false)
    .gte("datetime", from24h.toISOString())
    .lt("datetime", to24h.toISOString());

  for (const event of events24h ?? []) {
    sent24h += await sendReminders(admin, event, "明日開催", "24時間前リマインダー", baseUrl, "reminder_24h_sent");
  }

  // ─── Day-of reminders (events in 0-24h) ────────────────
  const from2h = new Date(now.getTime());
  const to2h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: events2h } = await admin
    .from("events")
    .select("id, title, datetime, location, price, capacity, image_url, short_code, creator_id")
    .eq("is_published", true)
    .eq("reminder_2h_sent", false)
    .gte("datetime", from2h.toISOString())
    .lt("datetime", to2h.toISOString());

  for (const event of events2h ?? []) {
    sent2h += await sendReminders(admin, event, "まもなく開催", "2時間前リマインダー", baseUrl, "reminder_2h_sent");
  }

  return NextResponse.json({
    ok: true,
    sent_24h: sent24h,
    sent_2h: sent2h,
    checked_at: now.toISOString(),
  });
}

type EventForReminder = {
  id: string;
  title: string;
  datetime: string;
  location: string | null;
  price: number;
  capacity: number | null;
  image_url: string | null;
  short_code: string | null;
  creator_id: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendReminders(
  admin: any,
  event: EventForReminder,
  timeLabel: string,
  emailSubjectPrefix: string,
  baseUrl: string,
  sentColumn: "reminder_24h_sent" | "reminder_2h_sent"
): Promise<number> {
  // Get confirmed bookings
  const { data: bookings } = await admin
    .from("bookings")
    .select("guest_email, guest_name, user_id")
    .eq("event_id", event.id)
    .eq("status", "confirmed");

  if (!bookings || bookings.length === 0) {
    // Mark as sent even if no bookings
    await admin.from("events").update({ [sentColumn]: true }).eq("id", event.id);
    return 0;
  }

  const dateStr = new Date(event.datetime).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Send emails
  const emails = bookings.map((b: { guest_email: string }) => b.guest_email);
  const subject = `【${emailSubjectPrefix}】${event.title}`;
  const html = buildReminderEmailHtml(event.title, dateStr, event.location ?? "未定", timeLabel);

  if (process.env.RESEND_API_KEY) {
    await sendBatchEmails({ to: emails, subject, html }).catch((err) => {
      console.error(`[reminders] email error for event ${event.id}:`, err);
    });
  }

  // Send LINE reminders if creator has LINE account
  if (event.creator_id) {
    try {
      const { data: lineAccount } = await admin
        .from("line_accounts")
        .select("id, channel_access_token, is_active")
        .eq("user_id", event.creator_id)
        .maybeSingle();

      if (lineAccount?.is_active && lineAccount.channel_access_token) {
        // Find bookings where user has a line_user_id and is also a follower
        const userIds = bookings
          .filter((b: { user_id: string | null }) => b.user_id)
          .map((b: { user_id: string }) => b.user_id);

        if (userIds.length > 0) {
          const { data: profiles } = await admin
            .from("profiles")
            .select("line_user_id")
            .in("id", userIds)
            .not("line_user_id", "is", null);

          const lineUserIds = (profiles ?? [])
            .map((p: { line_user_id: string | null }) => p.line_user_id)
            .filter(Boolean) as string[];

          // Also check follower status
          if (lineUserIds.length > 0) {
            const { data: followers } = await admin
              .from("line_followers")
              .select("line_user_id")
              .eq("line_account_id", lineAccount.id)
              .eq("is_following", true)
              .in("line_user_id", lineUserIds);

            const activeLineUserIds = (followers ?? []).map(
              (f: { line_user_id: string }) => f.line_user_id
            );

            if (activeLineUserIds.length > 0) {
              const bubble = buildReminderFlexBubble(
                { ...event, booking_count: bookings.length },
                baseUrl,
                timeLabel
              );
              await multicastFlexMessage(
                lineAccount.channel_access_token,
                activeLineUserIds,
                `🔔 ${timeLabel}: ${event.title}`,
                bubble
              );
            }
          }
        }
      }
    } catch (err) {
      console.error(`[reminders] LINE error for event ${event.id}:`, err);
    }
  }

  // Mark as sent
  await admin.from("events").update({ [sentColumn]: true }).eq("id", event.id);

  return bookings.length;
}
