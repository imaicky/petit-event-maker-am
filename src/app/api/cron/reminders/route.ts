import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBatchEmails } from "@/lib/email";
import { buildReminderEmailHtml, wrapInHtml } from "@/lib/email-templates";
import {
  buildReminderFlexBubble,
  multicastFlexMessage,
} from "@/lib/line";
import { logPaymentEvent } from "@/lib/payment-audit";

// ─── GET /api/cron/reminders ────────────────────────────────
// Called daily by Vercel cron. Sends 24h and 2h reminders.
// Since Hobby plan only supports daily crons, we widen windows:
// - "24h reminder": events happening 24-48h from now
// - "day-of reminder": events happening 0-24h from now

export async function GET(request: Request) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Missing service role key" }, { status: 500 });
  }

  try {
    const admin = createAdminClient();
    const now = new Date();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://petit-event-maker-am.vercel.app";

    let sent24h = 0;
    let sent2h = 0;
    const errors: string[] = [];

    // ─── 24-hour reminders (events in 24-48h) ──────────────
    const from24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const to24h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const { data: events24h, error: err24h } = await admin
      .from("events")
      .select("id, title, datetime, location, location_type, online_url, zoom_meeting_id, zoom_passcode, price, capacity, image_url, short_code, creator_id")
      .eq("is_published", true)
      .eq("reminder_24h_sent", false)
      .gte("datetime", from24h.toISOString())
      .lt("datetime", to24h.toISOString());

    if (err24h) {
      errors.push(`24h query error: ${err24h.message}`);
    }

    for (const event of events24h ?? []) {
      try {
        sent24h += await sendReminders(admin, event, "明日開催", "24時間前リマインダー", baseUrl, "reminder_24h_sent");
      } catch (e) {
        errors.push(`24h event ${event.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // ─── Day-of reminders (events in 0-24h) ────────────────
    const from2h = new Date(now.getTime());
    const to2h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: events2h, error: err2h } = await admin
      .from("events")
      .select("id, title, datetime, location, location_type, online_url, zoom_meeting_id, zoom_passcode, price, capacity, image_url, short_code, creator_id")
      .eq("is_published", true)
      .eq("reminder_2h_sent", false)
      .gte("datetime", from2h.toISOString())
      .lt("datetime", to2h.toISOString());

    if (err2h) {
      errors.push(`2h query error: ${err2h.message}`);
    }

    for (const event of events2h ?? []) {
      try {
        sent2h += await sendReminders(admin, event, "まもなく開催", "当日リマインダー", baseUrl, "reminder_2h_sent");
      } catch (e) {
        errors.push(`2h event ${event.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // ─── Bank transfer reminders + auto-cancel ─────────────
    let bankReminded = 0;
    let bankCancelled = 0;
    try {
      const bankResult = await processBankTransferDeadlines(admin, now, baseUrl);
      bankReminded = bankResult.reminded;
      bankCancelled = bankResult.cancelled;
      if (bankResult.errors.length > 0) errors.push(...bankResult.errors);
    } catch (e) {
      errors.push(`bank deadlines: ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json({
      ok: true,
      sent_24h: sent24h,
      sent_2h: sent2h,
      bank_reminded: bankReminded,
      bank_cancelled: bankCancelled,
      errors: errors.length > 0 ? errors : undefined,
      checked_at: now.toISOString(),
    });
  } catch (err) {
    console.error("[GET /api/cron/reminders] Fatal error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

type EventForReminder = {
  id: string;
  title: string;
  datetime: string;
  location: string | null;
  location_type: string | null;
  online_url: string | null;
  zoom_meeting_id: string | null;
  zoom_passcode: string | null;
  price: number;
  capacity: number | null;
  image_url: string | null;
  short_code: string | null;
  creator_id: string | null;
};

async function sendReminders(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    await admin.from("events").update({ [sentColumn]: true }).eq("id", event.id);
    return 0;
  }

  const dateStr = new Date(event.datetime).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Send emails — filter out null/empty emails and deduplicate
  const emails: string[] = [...new Set(
    (bookings as { guest_email: string | null }[])
      .map((b) => b.guest_email)
      .filter((e): e is string => !!e && e.includes("@"))
  )];
  const subject = `【${emailSubjectPrefix}】${event.title}`;
  const html = buildReminderEmailHtml(event.title, dateStr, event.location ?? "未定", timeLabel, {
    locationType: event.location_type,
    onlineUrl: event.online_url,
    zoomMeetingId: event.zoom_meeting_id,
    zoomPasscode: event.zoom_passcode,
  });

  if (process.env.RESEND_API_KEY && emails.length > 0) {
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

// ─── Bank transfer deadline handling ────────────────────────────────
// Daily cron pass that:
//   1. Sends a reminder email/notification to bookers whose payment_deadline
//      is within the next 24 hours and who haven't been reminded yet
//   2. Auto-cancels pending bookings whose payment_deadline has passed
//      (status = 'cancelled', payment_status = 'failed')

interface BankCronResult {
  reminded: number;
  cancelled: number;
  errors: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processBankTransferDeadlines(admin: any, now: Date, baseUrl: string): Promise<BankCronResult> {
  const errors: string[] = [];
  let reminded = 0;
  let cancelled = 0;

  // 1) Reminder window: deadline within 0-24h from now AND not reminded yet.
  // Filter out bookings that were already cancelled by the user/organiser so
  // we don't spam them with reminder emails.
  const reminderUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: dueSoon, error: dueSoonErr } = await admin
    .from("bookings")
    .select("id, event_id, guest_name, guest_email, payment_deadline")
    .eq("payment_method", "bank")
    .eq("payment_status", "pending")
    .eq("status", "confirmed")
    .is("payment_reminded_at", null)
    .gte("payment_deadline", now.toISOString())
    .lt("payment_deadline", reminderUntil.toISOString());
  if (dueSoonErr) errors.push(`bank reminder query: ${dueSoonErr.message}`);

  for (const b of (dueSoon ?? []) as Array<{
    id: string;
    event_id: string;
    guest_name: string;
    guest_email: string;
    payment_deadline: string;
  }>) {
    try {
      const { data: ev } = await admin
        .from("events")
        .select("title, price, bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder, bank_note")
        .eq("id", b.event_id)
        .single();
      if (!ev) continue;
      const event = ev as Record<string, unknown>;
      const deadlineStr = new Date(b.payment_deadline).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit",
      });
      const priceStr = (event.price as number) === 0 ? "無料" : `¥${(event.price as number).toLocaleString("ja-JP")}`;
      const subject = `【お振込み期限のお知らせ】${event.title}`;
      const body = `${b.guest_name} 様

${event.title} のお申し込みありがとうございます。
お振込み期限が間近に迫っております。お早めにお手続きをお願いいたします。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 振込期限：${deadlineStr} まで
■ 振込金額：${priceStr}
■ 振込先銀行：${event.bank_name ?? "—"}
■ 支店：${event.bank_branch ?? "—"}
■ 口座種別：${event.bank_account_type ?? "普通"}
■ 口座番号：${event.bank_account_number ?? "—"}
■ 口座名義：${event.bank_account_holder ?? "—"}
${event.bank_note ? `■ 注意事項：${event.bank_note}\n` : ""}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

期限を過ぎますと自動的にキャンセルとなりますのでご注意ください。
入金確認後、参加情報（オンライン参加URL等）をメールでお送りします。

プチイベント作成くん`;

      if (process.env.RESEND_API_KEY && b.guest_email) {
        await sendBatchEmails({
          to: [b.guest_email],
          subject,
          html: wrapInHtml(body, event.title as string),
        }).catch((err) => errors.push(`bank reminder email ${b.id}: ${err instanceof Error ? err.message : String(err)}`));
      }
      await admin.from("notifications").insert({
        recipient_email: b.guest_email,
        type: "bank_payment_reminder",
        subject,
        body,
      });
      await admin
        .from("bookings")
        .update({ payment_reminded_at: now.toISOString() })
        .eq("id", b.id);
      await logPaymentEvent({
        bookingId: b.id,
        eventId: b.event_id,
        type: "reminder_sent",
        paymentMethod: "bank",
        actor: "cron_reminders",
        note: `Bank payment reminder sent. deadline=${b.payment_deadline}`,
      });
      reminded++;
    } catch (err) {
      errors.push(`bank reminder ${b.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2) Auto-cancel pass: payment_deadline already passed. Skip rows already
  // cancelled to avoid re-processing.
  const { data: expired, error: expErr } = await admin
    .from("bookings")
    .select("id, event_id, guest_name, guest_email, payment_deadline")
    .eq("payment_method", "bank")
    .eq("payment_status", "pending")
    .eq("status", "confirmed")
    .lt("payment_deadline", now.toISOString());
  if (expErr) errors.push(`bank expiry query: ${expErr.message}`);

  for (const b of (expired ?? []) as Array<{
    id: string;
    event_id: string;
    guest_name: string;
    guest_email: string;
    payment_deadline: string;
  }>) {
    try {
      // Cancel the booking
      const { error: updErr } = await admin
        .from("bookings")
        .update({ status: "cancelled", payment_status: "failed" })
        .eq("id", b.id);
      if (updErr) {
        errors.push(`bank cancel update ${b.id}: ${updErr.message}`);
        continue;
      }
      await logPaymentEvent({
        bookingId: b.id,
        eventId: b.event_id,
        type: "auto_cancelled",
        prevStatus: "pending",
        nextStatus: "failed",
        paymentMethod: "bank",
        actor: "cron_reminders",
        note: `Auto-cancelled past payment deadline (${b.payment_deadline})`,
      });

      // Notify booker
      const { data: ev } = await admin.from("events").select("title").eq("id", b.event_id).single();
      const eventTitle = (ev as { title?: string } | null)?.title ?? "イベント";
      const subject = `【自動キャンセルのお知らせ】${eventTitle}`;
      const body = `${b.guest_name} 様

${eventTitle} のお申し込みについて、振込期限を過ぎましても入金確認ができませんでした。
誠に恐縮ですが、自動キャンセルとさせていただきました。

再度のお申し込みをご希望の場合は、お手数ですがイベントページから再度お申込みください。

ご不明な点は主催者までお問い合わせください。

プチイベント作成くん`;
      if (process.env.RESEND_API_KEY && b.guest_email) {
        await sendBatchEmails({
          to: [b.guest_email],
          subject,
          html: wrapInHtml(body, eventTitle),
        }).catch((err) => errors.push(`bank cancel email ${b.id}: ${err instanceof Error ? err.message : String(err)}`));
      }
      await admin.from("notifications").insert({
        recipient_email: b.guest_email,
        type: "bank_payment_cancelled",
        subject,
        body,
      });

      // Promote a waitlisted booking if capacity allows (matches existing cancel route behaviour)
      try {
        const { data: evCap } = await admin.from("events").select("capacity").eq("id", b.event_id).single();
        const capacity = (evCap as { capacity?: number | null } | null)?.capacity ?? null;
        if (capacity != null) {
          const { count: confirmedCount } = await admin
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("event_id", b.event_id)
            .eq("status", "confirmed");
          if ((confirmedCount ?? 0) < capacity) {
            const { data: nextInLine } = await admin
              .from("bookings")
              .select("id")
              .eq("event_id", b.event_id)
              .eq("status", "waitlisted")
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();
            if (nextInLine) {
              await admin
                .from("bookings")
                .update({ status: "confirmed" })
                .eq("id", (nextInLine as { id: string }).id)
                .eq("status", "waitlisted");
            }
          }
        }
      } catch (err) {
        errors.push(`bank waitlist promote ${b.id}: ${err instanceof Error ? err.message : String(err)}`);
      }

      cancelled++;
    } catch (err) {
      errors.push(`bank cancel ${b.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // baseUrl is reserved for any future link generation in the messages
  void baseUrl;

  return { reminded, cancelled, errors };
}
