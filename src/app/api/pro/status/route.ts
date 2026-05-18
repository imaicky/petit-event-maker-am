import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isProUser, IS_PRO_OPEN_ACCESS } from "@/lib/pro-plan";
import { isProBillingConfigured } from "@/lib/pro-stripe";

// GET /api/pro/status
// 現在のユーザーのPROプラン状態をまとめて返す。
//   - is_pro: PRO相当の扱いを受けているか（OPEN_ACCESS含む）
//   - is_paid_pro: 実際に課金が走っているサブスクが有効か
//   - plan / pro_until / subscription_id を含む
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({
      authenticated: false,
      is_pro: false,
      is_paid_pro: false,
      open_access: IS_PRO_OPEN_ACCESS,
      billing_configured: isProBillingConfigured(),
    });
  }

  const { data } = await supabase
    .from("profiles")
    .select("plan, pro_until, pro_stripe_subscription_id, pro_stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  const row = (data as {
    plan: string | null;
    pro_until: string | null;
    pro_stripe_subscription_id: string | null;
    pro_stripe_customer_id: string | null;
  } | null) ?? {
    plan: "free",
    pro_until: null,
    pro_stripe_subscription_id: null,
    pro_stripe_customer_id: null,
  };

  const isPaidPro =
    row.plan === "pro" &&
    !!row.pro_stripe_subscription_id &&
    (!row.pro_until || new Date(row.pro_until).getTime() > Date.now());
  const isPro = await isProUser(supabase, user.id);

  return NextResponse.json({
    authenticated: true,
    is_pro: isPro,
    is_paid_pro: isPaidPro,
    open_access: IS_PRO_OPEN_ACCESS,
    billing_configured: isProBillingConfigured(),
    plan: row.plan ?? "free",
    pro_until: row.pro_until,
    has_customer: !!row.pro_stripe_customer_id,
  });
}
