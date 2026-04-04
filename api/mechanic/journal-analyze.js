import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { journalId } = req.body || {};
  if (!journalId) return res.status(400).json({ error: 'Missing journalId' });

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

  // Fetch journal entry
  const { data: entry, error: entryErr } = await supabase
    .from('ifs_journal_entries')
    .select('*')
    .eq('id', journalId)
    .single();

  if (entryErr || !entry) return res.status(404).json({ error: 'Journal entry not found' });
  if (entry.user_id !== userId) return res.status(403).json({ error: 'Not your entry' });

  // Fetch existing entities for matching
  const { data: existingEntities } = await supabase
    .from('ifs_entities')
    .select('id, name, relationship_type, is_group')
    .eq('user_id', userId);

  const entityNames = (existingEntities || []).map(e => e.name).join(', ');

  const systemPrompt = `You are the Internal Mechanic's journal analyzer. You read free-flow diary entries and extract relational intelligence.

Your job:
1. ENTITY EXTRACTION — Identify every person or group mentioned by name or role. For each:
   - name: Their name or identifier as written
   - sentiment: The emotional valence of this mention (positive/negative/neutral/mixed)
   - context_snippet: The 1-2 sentences where they appear
   - relationship_guess: Your best guess at the relationship type
   - is_group: true if this refers to a group of people (e.g., "the softball parents", "my old band")

2. PARTS DETECTION — Notice any IFS parts activating in the writing:
   - name: What to call this part (use the writer's language if possible)
   - role: protector/exile/firefighter/self
   - activation_level: low/medium/high

3. THEME EXTRACTION — What relational themes are present?
   Examples: authority, abandonment, perfectionism, people-pleasing, boundary violation, grief, connection, play

4. NS STATE READ — Based on the writing style and content, what nervous system state does this suggest?
   - green (ventral vagal): open, reflective, curious
   - amber (sympathetic): activated, reactive, urgent
   - red (dorsal vagal): flat, disconnected, collapsed

5. SUGGESTED INTERACTIONS — If specific interactions are described that warrant full 9-module analysis, flag them with the entity name and a brief description.

KNOWN ENTITIES (match these when possible): ${entityNames || 'None yet'}

Return ONLY valid JSON:
{
  "entities": [{"name": "", "sentiment": "", "context_snippet": "", "relationship_guess": "", "is_group": false}],
  "parts": [{"name": "", "role": "", "activation_level": ""}],
  "themes": [""],
  "ns_state_read": "green|amber|red",
  "ns_state_reasoning": "",
  "suggested_interactions": [{"entity_name": "", "description": ""}],
  "summary": ""
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: entry.content }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    let analysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw_response: text };
    } catch {
      analysis = { raw_response: text, parse_error: true };
    }

    // Match extracted entities to existing ones
    const matchedEntityIds = [];
    if (analysis.entities && existingEntities) {
      for (const extracted of analysis.entities) {
        const match = existingEntities.find(e =>
          e.name.toLowerCase() === extracted.name?.toLowerCase()
        );
        if (match) matchedEntityIds.push(match.id);
      }
    }

    // ── Auto-create entities from journal extraction ──
    const newEntityRecords = [];
    if (analysis.entities?.length > 0) {
      for (const extracted of analysis.entities) {
        if (!extracted.name) continue;
        const alreadyExists = (existingEntities || []).find(
          ex => ex.name.toLowerCase() === extracted.name.toLowerCase()
        );
        if (alreadyExists) {
          matchedEntityIds.push(alreadyExists.id);
        } else {
          // Auto-create the entity
          const { data: newEnt } = await supabase.from('ifs_entities').insert({
            user_id: userId,
            name: extracted.name,
            relationship_type: extracted.relationship_guess || 'other',
            is_group: extracted.is_group || false,
            notes: `Auto-detected from journal entry`,
            log_count: 1,
            confidence_level: 'low',
          }).select().single();
          if (newEnt) {
            matchedEntityIds.push(newEnt.id);
            newEntityRecords.push(newEnt);
          }
        }
      }
    }

    // ── Auto-create parts from journal extraction ──
    if (analysis.parts?.length > 0) {
      const { data: existingParts } = await supabase
        .from('ifs_parts')
        .select('id, name, role')
        .eq('user_id', userId);
      const existingPartNames = new Set((existingParts || []).map(p => p.name.toLowerCase()));

      for (const detected of analysis.parts) {
        if (!detected.name || existingPartNames.has(detected.name.toLowerCase())) continue;
        await supabase.from('ifs_parts').insert({
          user_id: userId,
          name: detected.name,
          role: detected.role || 'protector',
          ns_state: analysis.ns_state_read === 'green' ? 'ventral_vagal'
            : analysis.ns_state_read === 'amber' ? 'sympathetic'
            : analysis.ns_state_read === 'red' ? 'dorsal_vagal' : null,
          notes: `Auto-detected from journal entry`,
          is_active: true,
        });
        existingPartNames.add(detected.name.toLowerCase());
      }
    }

    // Update journal entry with analysis
    await supabase.from('ifs_journal_entries').update({
      extracted_entities: analysis.entities || [],
      extracted_parts: analysis.parts || [],
      extracted_themes: analysis.themes || [],
      linked_entity_ids: matchedEntityIds,
      is_analyzed: true,
      analysis_result: analysis,
      updated_at: new Date().toISOString(),
    }).eq('id', journalId);

    return res.status(200).json({
      status: 'completed',
      analysis,
      matched_entities: matchedEntityIds.length,
      new_entities: newEntityRecords,
      auto_created: true,
    });

  } catch (err) {
    return res.status(500).json({ error: 'Analysis failed', details: err.message });
  }
}
