import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlatformStripe } from "@/lib/pro-stripe";

// POST /api/pro/portal
// Stripe Customer Portal の URL を返す。PRO契約者がカード変更・解約等を
// セルフで行うために使う。
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const stripe = getPlatformStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe未設定" }, { status: 503 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("pro_stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  const customerId = (
    profile as { pro_stripe_customer_id: string | null } | null
  )?.pro_stripe_customer_id;
  if (!customerId) {
    return NextResponse.json(
      { error: "PROサブスクが未登録です" },
      { status: 404 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
