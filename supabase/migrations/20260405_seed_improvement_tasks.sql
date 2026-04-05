-- Seed improvement tasks from the April 4-5 session
-- These show up in Task Queue, Work Planner, and QuickPick
-- Meta tags: priority, category, domain, trigger_level, frequency, impact

-- First ensure ALL columns exist (original schema only had: id, project_id, title, description, column_id, complexity, assigned_to, is_blocked, created_at)
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS depends_on TEXT[];
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS step_order INTEGER;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS trigger_level TEXT DEFAULT 'manual';
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'once';
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS impact TEXT;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS case_id TEXT;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS last_run_status TEXT;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;

-- Quick Wins (P0 — do now)
INSERT INTO global_tasks (title, description, column_id, priority, assigned_to, category, domain, trigger_level, impact, source)
VALUES
  ('Set Google Calendar env vars', 'Set GOOGLE_CALENDAR_ID and GOOGLE_API_KEY in Vercel Dashboard → Settings → Environment Variables to fix calendar sync JSON error.', 'triage', 'P0 — Critical', 'Lance', 'infrastructure', 'INFRA', 'manual', 'Fixes calendar sync', 'session'),
  ('Create proposal.md template', 'Write a reusable proposal template matching the oversubscribed pricing model. Store in library/templates/', 'backlog', 'P1 — High', 'Lance', 'sales', 'CONSULT', 'manual', 'Streamlines proposals', 'session')
ON CONFLICT DO NOTHING;

-- Medium Tasks (P1)
INSERT INTO global_tasks (title, description, column_id, priority, assigned_to, category, domain, trigger_level, impact, source)
VALUES
  ('Build content pipeline view', 'Unified view showing flow from idea (Wishlist) → draft (Sniper) → review → published. Show status across Oracle, Wishlist, and ClinicalBlog.', 'backlog', 'P1 — High', 'Agent', 'feature', 'CONTENT', 'autonomous', 'Visibility into content lifecycle', 'session'),
  ('Heat map scheduling seasons', 'Add 3 scheduling season views (Mar-Apr, May-Aug, Sep-Dec) to ClientAvailability heat map. Plus weekly openings view for calling unscheduled clients.', 'backlog', 'P1 — High', 'Lance', 'clinical', 'BRAIN', 'guided', 'Better scheduling decisions', 'session'),
  ('Onboarding wizard findability', 'Add Start Tour button to Settings page and/or a welcome banner for first-time users. Currently the wizard triggers on first login but has no re-entry point.', 'backlog', 'P1 — High', 'Agent', 'feature', 'INFRA', 'autonomous', 'User onboarding', 'session'),
  ('Agent confirmation queue', 'New tab/section for agents requesting confirmation or additional info. When an agent cant complete a task, it posts questions here. User responds, agent continues.', 'backlog', 'P1 — High', 'Agent', 'feature', 'INFRA', 'guided', 'Enables agent-human collaboration', 'session'),
  ('Work History auto-duration tracking', 'Estimate time spent on tasks based on activity timestamps (page opens, form submissions, SOAP saves). Show duration on Work History entries.', 'backlog', 'P1 — High', 'Agent', 'feature', 'INFRA', 'autonomous', 'Time tracking without manual entry', 'session')
ON CONFLICT DO NOTHING;

-- Larger Features (P2)
INSERT INTO global_tasks (title, description, column_id, priority, assigned_to, category, domain, trigger_level, impact, source)
VALUES
  ('Unified activity_log as single data source', 'Consolidate all activity sources (agent_runs, communication_log, soap_notes, wishlist, etc) into activity_log table with source_type. Add triggers or hooks.', 'backlog', 'P2 — Medium', 'Agent', 'infrastructure', 'INFRA', 'guided', 'Single source of truth for all activity', 'session'),
  ('Offline cache for critical pages', 'Implement service worker or localStorage caching for SOAP Notes, Billing Review, and Client Availability. Sync on reconnect.', 'backlog', 'P2 — Medium', 'Agent', 'infrastructure', 'INFRA', 'guided', 'Works without internet', 'session'),
  ('Google Calendar bi-directional write', 'Add OAuth write scope to calendar integration. When tasks are scheduled in Work Planner, create corresponding Google Calendar events.', 'backlog', 'P2 — Medium', 'Lance', 'integration', 'INFRA', 'manual', 'Calendar stays in sync', 'session'),
  ('Wire auto-CPT into SOAP Notes UI', 'Add Suggest CPT Codes button to SOAP Notes page that calls /api/billing/auto-cpt and pre-fills the CPT field with AI suggestions + 8-minute rule units.', 'backlog', 'P1 — High', 'Agent', 'clinical', 'BRAIN', 'autonomous', 'Faster billing, fewer errors', 'session')
ON CONFLICT DO NOTHING;
