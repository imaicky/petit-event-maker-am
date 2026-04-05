-- Add missing columns to line_accounts for LINE API integration
ALTER TABLE line_accounts ADD COLUMN IF NOT EXISTS bot_basic_id TEXT;
ALTER TABLE line_accounts ADD COLUMN IF NOT EXISTS bot_user_id TEXT;
ALTER TABLE line_accounts ADD COLUMN IF NOT EXISTS channel_secret TEXT;
ALTER TABLE line_accounts ADD COLUMN IF NOT EXISTS owner_line_user_id TEXT;
ALTER TABLE line_accounts ADD COLUMN IF NOT EXISTS notify_on_booking BOOLEAN NOT NULL DEFAULT true;
