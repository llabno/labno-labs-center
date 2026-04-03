-- ============================================
-- Internal Mechanic: Entity Profiles + Analysis Logs
-- Cross-session entity persistence + modular analysis output
-- ============================================

-- ============================================
-- 1. Entity Profiles (People in your relational field)
-- ============================================
CREATE TABLE IF NOT EXISTS ifs_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,                              -- "Mom", "Sarah", "Boss"
    relationship_type TEXT,                          -- parent | partner | sibling | friend | authority | colleague | self | other
    -- Hypothesized profile (built from logs, always provisional)
    vmeme_center TEXT,                               -- Spiral Dynamics: beige | purple | red | blue | orange | green | yellow | turquoise
    observed_protectors TEXT[],                       -- Parts detected in their behavior (hypothesis only)
    autonomic_baseline TEXT,                          -- ventral_vagal | sympathetic | dorsal_vagal
    affective_drive TEXT,                             -- Dominant Panksepp system observed
    hypothesized_wound TEXT,                          -- What their system may be protecting (hypothesis)
    compassion_frame TEXT,                            -- How to hold compassion for this person
    -- Tracking
    log_count INTEGER DEFAULT 0,                     -- Number of interaction logs analyzed
    confidence_level TEXT DEFAULT 'low',              -- low (<3 logs) | medium (3-7) | high (8+)
    last_log_date TIMESTAMP WITH TIME ZONE,
    -- Visual board position (shared with ifs_relationships)
    board_x NUMERIC DEFAULT 0,
    board_y NUMERIC DEFAULT 0,
    color TEXT DEFAULT '#6b8e9b',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ifs_entities_user ON ifs_entities(user_id);
CREATE INDEX IF NOT EXISTS idx_ifs_entities_name ON ifs_entities(user_id, name);

-- ============================================
-- 2. Interaction Logs (Raw input + intake data)
-- ============================================
CREATE TABLE IF NOT EXISTS ifs_interaction_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    entity_id UUID REFERENCES ifs_entities(id),       -- Who this interaction was with
    -- Step 1: Entity (auto-linked)
    -- Step 2: Raw Dump
    raw_text TEXT NOT NULL,                            -- Unformatted interaction description
    -- Step 3: Somatic Anchor
    somatic_state TEXT,                                -- green | amber | red
    -- Step 4: Affective Drive (self-report)
    affective_drive_self_report TEXT,                  -- seeking | rage | fear | panic_grief | care | play
    -- Step 5: Parts Self-Report (optional)
    parts_self_report TEXT,                            -- Free text
    -- Metadata
    interaction_date DATE DEFAULT CURRENT_DATE,
    session_number INTEGER DEFAULT 1,                  -- Log # within a session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ifs_logs_user ON ifs_interaction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ifs_logs_entity ON ifs_interaction_logs(entity_id);

-- ============================================
-- 3. Analysis Results (9-module pipeline output)
-- ============================================
CREATE TABLE IF NOT EXISTS ifs_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    log_id UUID NOT NULL REFERENCES ifs_interaction_logs(id),
    entity_id UUID REFERENCES ifs_entities(id),
    -- Module outputs (each stored as JSONB for flexibility)
    m9_polyvagal JSONB,                               -- ns_state_confirmed, discrepancy, reasoning
    m16_ifs JSONB,                                    -- self_energy_present, parts_active[], blending_level
    m18_compassionate_inquiry JSONB,                  -- ci_level, disconnection_pattern, what_triggered, conscious_response
    m19_panksepp JSONB,                               -- affective_drive_confirmed, discrepancy, reasoning
    m21_winnicott JSONB,                              -- four_layer_check (safety/regulation/connection/meaning)
    m22_epstein JSONB,                                -- feel_towards_gate (pass/fail), reasoning
    m23_integral JSONB,                               -- aqal_breakdown (UL/UR/LL/LR)
    m20_spiral JSONB,                                 -- vmeme_assessment, tier_shift
    m25_watts JSONB,                                  -- wu_wei_note, non_forcing_alternative
    -- Aggregate outputs
    pattern_flags JSONB,                              -- Cross-log pattern detection (fires at 3+ logs)
    retrospective JSONB,                              -- Five-angle retrospective
    entity_hypothesis_update JSONB,                   -- Updated entity profile fields
    -- Pipeline metadata
    pipeline_status TEXT DEFAULT 'pending',            -- pending | running | completed | failed
    modules_completed TEXT[] DEFAULT '{}',             -- Track which modules finished
    current_module TEXT,                               -- Which module is currently running
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ifs_analysis_log ON ifs_analysis_results(log_id);
CREATE INDEX IF NOT EXISTS idx_ifs_analysis_entity ON ifs_analysis_results(entity_id);
CREATE INDEX IF NOT EXISTS idx_ifs_analysis_status ON ifs_analysis_results(pipeline_status);

-- ============================================
-- RLS: Owner-only access
-- ============================================
ALTER TABLE ifs_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_interaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ifs_entities_owner" ON ifs_entities
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ifs_logs_owner" ON ifs_interaction_logs
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ifs_analysis_owner" ON ifs_analysis_results
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
