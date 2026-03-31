import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { taskId, taskTitle, projectName, context } = req.body
  if (!taskId || !taskTitle) return res.status(400).json({ error: 'taskId and taskTitle required' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  )

  const prompt = `Execute task: ${taskTitle}\nProject: ${projectName || 'Unassigned'}\nContext: ${context || 'None'}`

  const { data, error } = await supabase.from('agent_runs').insert({
    task_id: taskId,
    task_title: taskTitle,
    project_name: projectName || null,
    context: context || '',
    prompt,
    status: 'queued'
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })

  // Move task to triage to indicate it's being worked on
  await supabase.from('global_tasks').update({ column_id: 'triage' }).eq('id', taskId)

  // Trigger the processor immediately (don't wait for cron)
  try {
    const baseUrl = `https://${req.headers.host}`
    fetch(`${baseUrl}/api/agent/process`, { method: 'GET', headers: { Authorization: `Bearer ${process.env.CRON_SECRET || 'manual'}` } }).catch(() => {})
  } catch (e) { /* fire and forget */ }

  return res.status(200).json({ success: true, runId: data.id, status: 'queued' })
}
