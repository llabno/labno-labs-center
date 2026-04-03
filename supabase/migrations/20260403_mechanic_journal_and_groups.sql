-- ============================================
-- Internal Mechanic: Journal + Groups + Custom Relationship Types
-- ============================================

-- ============================================
-- 1. Custom Relationship Types (user-defined)
-- ============================================
CREATE TABLE IF NOT EXISTS ifs_relationship_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    label TEXT NOT NULL,                             -- e.g., "client", "bandmate", "church group"
    is_group BOOLEAN DEFAULT false,                  -- true for group types
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ifs_rel_types_user ON ifs_relationship_types(user_id);

ALTER TABLE ifs_relationship_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ifs_rel_types_owner" ON ifs_relationship_types
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. Group Members (link people to groups)
-- ============================================
ALTER TABLE ifs_entities ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;
ALTER TABLE ifs_entities ADD COLUMN IF NOT EXISTS group_members UUID[] DEFAULT '{}';
ALTER TABLE ifs_entities ADD COLUMN IF NOT EXISTS group_description TEXT;

-- ============================================
-- 3. Journal Entries (free-flow diary)
-- ============================================
CREATE TABLE IF NOT EXISTS ifs_journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,                           -- Raw diary text
    entry_type TEXT DEFAULT 'freeflow',              -- freeflow | voice_transcript | prompted
    -- AI-extracted data (populated after analysis)
    extracted_entities JSONB DEFAULT '[]'::jsonb,    -- [{name, sentiment, context_snippet}]
    extracted_parts JSONB DEFAULT '[]'::jsonb,       -- [{name, role, activation_level}]
    extracted_themes JSONB DEFAULT '[]'::jsonb,      -- ["authority", "abandonment", etc.]
    ns_state_before TEXT,                            -- green | amber | red (optional self-report)
    ns_state_after TEXT,                             -- green | amber | red (optional post-write)
    -- Linked entities (auto or manual)
    linked_entity_ids UUID[] DEFAULT '{}',
    linked_log_ids UUID[] DEFAULT '{}',              -- If journal spawns interaction logs
    -- Metadata
    word_count INTEGER DEFAULT 0,
    is_analyzed BOOLEAN DEFAULT false,
    analysis_result JSONB,                           -- Full AI analysis output
    -- Time tracking
    entry_date DATE DEFAULT CURRENT_DATE,
    entry_time TIME WITH TIME ZONE DEFAULT CURRENT_TIME,
    log_period TEXT,                                  -- morning | afternoon | evening | unset
    time_of_day_hour INTEGER,                        -- 0-23, auto-set from entry_time
    -- Emotional valence per entity mention
    entity_valence JSONB DEFAULT '[]'::jsonb,        -- [{entity_name, valence: positive|negative|neutral|mixed, intensity: 1-5}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ifs_journal_user ON ifs_journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ifs_journal_date ON ifs_journal_entries(entry_date DESC);

ALTER TABLE ifs_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ifs_journal_owner" ON ifs_journal_entries
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
