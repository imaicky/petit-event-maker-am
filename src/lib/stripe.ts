import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

let stripeInstance: Stripe | null = null;

/**
 * Legacy: get Stripe using env var. Falls back gracefully.
 * Returns null if STRIPE_SECRET_KEY is not set.
 */
export function getStripe(): Stripe | null {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}

// ─── Per-creator Stripe (DB-backed) ─────────────────────────

const stripeCache = new Map<string, { stripe: Stripe; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a Stripe instance for a specific creator.
 * 1. Looks up stripe_settings in DB for the creator
 * 2. Falls back to env var STRIPE_SECRET_KEY
 * Returns null if neither is available.
 */
export async function getStripeForCreator(
  creatorId: string | null
): Promise<Stripe | null> {
  if (!creatorId) return getStripe();

  // Check cache
  const cached = stripeCache.get(creatorId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.stripe;
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("stripe_settings")
      .select("stripe_secret_key, is_active")
      .eq("user_id", creatorId)
      .eq("is_active", true)
      .maybeSingle();

    if (data?.stripe_secret_key) {
      const stripe = new Stripe(data.stripe_secret_key);
      stripeCache.set(creatorId, {
        stripe,
        expiresAt: Date.now() + CACHE_TTL,
      });
      return stripe;
    }
  } catch (err) {
    console.error("[getStripeForCreator] DB lookup error:", err);
  }

  // Fallback to env var
  return getStripe();
}

/**
 * Get all active webhook secrets from DB + env var.
 * Used by the webhook route to try each secret for signature verification.
 */
export async function getActiveWebhookSecrets(): Promise<
  { secret: string; secretKey: string }[]
> {
  const results: { secret: string; secretKey: string }[] = [];

  // DB-stored secrets
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("stripe_settings")
      .select("stripe_webhook_secret, stripe_secret_key")
      .eq("is_active", true)
      .not("stripe_webhook_secret", "is", null);

    if (data) {
      for (const row of data) {
        if (row.stripe_webhook_secret && row.stripe_secret_key) {
          results.push({
            secret: row.stripe_webhook_secret,
            secretKey: row.stripe_secret_key,
          });
        }
      }
    }
  } catch (err) {
    console.error("[getActiveWebhookSecrets] DB error:", err);
  }

  // Env var fallback
  if (process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY) {
    results.push({
      secret: process.env.STRIPE_WEBHOOK_SECRET,
      secretKey: process.env.STRIPE_SECRET_KEY,
    });
  }

  return results;
}

/**
 * Clear cached Stripe instance for a creator (call after settings change).
 */
export function invalidateStripeCache(creatorId: string): void {
  stripeCache.delete(creatorId);
}
