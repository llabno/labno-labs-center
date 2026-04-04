-- Add category column to oracle_sops for organizing documentation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oracle_sops' AND column_name = 'category'
  ) THEN
    ALTER TABLE oracle_sops ADD COLUMN category text DEFAULT 'General';
    CREATE INDEX idx_oracle_sops_category ON oracle_sops (category);
  END IF;
END $$;

COMMENT ON COLUMN oracle_sops.category IS 'Document category: General, Clinical, Billing, Operations, Agent, Security, Onboarding, Technical, Marketing';
