-- Client profitability, satisfaction tracking, billing multiplier, and personality system
-- Replaces "PITA-DNC" status with "P" rating system (orange, stars-based)

-- Add personality and profitability fields to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS personality_type TEXT; -- 'collaborative', 'perfectionist', 'pusher', 'ocd', 'easy_going', 'demanding'
ALTER TABLE clients ADD COLUMN IF NOT EXISTS effort_rating INTEGER DEFAULT 3 CHECK (effort_rating >= 1 AND effort_rating <= 5); -- 1=joy 5=high-effort (was "PITA")
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_multiplier DECIMAL(3,2) DEFAULT 1.00; -- 1.0=standard, 0.8=joy discount, 3.0=high-effort surcharge
ALTER TABLE clients ADD COLUMN IF NOT EXISTS joy_score INTEGER DEFAULT 3 CHECK (joy_score >= 1 AND joy_score <= 5); -- how much joy working with this client brings
ALTER TABLE clients ADD COLUMN IF NOT EXISTS satisfaction_score INTEGER; -- latest CSAT from surveys (0-100)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lifetime_revenue DECIMAL(12,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_hours_spent DECIMAL(8,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS effective_hourly_rate DECIMAL(8,2); -- lifetime_revenue / total_hours_spent
ALTER TABLE clients ADD COLUMN IF NOT EXISTS dnc_status BOOLEAN DEFAULT false; -- replaces PITA-DNC (Do Not Contact)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS dnc_reason TEXT; -- why they were marked DNC
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referral_status TEXT; -- 'active', 'referred_out', 'breakup_pending'
ALTER TABLE clients ADD COLUMN IF NOT EXISTS breakup_email_sent_at TIMESTAMPTZ;

-- Client satisfaction surveys table
CREATE TABLE IF NOT EXISTS client_surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  milestone TEXT, -- 'stage_1_complete', 'stage_4_complete', 'project_close', 'quarterly_check'
  survey_type TEXT DEFAULT 'milestone', -- 'milestone', 'quarterly', 'nps', 'close_out'
  responses JSONB DEFAULT '{}', -- structured survey answers
  satisfaction_score INTEGER CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
  effort_adjustment DECIMAL(3,2), -- suggested billing multiplier change based on survey
  notes TEXT,
  personality_signals JSONB DEFAULT '{}', -- detected traits from responses (pusher, ocd, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Billing adjustment log (tracks multiplier changes over time)
CREATE TABLE IF NOT EXISTS billing_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  previous_multiplier DECIMAL(3,2),
  new_multiplier DECIMAL(3,2),
  reason TEXT, -- 'joy_discount', 'effort_surcharge', 'survey_adjustment', 'manual'
  adjusted_by TEXT DEFAULT 'Lance',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rename PITA-DNC status in moso_clinical_leads table
-- This changes "PITA-DNC" to "DNC" with effort_rating stored on the client instead
UPDATE moso_clinical_leads SET status = 'DNC' WHERE status = 'PITA-DNC';

-- Enable RLS
ALTER TABLE client_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_surveys" ON client_surveys FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_billing_adj" ON billing_adjustments FOR ALL USING (auth.role() = 'authenticated');
