-- ============================================================
-- F3-02: 興味プロファイル（Issue #3）ベーステーブル
-- ============================================================
-- 参加者の参加履歴・閲覧履歴・お気に入りからタグごとの興味スコアを
-- 蓄積する。F3-03 パーソナライズフィードの直接の入力。
--
-- 同じ (user, tag) でも source(booking/view/favorite/explicit) ごとに
-- 行を持つ。集計時に SUM で合算する。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_interest_scores (
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_id      smallint    NOT NULL REFERENCES public.event_tags(id) ON DELETE CASCADE,
  source      text        NOT NULL CHECK (source IN ('booking', 'view', 'favorite', 'explicit')),
  score       real        NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tag_id, source)
);

-- 集計クエリ用（推薦時に user 単位で全タグの SUM(score) を取る）
CREATE INDEX IF NOT EXISTS idx_user_interest_user
  ON public.user_interest_scores (user_id, score DESC);

-- ─── RLS ──────────────────────────────────────────────────
-- 本人 + サーバー（service_role）からのみ参照可能。
-- 推薦エンジンが service_role 経由で読むため、anon/authenticated は本人のみ。
ALTER TABLE public.user_interest_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_interest_select_own ON public.user_interest_scores;
CREATE POLICY user_interest_select_own ON public.user_interest_scores
  FOR SELECT USING (user_id = auth.uid());

-- INSERT/UPDATE は service_role からのみ（明示ポリシーなし → RLS で拒否）
