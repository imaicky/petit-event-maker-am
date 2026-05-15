-- 事前アンケート（カスタム質問）v1
-- 主催者がイベント作成・編集時に最大3問のカスタム質問を定義し、
-- 申込時に参加者が任意回答する仕組み。
--
-- 設計方針:
--   - events.custom_questions: JSONB 配列 (最大3要素、CHECK制約)
--     各要素: { id: string, label: string, type: "select"|"text", options?: string[] }
--   - bookings.custom_answers: JSONB オブジェクト { [questionId]: string }
--   - 全項目「任意回答」: 必須フラグなし。参加者は質問をスキップして申込可能。
--   - 既存予約は default '{}' で何も影響なし。
--   - 回答編集機能は v1 では未実装（書き込みのみ、UI で表示は今後）。

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS custom_questions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS custom_answers JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 質問数は3問まで（過剰な質問項目によるストレス防止）
ALTER TABLE events
  ADD CONSTRAINT events_custom_questions_max_three
  CHECK (jsonb_typeof(custom_questions) = 'array' AND jsonb_array_length(custom_questions) <= 3);

-- bookings.custom_answers は JSON オブジェクト形式のみ許可
ALTER TABLE bookings
  ADD CONSTRAINT bookings_custom_answers_is_object
  CHECK (jsonb_typeof(custom_answers) = 'object');

COMMENT ON COLUMN events.custom_questions IS
  '主催者が定義したカスタム質問配列（最大3問、各要素: {id,label,type,options?}）';
COMMENT ON COLUMN bookings.custom_answers IS
  '参加者の任意回答 ({questionId: 回答文字列})。未回答は単に欠落。';
