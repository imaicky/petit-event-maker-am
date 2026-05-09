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
export const maxDuration = 30;

/**
 * POST /api/events/[id]/bookings/[bookingId]/payment-link
 *
 * 主催者専用: 未払い予約に対して新しい Stripe Checkout セッションを作成し、
 * 参加者宛にメールで再決済リンクを送信する。
 *
 * 想定ユースケース:
 * - 参加者が決済画面を開いたまま放置 → セッション失効
 * - 銀行振込からカード払いに切替えたい
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
  const { id: eventId, bookingId } = await params;

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
    return NextResponse.json(
      { error: "サーバー設定エラー" },
      { status: 500 }
    );
  }
  const admin = createAdminClient();

  // Booking + event を取得
  const { data: booking } = await admin
    .from("bookings")
    .select("id, event_id, guest_name, guest_email, payment_status, status")
    .eq("id", bookingId)
    .eq("event_id", eventId)
    .single();
  if (!booking) {
    return NextResponse.json(
      { error: "予約が見つかりません" },
      { status: 404 }
    );
  }
  if ((booking as { payment_status: string }).payment_status === "paid") {
    return NextResponse.json(
      { error: "この予約は既に支払い済みです" },
      { status: 409 }
    );
  }
  if ((booking as { status: string }).status === "cancelled") {
    return NextResponse.json(
      { error: "キャンセル済みの予約には決済リンクを送信できません" },
      { status: 409 }
    );
  }

  const { data: event } = await admin
    .from("events")
    .select("id, title, price, image_url, creator_id")
    .eq("id", eventId)
    .single();
  if (!event) {
    return NextResponse.json(
      { error: "イベントが見つかりません" },
      { status: 404 }
    );
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

  // Stripe 設定取得
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

  const url = new URL(req.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || `${url.protocol}//${url.host}`;
  const successUrl = `${baseUrl}/events/${ev.id}/thanks?booking_id=${encodeURIComponent(bookingId)}&name=${encodeURIComponent((booking as { guest_name: string }).guest_name)}&email=${encodeURIComponent((booking as { guest_email: string }).guest_email)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/events/${ev.id}?payment_cancelled=1`;

  let checkoutUrl: string;
  let newSessionId: string | null = null;
  try {
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
        customerEmail: (booking as { guest_email: string }).guest_email,
        metadata: {
          booking_id: bookingId,
          event_id: ev.id,
          platform_fee_jpy: String(feeJpy),
          relink: "true",
        },
        successUrl,
        cancelUrl,
        idempotencyKey: `relink-${bookingId}-${Date.now()}`,
      });
      checkoutUrl = session.url ?? "";
      newSessionId = session.id;
    } else {
      const stripe = await getStripeForCreator(ev.creator_id);
      if (!stripe) {
        return NextResponse.json(
          { error: "Stripeが設定されていません" },
          { status: 503 }
        );
      }
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
          customer_email: (booking as { guest_email: string }).guest_email,
          metadata: {
            booking_id: bookingId,
            event_id: ev.id,
            relink: "true",
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
        { idempotencyKey: `relink-${bookingId}-${Date.now()}` }
      );
      checkoutUrl = session.url ?? "";
      newSessionId = session.id;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "checkout_failed";
    console.error("[payment-link] checkout error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!checkoutUrl) {
    return NextResponse.json(
      { error: "決済URLの生成に失敗しました" },
      { status: 500 }
    );
  }

  // booking 行に新セッションを反映
  // (古いセッションのexpired webhookで誤キャンセルされないよう session_id を更新)
  await admin
    .from("bookings")
    .update({
      payment_status: "pending",
      payment_method: "stripe",
      ...(newSessionId ? { stripe_session_id: newSessionId } : {}),
    })
    .eq("id", bookingId);

  // 参加者にメール送信（任意 - フロントから sendEmail フラグを取れるようにする）
  let body: { sendEmail?: boolean } = {};
  try {
    body = (await req.json().catch(() => ({}))) as { sendEmail?: boolean };
  } catch {
    body = {};
  }
  let emailed = false;
  if (body.sendEmail !== false && process.env.RESEND_API_KEY) {
    try {
      const html = wrapInHtml(
        `
<p>${(booking as { guest_name: string }).guest_name} 様</p>

<p>「${ev.title}」のお支払い手続きをまだ完了されていないようです。<br>
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
        to: [(booking as { guest_email: string }).guest_email],
        subject: `【${ev.title}】お支払いリンクのご案内`,
        html,
      });
      emailed = true;
    } catch (err) {
      console.error("[payment-link] email send error:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    url: checkoutUrl,
    emailed,
  });
}
