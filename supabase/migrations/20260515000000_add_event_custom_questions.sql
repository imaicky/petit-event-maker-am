-- 事前アンケート（カスタム質問）v1
--
-- 設計方針:
--   - events.custom_questions: JSONB 配列 (最大3要素)
--   - bookings.custom_answers: JSONB オブジェクト
--   - 全項目「任意回答」: 必須フラグなし
--   - 既存予約は default '{}' で何も影響なし
--
-- 安全策（Supabase SQL editor の60s timeout 対策）:
--   - 列追加は default をつけても定数なので即時 (PG11+)
--   - CHECK制約は NOT VALID で既存行のスキャンをスキップしてからVALIDATE
--   - 各文を独立したトランザクションで実行できるよう SET LOCAL は使わない
--
-- 失敗時の再実行は IF NOT EXISTS / IF NOT EXISTS でべき等。

-- ── Step 1: 列追加（定数 default なので一瞬で完了）──────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS custom_questions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS custom_answers JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── Step 2: CHECK 制約を NOT VALID で追加（既存行スキャンをスキップ）─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'events_custom_questions_max_three'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_custom_questions_max_three
      CHECK (
        jsonb_typeof(custom_questions) = 'array'
        AND jsonb_array_length(custom_questions) <= 3
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_custom_answers_is_object'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_custom_answers_is_object
      CHECK (jsonb_typeof(custom_answers) = 'object') NOT VALID;
  END IF;
END $$;

-- ── Step 3: 既存行を背景でバリデート（タイムアウトせず実行可能）──
-- これはオプション。失敗した場合でも新規行への制約は有効。
-- 既存行は default 値しか入っていないので必ず通る。
ALTER TABLE events VALIDATE CONSTRAINT events_custom_questions_max_three;
ALTER TABLE bookings VALIDATE CONSTRAINT bookings_custom_answers_is_object;

COMMENT ON COLUMN events.custom_questions IS
  '主催者が定義したカスタム質問配列（最大3問、各要素: {id,label,type,options?}）';
COMMENT ON COLUMN bookings.custom_answers IS
  '参加者の任意回答 ({questionId: 回答文字列})。未回答は単に欠落。';
