/**
 * PRO プラン判定ヘルパー
 *
 * Phase 1 では PRO 課金フローがまだ実装されていないため、ロールアウト戦略として
 * 環境変数 PRO_OPEN_ACCESS=true のとき全員 PRO 扱いにする。本番では false の
 * デフォルトで profiles.plan + profiles.pro_until をチェックする。
 *
 * Phase 3 で Stripe Subscription を導入したら、本ヘルパーはそのまま使える。
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Phase 1/2 ロールアウト中はデフォルト true（全員 PRO 扱い）。
// Phase 4 で課金フローと PRO 限定ゲートを稼働させるときに、
// 環境変数 PRO_OPEN_ACCESS=false を設定して切り替える。
const OPEN_ACCESS = process.env.PRO_OPEN_ACCESS !== "false";

/**
 * 指定ユーザーが PRO プラン契約者か判定する。
 *
 * Phase 1 ロールアウト中は OPEN_ACCESS=true で全員 true。
 * Phase 3 以降は profiles.plan = 'pro' かつ pro_until > now() で判定。
 */
export async function isProUser(
  supabase: SupabaseClient<Database>,
  userId: string | null | undefined
): Promise<boolean> {
  if (!userId) return false;
  if (OPEN_ACCESS) return true;

  const { data } = await supabase
    .from("profiles")
    .select("plan, pro_until")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return false;
  const row = data as { plan?: string | null; pro_until?: string | null };
  if (row.plan !== "pro") return false;
  if (!row.pro_until) return true; // 永続PRO（管理者付与など）
  return new Date(row.pro_until).getTime() > Date.now();
}

/**
 * クライアント側で同期的に PRO 判定したいケース向け。
 * profile レコードがすでに手元にある前提。
 */
export function isProFromProfile(profile: {
  plan?: string | null;
  pro_until?: string | null;
} | null | undefined): boolean {
  if (OPEN_ACCESS) return true;
  if (!profile) return false;
  if (profile.plan !== "pro") return false;
  if (!profile.pro_until) return true;
  return new Date(profile.pro_until).getTime() > Date.now();
}

/** UI 表示用: PRO 限定機能のラベル */
export const PRO_FEATURE_LABEL = "PRO";

/** ロールアウト中フラグ。UI で「Phase 1 限定公開中」バッジを出す等に使う */
export const IS_PRO_OPEN_ACCESS = OPEN_ACCESS;
