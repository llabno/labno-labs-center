-- Add source meta-tag columns to global_tasks and projects
-- Tracks WHERE information/ideas came from (newsletter, research, client request, etc.)

ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS source_type TEXT; -- 'newsletter', 'research', 'client_request', 'internal', 'gtm_signal', 'gem_research'
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS source_name TEXT; -- 'Nate Substack', 'Morning Brew', 'Client: Williamson'
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS source_url TEXT; -- URL to original content if applicable
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS trigger_level TEXT; -- 'autonomous', 'one-click', 'guided', 'manual'
ALTER TABLE global_tasks ADD COLUMN IF NOT EXISTS due_date DATE;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_cost_per_stage JSONB DEFAULT '{}'; -- {1: 500, 2: 1200, ...}
ALTER TABLE projects ADD COLUMN IF NOT EXISTS health_score INTEGER; -- 0-100 composite score

-- Pipeline template improvements (all 15 questions answered YES)
ALTER TABLE pipeline_task_templates ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE pipeline_task_templates ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2);
ALTER TABLE pipeline_task_templates ADD COLUMN IF NOT EXISTS client_visible BOOLEAN DEFAULT false;
ALTER TABLE pipeline_task_templates ADD COLUMN IF NOT EXISTS tier_min TEXT DEFAULT 'free'; -- minimum tier required
ALTER TABLE pipeline_task_templates ADD COLUMN IF NOT EXISTS definition_of_done TEXT; -- gate criteria
ALTER TABLE pipeline_task_templates ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Activity feed / work history table
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL, -- 'task_created', 'task_completed', 'pipeline_advanced', 'proposal_generated', 'scheduler_run', 'agent_dispatched'
  entity_type TEXT, -- 'task', 'project', 'pipeline', 'proposal', 'client'
  entity_id UUID,
  entity_name TEXT,
  actor TEXT, -- 'Lance', 'Agent', 'System', 'Scheduler'
  details JSONB DEFAULT '{}', -- flexible metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Client document tracking
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  document_type TEXT NOT NULL, -- 'proposal', 'contract', 'invoice', 'report', 'template'
  title TEXT NOT NULL,
  file_url TEXT, -- Google Drive URL, Supabase Storage URL, etc.
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'viewed', 'signed', 'expired'
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1,
  template_id TEXT, -- Google Docs template ID for regeneration
  metadata JSONB DEFAULT '{}', -- tier, track, add-ons, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deep research pipeline tracking
CREATE TABLE IF NOT EXISTS research_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL, -- 'gmail_newsletter', 'manual', 'rss', 'web_scan'
  source_name TEXT, -- 'Nate Substack', 'Morning Brew'
  source_content TEXT, -- raw content extracted
  status TEXT DEFAULT 'pending', -- 'pending', 'gemini_research', 'claude_analysis', 'review', 'applied', 'dismissed'
  gemini_output JSONB, -- deep research results
  claude_output JSONB, -- Claude analysis + improvement suggestions
  improvements JSONB DEFAULT '[]', -- array of {title, description, pros, cons, edge_cases, approved: bool}
  applied_tasks TEXT[] DEFAULT '{}', -- task IDs created from this research
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Scheduling holds (temporary calendar blocks)
CREATE TABLE IF NOT EXISTS schedule_holds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  person TEXT NOT NULL, -- 'Lance', 'Client: Williamson'
  hold_type TEXT DEFAULT 'proposed', -- 'proposed', 'confirmed', 'expired', 'cancelled'
  task_id UUID REFERENCES global_tasks(id),
  project_id UUID REFERENCES projects(id),
  expires_at TIMESTAMPTZ, -- when the hold auto-expires
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_holds ENABLE ROW LEVEL SECURITY;

-- RLS policies (authenticated users only)
CREATE POLICY "auth_activity" ON activity_feed FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_documents" ON client_documents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_research" ON research_queue FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_holds" ON schedule_holds FOR ALL USING (auth.role() = 'authenticated');
