-- line_followers テーブルのRLSポリシー追加
-- 問題: RLSが有効だがポリシー未定義のため、ユーザースコープのクライアントからSELECTが空結果を返す

-- Ensure RLS is enabled
ALTER TABLE line_followers ENABLE ROW LEVEL SECURITY;

-- Users can read followers of their own LINE account
DROP POLICY IF EXISTS "line_followers_select_own" ON line_followers;
CREATE POLICY "line_followers_select_own" ON line_followers
  FOR SELECT USING (
    line_account_id IN (
      SELECT id FROM line_accounts WHERE user_id = auth.uid()
    )
  );

-- Users can update followers of their own LINE account (for tags etc)
DROP POLICY IF EXISTS "line_followers_update_own" ON line_followers;
CREATE POLICY "line_followers_update_own" ON line_followers
  FOR UPDATE USING (
    line_account_id IN (
      SELECT id FROM line_accounts WHERE user_id = auth.uid()
    )
  );
