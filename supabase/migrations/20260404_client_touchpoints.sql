-- Client communication touchpoint tracking
-- Feeds into effort rating and billing multiplier calculations

CREATE TABLE IF NOT EXISTS client_touchpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  touchpoint_type TEXT NOT NULL, -- 'call', 'email', 'meeting', 'slack', 'text', 'review'
  duration_minutes INTEGER, -- estimated duration
  direction TEXT DEFAULT 'outbound', -- 'inbound', 'outbound'
  notes TEXT,
  logged_by TEXT DEFAULT 'Lance',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_touchpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_touchpoints" ON client_touchpoints FOR ALL USING (auth.role() = 'authenticated');
