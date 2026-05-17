-- ============================================================
-- events.payment_method (singular) の CHECK 制約に 'bank' を追加
-- ============================================================
-- 経緯:
--   20260420100000_add_payment_method_fields.sql で
--     CHECK (payment_method IN ('stripe', 'onsite', 'custom'))
--   を導入したが、その後 20260504100000 で 'bank' を含む multi-method
--   をサポートした。フロントは payment_methods 配列の先頭要素を
--   payment_method(singular) にも書き込むため、銀行振込のみを選ぶと
--   制約違反で更新が失敗する。'bank' を許可リストに追加して修正する。

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_payment_method_check;

ALTER TABLE events
  ADD CONSTRAINT events_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN ('stripe', 'bank', 'onsite', 'custom')
  );
