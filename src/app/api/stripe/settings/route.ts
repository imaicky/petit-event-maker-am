import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { invalidateStripeCache } from "@/lib/stripe";

const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "charge.refunded",
];

// ─── GET: Retrieve settings (no secret key returned) ──────────

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data } = await supabase
      .from("stripe_settings")
      .select(
        "id, stripe_account_id, display_name, is_test_mode, is_active, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({ stripeSettings: data ?? null });
  } catch (err) {
    console.error("[GET /api/stripe/settings]", err);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// ─── POST: Connect Stripe account ─────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { secret_key } = await request.json();

    if (
      !secret_key ||
      typeof secret_key !== "string" ||
      (!secret_key.startsWith("sk_test_") && !secret_key.startsWith("sk_live_"))
    ) {
      return NextResponse.json(
        {
          error:
            "シークレットキーの形式が正しくありません。sk_test_ または sk_live_ で始まるキーを入力してください。",
        },
        { status: 400 }
      );
    }

    const isTestMode = secret_key.startsWith("sk_test_");

    // Validate key by retrieving account info
    let stripe: Stripe;
    let accountId: string;
    let displayName: string;
    try {
      stripe = new Stripe(secret_key);
      // Validate key by listing a resource (balance is always accessible)
      const balance = await stripe.balance.retrieve();
      // Use balance to confirm key works; get account id from a simple call
      accountId = balance.object === "balance" ? "connected" : "unknown";
      // Try to get account display name
      try {
        const acct = await stripe.accounts.retrieve("me" as string);
        accountId = acct.id;
        displayName =
          acct.settings?.dashboard?.display_name ||
          acct.business_profile?.name ||
          acct.email ||
          "Stripe Account";
      } catch {
        // Some accounts can't retrieve themselves; use fallback
        displayName = "Stripe Account";
      }
    } catch {
      return NextResponse.json(
        {
          error:
            "シークレットキーが無効です。Stripeダッシュボードで正しいキーを確認してください。",
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Delete old webhook if exists
    const { data: existing } = await admin
      .from("stripe_settings")
      .select("stripe_webhook_id, stripe_secret_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.stripe_webhook_id && existing.stripe_secret_key) {
      try {
        const oldStripe = new Stripe(existing.stripe_secret_key);
        await oldStripe.webhookEndpoints.del(existing.stripe_webhook_id);
      } catch {
        // Old webhook may already be gone — ignore
      }
    }

    // Create new webhook endpoint
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://petit-event-maker-am.vercel.app";

    let webhookId: string | null = null;
    let webhookSecret: string | null = null;
    try {
      const webhookEndpoint = await stripe.webhookEndpoints.create({
        url: `${baseUrl}/api/stripe/webhook`,
        enabled_events: WEBHOOK_EVENTS,
        description: "petit event maker auto-setup",
      });
      webhookId = webhookEndpoint.id;
      webhookSecret = webhookEndpoint.secret ?? null;
    } catch (err) {
      console.error("[POST /api/stripe/settings] Webhook creation error:", err);
      return NextResponse.json(
        {
          error:
            "Webhookの自動作成に失敗しました。Stripeアカウントの権限を確認してください。",
        },
        { status: 500 }
      );
    }

    // Upsert settings
    const { error: upsertErr } = await admin
      .from("stripe_settings")
      .upsert(
        {
          user_id: user.id,
          stripe_account_id: accountId,
          stripe_secret_key: secret_key,
          stripe_webhook_id: webhookId,
          stripe_webhook_secret: webhookSecret,
          display_name: displayName,
          is_test_mode: isTestMode,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      console.error("[POST /api/stripe/settings] Upsert error:", upsertErr);
      return NextResponse.json(
        { error: "設定の保存に失敗しました" },
        { status: 500 }
      );
    }

    invalidateStripeCache(user.id);

    return NextResponse.json({
      stripeSettings: {
        stripe_account_id: accountId,
        display_name: displayName,
        is_test_mode: isTestMode,
        is_active: true,
      },
    });
  } catch (err) {
    console.error("[POST /api/stripe/settings]", err);
    return NextResponse.json(
      { error: "接続に失敗しました" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Disconnect Stripe account ────────────────────────

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get existing settings to delete webhook
    const { data: existing } = await admin
      .from("stripe_settings")
      .select("stripe_webhook_id, stripe_secret_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.stripe_webhook_id && existing.stripe_secret_key) {
      try {
        const stripe = new Stripe(existing.stripe_secret_key);
        await stripe.webhookEndpoints.del(existing.stripe_webhook_id);
      } catch {
        // Webhook may already be gone — ignore
      }
    }

    await admin.from("stripe_settings").delete().eq("user_id", user.id);

    invalidateStripeCache(user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/stripe/settings]", err);
    return NextResponse.json(
      { error: "解除に失敗しました" },
      { status: 500 }
    );
  }
}
