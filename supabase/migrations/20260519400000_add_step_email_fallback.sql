-- ============================================================
-- ステップ配信のメールフォールバック
-- ============================================================
-- 各ステップに「LINE未紐付け申込者へメールで送信するか」のフラグを追加。
-- 既存ステップはデフォルトON（互換性のためメールも送る）。
--
-- line_step_sends にチャネル情報を追加して
--   - LINE紐付け済み → channel='line'
--   - 未紐付け → channel='email'
-- を区別できるようにする。1 booking × 1 step につき1配信のみ（重複防止は維持）。
-- ============================================================

-- line_step_messages: メール送信可否のトグル
ALTER TABLE public.line_step_messages
  ADD COLUMN IF NOT EXISTS email_fallback boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.line_step_messages.email_fallback IS
  'LINE未紐付け申込者にメールで送信するか。trueなら全員に届く。falseならLINE紐付け済みのみ';

-- line_step_sends: 実際に使われたチャネル
ALTER TABLE public.line_step_sends
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'line';

COMMENT ON COLUMN public.line_step_sends.channel IS
  '配信に使われたチャネル: line / email / skipped';
