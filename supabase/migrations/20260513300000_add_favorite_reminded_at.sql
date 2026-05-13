-- ============================================================
-- お気に入り通知の冪等性
-- ============================================================
-- イベント開催が近づいたとき、お気に入り登録者に対して
-- 1回だけリマインダーメールを送る。
-- ============================================================

ALTER TABLE public.event_favorites
  ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_favorites_unreminded
  ON public.event_favorites (event_id)
  WHERE reminded_at IS NULL;
