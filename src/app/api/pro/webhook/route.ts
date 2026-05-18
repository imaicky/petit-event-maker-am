import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformStripe, getProWebhookSecret } from "@/lib/pro-stripe";
import Stripe from "stripe";

// POST /api/pro/webhook
// Stripe からのサブスク関連イベントを受信し、profiles.plan / pro_until 等を更新する。
//
// 受け取るイベント:
//   customer.subscription.created
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.payment_succeeded (期間延長)
//   invoice.payment_failed   (失敗ログ)

export const runtime = "nodejs";

async function activatePro(args: {
  userId: string;
  customerId: string;
  subscriptionId: string;
  validUntil: Date;
}) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      plan: "pro",
      pro_until: args.validUntil.toISOString(),
      pro_stripe_customer_id: args.customerId,
      pro_stripe_subscription_id: args.subscriptionId,
    })
    .eq("id", args.userId);
  if (error) console.error("[pro/webhook] activatePro error:", error);
}

async function deactivatePro(args: { userId: string }) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      plan: "free",
      pro_until: null,
      pro_stripe_subscription_id: null,
    })
    .eq("id", args.userId);
  if (error) console.error("[pro/webhook] deactivatePro error:", error);
}

async function findUserByCustomerId(
  customerId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("pro_stripe_customer_id", customerId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

function resolveUserId(
  metadata: Stripe.Metadata | null | undefined,
  customerId: string | null,
  fallback: () => Promise<string | null>
): Promise<string | null> {
  const fromMetadata =
    metadata && typeof metadata.app_user_id === "string"
      ? metadata.app_user_id
      : null;
  if (fromMetadata) return Promise.resolve(fromMetadata);
  if (!customerId) return Promise.resolve(null);
  return fallback();
}

export async function POST(request: NextRequest) {
  const stripe = getPlatformStripe();
  const webhookSecret = getProWebhookSecret();
  if (!stripe || !webhookSecret) {
    console.warn("[pro/webhook] not configured (stripe or webhook secret missing)");
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[pro/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
        const userId = await resolveUserId(sub.metadata, customerId, () =>
          findUserByCustomerId(customerId!)
        );
        if (!userId || !customerId) break;
        // current_period_end は subscription.items の最初の Price から取得
        const periodEndSec =
          (sub.items?.data?.[0] as { current_period_end?: number } | undefined)
            ?.current_period_end ??
          // Fallback to top-level if SDK exposes it
          (sub as unknown as { current_period_end?: number }).current_period_end ??
          null;
        const validUntil =
          typeof periodEndSec === "number"
            ? new Date(periodEndSec * 1000)
            : null;

        if (
          (sub.status === "active" || sub.status === "trialing") &&
          validUntil
        ) {
          await activatePro({
            userId,
            customerId,
            subscriptionId: sub.id,
            validUntil,
          });
        } else if (
          sub.status === "canceled" ||
          sub.status === "unpaid" ||
          sub.status === "incomplete_expired"
        ) {
          await deactivatePro({ userId });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
        const userId = await resolveUserId(sub.metadata, customerId, () =>
          findUserByCustomerId(customerId!)
        );
        if (userId) {
          await deactivatePro({ userId });
        }
        break;
      }
      case "invoice.payment_succeeded": {
        // 既に subscription.updated で延長されているはずだが、念のため
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          (invoice as unknown as { subscription?: string | Stripe.Subscription })
            .subscription;
        const subscriptionId =
          typeof subId === "string" ? subId : subId?.id ?? null;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? null;
        if (!subscriptionId || !customerId) break;
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = await resolveUserId(sub.metadata, customerId, () =>
          findUserByCustomerId(customerId)
        );
        if (!userId) break;
        const periodEndSec =
          (sub.items?.data?.[0] as { current_period_end?: number } | undefined)
            ?.current_period_end ??
          (sub as unknown as { current_period_end?: number }).current_period_end ??
          null;
        if (
          (sub.status === "active" || sub.status === "trialing") &&
          typeof periodEndSec === "number"
        ) {
          await activatePro({
            userId,
            customerId,
            subscriptionId: sub.id,
            validUntil: new Date(periodEndSec * 1000),
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(
          "[pro/webhook] payment failed:",
          invoice.customer,
          invoice.attempt_count
        );
        // 一度の失敗ではdeactivateしない（Stripeの再試行を信頼）
        break;
      }
      default:
        // ignore
        break;
    }
  } catch (err) {
    console.error("[pro/webhook] handler error:", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
