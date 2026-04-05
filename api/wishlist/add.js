import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * POST /api/wishlist/add
 * Add items to the Wishlist from external sources (email, Claude, Gemini, CLI).
 *
 * Body: { name: string, description?: string, source?: string, source_name?: string, priority?: number }
 * Headers: x-api-key: CRON_SECRET (for automated sources) OR Authorization: Bearer <token>
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Auth: either API key or Bearer token
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];

  if (apiKey !== process.env.CRON_SECRET) {
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized. Provide x-api-key or Bearer token.' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });
  }

  const { name, description, source, source_name, priority, venture } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  // Create project in "Planning" status
  const { data: project, error: projErr } = await supabase.from('projects').insert({
    name: name.trim(),
    status: 'Planning',
    project_type: 'internal',
    venture: venture || null,
    complexity: priority || 1,
    total_tasks: 0,
    completed_tasks: 0,
  }).select().single();

  if (projErr) return res.status(500).json({ error: projErr.message });

  // Optionally create a task with source metadata
  if (description || source) {
    await supabase.from('global_tasks').insert({
      title: description || `Review: ${name}`,
      project_id: project.id,
      column_id: 'backlog',
      assigned_to: 'lance',
      source_type: source || 'external',
      source_name: source_name || null,
    });
  }

  // Log activity
  await supabase.from('activity_feed').insert({
    action: 'wishlist_added',
    entity_type: 'project',
    entity_id: project.id,
    entity_name: name,
    actor: source_name || 'External',
    details: { source, source_name },
  });

  return res.status(200).json({ success: true, project_id: project.id, name });
}
