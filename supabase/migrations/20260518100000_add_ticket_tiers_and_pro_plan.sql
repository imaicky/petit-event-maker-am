-- ============================================================
-- チケット種別（複数プラン）+ プラットフォーム PRO プラン
-- ============================================================
-- 1イベントに複数プラン（通常/プレミアム/VIP等）を持てるようにする。
-- ticket tier 機能は PRO プラン契約者限定。
-- ============================================================

-- ─── event_ticket_tiers: チケット種別 ────────────────────────
CREATE TABLE IF NOT EXISTS public.event_ticket_tiers (
  id            uuid        primary key default gen_random_uuid(),
  event_id      uuid        not null references public.events(id) on delete cascade,
  name          text        not null,
  description   text,
  price         integer     not null check (price >= 0),
  capacity      integer     check (capacity is null or capacity > 0),
  sort_order    integer     not null default 0,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

COMMENT ON TABLE public.event_ticket_tiers IS
  '1イベントに対する複数の料金プラン（PRO機能）。例: 通常/早割/VIP';
COMMENT ON COLUMN public.event_ticket_tiers.capacity IS
  'このプラン固有の定員。NULL の場合はイベント全体の capacity を共有する。';

CREATE INDEX IF NOT EXISTS idx_event_ticket_tiers_event_id
  ON public.event_ticket_tiers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_ticket_tiers_sort
  ON public.event_ticket_tiers(event_id, sort_order);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION public.tg_update_event_ticket_tiers_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_ticket_tiers_updated_at ON public.event_ticket_tiers;
CREATE TRIGGER trg_event_ticket_tiers_updated_at
  BEFORE UPDATE ON public.event_ticket_tiers
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_event_ticket_tiers_updated_at();

-- RLS: 主催者本人 + 共同管理者 + 全員 select 可
ALTER TABLE public.event_ticket_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tiers_select_all" ON public.event_ticket_tiers;
CREATE POLICY "tiers_select_all"
  ON public.event_ticket_tiers FOR SELECT USING (true);

DROP POLICY IF EXISTS "tiers_insert_owner" ON public.event_ticket_tiers;
CREATE POLICY "tiers_insert_owner"
  ON public.event_ticket_tiers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_ticket_tiers.event_id
        AND e.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tiers_update_owner" ON public.event_ticket_tiers;
CREATE POLICY "tiers_update_owner"
  ON public.event_ticket_tiers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_ticket_tiers.event_id
        AND e.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tiers_delete_owner" ON public.event_ticket_tiers;
CREATE POLICY "tiers_delete_owner"
  ON public.event_ticket_tiers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_ticket_tiers.event_id
        AND e.creator_id = auth.uid()
    )
  );

-- ─── bookings: 選択された tier ───────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS ticket_tier_id uuid
    references public.event_ticket_tiers(id) on delete set null,
  ADD COLUMN IF NOT EXISTS amount_paid integer;

COMMENT ON COLUMN public.bookings.ticket_tier_id IS
  '申込者が選んだチケット種別。NULL なら単一価格イベント';
COMMENT ON COLUMN public.bookings.amount_paid IS
  '実際に支払う金額。tier の price または event.price のスナップショット';

CREATE INDEX IF NOT EXISTS idx_bookings_ticket_tier_id
  ON public.bookings(ticket_tier_id);

-- ─── profiles: PRO プラン ────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS pro_until timestamptz,
  ADD COLUMN IF NOT EXISTS pro_stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS pro_stripe_customer_id text;

COMMENT ON COLUMN public.profiles.plan IS
  'プラットフォーム契約プラン。free/pro';
COMMENT ON COLUMN public.profiles.pro_until IS
  'PRO 契約の有効期限。これを過ぎたら plan を free に戻す';
COMMENT ON COLUMN public.profiles.pro_stripe_subscription_id IS
  'Stripe Subscription ID（プラットフォーム側Stripe）';
COMMENT ON COLUMN public.profiles.pro_stripe_customer_id IS
  'Stripe Customer ID（プラットフォーム側Stripe）';

CREATE INDEX IF NOT EXISTS idx_profiles_plan
  ON public.profiles(plan) WHERE plan = 'pro';
