-- ============================================================
-- Phase 0.1: Rename internal_projects → projects
-- Phase 0.2: Create clients table
-- Phase 0.3: Create pipeline_task_templates table
-- Phase 0.4: Create project_pipelines table
-- Phase 0.5: Add rate-limit fields to token_usage_log
-- Phase 0.6: Create client_onboarding_submissions table
-- ============================================================
-- RUN IN: Supabase SQL Editor (Mission Control project)
-- FILE:   supabase/migrations/20260403_phase0_rename_projects.sql
-- ============================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 0.1  RENAME internal_projects → projects + add client columns
-- ═══════════════════════════════════════════════════════════════

-- Handle case where 'projects' table already exists:
-- Drop the empty/stale 'projects' table so we can rename internal_projects
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='projects')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='internal_projects')
  THEN
    -- Both exist: drop the empty 'projects' so rename can proceed
    DROP TABLE IF EXISTS projects CASCADE;
    ALTER TABLE internal_projects RENAME TO projects;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='internal_projects')
  THEN
    -- Only internal_projects exists: rename it
    ALTER TABLE internal_projects RENAME TO projects;
  END IF;
  -- If only 'projects' exists: it's already renamed, do nothing
END $$;

-- Add new columns for client project support
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS client_id       uuid,
  ADD COLUMN IF NOT EXISTS client_name     text,
  ADD COLUMN IF NOT EXISTS client_email    text,
  ADD COLUMN IF NOT EXISTS venture         text,
  ADD COLUMN IF NOT EXISTS pipeline_track  text DEFAULT 'app';

-- The project_type column already exists from a prior migration (default 'internal')
-- Just add a comment for clarity
COMMENT ON TABLE projects IS 'All projects — internal Labno Labs work and client consulting engagements';
COMMENT ON COLUMN projects.project_type IS 'internal = Labno Labs work, client = consulting client projects';
COMMENT ON COLUMN projects.venture IS 'clinical | consulting | apps | internal_ops';
COMMENT ON COLUMN projects.pipeline_track IS 'app = app build, service = service engagement';

-- Recreate the RLS policy on the renamed table
DROP POLICY IF EXISTS "global_project_access" ON projects;
CREATE POLICY "global_project_access" ON projects
  FOR ALL
  USING (
    auth.email() LIKE '%@labnolabs.com'
    OR auth.email() LIKE '%@movement-solutions.com'
  );

-- Recreate indexes on the renamed table
DROP INDEX IF EXISTS idx_internal_projects_type;
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_venture ON projects(venture);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- Update the FK on wishlist to point to renamed table
-- (Postgres follows the rename automatically for existing FKs,
--  but we add a comment for clarity)
COMMENT ON COLUMN wishlist.linked_project_id IS 'FK to projects.id (formerly internal_projects)';


-- ═════════════════════════════════════════════���═════════════════
-- 0.2  CREATE clients TABLE
-- ═════════════════════════════════════════════���═════════════════

CREATE TABLE IF NOT EXISTS clients (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  email             text,
  company           text,
  phone             text,
  tier              text NOT NULL DEFAULT 'basic',
    -- tier values: free, basic, mid, high, enterprise
  enabled_features  jsonb NOT NULL DEFAULT '["command_center","build_lab"]'::jsonb,
    -- array of feature keys the client can access
    -- possible keys: command_center, build_lab, intelligence, operations,
    --   clinical, sales, internal_mechanic, exercise_db, dual_crm,
    --   oracle, strategic, telemetry
  theme_config      jsonb DEFAULT '{}'::jsonb,
    -- white-label overrides: { "primaryColor": "#xxx", "logo": "url", "appName": "..." }
  onboarding_answers jsonb DEFAULT '{}'::jsonb,
    -- structured answers from the intake form
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Only Labno Labs employees can manage clients
CREATE POLICY "Employees can manage clients" ON clients
  FOR ALL
  USING (
    auth.email() LIKE '%@labnolabs.com'
    OR auth.email() LIKE '%@movement-solutions.com'
  );

CREATE INDEX IF NOT EXISTS idx_clients_tier ON clients(tier);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

COMMENT ON TABLE clients IS 'Consulting clients — each can have multiple projects, tier controls feature access';

-- Add FK from projects to clients
ALTER TABLE projects
  ADD CONSTRAINT fk_projects_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;


-- ═══════════════════════════════════════════════════════════════
-- 0.3  CREATE pipeline_task_templates TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pipeline_task_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage            integer NOT NULL CHECK (stage BETWEEN 1 AND 8),
    -- 1=Kickoff, 2=Scope, 3=Design, 4=Build, 5=Test, 6=Deploy, 7=Handoff, 8=Close
  tracks           text[] NOT NULL DEFAULT '{app,service}',
    -- which pipeline tracks this task applies to
  title            text NOT NULL,
  description      text,
  trigger_level    text NOT NULL DEFAULT 'gated' CHECK (trigger_level IN ('auto','gated','manual')),
  agent            text DEFAULT 'Claude Code',
  depends_on       text[] DEFAULT '{}',
    -- array of template titles this depends on (within same stage)
  estimated_tokens integer DEFAULT 0,
  sort_order       integer NOT NULL DEFAULT 0,
  case_id          text,
    -- links to a Task Queue CASE (e.g. '009' for CI/CD)
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pipeline_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can manage templates" ON pipeline_task_templates
  FOR ALL
  USING (
    auth.email() LIKE '%@labnolabs.com'
    OR auth.email() LIKE '%@movement-solutions.com'
  );

CREATE INDEX IF NOT EXISTS idx_ptt_stage ON pipeline_task_templates(stage);
CREATE INDEX IF NOT EXISTS idx_ptt_tracks ON pipeline_task_templates USING GIN(tracks);
CREATE INDEX IF NOT EXISTS idx_ptt_case ON pipeline_task_templates(case_id);

COMMENT ON TABLE pipeline_task_templates IS 'Exhaustive task trees per pipeline stage — seed templates for new projects';


-- ══════════════════════════════════════════════════���════════════
-- 0.4  CREATE project_pipelines TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS project_pipelines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_number    integer NOT NULL CHECK (stage_number BETWEEN 1 AND 8),
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','done','skipped')),
  track           text NOT NULL DEFAULT 'app'
    CHECK (track IN ('app','service')),
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, stage_number)
);

ALTER TABLE project_pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can manage pipelines" ON project_pipelines
  FOR ALL
  USING (
    auth.email() LIKE '%@labnolabs.com'
    OR auth.email() LIKE '%@movement-solutions.com'
  );

CREATE INDEX IF NOT EXISTS idx_pp_project ON project_pipelines(project_id);
CREATE INDEX IF NOT EXISTS idx_pp_status ON project_pipelines(status);

COMMENT ON TABLE project_pipelines IS 'Per-project pipeline stage tracking — one row per stage per project';


-- ═══════════════════════════════════��═════════════════════════���═
-- 0.5  ADD rate-limit fields TO token_usage_log
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE token_usage_log
  ADD COLUMN IF NOT EXISTS rate_limit_remaining   integer,
  ADD COLUMN IF NOT EXISTS rate_limit_reset_at    timestamptz,
  ADD COLUMN IF NOT EXISTS billing_mode           text DEFAULT 'subscription'
    CHECK (billing_mode IN ('subscription','pay_per_use')),
  ADD COLUMN IF NOT EXISTS provider               text DEFAULT 'anthropic'
    CHECK (provider IN ('anthropic','google','openai'));

COMMENT ON COLUMN token_usage_log.billing_mode IS 'subscription = flat-rate plan (track rate limits), pay_per_use = metered API (track dollars)';
COMMENT ON COLUMN token_usage_log.provider IS 'AI provider: anthropic (Claude), google (Gemini), openai';


-- ════════════════════════════════════════════��══════════════════
-- 0.6  CREATE client_onboarding_submissions TABLE
-- ═══════════════════════════════════════════════════════════════
-- This table is INSERT-only for anon users (the onboarding micro-app).
-- Server-side API processes submissions into clients + projects tables.

CREATE TABLE IF NOT EXISTS client_onboarding_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Contact info
  contact_name    text NOT NULL,
  contact_email   text NOT NULL,
  company_name    text,
  phone           text,
  -- Discovery answers (from Strategic Q1-Q5 adapted)
  answers         jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- { "q1_core_problem": "...", "q2_success_90d": "...", ... }
  -- Auto-tagged by the form
  suggested_type  text,
  suggested_tier  text,
  suggested_priority text,
  -- Processing status
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','converted','rejected')),
  converted_client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  converted_project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  processed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_onboarding_submissions ENABLE ROW LEVEL SECURITY;

-- Anon users can ONLY insert (the public onboarding form)
CREATE POLICY "Anon can submit onboarding" ON client_onboarding_submissions
  FOR INSERT
  WITH CHECK (true);

-- Employees can read and manage submissions
CREATE POLICY "Employees can manage submissions" ON client_onboarding_submissions
  FOR ALL
  USING (
    auth.email() LIKE '%@labnolabs.com'
    OR auth.email() LIKE '%@movement-solutions.com'
  );

CREATE INDEX IF NOT EXISTS idx_cos_status ON client_onboarding_submissions(status);
CREATE INDEX IF NOT EXISTS idx_cos_email ON client_onboarding_submissions(contact_email);

COMMENT ON TABLE client_onboarding_submissions IS 'Public intake form submissions — anon INSERT only, employees manage';

COMMIT;
