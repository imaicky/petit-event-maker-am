import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";
import { logPaymentEvent } from "@/lib/payment-audit";
import {
  effectiveSchedule,
  sendReminderForOffset,
  shouldSendNow,
  offsetLabel,
} from "@/lib/reminder-sender";

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

    let totalSent = 0;
    let runsExecuted = 0;
    const errors: string[] = [];

    // ─── 新形式: reminder_schedule ベースの送信 ─────────────
    // 直近2週間以内に開催される公開イベントを取得し、各イベントの
    // 実効スケジュール（カスタム or 既定 [24h, 3h]）を走査する。
    const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const { data: upcoming, error: upcomingErr } = await admin
      .from("events")
      .select(
        "id, title, datetime, location, location_type, online_url, zoom_meeting_id, zoom_passcode, price, capacity, image_url, short_code, creator_id, reminder_schedule"
      )
      .eq("is_published", true)
      .gte("datetime", now.toISOString())
      .lt("datetime", horizon.toISOString());

    if (upcomingErr) {
      errors.push(`upcoming query error: ${upcomingErr.message}`);
    }

    for (const event of upcoming ?? []) {
      const schedule = effectiveSchedule(event as Parameters<typeof effectiveSchedule>[0]);
      for (const entry of schedule) {
        if (!shouldSendNow(event.datetime, entry.offset_hours, now)) continue;
        try {
          const sent = await sendReminderForOffset(admin, event as Parameters<typeof sendReminderForOffset>[1], entry.offset_hours, {
            baseUrl,
            timeLabel: offsetLabel(entry.offset_hours),
          });
          if (sent >= 0) {
            runsExecuted++;
            totalSent += sent;
          }
        } catch (e) {
          errors.push(
            `event ${event.id} @${entry.offset_hours}h: ${
              e instanceof Error ? e.message : String(e)
            }`
          );
        }
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
      runs_executed: runsExecuted,
      total_sent: totalSent,
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
