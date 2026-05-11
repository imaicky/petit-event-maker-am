-- ============================================================
-- hybrid イベントの参加形式管理: Phase 1（Issue #5）
-- ============================================================
-- bookings に「参加形式 (リアル/オンライン)」を持たせる。
-- 既存全予約は DEFAULT 'physical' で自動 backfill される。
-- 非hybrid イベントでも attendance_format は持つが、UI上では
-- イベントの location_type が hybrid のときのみ切替を許可する。
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS attendance_format text
    NOT NULL DEFAULT 'physical'
    CHECK (attendance_format IN ('physical', 'online'));

-- 集計用インデックス（hybrid 定員チェックで形式別 COUNT を回す予定）
CREATE INDEX IF NOT EXISTS idx_bookings_event_format_status
  ON public.bookings (event_id, attendance_format, status);
