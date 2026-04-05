// Data Quality Notification Cron
// Runs daily at 9am CT — checks both CRM tables and logs results to agent_runs
// If grade is C or D, creates a triage task for Lance

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const cronAuth = req.headers.authorization;
  if (cronAuth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Invalid cron secret' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const runCheck = async (table, type) => {
    const { data: leads, error } = await supabase.from(table).select('*');
    if (error) return { type, error: error.message };

    let missingName = 0, missingEmail = 0, invalidEmail = 0, duplicateEmails = 0;
    const emailSeen = new Set();

    leads.forEach(lead => {
      const name = type === 'moso' ? lead.patient_name : (lead.company_name || lead.first_name);
      if (!name || !name.trim()) missingName++;
      if (!lead.email) { missingEmail++; }
      else if (!emailRegex.test(lead.email)) { invalidEmail++; }
      else {
        const norm = lead.email.toLowerCase().trim();
        if (emailSeen.has(norm)) duplicateEmails++;
        else emailSeen.add(norm);
      }
    });

    const highIssues = missingName + duplicateEmails;
    const totalIssues = highIssues + missingEmail + invalidEmail;
    const grade = highIssues === 0 ? (totalIssues <= 5 ? 'A' : 'B') : (highIssues <= 3 ? 'C' : 'D');

    return { type, total: leads.length, missingName, missingEmail, invalidEmail, duplicateEmails, grade, totalIssues };
  };

  try {
    const [moso, consulting] = await Promise.all([
      runCheck('moso_clinical_leads', 'moso'),
      runCheck('labno_consulting_leads', 'consulting'),
    ]);

    const summary = `Data Quality Report — MOSO: ${moso.grade} (${moso.totalIssues} issues / ${moso.total} records), Consulting: ${consulting.grade} (${consulting.totalIssues} issues / ${consulting.total} records)`;

    // Log to agent_runs feed
    await supabase.from('agent_runs').insert({
      task_title: 'Daily Data Quality Check',
      status: 'completed',
      agent_route: 'cron',
      result: JSON.stringify({ moso, consulting, summary }),
    });

    // If either grade is C or D, create a triage task
    const needsAttention = moso.grade >= 'C' || consulting.grade >= 'C';
    if (needsAttention) {
      // Find or create a "Data Hygiene" project
      const { data: projects } = await supabase.from('projects').select('id').ilike('name', '%data%hygiene%').limit(1);
      const projectId = projects?.[0]?.id;

      if (projectId) {
        await supabase.from('global_tasks').insert({
          title: `Data quality alert: MOSO=${moso.grade}, Consulting=${consulting.grade} — ${new Date().toISOString().split('T')[0]}`,
          project_id: projectId,
          column_id: 'triage',
          assigned_to: 'lance',
        });
      }
    }

    return res.status(200).json({ success: true, moso, consulting, needsAttention });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
