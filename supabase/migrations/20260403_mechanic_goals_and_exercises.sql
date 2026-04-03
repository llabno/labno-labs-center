-- ============================================
-- Internal Mechanic: Journal Goals, Streaks, Exercise Mapping, User Settings
-- ============================================

-- ============================================
-- 1. User Settings & Journal Goals
-- ============================================
CREATE TABLE IF NOT EXISTS ifs_user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
    -- Journal goals
    journal_goal_frequency TEXT DEFAULT 'none',       -- none | daily | twice_daily | three_daily
    journal_goal_times TEXT[] DEFAULT '{}',            -- e.g., ['morning', 'afternoon', 'evening']
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_method TEXT DEFAULT 'in_app',             -- in_app | email (future: push)
    -- Streaks
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_journal_date DATE,
    -- Premium features
    tier TEXT DEFAULT 'free',                          -- free | premium
    voice_input_enabled BOOLEAN DEFAULT false,
    -- Preferences
    default_log_mode TEXT DEFAULT 'individual',        -- individual | group
    show_trademarked_names BOOLEAN DEFAULT false,      -- false = consumer labels, true = clinical labels
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE ifs_user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ifs_settings_owner" ON ifs_user_settings
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. Notification Queue
-- ============================================
CREATE TABLE IF NOT EXISTS ifs_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type TEXT NOT NULL,                               -- journal_reminder | streak_milestone | pattern_alert | briefing
    title TEXT NOT NULL,
    body TEXT,
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ifs_notifications_user ON ifs_notifications(user_id, is_read);
ALTER TABLE ifs_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ifs_notifications_owner" ON ifs_notifications
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. Exercise Library (Core Three integration)
-- ============================================
CREATE TABLE IF NOT EXISTS ifs_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT,                                    -- settle | build | explore
    movement_family TEXT,                             -- from Core Three classification
    ns_state_target TEXT,                             -- Which NS state this helps with
    ns_state_contraindicated TEXT[],                  -- States where this should NOT be used
    affective_drive_target TEXT[],                    -- Which drives this addresses
    body_region TEXT,
    description TEXT,
    dose_frequency TEXT,                              -- e.g., "3 sets of 10"
    dose_duration TEXT,                               -- e.g., "30 seconds hold"
    safety_tier INTEGER DEFAULT 1,                    -- 1=safe for all, 2=moderate, 3=supervised
    source TEXT DEFAULT 'core_three',                 -- core_three | custom
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ifs_exercises_ns ON ifs_exercises(ns_state_target);
CREATE INDEX IF NOT EXISTS idx_ifs_exercises_category ON ifs_exercises(category);

-- No RLS on exercises — shared library (read-only for users, admin writes)
ALTER TABLE ifs_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ifs_exercises_read_all" ON ifs_exercises
    FOR SELECT USING (true);
CREATE POLICY "ifs_exercises_write_admin" ON ifs_exercises
    FOR INSERT WITH CHECK (auth.email() = 'lance@labnolabs.com');

-- ============================================
-- 4. Time Travel Sessions (Sarah Peyton)
-- ============================================
CREATE TABLE IF NOT EXISTS ifs_time_travel_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    -- Target
    target_age TEXT,                                  -- "Age 7", "teenager", "young adult"
    target_memory TEXT,                               -- Brief description of the memory
    target_part_id UUID REFERENCES ifs_parts(id),     -- Which part holds this memory
    -- Process steps
    current_step TEXT DEFAULT 'arrival',              -- arrival | witness | resonance | rewrite | return | integrate
    messages JSONB DEFAULT '[]'::jsonb,               -- Back-and-forth with AI guide
    -- Outcomes
    resonant_statement TEXT,                          -- The resonant language that landed
    original_contract TEXT,                           -- Contract discovered during travel
    new_truth TEXT,                                   -- What the younger self now knows
    somatic_shift TEXT,                               -- Body changes noticed
    -- Status
    status TEXT DEFAULT 'in_progress',                -- in_progress | completed | paused
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ifs_time_travel_user ON ifs_time_travel_sessions(user_id);
ALTER TABLE ifs_time_travel_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ifs_time_travel_owner" ON ifs_time_travel_sessions
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. Add icon field to parts and entities
-- ============================================
ALTER TABLE ifs_parts ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE ifs_entities ADD COLUMN IF NOT EXISTS icon TEXT;
