import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logTokenUsage } from '../lib/token-logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================
// Module definitions — execution order matches Gem prompt
// ============================================
const MODULE_SEQUENCE = [
  'm9',   // Phase 1: Polyvagal (Master Governor)
  'm16',  // Phase 2: IFS (Parts Detection)
  'm18',  // Phase 3: Compassionate Inquiry (Belief Surfacing)
  'm19',  // Phase 4: Panksepp (Affective Drive)
  'm21',  // Phase 5: Winnicott (Holding Environment)
  'm22',  // Phase 6: Epstein (Feel-Towards Gate)
  'm23',  // Phase 7: Integral (AQAL)
  'm20',  // Phase 8: Spiral Dynamics (vMeme)
  'm25',  // Phase 9: Watts (Wu Wei)
];

const MODULE_NAMES = {
  m9: 'Polyvagal (NS State Governor)',
  m16: 'IFS (Parts Detection)',
  m18: 'Compassionate Inquiry (Belief Surfacing)',
  m19: 'Panksepp (Affective Drive)',
  m21: 'Winnicott (Holding Environment)',
  m22: 'Epstein (Feel-Towards Gate)',
  m23: 'Integral (AQAL Four Quadrant)',
  m20: 'Spiral Dynamics (vMeme)',
  m25: 'Watts/Taoism (Wu Wei)',
};

// ============================================
// Module system prompts
// ============================================
const MODULE_SYSTEM_PROMPTS = {
  m9: `You are the Polyvagal module (M9) of the Internal Mechanic. You are the MASTER GOVERNOR — you fire first on every log and gate what subsequent modules are appropriate.

Your job:
- Confirm or refine the NS state based on raw_text content, NOT just the self-report
- If self-report says GREEN but raw_text shows threat language, bracing, shutdown → flag the discrepancy
- Dorsal/sympathetic activation → note that subsequent routing is limited
- Ventral vagal confirmed → full module routing available
- If RED confirmed → flag that deep parts work and CI inquiry are contraindicated

Output JSON with: ns_state_confirmed (green/amber/red), discrepancy (boolean), discrepancy_note, reasoning, routing_limitations (array of what's contraindicated)`,

  m16: `You are the IFS module (M16) of the Internal Mechanic. You DETECT parts present. You do NOT conduct IFS therapy or attempt unburdening.

Your job:
- Self-Energy Gate: Check for 8 Cs (curiosity, calm, compassion, confidence, creativity, courage, clarity, connectedness)
- If Self-energy present → note it. Self-led response options available.
- If Concerned Part is blended → note which part, flag that direct work is not recommended
- Manager detection: intellectualization, achievement-focus, planning, pushing
- Firefighter detection: avoidance, distraction, numbing, impulsive action
- Exile signals: childlike language, abandonment themes, "nobody sees me," age regression
- Self vs Manager differential: if language sounds calm but relational withdrawal present → flag Manager mimicking Self

Output JSON with: self_energy_present (yes/no/partial), parts_active (array of {name, role, protective_function}), blending_level (none/mild/moderate/severe), self_vs_manager_flag (boolean), self_vs_manager_note`,

  m18: `You are the Compassionate Inquiry module (M18) of the Internal Mechanic, based on Gabor Maté's framework.

Your job:
- Check Disconnection State first: tuning_out → do not advance CI. Exile voice → pause. Heart shutdown → acknowledge protective function only. Externalization active → redirect.
- If CI is appropriate given NS state and disconnection check: identify which Stepping Stone (1-17) is most relevant, identify the belief likely being defended
- Stones 1-5 must precede Stone 6. Never jump to depth content without foundation.
- CI level: Full CI (GREEN + no disconnection + protector permission), Modified CI (AMBER + partial disconnection), Compassionate Listening only (RED or high disconnection)

Output JSON with: ci_level (full/modified/listening_only), disconnection_pattern (none/tuning_out/exile_voice/heart_shutdown/externalization), what_triggered_me, stepping_stone_relevant (number), belief_defended, conscious_response_available`,

  m19: `You are the Panksepp module (M19) of the Internal Mechanic. You confirm or refine the user's self-reported affective drive.

Your job:
- Compare self-report to raw_text content
- RAGE vs FEAR differentiation: RAGE = boundary violation / thwarted forward motion. FEAR = threat / retreat. Do NOT collapse into "dysregulation."
- PANIC-GRIEF vs FEAR: Separation/loss → PANIC-GRIEF. Threat → FEAR. Different responses needed.
- CARE activation in conflict → often masking PANIC-GRIEF. Note if present.
- Discrepancy detection: flag explicitly if self-report differs from analysis

Output JSON with: affective_drive_confirmed, self_reported, discrepancy (boolean), discrepancy_note, reasoning`,

  m21: `You are the Winnicott module (M21) of the Internal Mechanic. You assess the relational field quality using the Four-Layer Check.

Your job:
- Layer 1 — Safety: Was a basic sense of safety present in the relational field?
- Layer 2 — Regulation: Was co-regulation available? Was it used?
- Layer 3 — Connection: Was genuine contact made?
- Layer 4 — Meaning: Was any shared meaning constructed?
- Detection: False Self compliance, Holding Broken, Impingement Active, Over-Holding
- Winnicott language stays in analysis only — never in user-facing summary

Output JSON with: four_layer_check ({safety, regulation, connection, meaning} each one sentence), patterns_detected (array: false_self/holding_broken/impingement/over_holding), reasoning`,

  m22: `You are the Epstein Feel-Towards Gate module (M22) of the Internal Mechanic. You are an ETHICAL GUARDRAIL that fires before generating any Entity hypothesis update.

Your job:
- Assess whether raw_text contains emotional contact with the Entity's experience — not just reactivity toward it
- Pass: User shows felt sense of Entity as separate person with their own inner life
- Fail: User is purely reactive — no perspective-taking, no empathy signal, no curiosity about Entity's state
- If Fail → Entity hypothesis updates limited to low-confidence surface notes only
- Realistic View guardrail: All Entity analysis is provisional regardless

Output JSON with: feel_towards_gate (pass/fail/not_assessed), reasoning, entity_update_allowed (boolean)`,

  m23: `You are the Integral/AQAL module (M23) of the Internal Mechanic. You ensure the retrospective covers all four dimensions.

Your job:
- UL (Upper Left) — Interior Individual: subjective experience, thoughts, emotions, parts active
- UR (Upper Right) — Exterior Individual: observable behaviors, somatic signals, actions taken
- LL (Lower Left) — Interior Collective: relational field, shared meaning, cultural context
- LR (Lower Right) — Exterior Collective: systemic factors, roles, environment, institutional context
- Check that the interaction doesn't over-index on any one quadrant

Output JSON with: aqal_breakdown ({ul, ur, ll, lr} each one sentence), over_indexed_quadrant (or null), under_indexed_quadrant (or null)`,

  m20: `You are the Spiral Dynamics module (M20) of the Internal Mechanic. You assess vMeme alignment and communication framing.

Your job:
- Assess vMeme alignment or clash between user and Entity based on raw_text
- Common clashes: Orange/Achievement Entity + Green/Community user, Red/Power Entity + Blue/Order user
- Tier shift detection: Compare to prior patterns. If regression or advance detected, surface it.
- Conservative language: "suggests movement toward" not "confirms a shift to"
- One log alone NEVER confirms a tier shift

Output JSON with: user_vmeme, entity_vmeme (or null), vmeme_clash (boolean), clash_description, tier_shift_assessment (or "insufficient data")`,

  m25: `You are the Watts/Taoism module (M25) of the Internal Mechanic. You assess effort quality and the non-forcing path.

Your job:
- Where did the user push against the natural flow of the interaction?
- What would the non-forcing path have looked like?
- Wu Wei is NOT passivity — it is action aligned with actual conditions, not desired conditions
- The Backwards Law: The harder the push, the more resistance generated. What was being pushed?

Output JSON with: wu_wei_note, non_forcing_alternative, pushing_detected (boolean), backwards_law_active (boolean), reasoning`,
};

// ============================================
// Load rules for a module
// ============================================
function loadRules(module) {
  try {
    const rulesPath = join(__dirname, 'rules', `${module}_rules.json`);
    const data = JSON.parse(readFileSync(rulesPath, 'utf-8'));
    // Condense rules to fit in prompt — take top 50 Phase6 + top 30 Phase5
    const p6 = (data.phase6_rules || []).slice(0, 50);
    const p5 = {};
    for (const [key, rows] of Object.entries(data.phase5_decision_trees || {})) {
      p5[key] = rows.slice(0, 30);
    }
    return { phase6: p6, phase5: p5 };
  } catch {
    return { phase6: [], phase5: {} };
  }
}

// ============================================
// Build context from prior modules
// ============================================
function buildPriorContext(results) {
  const ctx = [];
  if (results.m9) ctx.push(`[M9 Polyvagal] NS State: ${results.m9.ns_state_confirmed}. ${results.m9.discrepancy ? 'DISCREPANCY: ' + results.m9.discrepancy_note : ''}`);
  if (results.m16) ctx.push(`[M16 IFS] Self-Energy: ${results.m16.self_energy_present}. Parts: ${(results.m16.parts_active || []).map(p => p.name + ' (' + p.role + ')').join(', ')}`);
  if (results.m18) ctx.push(`[M18 CI] Level: ${results.m18.ci_level}. Triggered by: ${results.m18.what_triggered_me || 'unknown'}`);
  if (results.m19) ctx.push(`[M19 Panksepp] Drive: ${results.m19.affective_drive_confirmed}. ${results.m19.discrepancy ? 'DISCREPANCY: ' + results.m19.discrepancy_note : ''}`);
  if (results.m21) ctx.push(`[M21 Winnicott] Patterns: ${(results.m21.patterns_detected || []).join(', ') || 'none'}`);
  if (results.m22) ctx.push(`[M22 Epstein] Feel-Towards Gate: ${results.m22.feel_towards_gate}`);
  if (results.m23) ctx.push(`[M23 AQAL] Over-indexed: ${results.m23.over_indexed_quadrant || 'none'}`);
  if (results.m20) ctx.push(`[M20 Spiral] User vMeme: ${results.m20.user_vmeme}, Entity: ${results.m20.entity_vmeme || 'unknown'}`);
  return ctx.join('\n');
}

// ============================================
// Run a single module
// ============================================
async function runModule(module, log, priorContext, entityProfile, apiKey) {
  const rules = loadRules(module);
  const systemPrompt = MODULE_SYSTEM_PROMPTS[module];

  const rulesText = rules.phase6.length > 0
    ? `\n\nROUTING RULES (from Phase 6 extraction):\n${JSON.stringify(rules.phase6, null, 1)}`
    : '';

  const phase5Text = Object.keys(rules.phase5).length > 0
    ? `\n\nDECISION TREES (from Phase 5):\n${JSON.stringify(rules.phase5, null, 1)}`
    : '';

  const entityText = entityProfile
    ? `\n\nENTITY PROFILE (provisional — ${entityProfile.confidence_level} confidence from ${entityProfile.log_count} logs):\n${JSON.stringify(entityProfile, null, 1)}`
    : '';

  const userMessage = `INTERACTION LOG:
Entity: ${log.entity_name || 'Unknown'} (${log.relationship_type || 'unknown'})
Self-reported NS state: ${log.somatic_state || 'not provided'}
Self-reported affective drive: ${log.affective_drive_self_report || 'not provided'}
Parts self-report: ${log.parts_self_report || 'not provided'}

RAW TEXT:
${log.raw_text}

PRIOR MODULE RESULTS:
${priorContext || 'This is the first module in the sequence.'}
${entityText}
${rulesText}
${phase5Text}

Analyze this interaction through your module's lens. Return ONLY valid JSON matching the output format specified in your system prompt. No markdown, no explanation — just the JSON object.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const tokens = {
    input: data.usage?.input_tokens || 0,
    output: data.usage?.output_tokens || 0,
  };

  if (data.usage) {
    logTokenUsage({
      endpoint: '/api/mechanic/analyze',
      model: 'claude-sonnet-4-6-20250514',
      inputTokens: tokens.input,
      outputTokens: tokens.output,
      agentName: `mechanic-${module}`,
    });
  }

  // Parse JSON from response
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return { result: JSON.parse(jsonMatch[0]), tokens };
    }
  } catch {}

  return { result: { raw_response: text, parse_error: true }, tokens };
}

// ============================================
// Generate retrospective (final synthesis)
// ============================================
async function generateRetrospective(log, results, entityProfile, apiKey) {
  const systemPrompt = `You are the Internal Mechanic's retrospective synthesizer. You combine all 9 module outputs into a Five-Angle Retrospective.

LANGUAGE RULES:
- Never use: holistic, wellness, journey, empower, transform, synergy, optimize, game-changer, delve, tapestry
- Never use clinical diagnostic language: disorder, pathology, diagnosis, treatment, symptom
- Use: activation, regulation, parts, protective function, NS state, vMeme, holding, contact, tracking, surfacing
- All Entity language: hypothesis frames only — "likely," "may suggest," "appears to," "provisional"

Output JSON with five keys: my_inside (UL — parts active, Self-led response available but not taken), their_system_hypothesis (Entity's protective functions, framed as hypothesis), between_us (LL — vMeme clash, co-regulation failure, what the field needed), body_reading (UR — NS state, what regulated response would look like), non_forcing_path (M25 — Wu Wei in this situation)`;

  const userMessage = `ALL MODULE RESULTS:\n${JSON.stringify(results, null, 2)}\n\nENTITY: ${log.entity_name || 'Unknown'}\nRAW TEXT:\n${log.raw_text}\n\nSynthesize the Five-Angle Retrospective. Return ONLY valid JSON.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const tokens = { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 };

  if (data.usage) {
    logTokenUsage({
      endpoint: '/api/mechanic/analyze',
      model: 'claude-sonnet-4-6-20250514',
      inputTokens: tokens.input,
      outputTokens: tokens.output,
      agentName: 'mechanic-retrospective',
    });
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return { result: JSON.parse(jsonMatch[0]), tokens };
  } catch {}
  return { result: { raw_response: text }, tokens };
}

// ============================================
// Main handler
// ============================================
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { logId } = req.body || {};
  if (!logId) return res.status(400).json({ error: 'Missing logId' });

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

  // Fetch the interaction log
  const { data: log, error: logErr } = await supabase
    .from('ifs_interaction_logs')
    .select('*, ifs_entities(name, relationship_type, vmeme_center, observed_protectors, autonomic_baseline, affective_drive, hypothesized_wound, compassion_frame, log_count, confidence_level)')
    .eq('id', logId)
    .single();

  if (logErr || !log) return res.status(404).json({ error: 'Log not found' });
  if (log.user_id !== userId) return res.status(403).json({ error: 'Not your log' });

  // Attach entity info to log for convenience
  const entityProfile = log.ifs_entities || null;
  log.entity_name = entityProfile?.name || 'Unknown';
  log.relationship_type = entityProfile?.relationship_type || 'unknown';

  // Create analysis result record
  const { data: analysis, error: analysisErr } = await supabase
    .from('ifs_analysis_results')
    .insert({
      user_id: userId,
      log_id: logId,
      entity_id: log.entity_id,
      pipeline_status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (analysisErr) return res.status(500).json({ error: 'Failed to create analysis record' });

  // Run modules sequentially — each feeds the next
  const results = {};
  let totalInput = 0, totalOutput = 0;

  try {
    for (const module of MODULE_SEQUENCE) {
      const priorContext = buildPriorContext(results);

      // Update current module
      await supabase.from('ifs_analysis_results').update({
        current_module: module,
        modules_completed: Object.keys(results),
      }).eq('id', analysis.id);

      const { result, tokens } = await runModule(module, log, priorContext, entityProfile, apiKey);
      results[module] = result;
      totalInput += tokens.input;
      totalOutput += tokens.output;

      // Save intermediate result
      const updatePayload = { [`${module === 'm9' ? 'm9_polyvagal' : module === 'm16' ? 'm16_ifs' : module === 'm18' ? 'm18_compassionate_inquiry' : module === 'm19' ? 'm19_panksepp' : module === 'm21' ? 'm21_winnicott' : module === 'm22' ? 'm22_epstein' : module === 'm23' ? 'm23_integral' : module === 'm20' ? 'm20_spiral' : 'm25_watts'}`]: result };
      await supabase.from('ifs_analysis_results').update(updatePayload).eq('id', analysis.id);
    }

    // Generate retrospective synthesis
    const { result: retro, tokens: retroTokens } = await generateRetrospective(log, results, entityProfile, apiKey);
    totalInput += retroTokens.input;
    totalOutput += retroTokens.output;

    // Check for pattern detection (3+ logs for this entity)
    let patternFlags = null;
    if (log.entity_id && entityProfile?.log_count >= 2) {
      // Fetch prior analyses for this entity
      const { data: priorAnalyses } = await supabase
        .from('ifs_analysis_results')
        .select('m16_ifs, m19_panksepp, m18_compassionate_inquiry')
        .eq('entity_id', log.entity_id)
        .eq('pipeline_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (priorAnalyses && priorAnalyses.length >= 2) {
        patternFlags = { log_count: priorAnalyses.length + 1, note: 'Cross-session pattern detection active' };
      }
    }

    // Update entity profile
    let entityUpdate = null;
    if (log.entity_id && results.m22?.feel_towards_gate === 'pass') {
      entityUpdate = {};
      if (results.m20?.entity_vmeme) entityUpdate.vmeme_center = results.m20.entity_vmeme;
      if (results.m9?.ns_state_confirmed) entityUpdate.autonomic_baseline = results.m9.ns_state_confirmed;
      if (results.m19?.affective_drive_confirmed) entityUpdate.affective_drive = results.m19.affective_drive_confirmed;

      // Update entity in DB
      await supabase.from('ifs_entities').update({
        ...entityUpdate,
        log_count: (entityProfile?.log_count || 0) + 1,
        confidence_level: (entityProfile?.log_count || 0) + 1 >= 8 ? 'high' : (entityProfile?.log_count || 0) + 1 >= 3 ? 'medium' : 'low',
        last_log_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', log.entity_id);
    }

    // Final update
    await supabase.from('ifs_analysis_results').update({
      pipeline_status: 'completed',
      modules_completed: MODULE_SEQUENCE,
      current_module: null,
      retrospective: retro,
      pattern_flags: patternFlags,
      entity_hypothesis_update: entityUpdate,
      total_input_tokens: totalInput,
      total_output_tokens: totalOutput,
      completed_at: new Date().toISOString(),
    }).eq('id', analysis.id);

    return res.status(200).json({
      status: 'completed',
      analysisId: analysis.id,
      results,
      retrospective: retro,
      pattern_flags: patternFlags,
      tokens: { input: totalInput, output: totalOutput },
    });

  } catch (err) {
    await supabase.from('ifs_analysis_results').update({
      pipeline_status: 'failed',
      modules_completed: Object.keys(results),
    }).eq('id', analysis.id);

    return res.status(500).json({ error: 'Pipeline failed', module: Object.keys(results).length, details: err.message });
  }
}
