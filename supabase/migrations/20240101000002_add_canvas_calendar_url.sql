-- Add canvas_calendar_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS canvas_calendar_url TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN profiles.canvas_calendar_url IS 'Canvas iCal feed URL for calendar sync (alternative to API token)';
