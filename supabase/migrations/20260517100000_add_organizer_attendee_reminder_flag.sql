-- ============================================================
-- 主催者向け参加者リスト送信フラグ
-- ============================================================
-- 翌日開催のイベントについて、主催者のLINEに参加者リストを送信したかを追跡。
-- 重複送信を防ぐ。
-- ============================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organizer_attendee_list_sent BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.events.organizer_attendee_list_sent IS
  '主催者向け参加者リスト（前日リマインダー）が送信済みかどうか';
