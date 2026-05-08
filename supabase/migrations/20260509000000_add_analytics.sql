-- ============================================================
-- 計測基盤: event_views（主催者インサイト・ファネル分析・流入元分析）
-- ============================================================
-- 匿名ユーザーも含めてイベント閲覧をログ化する。
-- UTMパラメータ・リファラ・User-Agentを保存し、流入元分析を可能にする。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_views (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- 匿名ユーザーの追跡（cookie由来の擬似ID）
  anon_id       text,
  -- 流入元分析
  referrer      text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  user_agent    text,
  -- 基本情報
  viewed_at     timestamptz NOT NULL DEFAULT now()
);

-- インデックス（集計用）
CREATE INDEX IF NOT EXISTS idx_event_views_event_time
  ON public.event_views(event_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_views_user_time
  ON public.event_views(user_id, viewed_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_views_anon_event
  ON public.event_views(anon_id, event_id)
  WHERE anon_id IS NOT NULL;

-- ============================================================
-- bookings に流入元情報を付与（予約時のUTMを記録 → 流入経路ROI測定）
-- ============================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source_referrer text,
  ADD COLUMN IF NOT EXISTS source_utm_source text,
  ADD COLUMN IF NOT EXISTS source_utm_medium text,
  ADD COLUMN IF NOT EXISTS source_utm_campaign text;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.event_views ENABLE ROW LEVEL SECURITY;

-- 誰でもINSERT可能（閲覧記録は公開機能として動かす）
DROP POLICY IF EXISTS event_views_insert_any ON public.event_views;
CREATE POLICY event_views_insert_any ON public.event_views
  FOR INSERT WITH CHECK (true);

-- SELECTは service_role のみ（インサイトAPI経由で取得）
-- ※デフォルトで anon/authenticated には許可しない（policyを書かない）
