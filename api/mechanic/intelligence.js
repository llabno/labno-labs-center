import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Cross-Module Intelligence
 * Aggregates data across all mechanic tables to produce:
 * - Relational heat map (which relationships cost the most NS energy)
 * - Affective drive trends over time
 * - Contract-to-entity auto-linking
 * - Group dynamics scoring (4-layer Winnicott per group)
 * - Regulation capacity trend
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

  // Fetch all data
  const [analysesRes, entitiesRes, contractsRes, partsRes, journalsRes] = await Promise.all([
    supabase.from('ifs_analysis_results').select('*').eq('user_id', userId).eq('pipeline_status', 'completed').order('created_at'),
    supabase.from('ifs_entities').select('*').eq('user_id', userId),
    supabase.from('ifs_contracts').select('*').eq('user_id', userId),
    supabase.from('ifs_parts').select('*').eq('user_id', userId),
    supabase.from('ifs_journal_entries').select('*').eq('user_id', userId).eq('is_analyzed', true).order('created_at'),
  ]);

  const analyses = analysesRes.data || [];
  const entities = entitiesRes.data || [];
  const contracts = contractsRes.data || [];
  const parts = partsRes.data || [];
  const journals = journalsRes.data || [];

  // ── 1. Relational Heat Map ──
  // Score each entity by NS cost: red=3, amber=2, green=1
  const heatMap = {};
  for (const a of analyses) {
    if (!a.entity_id || !a.m9_polyvagal?.ns_state_confirmed) continue;
    const entity = entities.find(e => e.id === a.entity_id);
    if (!entity) continue;
    if (!heatMap[entity.name]) heatMap[entity.name] = { entity_id: entity.id, name: entity.name, total_cost: 0, count: 0, states: { green: 0, amber: 0, red: 0 } };
    const ns = a.m9_polyvagal.ns_state_confirmed;
    const cost = ns === 'red' ? 3 : ns === 'amber' ? 2 : 1;
    heatMap[entity.name].total_cost += cost;
    heatMap[entity.name].count++;
    heatMap[entity.name].states[ns] = (heatMap[entity.name].states[ns] || 0) + 1;
  }
  const heatMapRanked = Object.values(heatMap)
    .map(h => ({ ...h, avg_cost: h.count ? +(h.total_cost / h.count).toFixed(2) : 0 }))
    .sort((a, b) => b.avg_cost - a.avg_cost);

  // ── 2. Affective Drive Trends ──
  const driveTrend = [];
  for (const a of analyses) {
    if (!a.m19_panksepp?.affective_drive_confirmed) continue;
    driveTrend.push({
      date: a.created_at?.split('T')[0],
      drive: a.m19_panksepp.affective_drive_confirmed,
      entity: entities.find(e => e.id === a.entity_id)?.name,
    });
  }
  // Count drive frequency
  const driveCounts = {};
  for (const d of driveTrend) {
    driveCounts[d.drive] = (driveCounts[d.drive] || 0) + 1;
  }
  const driveTotal = driveTrend.length || 1;
  const driveDistribution = Object.entries(driveCounts)
    .map(([drive, count]) => ({ drive, count, percentage: +((count / driveTotal) * 100).toFixed(1) }))
    .sort((a, b) => b.count - a.count);

  // ── 3. Contract-to-Entity Linking ──
  // Match contracts' sworn_to field against entity names
  const contractLinks = [];
  for (const c of contracts) {
    if (!c.sworn_to) continue;
    const matchedEntity = entities.find(e =>
      e.name.toLowerCase().includes(c.sworn_to.toLowerCase()) ||
      c.sworn_to.toLowerCase().includes(e.name.toLowerCase())
    );
    // Also check which entities trigger the same part that holds this contract
    const linkedPart = c.part_id ? parts.find(p => p.id === c.part_id) : null;
    const entitiesActivatingPart = linkedPart ? analyses.filter(a =>
      a.entity_id && (a.m16_ifs?.parts_active || []).some(p =>
        p.name?.toLowerCase() === linkedPart.name?.toLowerCase()
      )
    ).map(a => entities.find(e => e.id === a.entity_id)?.name).filter(Boolean) : [];

    contractLinks.push({
      contract_id: c.id,
      sworn_to: c.sworn_to,
      vow: c.vow_action,
      matched_entity: matchedEntity?.name || null,
      held_by_part: linkedPart?.name || null,
      entities_activating_part: [...new Set(entitiesActivatingPart)],
      is_released: c.is_released,
    });
  }

  // ── 4. Group Dynamics ──
  const groupScores = [];
  for (const entity of entities.filter(e => e.is_group)) {
    const groupAnalyses = analyses.filter(a => a.entity_id === entity.id);
    if (groupAnalyses.length === 0) continue;
    // Average 4-layer scores from Winnicott module
    const layers = { safety: 0, regulation: 0, connection: 0, meaning: 0, count: 0 };
    for (const a of groupAnalyses) {
      if (a.m21_winnicott?.four_layer_check) {
        layers.count++;
        // We can't numerically score text, but we can count how many analyses have each layer mentioned
      }
    }
    groupScores.push({
      name: entity.name,
      log_count: groupAnalyses.length,
      avg_ns: groupAnalyses.reduce((acc, a) => {
        const ns = a.m9_polyvagal?.ns_state_confirmed;
        return acc + (ns === 'red' ? 3 : ns === 'amber' ? 2 : 1);
      }, 0) / groupAnalyses.length,
    });
  }

  // ── 5. Regulation Capacity (journal before/after) ──
  let regulationImproved = 0, regulationWorsened = 0, regulationSame = 0;
  const stateScore = (s) => s === 'green' ? 1 : s === 'amber' ? 2 : s === 'red' ? 3 : 0;
  for (const j of journals) {
    if (j.ns_state_before && j.ns_state_after) {
      const before = stateScore(j.ns_state_before);
      const after = stateScore(j.ns_state_after);
      if (after < before) regulationImproved++;
      else if (after > before) regulationWorsened++;
      else regulationSame++;
    }
  }

  // ── 6. Parts Activation Frequency ──
  const partsFrequency = {};
  for (const a of analyses) {
    for (const p of (a.m16_ifs?.parts_active || [])) {
      const name = p.name || 'unnamed';
      if (!partsFrequency[name]) partsFrequency[name] = { name, role: p.role, count: 0, entities: [] };
      partsFrequency[name].count++;
      const entityName = entities.find(e => e.id === a.entity_id)?.name;
      if (entityName && !partsFrequency[name].entities.includes(entityName)) {
        partsFrequency[name].entities.push(entityName);
      }
    }
  }
  // Also from journals
  for (const j of journals) {
    for (const p of (j.extracted_parts || [])) {
      const name = p.name || 'unnamed';
      if (!partsFrequency[name]) partsFrequency[name] = { name, role: p.role, count: 0, entities: [] };
      partsFrequency[name].count++;
    }
  }
  const partsRanked = Object.values(partsFrequency).sort((a, b) => b.count - a.count);

  return res.status(200).json({
    status: 'completed',
    heat_map: heatMapRanked,
    drive_distribution: driveDistribution,
    drive_trend: driveTrend,
    contract_links: contractLinks,
    group_dynamics: groupScores,
    regulation_capacity: {
      improved: regulationImproved,
      worsened: regulationWorsened,
      same: regulationSame,
      total: regulationImproved + regulationWorsened + regulationSame,
      writing_helps: regulationImproved > regulationWorsened,
    },
    parts_frequency: partsRanked,
    data_points: {
      analyses: analyses.length,
      entities: entities.length,
      contracts: contracts.length,
      parts: parts.length,
      journals: journals.length,
    },
  });
}
