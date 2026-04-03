import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Morning Briefing Integration
 * Pulls top patterns from the Internal Mechanic and generates
 * a briefing snippet for the MOSO Chief morning briefing.
 * Can be called by the Chief agent or by the user manually.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth
  const authHeader = req.headers.authorization;
  let userId;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(authHeader.split(' ')[1]);
      if (error || !user) return res.status(401).json({ error: 'Invalid token' });
      userId = user.id;
    } catch {
      return res.status(401).json({ error: 'Token verification failed' });
    }
  } else {
    return res.status(401).json({ error: 'Missing authorization' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Fetch recent data (last 7 days)
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();

  const [analysesRes, journalsRes, contractsRes, settingsRes, streakRes] = await Promise.all([
    supabase.from('ifs_analysis_results').select('m9_polyvagal, m16_ifs, m19_panksepp, entity_id').eq('user_id', userId).eq('pipeline_status', 'completed').gte('created_at', cutoff).order('created_at', { ascending: false }).limit(10),
    supabase.from('ifs_journal_entries').select('extracted_parts, extracted_themes, analysis_result, ns_state_before, ns_state_after').eq('user_id', userId).eq('is_analyzed', true).gte('created_at', cutoff).order('created_at', { ascending: false }).limit(10),
    supabase.from('ifs_contracts').select('sworn_to, vow_action, cost_recognized').eq('user_id', userId).eq('is_released', false).limit(5),
    supabase.from('ifs_user_settings').select('current_streak, journal_goal_frequency').eq('user_id', userId).single(),
    supabase.from('ifs_entities').select('name, log_count, autonomic_baseline').eq('user_id', userId).order('last_log_date', { ascending: false }).limit(5),
  ]);

  // Build briefing without AI if no API key (lightweight)
  const analyses = analysesRes.data || [];
  const journals = journalsRes.data || [];
  const contracts = contractsRes.data || [];
  const settings = settingsRes.data;
  const recentEntities = streakRes.data || [];

  // Most active parts this week
  const partCounts = {};
  for (const a of analyses) {
    for (const p of (a.m16_ifs?.parts_active || [])) {
      partCounts[p.name] = (partCounts[p.name] || 0) + 1;
    }
  }
  for (const j of journals) {
    for (const p of (j.extracted_parts || [])) {
      partCounts[p.name] = (partCounts[p.name] || 0) + 1;
    }
  }
  const topParts = Object.entries(partCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Dominant NS state
  const nsCounts = { green: 0, amber: 0, red: 0 };
  for (const a of analyses) {
    const ns = a.m9_polyvagal?.ns_state_confirmed;
    if (ns) nsCounts[ns]++;
  }
  const dominantNs = Object.entries(nsCounts).sort((a, b) => b[1] - a[1])[0];

  // Recent themes
  const themes = {};
  for (const j of journals) {
    for (const t of (j.extracted_themes || [])) {
      themes[t] = (themes[t] || 0) + 1;
    }
  }
  const topThemes = Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Build briefing
  const briefing = {
    streak: settings?.current_streak || 0,
    journal_goal: settings?.journal_goal_frequency || 'none',
    dominant_ns_state: dominantNs?.[0] || 'unknown',
    dominant_ns_count: dominantNs?.[1] || 0,
    top_parts: topParts.map(([name, count]) => ({ name, count })),
    top_themes: topThemes.map(([theme, count]) => ({ theme, count })),
    active_contracts: contracts.length,
    most_logged_entities: recentEntities.slice(0, 3).map(e => e.name),
    data_points: { analyses: analyses.length, journals: journals.length },
  };

  // Generate natural language briefing if API key available
  if (apiKey && (analyses.length > 0 || journals.length > 0)) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: `You generate a brief morning check-in for someone's internal state. Be warm, direct, 3-5 sentences max. Use consumer-friendly terms (not clinical jargon). If there's an active pattern to watch for today, name it specifically. If there's an active contract, gently mention it. End with one actionable suggestion.`,
          messages: [{ role: 'user', content: `Morning briefing data:\n${JSON.stringify(briefing, null, 1)}` }],
        }),
      });
      const data = await response.json();
      briefing.narrative = data.content?.[0]?.text || '';
    } catch {}
  }

  return res.status(200).json({ status: 'completed', briefing });
}
