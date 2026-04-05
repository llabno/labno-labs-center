-- Add client_name column to client_availability (was missing from original migration)
ALTER TABLE client_availability ADD COLUMN IF NOT EXISTS client_name TEXT;
