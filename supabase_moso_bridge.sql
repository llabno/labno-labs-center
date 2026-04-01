-- MOSO Bridge: sync log table for tracking agent output syncs
-- Run this after supabase_schema.sql

-- Tracks every sync from MOSO agents (Coach, Chief, Architect, etc.)
CREATE TABLE moso_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent TEXT NOT NULL,           -- chief, coach, architect, voice, librarian, overseer
    output_type TEXT NOT NULL,     -- weekly_pulse, pattern_alert, morning_briefing, etc.
    title TEXT,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    energy_state TEXT,             -- High, Steady, Low, Depleted (from Personal_Log)
    domains_active TEXT[],         -- Array of active domains at sync time
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS: only @labnolabs.com employees
ALTER TABLE moso_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moso_sync_employee_access" ON moso_sync_log
    FOR ALL
    USING (auth.email() LIKE '%@labnolabs.com');

-- Add agent_runs columns if they don't exist (for MOSO-sourced runs)
-- The existing agent_runs table works as-is; MOSO syncs just insert with
-- project_name = 'MOSO Personal System' to distinguish from dashboard-triggered runs.

-- Index for querying by agent and output type
CREATE INDEX idx_moso_sync_agent ON moso_sync_log(agent);
CREATE INDEX idx_moso_sync_type ON moso_sync_log(output_type);
CREATE INDEX idx_moso_sync_date ON moso_sync_log(synced_at DESC);
