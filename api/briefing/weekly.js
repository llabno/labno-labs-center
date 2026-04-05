import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Weekly Ops Briefing — generates a Monday morning summary.
 * Can be called via cron (Monday 7am) or manually.
 * GET /api/briefing/weekly
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  // Auth: cron secret or bearer token
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  if (!apiKey && !authHeader) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
    const nextWeek = new Date(now.getTime() + 7 * 86400000);

    // Fetch data in parallel
    const [projectsRes, tasksRes, activityRes, clientsRes, docsRes] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('global_tasks').select('*'),
      supabase.from('activity_feed').select('*').gte('created_at', oneWeekAgo.toISOString()).order('created_at', { ascending: false }),
      supabase.from('clients').select('*'),
      supabase.from('client_documents').select('*').gte('created_at', oneWeekAgo.toISOString()),
    ]);

    const projects = projectsRes.data || [];
    const tasks = tasksRes.data || [];
    const activity = activityRes.data || [];
    const clients = clientsRes.data || [];
    const docs = docsRes.data || [];

    // Compute metrics
    const activeProjects = projects.filter(p => p.status === 'Active');
    const completedThisWeek = tasks.filter(t => t.column_id === 'completed' && t.updated_at && new Date(t.updated_at) >= oneWeekAgo);
    const totalTasks = tasks.length;
    const blockedTasks = tasks.filter(t => t.is_blocked || t.column_id === 'blocked');
    const upcomingDeadlines = projects.filter(p => p.due_date && new Date(p.due_date) <= nextWeek && new Date(p.due_date) >= now);

    // Stalled projects (no activity in 5+ business days)
    const stalledProjects = activeProjects.filter(p => {
      const lastAct = p.last_activity_at || p.updated_at || p.created_at;
      const daysSince = Math.floor((now - new Date(lastAct)) / 86400000);
      return daysSince >= 5;
    });

    // Revenue estimate
    const baseRate = 250;
    const activeClientProjects = projects.filter(p => p.project_type === 'client' && p.status === 'Active');
    const estimatedMonthlyRevenue = activeClientProjects.length * 20 * baseRate; // 20 hrs/mo avg

    const briefing = {
      generated_at: now.toISOString(),
      period: `${oneWeekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      summary: {
        active_projects: activeProjects.length,
        tasks_completed_this_week: completedThisWeek.length,
        total_tasks: totalTasks,
        blocked_tasks: blockedTasks.length,
        stalled_projects: stalledProjects.length,
        upcoming_deadlines: upcomingDeadlines.length,
        active_clients: clients.filter(c => !c.dnc_status).length,
        documents_created: docs.length,
        estimated_monthly_revenue: estimatedMonthlyRevenue,
      },
      top_priorities: activeProjects
        .sort((a, b) => (a.complexity || 0) - (b.complexity || 0))
        .slice(0, 5)
        .map(p => ({ name: p.name, status: p.status, due: p.due_date, type: p.project_type })),
      stalled: stalledProjects.map(p => ({
        name: p.name,
        days_stalled: Math.floor((now - new Date(p.last_activity_at || p.updated_at || p.created_at)) / 86400000),
      })),
      deadlines: upcomingDeadlines.map(p => ({ name: p.name, due: p.due_date })),
      blocked: blockedTasks.slice(0, 5).map(t => ({ title: t.title, project_id: t.project_id })),
      recent_activity: activity.slice(0, 10).map(a => ({ action: a.action, entity: a.entity_name, actor: a.actor, at: a.created_at })),
    };

    // Generate human-readable text version
    const text = `
# Weekly Ops Briefing — ${briefing.period}

## At a Glance
- ${briefing.summary.active_projects} active projects
- ${briefing.summary.tasks_completed_this_week} tasks completed this week
- ${briefing.summary.blocked_tasks} blocked tasks
- ${briefing.summary.stalled_projects} stalled projects
- ${briefing.summary.upcoming_deadlines} deadlines this week
- ${briefing.summary.active_clients} active clients
- Est. monthly revenue: $${briefing.summary.estimated_monthly_revenue.toLocaleString()}

## Top Priorities
${briefing.top_priorities.map((p, i) => `${i + 1}. ${p.name} (${p.type}) — due ${p.due || 'no date'}`).join('\n')}

## Needs Attention
${briefing.stalled.length > 0 ? briefing.stalled.map(p => `- STALLED: ${p.name} (${p.days_stalled} days)`).join('\n') : '- No stalled projects'}
${briefing.blocked.length > 0 ? '\n' + briefing.blocked.map(t => `- BLOCKED: ${t.title}`).join('\n') : ''}

## Upcoming Deadlines
${briefing.deadlines.length > 0 ? briefing.deadlines.map(p => `- ${p.name} — due ${p.due}`).join('\n') : '- No deadlines this week'}
`;

    briefing.text = text.trim();

    // Log the briefing generation
    await supabase.from('activity_feed').insert({
      action: 'briefing_generated',
      entity_type: 'system',
      entity_name: 'Weekly Ops Briefing',
      actor: 'System',
      details: { period: briefing.period, ...briefing.summary },
    });

    return res.status(200).json({ success: true, briefing });
  } catch (err) {
    console.error('Briefing generation failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
