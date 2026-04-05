import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Stale task cleanup — moves tasks older than 30 days in triage to backlog.
 * GET /api/tasks/cleanup (call via cron or manually)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;
  if (!apiKey && !authHeader) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    // Find stale tasks in triage
    const { data: staleTasks, error } = await supabase
      .from('global_tasks')
      .select('id, title, created_at')
      .eq('column_id', 'triage')
      .lt('created_at', thirtyDaysAgo);

    if (error) return res.status(500).json({ error: error.message });

    if (staleTasks && staleTasks.length > 0) {
      const ids = staleTasks.map(t => t.id);
      await supabase.from('global_tasks').update({ column_id: 'backlog' }).in('id', ids);

      await supabase.from('activity_feed').insert({
        action: 'stale_task_cleanup',
        entity_type: 'system',
        entity_name: `${staleTasks.length} stale tasks moved to backlog`,
        actor: 'System',
        details: { count: staleTasks.length, task_titles: staleTasks.map(t => t.title).slice(0, 10) },
      });
    }

    return res.status(200).json({
      success: true,
      cleaned: staleTasks?.length || 0,
      tasks: (staleTasks || []).map(t => ({ id: t.id, title: t.title })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
