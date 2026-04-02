-- ============================================================================
-- V2 Features: attendance tracking + menu messages
-- ============================================================================

-- 1. Add attended column to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS attended boolean DEFAULT null;

-- 2. Add attended column to menu_bookings
ALTER TABLE public.menu_bookings
  ADD COLUMN IF NOT EXISTS attended boolean DEFAULT null;

-- 3. Create menu_messages table (mirrors event_messages)
CREATE TABLE IF NOT EXISTS public.menu_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  subject text NOT NULL,
  body text NOT NULL,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'line', 'both')),
  recipient_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4. RLS for menu_messages
ALTER TABLE public.menu_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Menu creators can view their messages" ON public.menu_messages;
CREATE POLICY "Menu creators can view their messages" ON public.menu_messages
  FOR SELECT USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Menu creators can insert messages" ON public.menu_messages;
CREATE POLICY "Menu creators can insert messages" ON public.menu_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_menu_messages_menu_id ON public.menu_messages(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_messages_sender_created ON public.menu_messages(sender_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_attended ON public.bookings(event_id, attended) WHERE attended IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_menu_bookings_attended ON public.menu_bookings(menu_id, attended) WHERE attended IS NOT NULL;
