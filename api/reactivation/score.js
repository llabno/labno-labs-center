// Reactivation Scoring & Queue Population
// Scans clinical leads for inactive/at-risk patients, scores them, and upserts into reactivation_queue
// POST /api/reactivation/score — manual trigger
// Also callable via cron

import { createClient } from '@supabase/supabase-js';
import { isLance } from '../lib/auth.js';

export const config = { maxDuration: 30 };

const REACTIVATION_TEMPLATES = {
  email: "Hi {name}, it's been a while since your last visit at Movement Solutions. I wanted to check in — how are you feeling? If you'd like to schedule a follow-up, we have openings this week. — Lance",
  text: "Hi {name}! Lance from Movement Solutions checking in. How are you doing? Reply if you'd like to schedule a tune-up visit.",
  call: "Call {name} — haven't been seen in {days} days. Last visit: {last_visit}. Check on progress and offer re-evaluation."
};

function scoreLead(lead) {
  let score = 0;
  const reasons = [];

  // Days since last visit
  const daysSince = lead.last_visit_date
    ? Math.floor((Date.now() - new Date(lead.last_visit_date).getTime()) / 86400000)
    : 999;

  if (daysSince > 365) { score += 40; reasons.push(`${daysSince} days since last visit`); }
  else if (daysSince > 180) { score += 30; reasons.push(`${daysSince} days since last visit`); }
  else if (daysSince > 90) { score += 20; reasons.push(`${daysSince} days since last visit`); }
  else if (daysSince > 45) { score += 10; reasons.push(`${daysSince} days since last visit`); }
  else return null; // Too recent, skip

  // Visit count (low visits = dropped off early)
  const visits = parseInt(lead.total_visits || 0);
  if (visits <= 2) { score += 20; reasons.push('Only had ' + visits + ' visits'); }
  else if (visits <= 5) { score += 10; reasons.push(visits + ' total visits'); }

  // Revenue potential
  const revenue = parseFloat(lead.est_annual_revenue || 0);
  if (revenue >= 5000) { score += 15; reasons.push('High revenue potential'); }
  else if (revenue >= 2000) { score += 10; reasons.push('Medium revenue potential'); }

  // Status boost
  if (lead.status === 'Reactivation') { score += 10; reasons.push('Already flagged for reactivation'); }
  if (lead.status === 'Inactive') { score += 5; reasons.push('Inactive status'); }

  // Cap at 100
  score = Math.min(100, score);

  // Determine best outreach method
  const method = lead.email ? 'email' : (lead.phone || lead.mobile) ? 'text' : 'call';

  return { score, reasons, method, daysSince };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Auth: either cron secret or user token
  const authHeader = req.headers.authorization;
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!isCron) {
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authErr || !user || !isLance(user.email)) {
      return res.status(403).json({ error: 'Only Lance can run reactivation scoring' });
    }
  }

  try {
    // Fetch eligible leads (Active, Reactivation, Inactive — not DNC)
    const { data: leads, error } = await supabase
      .from('moso_clinical_leads')
      .select('*')
      .not('status', 'in', '("PITA-DNC","Referred Out","Waitlist")');

    if (error) return res.status(500).json({ error: error.message });

    const scored = [];
    for (const lead of leads) {
      const result = scoreLead(lead);
      if (!result) continue; // Too recent

      const name = lead.patient_name || 'Patient';
      const firstName = name.split(' ')[0];
      const template = REACTIVATION_TEMPLATES[result.method]
        .replace(/\{name\}/g, firstName)
        .replace(/\{days\}/g, result.daysSince)
        .replace(/\{last_visit\}/g, lead.last_visit_date || 'unknown');

      scored.push({
        lead_id: lead.id,
        lead_name: name,
        phone: lead.phone || lead.mobile || null,
        email: lead.email || null,
        priority_score: result.score,
        outreach_method: result.method,
        suggested_message: template,
        scoring_reasons: result.reasons.join('; '),
        status: 'pending',
        contact_attempts: 0,
      });
    }

    // Batch upsert into reactivation_queue
    // First, fetch all existing entries in one query
    const leadIds = scored.map(s => s.lead_id);
    const { data: existingEntries } = await supabase
      .from('reactivation_queue')
      .select('id, lead_id, status')
      .in('lead_id', leadIds);

    const existingMap = new Map((existingEntries || []).map(e => [e.lead_id, e]));

    const toInsert = [];
    const toUpdate = [];

    for (const item of scored) {
      const existing = existingMap.get(item.lead_id);
      if (existing) {
        if (existing.status === 'pending') {
          toUpdate.push({ id: existing.id, priority_score: item.priority_score, suggested_message: item.suggested_message, scoring_reasons: item.scoring_reasons });
        }
      } else {
        toInsert.push(item);
      }
    }

    let upserted = 0;
    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase.from('reactivation_queue').insert(toInsert);
      if (!insertErr) upserted += toInsert.length;
    }
    for (const update of toUpdate) {
      const { id, ...fields } = update;
      const { error: updateErr } = await supabase.from('reactivation_queue').update(fields).eq('id', id);
      if (!updateErr) upserted++;
    }

    // Log
    await supabase.from('agent_runs').insert({
      task_title: `Reactivation Scoring (${upserted} leads scored)`,
      status: 'completed',
      agent_route: isCron ? 'cron' : 'manual',
      result: JSON.stringify({ leadsScanned: leads.length, eligible: scored.length, upserted }),
    });

    return res.status(200).json({
      success: true,
      leadsScanned: leads.length,
      eligible: scored.length,
      upserted,
      topCandidates: scored.sort((a, b) => b.priority_score - a.priority_score).slice(0, 10).map(s => ({
        name: s.lead_name,
        score: s.priority_score,
        method: s.outreach_method,
        reasons: s.scoring_reasons,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
