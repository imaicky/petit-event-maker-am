-- 申し込み締め切り日時。null = 無制限。
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS booking_deadline timestamptz;

COMMENT ON COLUMN events.booking_deadline IS '申し込み締め切り日時。NULLの場合はイベント開始時刻まで受付可能';
