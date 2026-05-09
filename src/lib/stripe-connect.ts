import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe Connect (Standard) 用のヘルパー。
 *
 * Standard Connect は主催者が自身の Stripe アカウントをOAuthで連携する方式。
 * プラットフォーム側は STRIPE_SECRET_KEY（プラットフォームのSecret）と
 * STRIPE_CONNECT_CLIENT_ID（OAuth認証用のクライアントID）を持つ。
 *
 * Direct Charges + application_fee_amount でプラットフォーム手数料を自動徴収する。
 */

const STRIPE_CONNECT_OAUTH_BASE = "https://connect.stripe.com/oauth/authorize";

export function getConnectClientId(): string | null {
  return process.env.STRIPE_CONNECT_CLIENT_ID ?? null;
}

export function isConnectConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && getConnectClientId());
}

export type ConnectAuthorizeOptions = {
  state: string; // CSRF防御＋ユーザー識別
  redirectUri: string;
  /** Standard or Express. Standard推奨。 */
  mode?: "standard" | "express";
};

/** Stripe Connect の OAuth 認可URLを組み立てる */
export function buildConnectAuthorizeUrl(opts: ConnectAuthorizeOptions): string {
  const clientId = getConnectClientId();
  if (!clientId) {
    throw new Error("STRIPE_CONNECT_CLIENT_ID is not set");
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: opts.redirectUri,
    state: opts.state,
  });
  return `${STRIPE_CONNECT_OAUTH_BASE}?${params.toString()}`;
}

export type ConnectExchangeResult = {
  stripe_user_id: string; // acct_xxx
  scope: string;
  livemode: boolean;
  refresh_token?: string;
};

/** OAuth code を access_token + acct_id に交換 */
export async function exchangeOAuthCode(
  code: string
): Promise<ConnectExchangeResult> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Platform Stripe not configured");

  const response = await stripe.oauth.token({
    grant_type: "authorization_code",
    code,
  });

  if (!response.stripe_user_id) {
    throw new Error("OAuth response missing stripe_user_id");
  }

  return {
    stripe_user_id: response.stripe_user_id,
    scope: response.scope ?? "",
    livemode: response.livemode ?? false,
    refresh_token: response.refresh_token,
  };
}

/** 接続アカウントの状態（charges_enabled / payouts_enabled）を取得 */
export async function getAccountStatus(
  stripeAccountId: string
): Promise<{
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  display_name: string | null;
}> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Platform Stripe not configured");

  const account = await stripe.accounts.retrieve(stripeAccountId);
  return {
    charges_enabled: account.charges_enabled ?? false,
    payouts_enabled: account.payouts_enabled ?? false,
    details_submitted: account.details_submitted ?? false,
    display_name:
      account.business_profile?.name ??
      account.email ??
      null,
  };
}

/** OAuth連携を解除（主催者側からの切断） */
export async function disconnectAccount(stripeAccountId: string): Promise<void> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Platform Stripe not configured");
  const clientId = getConnectClientId();
  if (!clientId) throw new Error("STRIPE_CONNECT_CLIENT_ID is not set");

  await stripe.oauth.deauthorize({
    client_id: clientId,
    stripe_user_id: stripeAccountId,
  });
}

/** 手数料計算（円ベース） */
export function calcApplicationFee(
  baseAmountJpy: number,
  feePercent: number,
  feeFixedJpy: number
): number {
  const pct = Math.floor((baseAmountJpy * feePercent) / 100);
  return pct + feeFixedJpy;
}

/**
 * Direct charge で Checkout Session を作成する（手数料を抜きながら主催者に入金）
 */
export async function createConnectCheckoutSession(opts: {
  stripeAccountId: string;
  amountJpy: number;
  feeJpy: number;
  productName: string;
  productImageUrl?: string;
  customerEmail: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Platform Stripe not configured");

  return stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: opts.productName,
              ...(opts.productImageUrl
                ? { images: [opts.productImageUrl] }
                : {}),
            },
            unit_amount: opts.amountJpy,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: opts.feeJpy,
      },
      customer_email: opts.customerEmail,
      metadata: opts.metadata,
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
    },
    {
      idempotencyKey: opts.idempotencyKey,
      stripeAccount: opts.stripeAccountId, // ← Direct Charge: 接続アカウントの台帳に乗る
    }
  );
}
