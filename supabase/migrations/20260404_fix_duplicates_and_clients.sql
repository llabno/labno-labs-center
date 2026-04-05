-- ============================================================
-- Fix duplicate pipeline templates (from seed being run twice)
-- Fix clients table for onboarding compatibility
-- ============================================================
-- RUN IN: Supabase SQL Editor (Mission Control project)
-- ============================================================

-- 1. Remove duplicate pipeline templates, keeping the first one
DELETE FROM pipeline_task_templates
WHERE id NOT IN (
  SELECT DISTINCT ON (stage, title, tracks) id
  FROM pipeline_task_templates
  ORDER BY stage, title, tracks, created_at ASC
);

-- 2. Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_ptt_unique_task
  ON pipeline_task_templates(stage, title, tracks);

-- 3. Make sure clients table columns are nullable for onboarding
-- The original clients table had columns that may have NOT NULL constraints
ALTER TABLE clients ALTER COLUMN avatar_type DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN portal DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN phase DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN auth DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN user_id DROP NOT NULL;

-- If any of those ALTER statements fail because the column doesn't exist,
-- that's fine — just means the constraint wasn't there.

-- 4. Fix project_type for any remaining NULLs
UPDATE projects SET project_type = 'internal' WHERE project_type IS NULL OR project_type = '';

-- 5. Mark client projects
UPDATE projects SET project_type = 'client'
WHERE name IN ('Database Editor App', 'Lance Labno Labs Website', 'SlowBraid Music Website', 'SlowBraid SAN Website');
