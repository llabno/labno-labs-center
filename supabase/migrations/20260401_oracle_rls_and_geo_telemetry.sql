-- Oracle RLS Policy: Allow all @labnolabs.com and @movement-solutions.com employees to read SOPs
-- Only Lance can insert/update/delete
CREATE POLICY "oracle_read_employees" ON oracle_sops
    FOR SELECT
    USING (
        auth.email() LIKE '%@labnolabs.com'
        OR auth.email() LIKE '%@movement-solutions.com'
    );

CREATE POLICY "oracle_write_lance_only" ON oracle_sops
    FOR INSERT
    WITH CHECK (auth.email() = 'lance@labnolabs.com');

CREATE POLICY "oracle_update_lance_only" ON oracle_sops
    FOR UPDATE
    USING (auth.email() = 'lance@labnolabs.com');

CREATE POLICY "oracle_delete_lance_only" ON oracle_sops
    FOR DELETE
    USING (auth.email() = 'lance@labnolabs.com');

-- Global Tasks RLS (was missing)
ALTER TABLE global_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_employee_access" ON global_tasks
    FOR ALL
    USING (auth.email() LIKE '%@labnolabs.com');

-- ============================================
-- Geo Telemetry Table (PostHog Zipcode Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS geo_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zipcode TEXT NOT NULL,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'US',
    visitor_count INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    avg_duration_seconds NUMERIC DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    top_pages TEXT[], -- Array of most visited page paths
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    source TEXT DEFAULT 'posthog', -- posthog | manual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(zipcode, date)
);

-- Index for fast date + zipcode lookups
CREATE INDEX IF NOT EXISTS idx_geo_telemetry_date ON geo_telemetry(date DESC);
CREATE INDEX IF NOT EXISTS idx_geo_telemetry_zipcode ON geo_telemetry(zipcode);
CREATE INDEX IF NOT EXISTS idx_geo_telemetry_state ON geo_telemetry(state);

-- RLS: All employees can view telemetry
ALTER TABLE geo_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telemetry_employee_read" ON geo_telemetry
    FOR SELECT
    USING (
        auth.email() LIKE '%@labnolabs.com'
        OR auth.email() LIKE '%@movement-solutions.com'
    );

-- Only service role / Lance can insert/update (from API cron)
CREATE POLICY "telemetry_write_lance" ON geo_telemetry
    FOR INSERT
    WITH CHECK (auth.email() = 'lance@labnolabs.com');

CREATE POLICY "telemetry_update_lance" ON geo_telemetry
    FOR UPDATE
    USING (auth.email() = 'lance@labnolabs.com');

-- ============================================
-- pgvector: Semantic SOP search function
-- Used by /api/oracle/ask when embeddings are available
-- ============================================
CREATE OR REPLACE FUNCTION match_sops(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    visibility text,
    token_count integer,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        oracle_sops.id,
        oracle_sops.title,
        oracle_sops.content,
        oracle_sops.visibility,
        oracle_sops.token_count,
        1 - (oracle_sops.embedding <=> query_embedding) AS similarity
    FROM oracle_sops
    WHERE oracle_sops.embedding IS NOT NULL
      AND 1 - (oracle_sops.embedding <=> query_embedding) > match_threshold
    ORDER BY oracle_sops.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
