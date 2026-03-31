-- Add location_type and online_url columns to events table
ALTER TABLE events ADD COLUMN location_type TEXT DEFAULT 'physical';
-- Values: 'physical' | 'online' | 'hybrid'

ALTER TABLE events ADD COLUMN online_url TEXT;
