import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
 * GET /api/cron/payment-reminders
 *
 * Vercel Cron で1時間に1回実行する想定。
 * 未払い予約に対して 24時間後 / 72時間後の2回までリマインダーを送信。
 *
 * - bookings.payment_status='pending' AND status='confirmed'
 * - 経過時間に応じて第1回(24h) / 第2回(72h) のリマインドメール
 * - 重複防止に payment_reminded_at を更新
 */

const REMINDER_24H_MS = 24 * 60 * 60 * 1000;
const REMINDER_72H_MS = 72 * 60 * 60 * 1000;

type BookingRow = {
  id: string;
  event_id: string;
  guest_name: string;
  guest_email: string;
  payment_status: string;
  payment_method: string | null;
  status: string;
  created_at: string;
  payment_reminded_at: string | null;
  events: {
    id: string;
    title: string;
    price: number;
    image_url: string | null;
    creator_id: string;
    is_published: boolean;
    datetime: string;
  } | null;
};

export async function GET(req: Request) {
  // Adversarial fix: CRON_SECRET 未設定時に fail-open になるバグ修正。
  // 必ず CRON_SECRET 必須に変更（fail-closed）。
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 }
    );
  }

  const admin = createAdminClient();

  // Pending かつ Stripe 払いの予約を取得
  // 開催が未来のものに限定（過ぎた分はリマインド不要）
  const now = new Date();
  const cutoff168h = new Date(now.getTime() - 168 * 60 * 60 * 1000); // 7日以上経過は対象外
  const { data, error } = await admin
    .from("bookings")
    .select(
      "id, event_id, guest_name, guest_email, payment_status, payment_method, status, created_at, payment_reminded_at, events!inner(id, title, price, image_url, creator_id, is_published, datetime)"
    )
    .eq("payment_status", "pending")
    .eq("status", "confirmed")
    .gte("created_at", cutoff168h.toISOString())
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error("[cron/payment-reminders] query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookings = (data ?? []) as unknown as BookingRow[];
  const url = new URL(req.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || `${url.protocol}//${url.host}`;

  const results: Array<{ id: string; tier: string; status: string }> = [];

  for (const b of bookings) {
    if (!b.events) continue;
    if (!b.events.is_published) continue;
    if (b.events.price <= 0) continue;
    if (new Date(b.events.datetime).getTime() < now.getTime()) continue;
    if (b.payment_method && b.payment_method !== "stripe") continue;

    const ageMs = now.getTime() - new Date(b.created_at).getTime();
    const lastSentMs = b.payment_reminded_at
      ? now.getTime() - new Date(b.payment_reminded_at).getTime()
      : Infinity;

    // 第1回: 24h-72h かつ 未送信 (lastSent === Infinity)
    // 第2回: 72h以降 かつ 第1回送信から24h以上経過
    let tier: "24h" | "72h" | null = null;
    if (ageMs >= REMINDER_24H_MS && ageMs < REMINDER_72H_MS && lastSentMs === Infinity) {
      tier = "24h";
    } else if (
      ageMs >= REMINDER_72H_MS &&
      lastSentMs >= REMINDER_24H_MS // 第1回から24h以上経過
    ) {
      // 既に72h tier送信済みなら2回目はスキップ
      const alreadySent72h =
        b.payment_reminded_at &&
        new Date(b.payment_reminded_at).getTime() >
          new Date(b.created_at).getTime() + REMINDER_72H_MS;
      if (!alreadySent72h) tier = "72h";
    }

    if (!tier) {
      results.push({ id: b.id, tier: "skip", status: "out_of_window" });
      continue;
    }

    // ── 新規 Checkout セッションを作成 ────────────────────────
    let checkoutUrl = "";
    try {
      const { data: settingsRow } = await admin
        .from("stripe_settings")
        .select(
          "connect_mode, stripe_account_id, platform_fee_percent, platform_fee_fixed_jpy, charges_enabled"
        )
        .eq("user_id", b.events.creator_id)
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

      const successUrl = `${baseUrl}/events/${b.event_id}/thanks?booking_id=${encodeURIComponent(b.id)}&name=${encodeURIComponent(b.guest_name)}&email=${encodeURIComponent(b.guest_email)}&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/events/${b.event_id}?payment_cancelled=1`;
      const isConnect =
        settings?.connect_mode === "standard" ||
        settings?.connect_mode === "express";

      if (
        isConnect &&
        settings?.stripe_account_id &&
        settings.charges_enabled
      ) {
        const feeJpy = calcApplicationFee(
          b.events.price,
          Number(settings.platform_fee_percent ?? 5),
          Number(settings.platform_fee_fixed_jpy ?? 0)
        );
        const session = await createConnectCheckoutSession({
          stripeAccountId: settings.stripe_account_id,
          amountJpy: b.events.price,
          feeJpy,
          productName: b.events.title,
          productImageUrl: b.events.image_url ?? undefined,
          customerEmail: b.guest_email,
          metadata: {
            booking_id: b.id,
            event_id: b.event_id,
            platform_fee_jpy: String(feeJpy),
            relink: "auto",
            tier,
          },
          successUrl,
          cancelUrl,
          idempotencyKey: `auto-${b.id}-${tier}-${Math.floor(now.getTime() / 3600000)}`,
        });
        checkoutUrl = session.url ?? "";
      } else {
        const stripe = await getStripeForCreator(b.events.creator_id);
        if (!stripe) {
          results.push({ id: b.id, tier, status: "no_stripe" });
          continue;
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
                    name: b.events.title,
                    ...(b.events.image_url
                      ? { images: [b.events.image_url] }
                      : {}),
                  },
                  unit_amount: b.events.price,
                },
                quantity: 1,
              },
            ],
            customer_email: b.guest_email,
            metadata: {
              booking_id: b.id,
              event_id: b.event_id,
              relink: "auto",
              tier,
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
          },
          {
            idempotencyKey: `auto-${b.id}-${tier}-${Math.floor(now.getTime() / 3600000)}`,
          }
        );
        checkoutUrl = session.url ?? "";
      }
    } catch (err) {
      console.error("[cron/payment-reminders] checkout error:", b.id, err);
      results.push({ id: b.id, tier, status: "checkout_failed" });
      continue;
    }

    if (!checkoutUrl) {
      results.push({ id: b.id, tier, status: "no_url" });
      continue;
    }

    // ── メール送信 ────────────────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      try {
        const isFinal = tier === "72h";
        const subjectPrefix = isFinal ? "【最終ご案内】" : "【お支払いのお願い】";
        const html = wrapInHtml(
          `
<p>${b.guest_name} 様</p>

<p>「${b.events.title}」へのお申込みありがとうございます。<br>
${isFinal ? "<b>お支払いがまだ完了していません。</b>このメールは最終のご案内です。" : "お支払いがまだ完了していません。下記リンクよりお手続きをお願いします。"}</p>

<p style="text-align:center;margin:32px 0;">
  <a href="${checkoutUrl}" style="display:inline-block;padding:12px 28px;background:#1A1A1A;color:#fff;text-decoration:none;border-radius:24px;font-weight:bold;">
    クレジットカードでお支払い
  </a>
</p>

<p style="font-size:12px;color:#666666;">
  決済はStripeの安全な画面で行われます。<br>
  リンクが開けない場合は以下のURLをコピーしてブラウザで開いてください：<br>
  <span style="word-break:break-all;">${checkoutUrl}</span>
</p>

${
  isFinal
    ? `<p style="font-size:12px;color:#999999;margin-top:24px;">お支払いが確認できない場合、申込が自動キャンセルされる可能性があります。</p>`
    : ""
}
          `,
          b.events.title
        );
        await sendBatchEmails({
          to: [b.guest_email],
          subject: `${subjectPrefix}${b.events.title}`,
          html,
        });
      } catch (err) {
        console.error("[cron/payment-reminders] email error:", b.id, err);
        results.push({ id: b.id, tier, status: "email_failed" });
        continue;
      }
    }

    // ── reminded_at 更新 ──────────────────────────────────────
    await admin
      .from("bookings")
      .update({ payment_reminded_at: new Date().toISOString() })
      .eq("id", b.id);

    results.push({ id: b.id, tier, status: "sent" });
  }

  return NextResponse.json({
    ok: true,
    processed: bookings.length,
    results,
  });
}
