-- LINE messages for bidirectional communication
CREATE TABLE IF NOT EXISTS line_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_account_id uuid REFERENCES line_accounts(id) ON DELETE CASCADE,
  line_user_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  message_type text NOT NULL DEFAULT 'text',
  content text NOT NULL,
  line_message_id text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_line_messages_account ON line_messages(line_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_messages_user ON line_messages(line_account_id, line_user_id, created_at);

-- Event messages table (for tracking sent messages)
CREATE TABLE IF NOT EXISTS event_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id),
  subject text NOT NULL,
  body text NOT NULL,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'line', 'both')),
  recipient_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_messages_event ON event_messages(event_id, created_at DESC);
