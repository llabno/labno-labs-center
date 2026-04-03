// Consulting Lead Data Cleaning API
// Normalizes emails, trims whitespace, flags duplicates, strips HIPAA fields
// POST /api/data/clean-leads?dry_run=true for preview, omit for live update

import { createClient } from '@supabase/supabase-js';
import { isLance } from '../lib/auth.js';

export const config = { maxDuration: 60 };

// Fields that should NEVER appear in consulting leads (HIPAA)
const HIPAA_FIELDS = [
  'diagnosis', 'icd_code', 'insurance_id', 'insurance_provider',
  'dob', 'date_of_birth', 'ssn', 'medical_history', 'soap_notes',
  'body_region', 'case_primary', 'tier', 'treatment_plan',
  'medications', 'allergies', 'emergency_contact',
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.split(' ')[1]);
  if (authErr || !user || !isLance(user.email)) {
    return res.status(403).json({ error: 'Only Lance can run data cleaning (HIPAA)' });
  }

  const dryRun = req.query.dry_run === 'true';

  try {
    const { data: leads, error } = await supabase.from('labno_consulting_leads').select('*');
    if (error) return res.status(500).json({ error: error.message });

    const actions = [];
    const emailMap = new Map();
    const duplicates = [];

    leads.forEach(lead => {
      const updates = {};
      let needsUpdate = false;

      // 1. Trim whitespace on text fields
      for (const [key, val] of Object.entries(lead)) {
        if (typeof val === 'string' && val !== val.trim()) {
          updates[key] = val.trim();
          needsUpdate = true;
        }
      }

      // 2. Normalize email
      if (lead.email) {
        const normalized = lead.email.toLowerCase().trim();
        if (normalized !== lead.email) {
          updates.email = normalized;
          needsUpdate = true;
        }

        // Track duplicates
        if (emailMap.has(normalized)) {
          duplicates.push({ id: lead.id, email: normalized, duplicate_of: emailMap.get(normalized) });
        } else {
          emailMap.set(normalized, lead.id);
        }
      }

      // 3. Flag invalid emails
      const email = updates.email || lead.email;
      if (email && !emailRegex.test(email)) {
        actions.push({ type: 'invalid_email', id: lead.id, email });
      }

      // 4. Strip HIPAA fields
      for (const field of HIPAA_FIELDS) {
        if (lead[field] !== null && lead[field] !== undefined && lead[field] !== '') {
          updates[field] = null;
          needsUpdate = true;
          actions.push({ type: 'hipaa_stripped', id: lead.id, field, had_value: true });
        }
      }

      // 5. Normalize empty strings to null
      for (const [key, val] of Object.entries(lead)) {
        if (val === '' && key !== 'id') {
          updates[key] = null;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        actions.push({ type: 'update', id: lead.id, updates });
      }
    });

    // Apply updates if not dry run
    let applied = 0;
    if (!dryRun) {
      for (const action of actions) {
        if (action.type === 'update') {
          const { error: updateErr } = await supabase
            .from('labno_consulting_leads')
            .update(action.updates)
            .eq('id', action.id);
          if (!updateErr) applied++;
        }
      }

      // Log to audit
      await supabase.from('agent_runs').insert({
        task_title: 'Consulting Lead Data Cleaning',
        status: 'completed',
        agent_route: 'manual',
        result: JSON.stringify({
          totalLeads: leads.length,
          updatesApplied: applied,
          duplicatesFound: duplicates.length,
          hipaaFieldsStripped: actions.filter(a => a.type === 'hipaa_stripped').length,
        }),
      });
    }

    return res.status(200).json({
      dryRun,
      totalLeads: leads.length,
      updatesNeeded: actions.filter(a => a.type === 'update').length,
      updatesApplied: applied,
      duplicatesFound: duplicates,
      invalidEmails: actions.filter(a => a.type === 'invalid_email'),
      hipaaFieldsStripped: actions.filter(a => a.type === 'hipaa_stripped').length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
