-- Add Zoom meeting ID and passcode fields to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS zoom_passcode TEXT;
