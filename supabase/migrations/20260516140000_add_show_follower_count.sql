-- ============================================================
-- 主催者フォロー: フォロワー数の公開可否設定 (Issue #1 / F2-01 サブタスク 8)
-- ============================================================
-- 主催者プロフィール `/[username]` でフォロワー数を表示するかを
-- 個別に選択できるようにする。デフォルトは表示 (true)。
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_follower_count boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.show_follower_count IS
  '主催者ポートフォリオでフォロワー数を公開するか。false にすると /[username] のフォロワー数表示が隠れる。';
