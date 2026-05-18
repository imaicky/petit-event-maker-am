/**
 * PRO プラン課金用 Stripe ヘルパー
 *
 * プラットフォーム側の Stripe アカウントを使ったサブスクリプション
 * （Stripe Connect の組織側決済とは別物）。
 *
 * 必要な環境変数:
 *   - STRIPE_SECRET_KEY                  プラットフォームのStripeシークレット
 *   - STRIPE_PRO_PRICE_ID_MONTHLY        ¥980/月のPrice ID
 *   - STRIPE_PRO_PRICE_ID_YEARLY         ¥9,800/年のPrice ID
 *   - STRIPE_PRO_WEBHOOK_SECRET          PROサブスク専用Webhookシークレット
 */

import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

export type ProBilling = "monthly" | "yearly";

export function getProPriceId(billing: ProBilling): string | null {
  if (billing === "yearly") {
    return process.env.STRIPE_PRO_PRICE_ID_YEARLY ?? null;
  }
  return process.env.STRIPE_PRO_PRICE_ID_MONTHLY ?? null;
}

export function isProBillingConfigured(): boolean {
  return (
    !!process.env.STRIPE_SECRET_KEY &&
    !!process.env.STRIPE_PRO_PRICE_ID_MONTHLY
  );
}

export function getProWebhookSecret(): string | null {
  return process.env.STRIPE_PRO_WEBHOOK_SECRET ?? null;
}

/**
 * Stripe Customer を作成 or 取得する。
 * 既存の customer_id があればそれを返す。なければ新規作成して返す。
 */
export async function ensureProStripeCustomer(opts: {
  stripe: Stripe;
  existingCustomerId: string | null;
  email: string;
  userId: string;
  username?: string | null;
}): Promise<string> {
  if (opts.existingCustomerId) {
    try {
      const customer = await opts.stripe.customers.retrieve(
        opts.existingCustomerId
      );
      if (!customer.deleted) return opts.existingCustomerId;
    } catch {
      // 取得失敗時は新規作成
    }
  }
  const created = await opts.stripe.customers.create({
    email: opts.email,
    name: opts.username ?? undefined,
    metadata: {
      app_user_id: opts.userId,
    },
  });
  return created.id;
}

/** プラットフォーム Stripe を取得（PROサブスク用） */
export function getPlatformStripe(): Stripe | null {
  return getStripe();
}
