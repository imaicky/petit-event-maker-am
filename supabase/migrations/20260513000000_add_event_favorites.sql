-- ============================================================
-- お気に入り（イベント単位の「保存」）
-- ============================================================
-- 参加者が気になるイベントを後で見返すための保存機能。
-- F3-02 興味プロファイルにも反映する: お気に入り = +3 加点。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_favorites (
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id   uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_favorites_user
  ON public.event_favorites (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_favorites_event
  ON public.event_favorites (event_id);

-- ─── RLS ──────────────────────────────────────────────────
ALTER TABLE public.event_favorites ENABLE ROW LEVEL SECURITY;

-- 自分のお気に入りのみ参照可能
DROP POLICY IF EXISTS event_favorites_select_own ON public.event_favorites;
CREATE POLICY event_favorites_select_own ON public.event_favorites
  FOR SELECT USING (user_id = auth.uid());

-- 自分のお気に入りのみ追加可能
DROP POLICY IF EXISTS event_favorites_insert_own ON public.event_favorites;
CREATE POLICY event_favorites_insert_own ON public.event_favorites
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 自分のお気に入りのみ削除可能
DROP POLICY IF EXISTS event_favorites_delete_own ON public.event_favorites;
CREATE POLICY event_favorites_delete_own ON public.event_favorites
  FOR DELETE USING (user_id = auth.uid());
