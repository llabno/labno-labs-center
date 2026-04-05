import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Auto-generate superbill from SOAP note CPT codes.
 * POST /api/billing/superbill { soap_note_id }
 * Returns structured superbill data + updates billing_status.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const { soap_note_id } = req.body;
  if (!soap_note_id) return res.status(400).json({ error: 'soap_note_id required' });

  try {
    // Fetch SOAP note
    const { data: soap, error: soapErr } = await supabase
      .from('soap_notes').select('*').eq('id', soap_note_id).single();
    if (soapErr || !soap) return res.status(404).json({ error: 'SOAP note not found' });

    // CPT code rates (standard PT rates)
    const CPT_RATES = {
      '97110': { desc: 'Therapeutic Exercise', rate: 65, units_per_15: 1 },
      '97112': { desc: 'Neuromuscular Re-education', rate: 70, units_per_15: 1 },
      '97140': { desc: 'Manual Therapy', rate: 75, units_per_15: 1 },
      '97530': { desc: 'Therapeutic Activities', rate: 68, units_per_15: 1 },
      '97542': { desc: 'Wheelchair Management', rate: 60, units_per_15: 1 },
      '97116': { desc: 'Gait Training', rate: 65, units_per_15: 1 },
      '97150': { desc: 'Group Therapy', rate: 40, units_per_15: 1 },
    };

    // Parse CPT codes from SOAP note
    const codes = (soap.cpt_codes || '').split(',').map(c => c.trim()).filter(Boolean);
    const duration = parseInt(soap.duration) || 55;

    // 8-minute rule: calculate units
    const totalMinutes = duration;
    const totalUnits = Math.floor(totalMinutes / 15); // 15-min billing units
    const unitsPerCode = codes.length > 0 ? Math.max(1, Math.floor(totalUnits / codes.length)) : 0;

    const lineItems = codes.map(code => {
      const info = CPT_RATES[code] || { desc: `CPT ${code}`, rate: 65, units_per_15: 1 };
      return {
        cpt_code: code,
        description: info.desc,
        units: unitsPerCode,
        rate_per_unit: info.rate,
        amount: unitsPerCode * info.rate,
      };
    });

    const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

    const superbill = {
      provider: 'Lance Labno, PT, DPT',
      practice: 'Movement Solutions',
      date_of_service: soap.session_date,
      patient: soap.client_name,
      diagnosis: soap.diagnosis || '',
      duration_minutes: duration,
      line_items: lineItems,
      total,
      notes: soap.clinical_flags ? `Clinical flags: ${soap.clinical_flags}` : '',
      generated_at: new Date().toISOString(),
    };

    // Update SOAP note billing status
    await supabase.from('soap_notes').update({ billing_status: 'superbill_generated' }).eq('id', soap_note_id);

    // Log activity
    await supabase.from('activity_feed').insert({
      action: 'superbill_generated', entity_type: 'soap_note',
      entity_id: soap_note_id, entity_name: `Superbill — ${soap.client_name}`,
      actor: 'System', details: { total, codes, date: soap.session_date },
    });

    return res.status(200).json({ success: true, superbill });
  } catch (err) {
    console.error('Superbill generation failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
