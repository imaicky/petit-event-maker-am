-- ============================================================
-- 主催者フォロー機能（Issue #1）
-- ============================================================
-- 参加者が主催者をフォローし、新規イベント公開時に通知を受け取る
-- ============================================================

CREATE TABLE IF NOT EXISTS public.follows (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organizer_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notify_email  boolean     NOT NULL DEFAULT true,
  notify_line   boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, organizer_id),
  CHECK (follower_id <> organizer_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower
  ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_organizer
  ON public.follows(organizer_id);

-- ─── フォロワー数集計用関数（公開：個人特定なし）──────────
CREATE OR REPLACE FUNCTION public.get_follower_count(p_organizer_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT count(*)::int
    FROM public.follows
   WHERE organizer_id = p_organizer_id;
$$;

-- ─── 自分がフォローしているかチェック（公開）─────────────
CREATE OR REPLACE FUNCTION public.is_following(p_organizer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows
     WHERE organizer_id = p_organizer_id
       AND follower_id = auth.uid()
  );
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- 自分がfollower or organizerのレコードのみ閲覧可能
DROP POLICY IF EXISTS follows_select_own ON public.follows;
CREATE POLICY follows_select_own ON public.follows
  FOR SELECT USING (
    follower_id = auth.uid() OR organizer_id = auth.uid()
  );

-- 自分がfollowerのレコードのみ作成可能
DROP POLICY IF EXISTS follows_insert_own ON public.follows;
CREATE POLICY follows_insert_own ON public.follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

-- 自分がfollowerのレコードのみ更新（通知設定）可能
DROP POLICY IF EXISTS follows_update_own ON public.follows;
CREATE POLICY follows_update_own ON public.follows
  FOR UPDATE USING (follower_id = auth.uid())
  WITH CHECK (follower_id = auth.uid());

-- 自分がfollowerのレコードのみ削除可能（unfollow）
DROP POLICY IF EXISTS follows_delete_own ON public.follows;
CREATE POLICY follows_delete_own ON public.follows
  FOR DELETE USING (follower_id = auth.uid());
