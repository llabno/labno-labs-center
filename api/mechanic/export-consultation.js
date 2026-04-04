import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Peer Consultation Export
 * Generates a summary document of recent patterns, active parts,
 * and unresolved contracts — designed for peer consultation sessions.
 * Uses consumer-friendly naming (no trademarked framework names).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { timeRange = 30 } = req.body || {}; // days to look back

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
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const cutoff = new Date(Date.now() - timeRange * 86400000).toISOString();

  // Fetch recent data
  const [journalRes, analysisRes, partsRes, contractsRes, entitiesRes] = await Promise.all([
    supabase.from('ifs_journal_entries').select('*').eq('user_id', userId).eq('is_analyzed', true).gte('created_at', cutoff).order('created_at', { ascending: false }),
    supabase.from('ifs_analysis_results').select('*').eq('user_id', userId).eq('pipeline_status', 'completed').gte('created_at', cutoff).order('created_at', { ascending: false }),
    supabase.from('ifs_parts').select('*').eq('user_id', userId).eq('is_active', true),
    supabase.from('ifs_contracts').select('*').eq('user_id', userId).eq('is_released', false),
    supabase.from('ifs_entities').select('*').eq('user_id', userId),
  ]);

  const systemPrompt = `You are generating a Peer Consultation Summary for someone's personal reflection work. This document is designed to be brought to a peer consultation, support group, or trusted advisor.

CRITICAL NAMING RULES — use ONLY these consumer-friendly terms:
- "Nervous System State" (NOT Polyvagal)
- "Parts Awareness" (NOT Internal Family Systems / IFS)
- "Guardians" (NOT Protectors/Managers)
- "Vulnerable Parts" (NOT Exiles)
- "Emergency Responders" (NOT Firefighters)
- "Core Self" (NOT Self Energy)
- "Belief Inquiry" (NOT Compassionate Inquiry)
- "Core Drives" (NOT Panksepp Affective Systems)
- "Relational Safety" (NOT Winnicott)
- "Empathy Gate" (NOT Epstein)
- "Four Perspectives" (NOT AQAL / Integral)
- "Values & Worldview" (NOT Spiral Dynamics)
- "Natural Flow" (NOT Wu Wei / Taoism)
- Connected/Guarded/Overwhelmed (NOT Ventral/Sympathetic/Dorsal)
- Motivation/Boundary Fire/Threat Alert/Separation Pain/Nurturing/Playfulness (NOT SEEKING/RAGE/FEAR/PANIC-GRIEF/CARE/PLAY)

Format as clean Markdown with these sections:
1. OVERVIEW — Date range, # of entries/analyses, general state
2. ACTIVE PARTS — Which parts are showing up most, what they protect
3. PATTERNS OBSERVED — Recurring triggers, time patterns, entity patterns
4. UNRESOLVED CONTRACTS — Active vows that haven't been released
5. RELATIONSHIPS OF NOTE — Entities with highest activation
6. NERVOUS SYSTEM TRENDS — Is regulation improving or declining?
7. QUESTIONS FOR CONSULTATION — 3-5 questions to explore with a peer

Keep language warm, non-clinical, first-person accessible. This is NOT a clinical report.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Generate a Peer Consultation Summary for the last ${timeRange} days.\n\nJOURNAL ENTRIES (${(journalRes.data || []).length}):\n${JSON.stringify((journalRes.data || []).map(j => ({
            date: j.entry_date, period: j.log_period,
            ns_before: j.ns_state_before, ns_after: j.ns_state_after,
            entities: j.extracted_entities, parts: j.extracted_parts,
            themes: j.extracted_themes, summary: j.analysis_result?.summary,
          })), null, 1)}\n\nANALYSES (${(analysisRes.data || []).length}):\n${JSON.stringify((analysisRes.data || []).map(a => ({
            entity: (entitiesRes.data || []).find(e => e.id === a.entity_id)?.name,
            ns: a.m9_polyvagal?.ns_state_confirmed,
            drive: a.m19_panksepp?.affective_drive_confirmed,
            parts: a.m16_ifs?.parts_active,
            triggered: a.m18_compassionate_inquiry?.what_triggered_me,
            retrospective: a.retrospective,
          })), null, 1)}\n\nACTIVE PARTS (${(partsRes.data || []).length}):\n${JSON.stringify((partsRes.data || []).map(p => ({
            name: p.name, role: p.role, triggers: p.triggers, burdens: p.burdens, body: p.body_location,
          })), null, 1)}\n\nUNRESOLVED CONTRACTS (${(contractsRes.data || []).length}):\n${JSON.stringify((contractsRes.data || []).map(c => ({
            sworn_to: c.sworn_to, vow: c.vow_action, purpose: c.vow_purpose, cost: c.cost_recognized,
          })), null, 1)}`
        }],
      }),
    });

    const data = await response.json();
    const markdown = data.content?.[0]?.text || '';

    return res.status(200).json({
      status: 'completed',
      markdown,
      metadata: {
        time_range_days: timeRange,
        journal_count: (journalRes.data || []).length,
        analysis_count: (analysisRes.data || []).length,
        parts_count: (partsRes.data || []).length,
        contracts_count: (contractsRes.data || []).length,
        generated_at: new Date().toISOString(),
      },
    });

  } catch (err) {
    return res.status(500).json({ error: 'Export failed', details: err.message });
  }
}
