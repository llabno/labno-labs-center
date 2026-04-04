-- Add project_type to distinguish client projects from internal work
-- 'internal' = Labno Labs internal projects (default)
-- 'client'   = Client consulting projects (e.g., Williamson Student Tracker)
ALTER TABLE internal_projects
  ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'internal';

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_internal_projects_type ON internal_projects(project_type);

COMMENT ON COLUMN internal_projects.project_type IS 'internal = Labno Labs work, client = consulting client projects';
