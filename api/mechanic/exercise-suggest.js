import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Exercise Suggestion Engine
 * Maps detected NS states + parts + drives to exercises from Core Three library.
 * Respects contraindications (e.g., no high-intensity in dorsal state).
 */

// Default suggestions when exercise table is empty
const DEFAULT_SUGGESTIONS = {
  red: [
    { name: 'Belly on Floor', category: 'settle', description: 'Lie prone, feel the ground. Let gravity hold you.', dose: '2-3 minutes' },
    { name: 'Sigh of Despair', category: 'settle', description: 'Three deep sighs — let the exhale be longer than the inhale.', dose: '3 breaths' },
    { name: 'Gentle Self-Touch', category: 'settle', description: 'Hand on chest, hand on belly. Feel warmth.', dose: '1-2 minutes' },
  ],
  amber: [
    { name: 'Downshift Protocol', category: 'settle', description: 'Find floor with heels, 3 breaths exhale > inhale, tell NS it is safe.', dose: '5 breaths' },
    { name: 'Sigh of Frustration', category: 'settle', description: 'One powerful exhale through the mouth. Release the tension.', dose: '3 sighs' },
    { name: 'Wall Push', category: 'settle', description: 'Push against a wall with both hands. Feel your own strength without threat.', dose: '30 seconds × 3' },
  ],
  green: [
    { name: 'Savoring', category: 'explore', description: 'Notice something good. Stay with it for 20 seconds. Let it register.', dose: '20 seconds' },
    { name: 'Playful Movement', category: 'explore', description: 'Any movement that feels good — dance, stretch, shake. No rules.', dose: '2-3 minutes' },
    { name: 'Reach Out', category: 'build', description: 'Text someone you care about. Connection reinforces ventral.', dose: 'One message' },
  ],
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nsState, affectiveDrive, partsActive } = req.body || {};

  // Auth
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(authHeader.split(' ')[1]);
      if (error || !user) return res.status(401).json({ error: 'Invalid token' });
    } catch {
      return res.status(401).json({ error: 'Token verification failed' });
    }
  }

  // Try to get exercises from the database
  const { data: exercises } = await supabase
    .from('ifs_exercises')
    .select('*')
    .order('name');

  const state = nsState || 'green';

  if (!exercises || exercises.length === 0) {
    // Use defaults
    return res.status(200).json({
      status: 'completed',
      source: 'defaults',
      ns_state: state,
      suggestions: DEFAULT_SUGGESTIONS[state] || DEFAULT_SUGGESTIONS.green,
      note: 'Using built-in suggestions. Add exercises to the Core Three library for personalized recommendations.',
    });
  }

  // Filter exercises by NS state target
  let matched = exercises.filter(e => e.ns_state_target === state);

  // Remove contraindicated
  matched = matched.filter(e => !(e.ns_state_contraindicated || []).includes(state));

  // Boost exercises matching affective drive
  if (affectiveDrive) {
    matched.sort((a, b) => {
      const aMatch = (a.affective_drive_target || []).includes(affectiveDrive) ? -1 : 0;
      const bMatch = (b.affective_drive_target || []).includes(affectiveDrive) ? -1 : 0;
      return aMatch - bMatch;
    });
  }

  // Take top 3-5
  const suggestions = matched.slice(0, 5).map(e => ({
    name: e.name,
    category: e.category,
    description: e.description,
    dose: e.dose_frequency || e.dose_duration,
    body_region: e.body_region,
    safety_tier: e.safety_tier,
  }));

  // Fallback to defaults if no matches
  if (suggestions.length === 0) {
    return res.status(200).json({
      status: 'completed',
      source: 'defaults',
      ns_state: state,
      suggestions: DEFAULT_SUGGESTIONS[state] || DEFAULT_SUGGESTIONS.green,
    });
  }

  return res.status(200).json({
    status: 'completed',
    source: 'core_three',
    ns_state: state,
    affective_drive: affectiveDrive,
    suggestions,
    total_available: matched.length,
  });
}
