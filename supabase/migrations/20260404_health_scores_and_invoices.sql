-- Project health scores, scope tracking, CLV prediction, and invoice generation
-- Implements Q1-Q10 improvement questions (all YES)

-- Add health score and scope tracking to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 75 CHECK (health_score >= 0 AND health_score <= 100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS proposed_task_count INTEGER; -- from proposal at creation
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope_creep_flagged BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope_creep_flagged_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stalled_days INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- Add CLV and revenue tracking to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS projected_clv_12mo DECIMAL(12,2); -- 12-month projected CLV
ALTER TABLE clients ADD COLUMN IF NOT EXISTS monthly_run_rate DECIMAL(10,2); -- current monthly billing rate
ALTER TABLE clients ADD COLUMN IF NOT EXISTS communication_frequency DECIMAL(5,2); -- avg touchpoints per week

-- Wishlist impact scoring
ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS impact_score INTEGER; -- 0-100 auto-calculated
ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS related_project_count INTEGER DEFAULT 0;
ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS revenue_potential TEXT; -- 'direct', 'indirect', 'infrastructure', 'none'

-- Invoice table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  document_id UUID REFERENCES client_documents(id),
  invoice_number TEXT, -- 'INV-2026-001'
  title TEXT NOT NULL,
  line_items JSONB DEFAULT '[]', -- [{description, hours, rate, amount}]
  subtotal DECIMAL(12,2),
  multiplier DECIMAL(3,2) DEFAULT 1.00,
  total DECIMAL(12,2),
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'void'
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Proposal templates (pre-built)
CREATE TABLE IF NOT EXISTS proposal_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- 'Website Build', 'AI Audit', etc.
  description TEXT,
  default_tier TEXT DEFAULT 'mid',
  default_track TEXT DEFAULT 'service',
  estimated_hours INTEGER,
  base_price DECIMAL(10,2),
  included_features JSONB DEFAULT '[]',
  stages_override JSONB, -- optional stage customization
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed 6 proposal templates
INSERT INTO proposal_templates (name, description, default_tier, default_track, estimated_hours, base_price, included_features) VALUES
  ('Website Build', 'Custom website with CRM integration', 'mid', 'app', 120, 30000, '["Custom design", "Responsive layout", "CRM integration", "Analytics setup", "SEO optimization"]'),
  ('AI Audit & Strategy', 'Assessment of AI readiness + implementation roadmap', 'basic', 'service', 40, 10000, '["Current state assessment", "AI opportunity mapping", "Implementation roadmap", "Tool recommendations", "ROI projections"]'),
  ('Clinical App Build', 'HIPAA-compliant clinical application', 'high', 'app', 300, 90000, '["HIPAA compliance", "Patient portal", "Exercise database", "Progress tracking", "Telehealth integration", "Audit logging"]'),
  ('Monthly Retainer', 'Ongoing advisory + development support', 'mid', 'service', 40, 10000, '["Weekly check-ins", "Priority support", "Up to 40 hrs/mo", "Bug fixes included", "Monthly reporting"]'),
  ('Enterprise AI Platform', 'Full-scale AI agent system with multi-agent orchestration', 'enterprise', 'app', 500, 150000, '["Multi-agent system", "Custom training", "Dedicated infrastructure", "SLA guarantee", "On-call support", "Source code access"]'),
  ('HIPAA Assessment', 'Comprehensive HIPAA compliance audit for AI systems', 'basic', 'service', 30, 9000, '["Gap analysis", "Risk assessment", "Remediation plan", "Policy templates", "Staff training guide"]')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_invoices" ON invoices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_proposal_templates" ON proposal_templates FOR ALL USING (auth.role() = 'authenticated');
