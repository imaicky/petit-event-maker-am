-- ============================================================
-- Stripe Connect 対応：手数料モデルへ移行するための DB 拡張
-- ============================================================
-- 既存の stripe_settings は「主催者がSecret Keyを直接入力する」レガシー方式。
-- Connect方式（OAuthで連携）を併存させ、新規はConnect、既存はレガシーで動作。
-- ============================================================

ALTER TABLE public.stripe_settings
  ADD COLUMN IF NOT EXISTS connect_mode text NOT NULL DEFAULT 'legacy'
    CHECK (connect_mode IN ('legacy', 'standard', 'express')),
  ADD COLUMN IF NOT EXISTS charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS details_submitted boolean NOT NULL DEFAULT false,
  -- 主催者ごとに手数料率を変えられるように（Pro加入者は優遇など）
  ADD COLUMN IF NOT EXISTS platform_fee_percent numeric(5,2) NOT NULL DEFAULT 5.0
    CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 50),
  ADD COLUMN IF NOT EXISTS platform_fee_fixed_jpy int NOT NULL DEFAULT 0
    CHECK (platform_fee_fixed_jpy >= 0);

COMMENT ON COLUMN public.stripe_settings.connect_mode IS
  'legacy=Secret Key直接入力（既存）, standard=Connect Standard（OAuth）, express=Connect Express';
COMMENT ON COLUMN public.stripe_settings.platform_fee_percent IS
  'プラットフォーム手数料率（％）。デフォルト5%。Pro加入者は別途調整。';
COMMENT ON COLUMN public.stripe_settings.platform_fee_fixed_jpy IS
  'プラットフォーム固定手数料（JPY）。Peatix式のper-ticket手数料に近づけたい場合用。';

-- Connect方式では stripe_secret_key が NULL になるため NOT NULL を緩和
ALTER TABLE public.stripe_settings
  ALTER COLUMN stripe_secret_key DROP NOT NULL;

-- 監査用: application_fee の集計テーブル
CREATE TABLE IF NOT EXISTS public.platform_fees (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_id        uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_jpy      int         NOT NULL,           -- 手数料（円）
  base_amount_jpy int         NOT NULL,           -- 元の取引額（円）
  fee_percent     numeric(5,2) NOT NULL,
  stripe_session_id text,
  stripe_application_fee_id text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_fees_event ON public.platform_fees(event_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_organizer ON public.platform_fees(organizer_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_created ON public.platform_fees(created_at DESC);

-- RLS: 主催者は自分の手数料のみ閲覧可能、service_role がすべて
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_fees_organizer_read ON public.platform_fees;
CREATE POLICY platform_fees_organizer_read ON public.platform_fees
  FOR SELECT USING (organizer_id = auth.uid());

DROP POLICY IF EXISTS platform_fees_service_all ON public.platform_fees;
CREATE POLICY platform_fees_service_all ON public.platform_fees
  FOR ALL USING (auth.role() = 'service_role');
