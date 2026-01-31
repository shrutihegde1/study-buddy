ALTER TABLE calendar_items
  ADD COLUMN IF NOT EXISTS effort_estimate TEXT,
  ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb;
