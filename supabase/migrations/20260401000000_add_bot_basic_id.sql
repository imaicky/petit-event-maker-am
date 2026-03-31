-- Add bot_basic_id column to line_accounts for friend-add URL
ALTER TABLE line_accounts ADD COLUMN IF NOT EXISTS bot_basic_id TEXT;
