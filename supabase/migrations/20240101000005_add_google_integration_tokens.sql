-- Add columns for storing Google integration tokens separately from auth
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMPTZ;
