-- ============================================================
-- 「興味なし」ボタン用: ユーザーごとのイベント除外フラグ
-- ============================================================
-- フィードで「興味なし」を押されたイベントを、その人のおすすめから
-- 二度と出さないようにする。
--
-- スコア(user_interest_scores) は持たず、イベント単位の除外フラグのみ。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_event_dismissals (
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id   uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_dismissals_user
  ON public.user_event_dismissals (user_id);

-- ─── RLS ──────────────────────────────────────────────────
ALTER TABLE public.user_event_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dismissals_select_own ON public.user_event_dismissals;
CREATE POLICY dismissals_select_own ON public.user_event_dismissals
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS dismissals_insert_own ON public.user_event_dismissals;
CREATE POLICY dismissals_insert_own ON public.user_event_dismissals
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS dismissals_delete_own ON public.user_event_dismissals;
CREATE POLICY dismissals_delete_own ON public.user_event_dismissals
  FOR DELETE USING (user_id = auth.uid());
