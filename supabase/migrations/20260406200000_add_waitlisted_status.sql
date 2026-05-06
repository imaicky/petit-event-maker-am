-- Add 'waitlisted' to bookings status CHECK constraint
-- Dynamically find and drop the existing constraint, then recreate with new values

DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find the CHECK constraint on bookings.status
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'bookings'
    AND nsp.nspname = 'public'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('confirmed', 'cancelled', 'waitlisted'));

-- Index for efficient waitlist queries (FIFO order)
CREATE INDEX IF NOT EXISTS idx_bookings_waitlisted
  ON public.bookings (event_id, created_at)
  WHERE status = 'waitlisted';
