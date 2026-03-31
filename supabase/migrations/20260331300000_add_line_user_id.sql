-- Add LINE user ID to profiles for LINE Login integration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_user_id text;
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id);
