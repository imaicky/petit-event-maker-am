-- ============================================================
-- LINE Webhook 診断ログ用カラム追加
-- ============================================================
-- 目的:
--   webhook 受信時の最終成功時刻、最終エラー、署名検証失敗時刻を記録する。
--   silently fail を観測可能にし、/admin/line から各アカウントの健全性を判定する。
-- ============================================================

ALTER TABLE public.line_accounts
  ADD COLUMN IF NOT EXISTS last_webhook_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_webhook_error TEXT,
  ADD COLUMN IF NOT EXISTS last_webhook_signature_failed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.line_accounts.last_webhook_event_at IS
  'webhookが最後に正常処理されたタイムスタンプ。NULLなら一度も受信していない可能性。';

COMMENT ON COLUMN public.line_accounts.last_webhook_error IS
  'webhook処理中の最終エラーメッセージ。NULLなら問題なし。';

COMMENT ON COLUMN public.line_accounts.last_webhook_signature_failed_at IS
  '署名検証が最後に失敗したタイムスタンプ。channel_secret誤設定の検知に使う。';

-- 健全性レポート用インデックス（active かつ secret/owner が不足しているアカウントを高速取得）
CREATE INDEX IF NOT EXISTS idx_line_accounts_health
  ON public.line_accounts (channel_secret, owner_line_user_id)
  WHERE is_active = true;
