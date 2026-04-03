-- ============================================
-- Internal Mechanic: IFS Parts Work App
-- Tables for parts registry, conscious contracts,
-- relationships, and unburdening sessions
-- ============================================

-- ============================================
-- 1. IFS Parts Registry
-- ============================================
CREATE TABLE IF NOT EXISTS ifs_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,                          -- e.g., "The Perfectionist", "Little Lance"
    role TEXT NOT NULL DEFAULT 'protector',       -- protector | exile | firefighter | self
    description TEXT,                             -- What this part does, how it shows up
    triggers TEXT[],                              -- What activates this part
    beliefs TEXT[],                               -- Core beliefs this part holds
    body_location TEXT,                           -- Where it's felt somatically
    emotions TEXT[],                              -- Primary emotions this part carries
    age_origin TEXT,                              -- Approximate age/era when this part formed
    burdens TEXT[],                               -- What this part carries (shame, fear, etc.)
    protects_part_id UUID REFERENCES ifs_parts(id), -- Which exile this protector guards
    ns_state TEXT,                                -- Polyvagal: ventral_vagal | sympathetic | dorsal_vagal
    board_x NUMERIC DEFAULT 0,                   -- Visual board X position
    board_y NUMERIC DEFAULT 0,                   -- Visual board Y position
    color TEXT DEFAULT '#b06050',                 -- Node color on visual board
    is_active BOOLEAN DEFAULT true,               -- Whether this part is currently active/relevant
    notes TEXT,                                   -- Free-form session notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ifs_parts_user ON ifs_parts(user_id);
CREATE INDEX IF NOT EXISTS idx_ifs_parts_role ON ifs_parts(role);

-- ============================================
-- 2. Conscious Contracts (Sarah Peyton framework)
-- ============================================
CREATE TABLE IF NOT EXISTS ifs_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    part_id UUID REFERENCES ifs_parts(id),        -- Which part holds this contract
    contract_type TEXT NOT NULL DEFAULT 'unconscious', -- unconscious | conscious | released
    -- The vow structure: "I solemnly swear to ___ that I will ___ in order to ___ no matter the cost"
    sworn_to TEXT,                                -- Who was this contract made with
    vow_action TEXT,                              -- What did you vow to do/be
    vow_purpose TEXT,                             -- Why (to stay connected, to survive, etc.)
    cost_recognized TEXT,                         -- What it costs you now
    -- The conscious rewrite
    new_contract TEXT,                            -- The conscious replacement contract
    release_date TIMESTAMP WITH TIME ZONE,        -- When it was released/rewritten
    release_notes TEXT,                           -- What happened during release
    is_released BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ifs_contracts_user ON ifs_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_ifs_contracts_part ON ifs_contracts(part_id);

-- ============================================
-- 3. Relationship Map (People in your system)
-- ============================================
CREATE TABLE IF NOT EXISTS ifs_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    person_name TEXT NOT NULL,                    -- e.g., "Mom", "Dad", "Ex-partner", "Boss"
    relationship_type TEXT,                       -- parent | partner | sibling | friend | authority | other
    description TEXT,                             -- How this person shows up in your system
    parts_activated UUID[],                       -- Array of part IDs this person activates
    contracts_linked UUID[],                      -- Contracts connected to this person
    patterns TEXT[],                              -- Recurring relational patterns
    board_x NUMERIC DEFAULT 0,                   -- Visual board position
    board_y NUMERIC DEFAULT 0,
    color TEXT DEFAULT '#6b8e9b',                 -- External node color (distinct from parts)
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ifs_relationships_user ON ifs_relationships(user_id);

-- ============================================
-- 4. Unburdening Sessions (Interactive flow log)
-- ============================================
CREATE TABLE IF NOT EXISTS ifs_unburdening_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    part_id UUID REFERENCES ifs_parts(id),        -- Which part is being unburdened
    status TEXT NOT NULL DEFAULT 'in_progress',    -- in_progress | completed | paused
    -- Step tracking
    current_step TEXT DEFAULT 'check_readiness',   -- check_readiness | listen | do_over | release | new_qualities | integrate
    -- Session content (the back-and-forth)
    messages JSONB DEFAULT '[]'::jsonb,            -- Array of {role, content, step, timestamp}
    -- Outcomes
    burden_released TEXT,                          -- What was released
    new_qualities TEXT[],                          -- What replaced the burden
    somatic_shift TEXT,                            -- Body sensation changes noted
    integration_notes TEXT,                        -- Post-session reflection
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ifs_unburdening_user ON ifs_unburdening_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ifs_unburdening_part ON ifs_unburdening_sessions(part_id);
CREATE INDEX IF NOT EXISTS idx_ifs_unburdening_status ON ifs_unburdening_sessions(status);

-- ============================================
-- RLS: Lance-only access (personal therapeutic data)
-- ============================================
ALTER TABLE ifs_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifs_unburdening_sessions ENABLE ROW LEVEL SECURITY;

-- Parts: owner only
CREATE POLICY "ifs_parts_owner" ON ifs_parts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Contracts: owner only
CREATE POLICY "ifs_contracts_owner" ON ifs_contracts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Relationships: owner only
CREATE POLICY "ifs_relationships_owner" ON ifs_relationships
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Unburdening sessions: owner only
CREATE POLICY "ifs_unburdening_owner" ON ifs_unburdening_sessions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
