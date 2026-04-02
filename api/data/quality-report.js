import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check — only Lance can run quality reports (HIPAA)
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authErr || !user || user.email !== 'lance@labnolabs.com') {
      return res.status(403).json({ error: 'Only Lance can run clinical data quality reports (HIPAA)' });
    }

    const type = req.query.type || 'moso';
    const table = type === 'moso' ? 'moso_clinical_leads' : 'labno_consulting_leads';

    const { data: leads, error: fetchErr } = await supabase.from(table).select('*');
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });

    // Run quality checks
    const issues = [];
    const stats = { total: leads.length, missingEmail: 0, invalidEmail: 0, duplicateEmails: 0, missingName: 0, invalidStatus: 0 };
    const emailSeen = new Map();
    const fillCounts = {};

    const MOSO_STATUSES = ['Active', 'Reactivation', 'Waitlist', 'Inactive', 'Referred Out', 'PITA-DNC'];
    const LABNO_STATUSES = ['New Lead', 'Qualified', 'Proposal', 'Active Client', 'Inactive', 'Referred Out'];
    const validStatuses = type === 'moso' ? MOSO_STATUSES : LABNO_STATUSES;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const trackFields = type === 'moso'
      ? ['email', 'case_primary', 'body_region', 'tier', 'referred_by', 'total_visits', 'est_annual_revenue']
      : ['email', 'contact_type', 'source', 'app_interest', 'lifetime_value'];

    trackFields.forEach(f => { fillCounts[f] = 0; });

    leads.forEach((lead, i) => {
      const name = type === 'moso' ? lead.patient_name : (lead.company_name || lead.first_name);
      if (!name || !name.trim()) {
        stats.missingName++;
        issues.push({ row: i, field: 'name', severity: 'high', message: `Missing name (id: ${lead.id?.slice(0, 8)})` });
      }

      if (!lead.email) {
        stats.missingEmail++;
      } else if (!emailRegex.test(lead.email)) {
        stats.invalidEmail++;
        issues.push({ row: i, field: 'email', severity: 'medium', message: `Invalid email "${lead.email}"` });
      } else {
        const norm = lead.email.toLowerCase().trim();
        if (emailSeen.has(norm)) {
          stats.duplicateEmails++;
          issues.push({ row: i, field: 'email', severity: 'high', message: `Duplicate email "${norm}"` });
        } else {
          emailSeen.set(norm, i);
        }
      }

      const status = type === 'moso' ? lead.status : lead.client_status;
      if (status && !validStatuses.includes(status)) {
        stats.invalidStatus++;
        issues.push({ row: i, field: 'status', severity: 'medium', message: `Invalid status "${status}"` });
      }

      trackFields.forEach(f => {
        const val = lead[f];
        if (val !== null && val !== undefined && val !== '' && val !== 0) fillCounts[f]++;
      });
    });

    const fillRates = {};
    Object.entries(fillCounts).forEach(([f, count]) => {
      fillRates[f] = leads.length > 0 ? `${((count / leads.length) * 100).toFixed(1)}%` : '0%';
    });

    const highCount = issues.filter(i => i.severity === 'high').length;
    const grade = highCount === 0 ? (issues.length <= 5 ? 'A' : 'B') : (highCount <= 3 ? 'C' : 'D');

    return res.status(200).json({
      type,
      summary: stats,
      fillRates,
      grade,
      issueCount: issues.length,
      issues: issues.slice(0, 50), // Cap at 50 to avoid huge responses
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
