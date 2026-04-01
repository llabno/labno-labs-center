import { createClient } from '@supabase/supabase-js'

// Agent status webhook: receives progress updates from running agents
// Writes status to agent_runs table for real-time dashboard updates via Supabase Realtime

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify Supabase auth
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const { createClient: createAuthClient } = await import('@supabase/supabase-js')
  const supabaseAuth = createAuthClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  )
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { runId, status, progress, output, error: agentError } = req.body
  if (!runId) return res.status(400).json({ error: 'runId required' })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const update = {}

  if (status) update.status = status
  if (progress !== undefined) update.progress = progress
  if (output) update.result = output
  if (agentError) update.error = agentError

  if (status === 'running' && !update.started_at) {
    update.started_at = new Date().toISOString()
  }
  if (status === 'completed' || status === 'failed') {
    update.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('agent_runs')
    .update(update)
    .eq('id', runId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: 'Failed to update agent run' })

  // If completed, move the associated task to review
  if (status === 'completed' && data?.task_id) {
    await supabase.from('global_tasks')
      .update({ column_id: 'review' })
      .eq('id', data.task_id)
  }

  return res.status(200).json({ success: true, run: data })
}
