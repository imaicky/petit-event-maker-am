-- ============================================================
-- Group / Series 機能（Connpass / Doorkeeper 互換）
-- ============================================================
-- 主催者が継続的に開催するシリーズイベントをGroupとしてまとめる。
-- 例: 「AI prompt勉強会」グループ内に複数の単発イベントが連なる。
-- 参加者はGroupをフォローでき、新規イベント時に通知を受け取る。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_groups (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug          text        NOT NULL UNIQUE,
  name          text        NOT NULL,
  description   text,
  cover_url     text,
  -- ブランディング
  tagline       text,
  website_url   text,
  -- 設定
  is_published  boolean     NOT NULL DEFAULT true,
  -- 連携URL（コミュニティ動線）
  discord_url   text,
  slack_url     text,
  substack_url  text,
  youtube_url   text,
  -- メタデータ
  category_id   smallint    REFERENCES public.event_categories(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_groups_owner ON public.event_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_event_groups_slug ON public.event_groups(slug);
CREATE INDEX IF NOT EXISTS idx_event_groups_published
  ON public.event_groups(is_published, created_at DESC);

DROP TRIGGER IF EXISTS trg_event_groups_updated_at ON public.event_groups;
CREATE TRIGGER trg_event_groups_updated_at
  BEFORE UPDATE ON public.event_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── events に group_id を追加 ───────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS group_id uuid
  REFERENCES public.event_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS series_index int;

CREATE INDEX IF NOT EXISTS idx_events_group_id ON public.events(group_id);

COMMENT ON COLUMN public.events.group_id IS 'シリーズイベントの所属グループ';
COMMENT ON COLUMN public.events.series_index IS 'シリーズ内の連番（第N回）';

-- ─── group_followers（フォロー関係）─────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_followers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id      uuid        NOT NULL REFERENCES public.event_groups(id) ON DELETE CASCADE,
  notify_email  boolean     NOT NULL DEFAULT true,
  notify_line   boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_group_followers_follower
  ON public.group_followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_group_followers_group
  ON public.group_followers(group_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.event_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_followers ENABLE ROW LEVEL SECURITY;

-- 公開グループは全員閲覧可能
DROP POLICY IF EXISTS event_groups_read ON public.event_groups;
CREATE POLICY event_groups_read ON public.event_groups
  FOR SELECT USING (is_published = true OR owner_id = auth.uid());

-- 自分のグループのみ書込可能
DROP POLICY IF EXISTS event_groups_write ON public.event_groups;
CREATE POLICY event_groups_write ON public.event_groups
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- フォロー関係は本人と group owner が閲覧可能
DROP POLICY IF EXISTS group_followers_select ON public.group_followers;
CREATE POLICY group_followers_select ON public.group_followers
  FOR SELECT USING (
    follower_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.event_groups g
       WHERE g.id = group_followers.group_id AND g.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS group_followers_insert ON public.group_followers;
CREATE POLICY group_followers_insert ON public.group_followers
  FOR INSERT WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS group_followers_update ON public.group_followers;
CREATE POLICY group_followers_update ON public.group_followers
  FOR UPDATE USING (follower_id = auth.uid())
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS group_followers_delete ON public.group_followers;
CREATE POLICY group_followers_delete ON public.group_followers
  FOR DELETE USING (follower_id = auth.uid());

-- ============================================================
-- ヘルパー関数: グループのフォロワー数
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_group_follower_count(p_group_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT count(*)::int
    FROM public.group_followers
   WHERE group_id = p_group_id;
$$;
