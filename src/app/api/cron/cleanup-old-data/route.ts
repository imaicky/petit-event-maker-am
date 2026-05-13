import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ─── GET /api/cron/cleanup-old-data ──────────────────────────
// 日次でテーブルの肥大化を防ぐお掃除 cron。
// 削除対象:
//   - event_views: 90日以上前（推薦に使うのは直近100件のみ。古いログは不要）
//   - line_messages: 180日以上前（送信履歴の長期保存は不要）
//   - notifications: 180日以上前
//   - event_messages: 365日以上前
//
// CRON_SECRET 認証必須。

const RETENTION = {
  event_views: 90,
  line_messages: 180,
  notifications: 180,
  event_messages: 365,
} as const;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret && process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}` &&
    process.env.NODE_ENV !== "development"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Missing service role key" },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  const now = new Date();
  const results: Record<string, { deleted: number; error?: string }> = {};

  // event_views: viewed_at で切る
  await cleanupTable(
    admin,
    "event_views",
    "viewed_at",
    RETENTION.event_views,
    now,
    results
  );

  // line_messages, notifications, event_messages: created_at で切る
  // テーブルがなければスキップ。
  for (const [tableName, days] of [
    ["line_messages", RETENTION.line_messages],
    ["notifications", RETENTION.notifications],
    ["event_messages", RETENTION.event_messages],
  ] as const) {
    await cleanupTable(admin, tableName, "created_at", days, now, results);
  }

  return NextResponse.json({
    ok: true,
    checked_at: now.toISOString(),
    results,
  });
}

async function cleanupTable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  tableName: string,
  timeColumn: string,
  retentionDays: number,
  now: Date,
  results: Record<string, { deleted: number; error?: string }>
): Promise<void> {
  const cutoff = new Date(
    now.getTime() - retentionDays * 24 * 60 * 60 * 1000
  ).toISOString();
  try {
    // count() で削除予定件数を先に取得（ログ用）
    const countQ = await admin
      .from(tableName)
      .select("*", { count: "exact", head: true })
      .lt(timeColumn, cutoff);
    const expected = countQ.count ?? 0;

    if (expected === 0) {
      results[tableName] = { deleted: 0 };
      return;
    }

    const { error } = await admin
      .from(tableName)
      .delete()
      .lt(timeColumn, cutoff);
    if (error) {
      results[tableName] = { deleted: 0, error: error.message };
      return;
    }
    results[tableName] = { deleted: expected };
  } catch (e) {
    results[tableName] = {
      deleted: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
