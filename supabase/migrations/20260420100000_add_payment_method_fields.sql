ALTER TABLE events
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'stripe'
    CHECK (payment_method IN ('stripe', 'onsite', 'custom')),
  ADD COLUMN IF NOT EXISTS payment_link text,
  ADD COLUMN IF NOT EXISTS payment_info text;
