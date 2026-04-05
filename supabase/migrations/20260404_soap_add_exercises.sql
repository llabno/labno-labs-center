-- Add exercises column to soap_notes (migration already ran without it)
ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS exercises TEXT;
