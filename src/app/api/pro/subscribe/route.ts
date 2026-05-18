import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureProStripeCustomer,
  getPlatformStripe,
  getProPriceId,
  isProBillingConfigured,
  type ProBilling,
} from "@/lib/pro-stripe";

// POST /api/pro/subscribe
// PRO サブスク用 Checkout Session を作成して URL を返す。
//   body: { billing: "monthly" | "yearly" }
export async function POST(request: NextRequest) {
  if (!isProBillingConfigured()) {
    return NextResponse.json(
      {
        error: "PROプランは現在準備中です。お問い合わせください。",
        notConfigured: true,
      },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const billing: ProBilling = body.billing === "yearly" ? "yearly" : "monthly";
  const priceId = getProPriceId(billing);
  if (!priceId) {
    return NextResponse.json(
      { error: "プラン価格IDが未設定です" },
      { status: 503 }
    );
  }

  const stripe = getPlatformStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe が未設定です" },
      { status: 503 }
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const admin = createAdminClient();

  // プロフィール取得
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "username, pro_stripe_customer_id, pro_stripe_subscription_id, plan, pro_until"
    )
    .eq("id", user.id)
    .maybeSingle();

  type ProfileRow = {
    username: string | null;
    pro_stripe_customer_id: string | null;
    pro_stripe_subscription_id: string | null;
    plan: string | null;
    pro_until: string | null;
  };
  const p = (profile as ProfileRow) ?? {
    username: null,
    pro_stripe_customer_id: null,
    pro_stripe_subscription_id: null,
    plan: "free",
    pro_until: null,
  };

  // 既にPROなら不要
  if (p.plan === "pro" && p.pro_stripe_subscription_id) {
    return NextResponse.json(
      {
        error: "既にPROプランをご契約中です",
        alreadyPro: true,
      },
      { status: 409 }
    );
  }

  const customerId = await ensureProStripeCustomer({
    stripe,
    existingCustomerId: p.pro_stripe_customer_id,
    email: user.email ?? "",
    userId: user.id,
    username: p.username,
  });

  // customer_id を保存（webhook到達前でも参照可能に）
  if (p.pro_stripe_customer_id !== customerId) {
    await admin
      .from("profiles")
      .update({ pro_stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      app_user_id: user.id,
      pro_billing: billing,
    },
    subscription_data: {
      metadata: {
        app_user_id: user.id,
        pro_billing: billing,
      },
    },
    success_url: `${baseUrl}/settings/billing?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/settings/billing?cancelled=1`,
    locale: "ja",
    // 利用規約への同意（任意）
    consent_collection: {
      terms_of_service: "required",
    },
  });

  return NextResponse.json({ url: session.url });
}
