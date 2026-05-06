-- ============================================================================
-- Add limited event (passcode gate) columns
-- ============================================================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_limited boolean DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS limited_passcode text;

-- Also ensure price_note and short_code exist
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS price_note text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS short_code text;

-- Index for short_code lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_short_code ON public.events(short_code) WHERE short_code IS NOT NULL;
