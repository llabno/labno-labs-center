import { createClient } from '@supabase/supabase-js';
import { callAnthropic } from '../lib/call-anthropic.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Temporal Pattern Analysis
 * Looks across journal entries + analysis results to find:
 * - Time-of-day mood patterns
 * - Day-of-week patterns
 * - Entity-specific recurring triggers
 * - Part activation frequency
 * - NS state trends over time
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

  // Fetch all journal entries
  const { data: journals } = await supabase
    .from('ifs_journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('is_analyzed', true)
    .order('created_at', { ascending: true });

  // Fetch all analysis results
  const { data: analyses } = await supabase
    .from('ifs_analysis_results')
    .select('*, ifs_entities(name)')
    .eq('user_id', userId)
    .eq('pipeline_status', 'completed')
    .order('created_at', { ascending: true });

  // Fetch entities
  const { data: entities } = await supabase
    .from('ifs_entities')
    .select('*')
    .eq('user_id', userId);

  if ((!journals || journals.length < 3) && (!analyses || analyses.length < 3)) {
    return res.status(200).json({
      status: 'insufficient_data',
      message: 'Need at least 3 analyzed entries or logs to detect patterns.',
      journal_count: journals?.length || 0,
      analysis_count: analyses?.length || 0,
    });
  }

  // Build a data summary for Claude to analyze
  const journalSummary = (journals || []).map(j => ({
    date: j.entry_date,
    time: j.entry_time,
    hour: j.time_of_day_hour,
    period: j.log_period,
    ns_before: j.ns_state_before,
    ns_after: j.ns_state_after,
    ns_read: j.analysis_result?.ns_state_read,
    entities: (j.extracted_entities || []).map(e => ({ name: e.name, sentiment: e.sentiment })),
    parts: (j.extracted_parts || []).map(p => ({ name: p.name, role: p.role, level: p.activation_level })),
    themes: j.extracted_themes || [],
    word_count: j.word_count,
  }));

  const analysisSummary = (analyses || []).map(a => ({
    date: a.created_at?.split('T')[0],
    entity: a.ifs_entities?.name,
    ns_state: a.m9_polyvagal?.ns_state_confirmed,
    drive: a.m19_panksepp?.affective_drive_confirmed,
    parts: (a.m16_ifs?.parts_active || []).map(p => p.name),
    blending: a.m16_ifs?.blending_level,
    ci_triggered: a.m18_compassionate_inquiry?.what_triggered_me,
    wu_wei: a.m25_watts?.pushing_detected,
  }));

  const systemPrompt = `You are the Internal Mechanic's pattern intelligence engine. You analyze longitudinal data across journal entries and interaction analyses to find temporal, relational, and somatic patterns.

Look for:
1. TIME-OF-DAY PATTERNS: Are certain NS states or parts more active at certain hours?
2. DAY-OF-WEEK PATTERNS: Are certain days more activating?
3. ENTITY PATTERNS: Which people consistently trigger the same parts or drives?
4. THEME RECURRENCE: What themes keep appearing across entries?
5. SOMATIC TRENDS: Is the user's baseline NS state shifting over time? Getting more regulated or less?
6. DRIVE PATTERNS: Which Panksepp drives dominate? Is there a trend?
7. REGULATION CAPACITY: Does writing shift NS state (before vs after)? Is that improving?
8. TRIGGER CLUSTERS: Do 3+ entities share the same trigger pattern? That's a structural theme, not about any one person.
9. EFFORT PATTERNS: Where does the user consistently push against natural flow (wu wei)?

Return JSON:
{
  "time_patterns": [{"pattern": "", "confidence": "low|medium|high", "evidence": ""}],
  "entity_patterns": [{"entity": "", "pattern": "", "frequency": 0}],
  "theme_recurrence": [{"theme": "", "count": 0, "trend": "increasing|stable|decreasing"}],
  "somatic_trend": {"direction": "regulating|stable|dysregulating", "evidence": ""},
  "drive_dominance": [{"drive": "", "percentage": 0}],
  "regulation_capacity": {"writing_shifts_state": true/false, "direction": "", "evidence": ""},
  "trigger_clusters": [{"trigger": "", "entities": [], "structural_theme": ""}],
  "key_insight": "",
  "recommendation": ""
}`;

  try {
    const { text } = await callAnthropic({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `JOURNAL ENTRIES (${journalSummary.length}):\n${JSON.stringify(journalSummary, null, 1)}\n\nINTERACTION ANALYSES (${analysisSummary.length}):\n${JSON.stringify(analysisSummary, null, 1)}\n\nENTITIES (${(entities || []).length}):\n${JSON.stringify((entities || []).map(e => ({ name: e.name, type: e.relationship_type, logs: e.log_count })), null, 1)}\n\nAnalyze all temporal, relational, and somatic patterns. Return ONLY valid JSON.`
      }],
      endpoint: '/api/mechanic/patterns',
      agentName: 'mechanic-patterns',
    });

    let patterns;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      patterns = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw_response: text };
    } catch {
      patterns = { raw_response: text, parse_error: true };
    }

    return res.status(200).json({
      status: 'completed',
      patterns,
      data_points: {
        journals: journalSummary.length,
        analyses: analysisSummary.length,
        entities: (entities || []).length,
      },
    });

  } catch (err) {
    return res.status(500).json({ error: 'Pattern analysis failed', details: err.message });
  }
}
