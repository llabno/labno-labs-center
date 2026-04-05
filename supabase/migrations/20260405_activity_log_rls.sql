-- Enable RLS on activity_log and allow authenticated users to read
-- Also allow service role (triggers, cron) to insert

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read activity log
CREATE POLICY "Authenticated users can read activity_log" ON activity_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Service role (triggers, APIs) can insert
CREATE POLICY "Service role can insert activity_log" ON activity_log
  FOR INSERT WITH CHECK (true);

-- Also allow anon read for API endpoints that don't have auth context
CREATE POLICY "Anon can read activity_log" ON activity_log
  FOR SELECT USING (true);
