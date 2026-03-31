-- Add tags to line_followers for segment delivery
ALTER TABLE line_followers ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
