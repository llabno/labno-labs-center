// Auto-log task queue status changes and other work events to work_history
// Called from the dashboard when task statuses change

import { createClient } from '@supabase/supabase-js'
import { isLance, isEmployee } from '../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  const anonClient = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  )

  let userEmail
  try {
    const { data: { user }, error } = await anonClient.auth.getUser(authHeader.split(' ')[1])
    if (error || !user) return res.status(401).json({ error: 'Invalid token' })
    userEmail = user.email
  } catch {
    return res.status(401).json({ error: 'Token verification failed' })
  }

  if (!isEmployee(userEmail)) return res.status(403).json({ error: 'Access denied' })

  const { task_title, project_name, category, status, notes, agent_or_mcp, files_changed, lines_added, lines_removed } = req.body
  if (!task_title) return res.status(400).json({ error: 'task_title required' })

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const displayName = isLance(userEmail) ? 'Lance' : userEmail.split('@')[0]

  const { data, error } = await supabase.from('work_history').insert({
    task_title,
    project_name: project_name || 'Labno Labs System',
    requested_by: displayName,
    executed_by: agent_or_mcp ? 'Claude Code' : displayName,
    agent_or_mcp: agent_or_mcp || 'Manual',
    category: category || 'Feature',
    status: status || 'completed',
    notes: notes || null,
    files_changed: files_changed || null,
    lines_added: lines_added || null,
    lines_removed: lines_removed || null,
  }).select('id').single()

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ logged: true, id: data.id })
}
