-- Add next_action and next_action_date to both CRM tables
-- Enables follow-up tracking directly in the lead record

DO $$
BEGIN
  -- moso_clinical_leads
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moso_clinical_leads' AND column_name = 'next_action'
  ) THEN
    ALTER TABLE moso_clinical_leads ADD COLUMN next_action text;
    ALTER TABLE moso_clinical_leads ADD COLUMN next_action_date date;
    CREATE INDEX idx_moso_leads_next_action ON moso_clinical_leads (next_action_date) WHERE next_action_date IS NOT NULL;
  END IF;

  -- labno_consulting_leads
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labno_consulting_leads' AND column_name = 'next_action'
  ) THEN
    ALTER TABLE labno_consulting_leads ADD COLUMN next_action text;
    ALTER TABLE labno_consulting_leads ADD COLUMN next_action_date date;
    CREATE INDEX idx_labno_leads_next_action ON labno_consulting_leads (next_action_date) WHERE next_action_date IS NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN moso_clinical_leads.next_action IS 'Next follow-up action text (e.g. Call back, Send referral)';
COMMENT ON COLUMN moso_clinical_leads.next_action_date IS 'Due date for next action';
COMMENT ON COLUMN labno_consulting_leads.next_action IS 'Next follow-up action text (e.g. Send proposal, Schedule demo)';
COMMENT ON COLUMN labno_consulting_leads.next_action_date IS 'Due date for next action';
