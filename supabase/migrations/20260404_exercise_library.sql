CREATE TABLE IF NOT EXISTS exercise_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  body_region TEXT,
  movement_family TEXT,
  difficulty TEXT DEFAULT 'Beginner',
  equipment TEXT,
  cues TEXT,
  contraindications TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_exercises" ON exercise_library;
CREATE POLICY "auth_exercises" ON exercise_library FOR ALL USING (auth.role() = 'authenticated');

-- Seed common PT exercises
INSERT INTO exercise_library (name, category, body_region, movement_family, difficulty, equipment) VALUES
  ('Sit-to-Stand', 'Functional', 'Lower Body', 'Squat', 'Beginner', 'Chair'),
  ('Single Leg Stance', 'Balance', 'Lower Body', 'Balance', 'Beginner', 'None'),
  ('Tandem Walking', 'Balance', 'Lower Body', 'Gait', 'Intermediate', 'None'),
  ('Wall Push-ups', 'Strength', 'Upper Body', 'Push', 'Beginner', 'Wall'),
  ('Resistance Band Rows', 'Strength', 'Upper Body', 'Pull', 'Beginner', 'Band'),
  ('Heel Raises', 'Strength', 'Lower Body', 'Ankle', 'Beginner', 'None'),
  ('Step-ups', 'Functional', 'Lower Body', 'Step', 'Intermediate', 'Step'),
  ('Mini Squats', 'Strength', 'Lower Body', 'Squat', 'Beginner', 'None'),
  ('Gentle ROM Series', 'Mobility', 'Full Body', 'ROM', 'Beginner', 'None'),
  ('Chair Stretches', 'Flexibility', 'Full Body', 'Stretch', 'Beginner', 'Chair'),
  ('Weight Shifts', 'Balance', 'Lower Body', 'Balance', 'Beginner', 'None'),
  ('Heel-to-Toe Walk', 'Balance', 'Lower Body', 'Gait', 'Intermediate', 'None'),
  ('Standing Hip Abduction', 'Strength', 'Lower Body', 'Hip', 'Beginner', 'None'),
  ('Supine Bridges', 'Strength', 'Lower Body', 'Hip', 'Beginner', 'Mat'),
  ('Cervical Retraction', 'Mobility', 'Neck', 'Posture', 'Beginner', 'None'),
  ('Thoracic Extension', 'Mobility', 'Spine', 'Extension', 'Intermediate', 'Foam Roll'),
  ('Diaphragmatic Breathing', 'Regulation', 'Core', 'Breathing', 'Beginner', 'None'),
  ('Walking Program', 'Cardio', 'Full Body', 'Gait', 'Beginner', 'None'),
  ('Clamshells', 'Strength', 'Lower Body', 'Hip', 'Beginner', 'Band'),
  ('Dead Bug', 'Core', 'Core', 'Stability', 'Intermediate', 'Mat')
ON CONFLICT DO NOTHING;
