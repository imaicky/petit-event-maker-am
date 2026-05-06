// Notifies the event creator when a booking's payment lands.
// Email + LINE (if creator has the bot configured and notify_on_booking enabled).
// Called from:
//   - Stripe webhook when checkout completes paid
//   - Manual bank-transfer confirm-payment endpoint

import { createAdminClient } from "@/lib/supabase/admin";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";
import { pushLineMessage } from "@/lib/line";

interface NotifyArgs {
  bookingId: string;
  source: "stripe" | "bank";
  /** Optional explicit amount (yen). Falls back to event.price. */
  amount?: number | null;
}

const SOURCE_META: Record<NotifyArgs["source"], { label: string; verb: string }> = {
  stripe: { label: "Stripe決済", verb: "決済完了" },
  bank: { label: "銀行振込", verb: "入金確認" },
};

export async function notifyOrganizerPayment({ bookingId, source, amount }: NotifyArgs): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const admin = createAdminClient();

  try {
    const { data: bk } = await admin
      .from("bookings")
      .select("id, event_id, guest_name, guest_email")
      .eq("id", bookingId)
      .single();
    if (!bk) return;
    const booking = bk as {
      id: string;
      event_id: string;
      guest_name: string;
      guest_email: string;
    };

    const { data: ev } = await admin
      .from("events")
      .select("title, datetime, price, creator_id")
      .eq("id", booking.event_id)
      .single();
    if (!ev) return;
    const event = ev as {
      title: string;
      datetime: string;
      price: number;
      creator_id: string | null;
    };

    const meta = SOURCE_META[source];
    const priceYen = amount ?? event.price;
    const priceStr = priceYen === 0 ? "無料" : `¥${priceYen.toLocaleString("ja-JP")}`;
    const dateStr = new Date(event.datetime).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit",
    });

    const subject = `【${meta.verb}】${event.title} — ${booking.guest_name}様`;
    const body = `${event.title} の${meta.verb}通知です。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ イベント：${event.title}
■ 開催日時：${dateStr}
■ 申込者：${booking.guest_name}（${booking.guest_email}）
■ 決済方法：${meta.label}
■ 金額：${priceStr}
■ 受付日時：${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

参加者一覧から詳細をご確認ください。

プチイベント作成くん`;

    // Email to creator
    if (event.creator_id) {
      try {
        const { data: creatorAuth } = await admin.auth.admin.getUserById(event.creator_id);
        const creatorEmail = creatorAuth?.user?.email;
        if (creatorEmail) {
          await admin
            .from("notifications")
            .insert({
              recipient_email: creatorEmail,
              type: "payment_received_alert",
              subject,
              body,
            })
            .then(({ error }) => {
              if (error) console.error("[organizer-notify] notifications insert:", error);
            });

          if (process.env.RESEND_API_KEY) {
            await sendBatchEmails({
              to: [creatorEmail],
              subject,
              html: wrapInHtml(body, event.title),
            }).catch((err) => console.error("[organizer-notify] email send:", err));
          }
        }
      } catch (err) {
        console.error("[organizer-notify] creator email lookup:", err);
      }
    }

    // LINE notification to creator
    if (event.creator_id) {
      try {
        const { data: la } = await admin
          .from("line_accounts")
          .select("channel_access_token, owner_line_user_id, is_active, notify_on_booking")
          .eq("user_id", event.creator_id)
          .maybeSingle();
        const lineAccount = la as {
          channel_access_token: string | null;
          owner_line_user_id: string | null;
          is_active: boolean;
          notify_on_booking: boolean;
        } | null;
        if (
          lineAccount?.is_active &&
          lineAccount.notify_on_booking &&
          lineAccount.channel_access_token &&
          lineAccount.owner_line_user_id
        ) {
          const text = `💴 ${meta.verb}\n${event.title}\n${booking.guest_name}様\n金額：${priceStr}（${meta.label}）`;
          await pushLineMessage(
            lineAccount.channel_access_token,
            lineAccount.owner_line_user_id,
            text
          );
        }
      } catch (err) {
        console.error("[organizer-notify] LINE push:", err);
      }
    }
  } catch (err) {
    console.error("[organizer-notify] unexpected error:", err);
  }
}
