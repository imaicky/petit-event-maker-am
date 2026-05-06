-- ============================================================
-- 決済イベント監査ログ
-- ============================================================
-- 全ての決済関連の状態遷移を記録する追記専用テーブル。
-- 万一の問題発生時に「いつ・誰が・何を」したかを追跡できるようにする。
-- 例: 申込時にpending作成、Stripe webhookでpaid、organizerが手動confirm、
--     cron自動キャンセル、等。

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  -- イベント種別: created/paid/refunded/cancelled/reminder_sent/auto_cancelled/...
  type text NOT NULL,
  -- 状態遷移
  prev_status text,
  next_status text,
  -- 決済方法
  payment_method text,
  -- 金額（参考値）
  amount integer,
  -- 実行者: 'system' (cron/webhook) or user.id (manual)
  actor text,
  -- 追加情報（自由テキスト or JSON）
  note text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_booking ON public.payment_events(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_events_event ON public.payment_events(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_events_type_created ON public.payment_events(type, created_at DESC);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- 主催者・共同管理者はそのイベントの履歴を読める
CREATE POLICY "payment_events_select_managers"
  ON public.payment_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = payment_events.event_id
        AND (
          e.creator_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.event_admins a
            WHERE a.event_id = e.id
              AND a.user_id = auth.uid()
              AND a.status = 'accepted'
          )
        )
    )
  );

-- 書き込みは service_role からのみ（API経由）
-- RLS下でのINSERTは禁止 — service roleがバイパス
COMMENT ON TABLE public.payment_events IS '決済イベント監査ログ。INSERT は service_role 経由のみ';
