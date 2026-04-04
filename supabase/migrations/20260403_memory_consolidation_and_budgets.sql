-- Memory Consolidation table for KAIROS-like daemon
-- Stores compressed summaries of completed agent runs
CREATE TABLE IF NOT EXISTS memory_consolidation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  summary text NOT NULL,
  runs_consolidated integer NOT NULL DEFAULT 0,
  tokens_saved integer NOT NULL DEFAULT 0,
  ai_used boolean NOT NULL DEFAULT false,
  cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
  run_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_consolidation_created
  ON memory_consolidation (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_consolidation_project
  ON memory_consolidation (project_name);

ALTER TABLE memory_consolidation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can read memory consolidation"
  ON memory_consolidation FOR SELECT
  USING (
    auth.jwt() ->> 'email' LIKE '%@labnolabs.com'
    OR auth.jwt() ->> 'email' LIKE '%@movement-solutions.com'
  );

-- Add consolidated_at to agent_runs (marks runs that have been summarized)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_runs' AND column_name = 'consolidated_at'
  ) THEN
    ALTER TABLE agent_runs ADD COLUMN consolidated_at timestamptz;
  END IF;
END $$;

-- Developer habits tracking table
CREATE TABLE IF NOT EXISTS developer_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_type text NOT NULL,  -- 'claude_md_update', 'primitive_fluency', 'security_sweep'
  user_name text NOT NULL DEFAULT 'lance',
  completed_at timestamptz NOT NULL DEFAULT now(),
  duration_minutes integer,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_developer_habits_type
  ON developer_habits (habit_type, completed_at DESC);

ALTER TABLE developer_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can read developer habits"
  ON developer_habits FOR SELECT
  USING (
    auth.jwt() ->> 'email' LIKE '%@labnolabs.com'
    OR auth.jwt() ->> 'email' LIKE '%@movement-solutions.com'
  );

CREATE POLICY "Employees can insert developer habits"
  ON developer_habits FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' LIKE '%@labnolabs.com'
    OR auth.jwt() ->> 'email' LIKE '%@movement-solutions.com'
  );

-- Daily summary view for habits (for dashboard)
CREATE OR REPLACE VIEW developer_habits_weekly AS
SELECT
  habit_type,
  user_name,
  date_trunc('week', completed_at)::date AS week_start,
  count(*) AS completions,
  sum(duration_minutes) AS total_minutes,
  array_agg(notes) FILTER (WHERE notes IS NOT NULL) AS all_notes
FROM developer_habits
GROUP BY habit_type, user_name, date_trunc('week', completed_at)::date
ORDER BY week_start DESC, habit_type;

-- Budget enforcement view (aggregates token spend by agent per day/month)
CREATE OR REPLACE VIEW agent_budget_status AS
SELECT
  agent_name,
  date_trunc('day', created_at)::date AS day,
  count(*) AS api_calls,
  sum(input_tokens) AS total_input_tokens,
  sum(output_tokens) AS total_output_tokens,
  sum(estimated_cost_usd) AS daily_cost_usd
FROM token_usage_log
WHERE agent_name IS NOT NULL
GROUP BY agent_name, date_trunc('day', created_at)::date
ORDER BY day DESC, agent_name;

-- Add memory-consolidation agent to permissions tracking
-- (it uses Gemini Flash which costs ~$0.00 per run, but we track it)
COMMENT ON TABLE memory_consolidation IS 'KAIROS-like daemon output: compressed summaries of completed agent runs. Created nightly at 1 AM CST (6 AM UTC).';
COMMENT ON TABLE developer_habits IS 'Tracks Atomic Habits for cybernetic development: CLAUDE.md updates, Primitive Fluency hours, security sweeps.';
