-- ============================================================
-- 申込者LINE紐付け
-- ============================================================
-- bookings に line_user_id を保持できるようにする。LINE Login OAuth で
-- 申込者本人の userId を取得し、リマインダーやイベント通知を本人のLINEに
-- 直接プッシュするための土台。
--
-- line_link_token は申込時に発行される一回限りのランダム文字列で、
-- /api/auth/line/booking-link/start での起点認証に使う。
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS line_user_id text,
  ADD COLUMN IF NOT EXISTS line_link_token text,
  ADD COLUMN IF NOT EXISTS line_linked_at timestamptz;

COMMENT ON COLUMN public.bookings.line_user_id IS
  '申込者本人のLINE userId。LINE Login OAuth 経由で取得。NULL なら未紐付け';
COMMENT ON COLUMN public.bookings.line_link_token IS
  'LINE紐付けフロー開始用のランダムトークン（一回限り）';
COMMENT ON COLUMN public.bookings.line_linked_at IS
  'LINE Login で紐付けが完了した時刻';

CREATE INDEX IF NOT EXISTS idx_bookings_line_link_token
  ON public.bookings(line_link_token) WHERE line_link_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_line_user_id
  ON public.bookings(line_user_id) WHERE line_user_id IS NOT NULL;
