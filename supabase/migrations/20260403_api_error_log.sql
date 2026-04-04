-- API Error Log — queryable record of every Anthropic API failure
-- Populated by api/lib/call-anthropic.js (fire-and-forget)

CREATE TABLE IF NOT EXISTS api_error_log (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now() NOT NULL,
  endpoint    text NOT NULL,           -- e.g. '/api/mechanic/analyze'
  model       text NOT NULL,           -- e.g. 'claude-sonnet-4-6'
  status_code integer DEFAULT 0,       -- HTTP status (0 = non-HTTP error)
  error_type  text NOT NULL,           -- e.g. 'MODEL_NOT_FOUND', 'RATE_LIMITED', 'NETWORK_ERROR'
  error_message text,                  -- first 500 chars of error body
  request_body_preview text,           -- first 500 chars of request (no secrets)
  resolved    boolean DEFAULT false    -- manual flag for triage
);

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_api_error_log_created ON api_error_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_error_log_endpoint ON api_error_log (endpoint);
CREATE INDEX IF NOT EXISTS idx_api_error_log_error_type ON api_error_log (error_type);

-- RLS: service role only (no user access needed)
ALTER TABLE api_error_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by API routes)
CREATE POLICY "Service role full access" ON api_error_log
  FOR ALL
  USING (true)
  WITH CHECK (true);
