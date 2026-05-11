-- ============================================================
-- 主催者フォロー: 新規イベント公開通知の冪等性保証
-- (Issue #1 / F2-01)
-- ============================================================
-- イベント公開時に follows に登録されている購読者へ通知する。
-- cron が毎日走るため、二重送信を防ぐ目印として
-- follower_notified_at (timestamptz NULL) を events に追加する。
-- ============================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS follower_notified_at timestamptz;

-- 通知未送信の公開済みイベントを高速に拾う部分インデックス
CREATE INDEX IF NOT EXISTS idx_events_unnotified
  ON public.events (created_at DESC)
  WHERE is_published = true
    AND follower_notified_at IS NULL;
