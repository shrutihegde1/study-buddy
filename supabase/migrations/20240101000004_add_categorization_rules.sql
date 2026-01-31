-- Rules table for user correction learning
CREATE TABLE categorization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL CHECK (match_type IN ('title_contains', 'title_prefix', 'source_id_prefix', 'context_code')),
  match_value TEXT NOT NULL,
  course_name TEXT NOT NULL,
  auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_type, match_value)
);

CREATE INDEX idx_categorization_rules_user ON categorization_rules(user_id);
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as other tables)
CREATE POLICY "Users can view own rules" ON categorization_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rules" ON categorization_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rules" ON categorization_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rules" ON categorization_rules FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_categorization_rules_updated_at BEFORE UPDATE ON categorization_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Prevent sync from overwriting user-initiated status changes
ALTER TABLE calendar_items ADD COLUMN IF NOT EXISTS status_locked BOOLEAN DEFAULT false;
