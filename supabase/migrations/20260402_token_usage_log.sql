-- Token usage logging for all AI API calls
-- Tracks input/output tokens, estimated cost, and metadata per request

CREATE TABLE IF NOT EXISTS token_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  endpoint text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
  task_id uuid REFERENCES global_tasks(id) ON DELETE SET NULL,
  agent_name text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Index on created_at for time-range queries (daily/weekly/monthly reports)
CREATE INDEX idx_token_usage_log_created_at ON token_usage_log (created_at);

-- Index on endpoint for per-endpoint aggregation
CREATE INDEX idx_token_usage_log_endpoint ON token_usage_log (endpoint);

-- RLS: read for @labnolabs.com employees, write for service_role only
ALTER TABLE token_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can read token usage"
  ON token_usage_log FOR SELECT
  USING (
    auth.jwt() ->> 'email' LIKE '%@labnolabs.com'
    OR auth.jwt() ->> 'email' LIKE '%@movement-solutions.com'
  );

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- Only service_role (which bypasses RLS) can write.

-- Daily summary view for dashboard
CREATE OR REPLACE VIEW token_usage_daily_summary AS
SELECT
  date_trunc('day', created_at)::date AS day,
  endpoint,
  model,
  count(*) AS request_count,
  sum(input_tokens) AS total_input_tokens,
  sum(output_tokens) AS total_output_tokens,
  sum(total_tokens) AS total_tokens,
  sum(estimated_cost_usd) AS total_cost_usd
FROM token_usage_log
GROUP BY date_trunc('day', created_at)::date, endpoint, model
ORDER BY day DESC, endpoint;
