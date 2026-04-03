-- =============================================================================
-- Seed: Task Dependency Relationships
-- Date: 2026-04-02
-- Purpose: Populate depends_on for known blocking relationships.
--          Uses ILIKE for fuzzy matching so exact titles don't matter.
-- =============================================================================

-- Root tasks: no dependencies (explicit reset)
UPDATE global_tasks
   SET depends_on = '[]'::jsonb
 WHERE title ILIKE '%RLS%'
    OR title ILIKE '%Oracle RLS%';

-- Auth / OAuth tasks depend on Oracle RLS Audit
UPDATE global_tasks
   SET depends_on = '["Oracle RLS Audit"]'::jsonb
 WHERE title ILIKE '%Auth%'
    OR title ILIKE '%OAuth%';

-- Prompt Injection depends on Oracle RLS Audit + Supabase Auth
UPDATE global_tasks
   SET depends_on = '["Oracle RLS Audit", "Supabase Auth"]'::jsonb
 WHERE title ILIKE '%Prompt Injection%';

-- Staging depends on Oracle RLS Audit
UPDATE global_tasks
   SET depends_on = '["Oracle RLS Audit"]'::jsonb
 WHERE title ILIKE '%Staging%';

-- CI/CD depends on Staging + Dev Environment Sync
UPDATE global_tasks
   SET depends_on = '["Staging vs. Production", "Dev Environment Sync"]'::jsonb
 WHERE title ILIKE '%CI/CD%';

-- Token / Cost Monitoring depends on Staging + CI/CD
UPDATE global_tasks
   SET depends_on = '["Staging vs. Production", "CI/CD Pipeline"]'::jsonb
 WHERE title ILIKE '%Token%'
    OR title ILIKE '%Cost Monitoring%';

-- Rate Limit depends on Auth + Prompt Injection + Token Cost Monitoring
UPDATE global_tasks
   SET depends_on = '["Supabase Auth", "Prompt Injection", "Token Cost Monitoring"]'::jsonb
 WHERE title ILIKE '%Rate Limit%';

-- Dashboard depends on Auth + Staging + DOE Framework
UPDATE global_tasks
   SET depends_on = '["Supabase Auth", "Staging vs. Production", "DOE Framework"]'::jsonb
 WHERE title ILIKE '%Dashboard%';

-- Vector / Embedding depends on Oracle RLS Audit + Staging
UPDATE global_tasks
   SET depends_on = '["Oracle RLS Audit", "Staging vs. Production"]'::jsonb
 WHERE title ILIKE '%Vector%'
    OR title ILIKE '%Embedding%';

-- Refresh blocked status after seeding all dependencies
SELECT refresh_blocked_status();
