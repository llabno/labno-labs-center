import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Daily Ops Briefing — generates a morning summary of today's ops.
 * Can be called via cron (daily 7am) or manually.
 * GET /api/briefing/daily
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  // Auth: cron secret or bearer token
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  if (!apiKey && !authHeader) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Determine greeting based on hour
    const hour = now.getHours();
    let greeting;
    if (hour < 12) greeting = 'Good morning, Lance';
    else if (hour < 17) greeting = 'Good afternoon, Lance';
    else greeting = 'Good evening, Lance';

    // Fetch all data in parallel
    const [sessionsRes, unbilledRes, newTasksRes, wishlistRes, overdueRes] = await Promise.all([
      // 1. Today's sessions
      supabase
        .from('session_briefs')
        .select('*')
        .eq('session_date', todayStr)
        .order('session_date', { ascending: true }),

      // 2. Unbilled SOAP notes
      supabase
        .from('soap_notes')
        .select('id', { count: 'exact', head: true })
        .eq('billing_status', 'pending'),

      // 3. New tasks in triage (last 24 hours)
      supabase
        .from('global_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('column_id', 'triage')
        .gte('created_at', twentyFourHoursAgo),

      // 4. New wishlist items
      supabase
        .from('wishlist')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'New Idea'),

      // 5. Overdue tasks
      supabase
        .from('global_tasks')
        .select('id', { count: 'exact', head: true })
        .lt('due_date', todayStr)
        .neq('column_id', 'done'),
    ]);

    const sessionsToday = sessionsRes.data || [];
    const unbilledSoaps = unbilledRes.count || 0;
    const newTasks = newTasksRes.count || 0;
    const newIdeas = wishlistRes.count || 0;
    const overdueTasks = overdueRes.count || 0;

    // Build summary sentence
    const parts = [];
    parts.push(`You have ${sessionsToday.length} session${sessionsToday.length !== 1 ? 's' : ''} today`);
    if (unbilledSoaps > 0) parts.push(`${unbilledSoaps} unbilled`);
    if (newTasks > 0) parts.push(`${newTasks} new task${newTasks !== 1 ? 's' : ''}`);
    if (overdueTasks > 0) parts.push(`${overdueTasks} overdue`);
    const summary = parts.join(', ') + '.';

    const briefing = {
      date: todayStr,
      greeting,
      sessions_today: sessionsToday,
      counts: {
        unbilled_soaps: unbilledSoaps,
        new_tasks: newTasks,
        new_ideas: newIdeas,
        overdue_tasks: overdueTasks,
      },
      summary,
    };

    // Log the briefing generation
    await supabase.from('activity_feed').insert({
      action: 'briefing_generated',
      entity_type: 'system',
      entity_name: 'Daily Ops Briefing',
      actor: 'System',
      details: { date: todayStr, ...briefing.counts, sessions: sessionsToday.length },
    });

    return res.status(200).json({ success: true, briefing });
  } catch (err) {
    console.error('Daily briefing generation failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
