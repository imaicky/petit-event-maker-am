-- Add reminder tracking fields to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_2h_sent boolean DEFAULT false;
