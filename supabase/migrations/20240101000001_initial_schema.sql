-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  canvas_token TEXT,  -- Encrypted personal access token
  canvas_base_url TEXT,  -- e.g., https://school.instructure.com
  google_refresh_token TEXT,  -- For offline access
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified calendar items
CREATE TABLE calendar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN ('assignment', 'test', 'quiz', 'activity', 'task')),

  -- Timing
  due_date TIMESTAMPTZ,  -- For assignments/tests
  start_time TIMESTAMPTZ,  -- For activities/events
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,

  -- Source tracking
  source TEXT NOT NULL CHECK (source IN ('google_classroom', 'canvas', 'gmail', 'manual')),
  source_id TEXT,  -- External ID for deduplication
  source_url TEXT,  -- Link back to original
  course_name TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,

  -- Metadata
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicates from same source
  UNIQUE(user_id, source, source_id)
);

-- Sync state tracking
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('google_classroom', 'canvas', 'gmail', 'manual')),
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  next_page_token TEXT,  -- For paginated APIs
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message TEXT,
  items_synced INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_calendar_items_user_date ON calendar_items(user_id, due_date);
CREATE INDEX idx_calendar_items_user_status ON calendar_items(user_id, status);
CREATE INDEX idx_calendar_items_source ON calendar_items(user_id, source, source_id);
CREATE INDEX idx_sync_logs_user_source ON sync_logs(user_id, source);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Calendar items: Users can only access their own items
CREATE POLICY "Users can view own calendar items" ON calendar_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar items" ON calendar_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar items" ON calendar_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar items" ON calendar_items
  FOR DELETE USING (auth.uid() = user_id);

-- Sync logs: Users can only access their own sync logs
CREATE POLICY "Users can view own sync logs" ON sync_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync logs" ON sync_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync logs" ON sync_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_items_updated_at
  BEFORE UPDATE ON calendar_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
