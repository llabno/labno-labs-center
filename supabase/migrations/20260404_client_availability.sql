-- Client availability preferences for scheduling heat map
-- Tracks preferred times, vacation dates, and seasonal patterns

CREATE TABLE IF NOT EXISTS client_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT NOT NULL, -- patient_name or client UUID
  client_type TEXT DEFAULT 'clinical', -- 'clinical', 'consulting'
  -- Preferred time slots: array of {day, start, end} objects
  preferred_slots JSONB DEFAULT '[]', -- [{day: 'Monday', start: '09:00', end: '10:00'}, ...]
  -- General preferences
  preferred_days TEXT[] DEFAULT '{}', -- ['Monday', 'Wednesday', 'Friday']
  unavailable_days TEXT[] DEFAULT '{}', -- ['Tuesday']
  general_preference TEXT, -- 'mornings', 'afternoons', 'flexible'
  -- Vacation / out of town tracking
  vacation_dates JSONB DEFAULT '[]', -- [{start: '2026-06-01', end: '2026-06-15', notes: 'Florida'}]
  seasonal_notes TEXT, -- 'Always gone December-January, snowbird to AZ'
  -- Client value for scheduling priority
  client_value_tier TEXT DEFAULT 'standard', -- 'premium', 'standard', 'trade', 'low_priority'
  -- Scheduling metadata
  last_scheduled_at TIMESTAMPTZ,
  scheduling_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bi-monthly billing cycles
CREATE TABLE IF NOT EXISTS billing_cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_label TEXT NOT NULL, -- '2026-04 First Half', '2026-04 Second Half'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'open', -- 'open', 'review', 'sent', 'paid'
  total_amount DECIMAL(10,2) DEFAULT 0,
  soap_note_ids UUID[] DEFAULT '{}',
  reviewed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE client_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_availability" ON client_availability;
CREATE POLICY "auth_availability" ON client_availability FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_billing_cycles" ON billing_cycles;
CREATE POLICY "auth_billing_cycles" ON billing_cycles FOR ALL USING (auth.role() = 'authenticated');
