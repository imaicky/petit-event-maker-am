-- ============================================================
-- 複数リマインダースケジュール
-- ============================================================
-- イベントごとに「1週間前」「3日前」「1日前」「当日朝」など複数の
-- リマインダー時点を設定できるようにする。各時点で参加者に対して
-- メール（および line_user_id がある場合は LINE）を送信する。
--
-- 設計:
--   events.reminder_schedule : JSONB 配列 [{ offset_hours: 24 }, ...]
--     - offset_hours は開催時刻からの逆算（24 = 開催24時間前）
--     - NULL の場合は既定スケジュール（24時間前 + 3時間前）を使用
--   event_reminder_sends : 送信実績ログ + 二重送信防止用
-- ============================================================

-- ─── events.reminder_schedule ────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS reminder_schedule jsonb;

COMMENT ON COLUMN public.events.reminder_schedule IS
  'リマインダー送信タイミング配列。例: [{"offset_hours": 168}, {"offset_hours": 24}, {"offset_hours": 3}]。NULL なら既定（24h, 3h）';

-- ─── event_reminder_sends ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_reminder_sends (
  id              uuid        primary key default gen_random_uuid(),
  event_id        uuid        not null references public.events(id) on delete cascade,
  offset_hours    integer     not null,
  sent_at         timestamptz not null default now(),
  recipient_count integer     not null default 0,
  channel         text        not null default 'email' check (channel in ('email', 'line', 'both')),
  UNIQUE(event_id, offset_hours, channel)
);

COMMENT ON TABLE public.event_reminder_sends IS
  'リマインダー送信実績。(event_id, offset_hours, channel) のユニーク制約で二重送信を防ぐ';

CREATE INDEX IF NOT EXISTS idx_event_reminder_sends_event_id
  ON public.event_reminder_sends(event_id);

-- RLS: 主催者本人のみ閲覧可
ALTER TABLE public.event_reminder_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder_sends_select_owner" ON public.event_reminder_sends;
CREATE POLICY "reminder_sends_select_owner"
  ON public.event_reminder_sends FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_reminder_sends.event_id
        AND e.creator_id = auth.uid()
    )
  );
