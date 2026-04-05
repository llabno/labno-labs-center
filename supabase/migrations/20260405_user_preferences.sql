-- User preferences table for cross-device sync (favorites, settings, theme)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL UNIQUE,
  favorites JSONB DEFAULT '[]'::jsonb,
  theme TEXT DEFAULT 'default',
  settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users can only read/write their own preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences" ON user_preferences
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);
