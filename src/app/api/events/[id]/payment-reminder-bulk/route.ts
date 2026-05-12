import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";
import { getStripeForCreator } from "@/lib/stripe";
import {
  calcApplicationFee,
  createConnectCheckoutSession,
} from "@/lib/stripe-connect";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/events/[id]/payment-reminder-bulk
 *
 * 主催者専用: 未払いの Stripe 予約者全員に決済リンク + メールを一斉送信する。
 * 単体版 (`/bookings/[bookingId]/payment-link`) と同等の処理を、対象者全員に
 * Promise.all で並列実行する。
 *
 * 対象:
 *   payment_status = 'pending'
 *   AND payment_method = 'stripe'
 *   AND status != 'cancelled'
 *
 * 銀行振込は別 cron (`/api/cron/reminders`) で期限近接時に自動メールされるため
 * このAPIではスコープ外。
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  void req;
  const { id: eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const allowed = await canManageEvent(supabase, eventId, user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "このイベントの操作権限がありません" },
      { status: 403 }
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const admin = createAdminClient();

  // ── イベント取得 ─────────────────────────────────────────
  const { data: event } = await admin
    .from("events")
    .select("id, title, price, image_url, creator_id")
    .eq("id", eventId)
    .single();
  if (!event) {
    return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  }
  const ev = event as {
    id: string;
    title: string;
    price: number;
    image_url: string | null;
    creator_id: string;
  };
  if (ev.price <= 0) {
    return NextResponse.json(
      { error: "無料イベントのため決済は不要です" },
      { status: 400 }
    );
  }

  // ── Stripe 設定 ──────────────────────────────────────────
  const { data: settingsRow } = await admin
    .from("stripe_settings")
    .select(
      "connect_mode, stripe_account_id, platform_fee_percent, platform_fee_fixed_jpy, charges_enabled"
    )
    .eq("user_id", ev.creator_id)
    .maybeSingle();
  const settings = settingsRow as
    | {
        connect_mode: "legacy" | "standard" | "express" | null;
        stripe_account_id: string | null;
        platform_fee_percent: number | null;
        platform_fee_fixed_jpy: number | null;
        charges_enabled: boolean | null;
      }
    | null;
  const isConnect =
    settings?.connect_mode === "standard" ||
    settings?.connect_mode === "express";

  const stripe = isConnect ? null : await getStripeForCreator(ev.creator_id);
  if (!isConnect && !stripe) {
    return NextResponse.json(
      { error: "Stripeが設定されていません" },
      { status: 503 }
    );
  }

  // ── 対象予約を取得 ──────────────────────────────────────
  const { data: targets } = await admin
    .from("bookings")
    .select("id, guest_name, guest_email, payment_status, payment_method, status")
    .eq("event_id", eventId)
    .eq("payment_status", "pending")
    .eq("payment_method", "stripe")
    .neq("status", "cancelled");

  type Target = {
    id: string;
    guest_name: string;
    guest_email: string;
  };
  const list: Target[] = (targets ?? [])
    .filter((b) => !!b.guest_email && b.guest_email.includes("@"))
    .map((b) => ({
      id: b.id,
      guest_name: b.guest_name,
      guest_email: b.guest_email,
    }));

  if (list.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      total: 0,
      message: "未払いのカード決済予約はありません",
    });
  }

  const url = new URL(req.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || `${url.protocol}//${url.host}`;

  let sent = 0;
  const errors: string[] = [];

  // 並列実行（Stripeレート制限を考慮し chunk で送る）
  const CHUNK_SIZE = 5;
  for (let i = 0; i < list.length; i += CHUNK_SIZE) {
    const chunk = list.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (booking) => {
        try {
          const successUrl = `${baseUrl}/events/${ev.id}/thanks?booking_id=${encodeURIComponent(
            booking.id
          )}&name=${encodeURIComponent(booking.guest_name)}&email=${encodeURIComponent(
            booking.guest_email
          )}&session_id={CHECKOUT_SESSION_ID}`;
          const cancelUrl = `${baseUrl}/events/${ev.id}?payment_cancelled=1`;

          let checkoutUrl = "";
          let newSessionId: string | null = null;
          if (isConnect && settings?.stripe_account_id && settings.charges_enabled) {
            const feeJpy = calcApplicationFee(
              ev.price,
              Number(settings.platform_fee_percent ?? 5),
              Number(settings.platform_fee_fixed_jpy ?? 0)
            );
            const session = await createConnectCheckoutSession({
              stripeAccountId: settings.stripe_account_id,
              amountJpy: ev.price,
              feeJpy,
              productName: ev.title,
              productImageUrl: ev.image_url ?? undefined,
              customerEmail: booking.guest_email,
              metadata: {
                booking_id: booking.id,
                event_id: ev.id,
                platform_fee_jpy: String(feeJpy),
                relink: "true",
                bulk: "true",
              },
              successUrl,
              cancelUrl,
              idempotencyKey: `relink-bulk-${booking.id}-${Date.now()}`,
            });
            checkoutUrl = session.url ?? "";
            newSessionId = session.id;
          } else if (stripe) {
            const session = await stripe.checkout.sessions.create(
              {
                mode: "payment",
                payment_method_types: ["card"],
                line_items: [
                  {
                    price_data: {
                      currency: "jpy",
                      product_data: {
                        name: ev.title,
                        ...(ev.image_url ? { images: [ev.image_url] } : {}),
                      },
                      unit_amount: ev.price,
                    },
                    quantity: 1,
                  },
                ],
                customer_email: booking.guest_email,
                metadata: {
                  booking_id: booking.id,
                  event_id: ev.id,
                  relink: "true",
                  bulk: "true",
                },
                success_url: successUrl,
                cancel_url: cancelUrl,
              },
              { idempotencyKey: `relink-bulk-${booking.id}-${Date.now()}` }
            );
            checkoutUrl = session.url ?? "";
            newSessionId = session.id;
          }
          if (!checkoutUrl) {
            errors.push(`${booking.guest_email}: 決済URL生成失敗`);
            return;
          }

          // 古いセッションと差し替え
          await admin
            .from("bookings")
            .update({
              ...(newSessionId ? { stripe_session_id: newSessionId } : {}),
            })
            .eq("id", booking.id);

          if (process.env.RESEND_API_KEY) {
            const html = wrapInHtml(
              `
<p>${booking.guest_name} 様</p>

<p>「${ev.title}」のお支払い手続きがまだ完了していないようです。<br>
お手数ですが、以下のリンクからクレジットカード決済をお済ませください。</p>

<p style="text-align:center;margin:32px 0;">
  <a href="${checkoutUrl}" style="display:inline-block;padding:12px 28px;background:#1A1A1A;color:#fff;text-decoration:none;border-radius:24px;font-weight:bold;">
    決済を完了する
  </a>
</p>

<p style="font-size:12px;color:#666666;">
  このリンクは Stripe の決済画面に遷移します。期限は約24時間です。<br>
  リンクが開けない場合は以下のURLをコピーしてブラウザで開いてください：<br>
  <span style="word-break:break-all;">${checkoutUrl}</span>
</p>
              `,
              ev.title
            );
            await sendBatchEmails({
              to: [booking.guest_email],
              subject: `【${ev.title}】お支払いリンクのご案内`,
              html,
            });
          }
          sent += 1;
        } catch (e) {
          errors.push(
            `${booking.guest_email}: ${
              e instanceof Error ? e.message : String(e)
            }`
          );
        }
      })
    );
  }

  return NextResponse.json({
    ok: true,
    sent,
    total: list.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
