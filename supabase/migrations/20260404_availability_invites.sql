CREATE TABLE IF NOT EXISTS availability_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_type TEXT DEFAULT 'clinical',
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE availability_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_availability_invites" ON availability_invites;
CREATE POLICY "public_availability_invites" ON availability_invites FOR ALL USING (true);
