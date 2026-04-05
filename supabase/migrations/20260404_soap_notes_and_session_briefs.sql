-- Clinical SOAP Notes and Session Briefs
-- Based on MOSO Forms Build Spec (5 forms) — Forms 1 and 2
-- Replaces Google Forms + Google Sheets with in-system HIPAA-compliant tracking

-- Session Brief (Form 1) — 90-second post-session capture
CREATE TABLE IF NOT EXISTS session_briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  tier TEXT, -- 'Tier 1 (Resilience)', 'Tier 2 (Flow)', 'Tier 3 (New)', 'Reactivation'
  track TEXT, -- '01 Sanctuary', '02 Softening', etc.
  nervous_system_state TEXT, -- 'Green', 'Amber', 'Red'
  session_type TEXT, -- '55min', '115min', '175min'
  the_win TEXT, -- "What went well today?"
  the_one_thing TEXT, -- "One thing to carry forward"
  the_friction TEXT, -- "What was hard or stuck?"
  kylie_tasks TEXT[], -- ['Send follow-up email', 'Schedule next session', etc.]
  mechanic_tasks TEXT[], -- ['Generate Habit Roadmap', 'Update Session Prep', etc.]
  sniper_tasks TEXT[], -- ['Draft Clinical Pearl', 'Content idea flagged', etc.]
  session_date DATE DEFAULT CURRENT_DATE,
  logged_by TEXT DEFAULT 'Lance',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SOAP Notes (Form 2) — Clinical documentation, legal record
CREATE TABLE IF NOT EXISTS soap_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  session_date DATE NOT NULL,
  -- SOAP sections
  subjective TEXT NOT NULL, -- "What the patient reported"
  objective TEXT NOT NULL, -- "What you found/measured"
  assessment TEXT NOT NULL, -- "Your clinical reasoning"
  plan TEXT NOT NULL, -- "Next session plan + home program"
  -- Billing
  cpt_codes TEXT, -- e.g. "97110, 97140, 97530"
  duration TEXT, -- '55', '115', '175'
  diagnosis TEXT, -- ICD-10 codes
  -- Progress
  functional_goal TEXT, -- Current treatment goal
  progress_to_goal TEXT, -- 'Progressing', 'Plateau', 'Regressing', 'New'
  clinical_flags TEXT, -- Yellow/Red escalation notes
  -- Exercises prescribed (daily tracking)
  exercises TEXT, -- comma-separated exercise names, linked to exercise library when available
  -- Linked data
  session_brief_id UUID REFERENCES session_briefs(id),
  billing_status TEXT DEFAULT 'pending', -- 'pending', 'superbill_generated', 'billed', 'paid'
  logged_by TEXT DEFAULT 'Lance',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE session_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE soap_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_session_briefs" ON session_briefs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_soap_notes" ON soap_notes FOR ALL USING (auth.role() = 'authenticated');
