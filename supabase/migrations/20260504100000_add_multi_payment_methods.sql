-- ============================================================
-- 複数決済方法 + 銀行振込サポート
-- ============================================================
-- 既存の events.payment_method（単一）はそのまま残す（互換性のため）
-- 新規に events.payment_methods text[] を追加し、複数指定を可能にする
-- 銀行振込の振込先情報、振込期限の任意上書きを追加
-- bookings 側に申込者が選んだ決済方法、振込期限、リマインド送信時刻を追加

-- ─── events: 複数決済方法 ────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS payment_methods text[];

-- 既存データを payment_method（単一）から payment_methods（配列）へ移行
-- - 値があれば配列1要素として設定
-- - 無料イベント（payment_method NULL）はそのまま NULL
UPDATE events
SET payment_methods = ARRAY[payment_method]
WHERE payment_methods IS NULL
  AND payment_method IS NOT NULL;

-- ─── events: 銀行振込情報 ────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_branch text,
  ADD COLUMN IF NOT EXISTS bank_account_type text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_account_holder text,
  ADD COLUMN IF NOT EXISTS bank_note text;

COMMENT ON COLUMN events.bank_name IS '銀行名（例：三井住友銀行）';
COMMENT ON COLUMN events.bank_branch IS '支店名';
COMMENT ON COLUMN events.bank_account_type IS '口座種別（普通/当座）';
COMMENT ON COLUMN events.bank_account_number IS '口座番号';
COMMENT ON COLUMN events.bank_account_holder IS '口座名義（カナ）';
COMMENT ON COLUMN events.bank_note IS '振込時の注意事項（任意）';

-- ─── events: 振込期限の任意上書き ────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS payment_deadline_days integer;

COMMENT ON COLUMN events.payment_deadline_days IS '振込期限（申込から何日後）。NULLなら自動計算（min(申込+7日, 開催-3日)）';

-- ─── bookings: 申込者が選んだ決済方法 ────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_method text;

COMMENT ON COLUMN bookings.payment_method IS '申込者が選択した決済方法 (stripe/bank/onsite/custom)';

-- ─── bookings: その予約の振込期限とリマインド送信状況 ─────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reminded_at timestamptz;

COMMENT ON COLUMN bookings.payment_deadline IS '銀行振込の振込期限（申込時に算出）';
COMMENT ON COLUMN bookings.payment_reminded_at IS '振込期限1日前のリマインド送信日時';

-- ─── インデックス（cron処理用） ────────────────────────────────
-- 期限超過チェック・リマインド送信対象を高速に絞り込むため
CREATE INDEX IF NOT EXISTS idx_bookings_payment_pending_deadline
  ON bookings (payment_deadline)
  WHERE payment_status = 'pending' AND payment_method = 'bank';
