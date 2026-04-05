import { createClient } from '@supabase/supabase-js';
import { callAnthropic } from '../lib/call-anthropic.js';

/**
 * Auto-CPT Suggestion API
 *
 * POST /api/billing/auto-cpt { soap_note_id }
 *
 * Reads a SOAP note and suggests CPT codes with proper 8-minute rule unit allocation.
 * Uses Claude to analyze the clinical content and match to billing codes.
 *
 * Returns { suggested_codes, units_breakdown, total_units, confidence }
 */

export const config = { maxDuration: 30 };

// Standard PT CPT code library
const CPT_LIBRARY = {
  // Timed codes (per 15-min unit, 8-minute rule applies)
  '97110': { desc: 'Therapeutic Exercise', type: 'timed', rate: 65, category: 'exercise' },
  '97112': { desc: 'Neuromuscular Re-education', type: 'timed', rate: 70, category: 'neuro' },
  '97116': { desc: 'Gait Training', type: 'timed', rate: 65, category: 'gait' },
  '97140': { desc: 'Manual Therapy', type: 'timed', rate: 75, category: 'manual' },
  '97530': { desc: 'Therapeutic Activities', type: 'timed', rate: 68, category: 'activity' },
  '97535': { desc: 'Self-Care/Home Management Training', type: 'timed', rate: 62, category: 'adl' },
  '97542': { desc: 'Wheelchair Management', type: 'timed', rate: 60, category: 'wheelchair' },
  '97750': { desc: 'Physical Performance Test', type: 'timed', rate: 55, category: 'test' },
  // Untimed codes (per encounter, no 8-min rule)
  '97161': { desc: 'PT Eval Low Complexity', type: 'eval', rate: 120, category: 'eval' },
  '97162': { desc: 'PT Eval Moderate Complexity', type: 'eval', rate: 150, category: 'eval' },
  '97163': { desc: 'PT Eval High Complexity', type: 'eval', rate: 180, category: 'eval' },
  '97164': { desc: 'PT Re-evaluation', type: 'eval', rate: 100, category: 'eval' },
  '97150': { desc: 'Group Therapy', type: 'group', rate: 40, category: 'group' },
};

/**
 * 8-Minute Rule Calculator
 *
 * Medicare's 8-minute rule:
 * - 1 unit = 8-22 minutes
 * - 2 units = 23-37 minutes
 * - 3 units = 38-52 minutes
 * - 4 units = 53-67 minutes
 *
 * For multiple timed codes: total all minutes, then distribute units
 * proportionally based on time spent per code.
 */
function apply8MinuteRule(codeTimes) {
  // codeTimes: [{ code: '97110', minutes: 20 }, ...]
  const totalMinutes = codeTimes.reduce((sum, ct) => sum + ct.minutes, 0);

  // Calculate total billable units using 8-minute rule
  let totalUnits;
  if (totalMinutes < 8) totalUnits = 0;
  else if (totalMinutes <= 22) totalUnits = 1;
  else if (totalMinutes <= 37) totalUnits = 2;
  else if (totalMinutes <= 52) totalUnits = 3;
  else if (totalMinutes <= 67) totalUnits = 4;
  else if (totalMinutes <= 82) totalUnits = 5;
  else if (totalMinutes <= 97) totalUnits = 6;
  else totalUnits = Math.round(totalMinutes / 15);

  // Distribute units proportionally
  const result = codeTimes.map(ct => ({
    ...ct,
    proportion: ct.minutes / totalMinutes,
    rawUnits: (ct.minutes / totalMinutes) * totalUnits,
  }));

  // Round to whole units, ensuring total matches
  let allocated = 0;
  const sorted = result.sort((a, b) => (b.rawUnits % 1) - (a.rawUnits % 1));
  sorted.forEach(r => {
    r.units = Math.floor(r.rawUnits);
    allocated += r.units;
  });
  // Distribute remaining units to codes with highest fractional parts
  let remaining = totalUnits - allocated;
  for (const r of sorted) {
    if (remaining <= 0) break;
    r.units += 1;
    remaining -= 1;
  }

  return { totalMinutes, totalUnits, breakdown: sorted };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { soap_note_id, ...bodyData } = req.body;
  if (!soap_note_id) return res.status(400).json({ error: 'soap_note_id required' });

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    let soap;
    if (soap_note_id === 'preview') {
      // Preview mode: use form data sent directly from the SOAP Notes UI
      soap = {
        client_name: bodyData.client_name || 'Preview',
        duration: bodyData.duration || '55',
        subjective: bodyData.subjective || '',
        objective: bodyData.objective || '',
        assessment: bodyData.assessment || '',
        plan: bodyData.plan || '',
        cpt_codes: bodyData.cpt_codes || '',
        exercises_used: bodyData.exercises || '',
      };
    } else {
      const { data, error: soapErr } = await supabase
        .from('soap_notes')
        .select('*')
        .eq('id', soap_note_id)
        .single();
      if (soapErr || !data) return res.status(404).json({ error: 'SOAP note not found' });
      soap = data;
    }

    const duration = parseInt(soap.duration) || 55;

    // If SOAP already has CPT codes, use them directly with 8-minute rule
    const existingCodes = (soap.cpt_codes || '').split(',').map(c => c.trim()).filter(Boolean);

    let suggestedCodes;

    if (existingCodes.length > 0) {
      // Distribute time evenly across existing codes and apply 8-minute rule
      const minutesPerCode = Math.floor(duration / existingCodes.length);
      const codeTimes = existingCodes.map(code => ({
        code,
        desc: CPT_LIBRARY[code]?.desc || `CPT ${code}`,
        rate: CPT_LIBRARY[code]?.rate || 65,
        minutes: minutesPerCode,
      }));
      const result = apply8MinuteRule(codeTimes);
      suggestedCodes = result.breakdown.map(r => ({
        code: r.code,
        description: r.desc,
        minutes: r.minutes,
        units: r.units,
        rate: r.rate,
        amount: r.units * r.rate,
      }));

      return res.status(200).json({
        success: true,
        source: 'existing_codes',
        session_duration: duration,
        total_units: result.totalUnits,
        total_amount: suggestedCodes.reduce((s, c) => s + c.amount, 0),
        suggested_codes: suggestedCodes,
        eight_minute_rule_applied: true,
      });
    }

    // No existing codes — use AI to suggest based on SOAP content
    const prompt = `You are a physical therapy billing specialist. Analyze this SOAP note and suggest appropriate CPT codes.

SOAP Note:
- Client: ${soap.client_name}
- Duration: ${duration} minutes
- Subjective: ${soap.subjective || 'Not provided'}
- Objective: ${soap.objective || 'Not provided'}
- Assessment: ${soap.assessment || 'Not provided'}
- Plan: ${soap.plan || 'Not provided'}
- Exercises: ${soap.exercises_used || 'Not listed'}

Available CPT codes: ${Object.entries(CPT_LIBRARY).map(([code, info]) => `${code} (${info.desc})`).join(', ')}

Return ONLY a JSON array of suggested codes with estimated minutes per code. Example:
[{"code": "97110", "minutes": 25}, {"code": "97140", "minutes": 15}]

The total minutes should roughly equal ${duration}. Choose 2-4 codes that best match the documented interventions.`;

    const { text } = await callAnthropic({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
      endpoint: '/api/billing/auto-cpt',
      agentName: 'billing-agent',
      taskId: soap_note_id,
    });

    // Parse AI response
    let aiSuggestions;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      aiSuggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      aiSuggestions = [];
    }

    if (aiSuggestions.length === 0) {
      // Fallback: default to 97110 + 97140
      aiSuggestions = [
        { code: '97110', minutes: Math.ceil(duration * 0.6) },
        { code: '97140', minutes: Math.floor(duration * 0.4) },
      ];
    }

    const codeTimes = aiSuggestions.map(s => ({
      code: s.code,
      desc: CPT_LIBRARY[s.code]?.desc || `CPT ${s.code}`,
      rate: CPT_LIBRARY[s.code]?.rate || 65,
      minutes: s.minutes,
    }));

    const result = apply8MinuteRule(codeTimes);
    suggestedCodes = result.breakdown.map(r => ({
      code: r.code,
      description: r.desc,
      minutes: r.minutes,
      units: r.units,
      rate: r.rate,
      amount: r.units * r.rate,
    }));

    return res.status(200).json({
      success: true,
      source: 'ai_suggested',
      session_duration: duration,
      total_units: result.totalUnits,
      total_amount: suggestedCodes.reduce((s, c) => s + c.amount, 0),
      suggested_codes: suggestedCodes,
      eight_minute_rule_applied: true,
      confidence: 'medium',
      note: 'AI-suggested codes. Review before submitting to insurance.',
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
