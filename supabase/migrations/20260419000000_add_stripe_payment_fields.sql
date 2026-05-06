ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'none'
    CHECK (payment_status IN ('none', 'pending', 'paid', 'failed', 'refunded'));

CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session_id
  ON bookings(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
