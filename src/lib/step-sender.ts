/**
 * ステップ配信送信ロジック (Phase D)
 *
 * 各主催者の line_step_sequences (is_active) を走査し、
 * その主催者のイベントへの confirmed bookings のうち
 * 申込からのオフセットを過ぎていて、まだ送信していないステップを
 * LINE push する。
 *
 * 送信先は bookings.line_user_id（Phase Aで紐付け済み）のみ。
 * 紐付け無しのbookingにはスキップ（メールでの別送は将来実装）。
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { pushLineMessage } from "@/lib/line";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";

type Admin = ReturnType<typeof createAdminClient>;

export async function processStepDeliveries(
  admin: Admin,
  now: Date
): Promise<{ sent: number; errors: string[] }> {
  const errors: string[] = [];
  let sent = 0;

  try {
    // 1. 有効なシーケンスを全主催者分まとめて取得
    const { data: sequences } = await admin
      .from("line_step_sequences")
      .select("id, user_id, is_active")
      .eq("is_active", true);
    const seqs = (sequences ?? []) as Array<{
      id: string;
      user_id: string;
    }>;
    if (seqs.length === 0) return { sent: 0, errors: [] };

    const userIdBySeq = new Map<string, string>();
    for (const s of seqs) userIdBySeq.set(s.id, s.user_id);
    const seqIds = seqs.map((s) => s.id);

    // 2. それらのシーケンスのステップ一覧
    const { data: steps } = await admin
      .from("line_step_messages")
      .select("id, sequence_id, offset_hours, body, is_active, email_fallback")
      .in("sequence_id", seqIds)
      .eq("is_active", true);
    const stepRows = (steps ?? []) as Array<{
      id: string;
      sequence_id: string;
      offset_hours: number;
      body: string;
      email_fallback?: boolean;
    }>;
    if (stepRows.length === 0) return { sent: 0, errors: [] };

    // 3. 各主催者ごとに、彼らのイベントへの confirmed bookings を取得
    //    と同時に channel_access_token を取得
    const userIds = Array.from(new Set(seqs.map((s) => s.user_id)));

    const { data: lineAccounts } = await admin
      .from("line_accounts")
      .select("user_id, channel_access_token, is_active")
      .in("user_id", userIds);
    const tokenByUserId = new Map<string, string>();
    for (const la of (lineAccounts ?? []) as Array<{
      user_id: string;
      channel_access_token: string | null;
      is_active: boolean;
    }>) {
      if (la.is_active && la.channel_access_token) {
        tokenByUserId.set(la.user_id, la.channel_access_token);
      }
    }

    // 各 user_id の event_id 一覧
    const { data: events } = await admin
      .from("events")
      .select("id, creator_id")
      .in("creator_id", userIds);
    const userIdByEventId = new Map<string, string>();
    const eventIdsByUserId = new Map<string, string[]>();
    for (const e of (events ?? []) as Array<{
      id: string;
      creator_id: string;
    }>) {
      userIdByEventId.set(e.id, e.creator_id);
      const arr = eventIdsByUserId.get(e.creator_id) ?? [];
      arr.push(e.id);
      eventIdsByUserId.set(e.creator_id, arr);
    }

    // 主催者ごとに処理（並列化はLINE Push レートを考慮して逐次）
    for (const userId of userIds) {
      const token = tokenByUserId.get(userId);
      const eventIds = eventIdsByUserId.get(userId) ?? [];
      if (eventIds.length === 0) continue;

      // confirmed bookings を全件取得（line_user_id 有無を問わず）
      // 未紐付け申込者にはメールでフォールバックする
      type BookingForStep = {
        id: string;
        event_id: string;
        line_user_id: string | null;
        guest_name: string | null;
        guest_email: string | null;
        created_at: string;
      };
      let bookings: BookingForStep[] = [];
      try {
        const { data: bks } = await admin
          .from("bookings")
          .select(
            "id, event_id, line_user_id, guest_name, guest_email, created_at"
          )
          .in("event_id", eventIds)
          .eq("status", "confirmed");
        bookings = (bks ?? []) as BookingForStep[];
      } catch (err) {
        errors.push(
          `bookings fetch (${userId}): ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        continue;
      }
      if (bookings.length === 0) continue;

      // この主催者のイベントタイトルを引いておく（メール件名に使う）
      const eventTitleById = new Map<string, string>();
      try {
        const { data: evRows } = await admin
          .from("events")
          .select("id, title")
          .in("id", eventIds);
        for (const e of (evRows ?? []) as Array<{ id: string; title: string }>) {
          eventTitleById.set(e.id, e.title);
        }
      } catch {
        // 件名にタイトル使えなくても続行
      }

      // この主催者のステップ一覧
      const mySteps = stepRows.filter(
        (s) => userIdBySeq.get(s.sequence_id) === userId
      );

      // 各 booking × 各 step で送信判定
      for (const booking of bookings) {
        const bookedAt = new Date(booking.created_at).getTime();
        for (const step of mySteps) {
          const dueAt = bookedAt + step.offset_hours * 60 * 60 * 1000;
          if (dueAt > now.getTime()) continue;

          // 既に送信済みか確認
          const { data: existing } = await admin
            .from("line_step_sends")
            .select("id")
            .eq("booking_id", booking.id)
            .eq("step_message_id", step.id)
            .maybeSingle();
          if (existing) continue;

          // ─── 配信ルート決定 ────────────────────────────
          // 1) LINE紐付け済み かつ 主催者LINE連携あり → LINE
          // 2) LINE未紐付け かつ email_fallback=true かつ guest_email あり → Email
          // 3) どれにも該当しなければ skipped を記録（再送はしない）
          const emailFallback = step.email_fallback !== false; // default true
          const canLine = !!booking.line_user_id && !!token;
          const canEmail =
            !canLine && emailFallback && !!booking.guest_email;

          if (canLine) {
            const result = await pushLineMessage(
              token!,
              booking.line_user_id!,
              step.body
            );
            await admin.from("line_step_sends").insert({
              booking_id: booking.id,
              step_message_id: step.id,
              ok: result.ok,
              error: result.ok ? null : result.error,
              channel: "line",
            } as never);
            if (result.ok) sent++;
            else errors.push(`line ${booking.id} step ${step.id}: ${result.error}`);
          } else if (canEmail) {
            const eventTitle =
              eventTitleById.get(booking.event_id) ?? "イベント";
            const subject = `【${eventTitle}】主催者からのお知らせ`;
            const html = wrapInHtml(step.body, eventTitle);
            try {
              await sendBatchEmails({
                to: [booking.guest_email!],
                subject,
                html,
              });
              await admin.from("line_step_sends").insert({
                booking_id: booking.id,
                step_message_id: step.id,
                ok: true,
                channel: "email",
              } as never);
              sent++;
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              await admin.from("line_step_sends").insert({
                booking_id: booking.id,
                step_message_id: step.id,
                ok: false,
                error: msg,
                channel: "email",
              } as never);
              errors.push(`email ${booking.id} step ${step.id}: ${msg}`);
            }
          } else {
            // 送信先なし — 記録して再送ループを止める
            await admin.from("line_step_sends").insert({
              booking_id: booking.id,
              step_message_id: step.id,
              ok: false,
              error: "no delivery channel available",
              channel: "skipped",
            } as never);
          }
        }
      }
    }
  } catch (err) {
    errors.push(
      `unexpected: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return { sent, errors };
}
