import { createClient } from '@supabase/supabase-js'

// Google Cloud Run integration: spawn heavier agent workloads
// Falls back to local Vercel execution if Cloud Run is not configured

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify Supabase auth
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const supabaseAuth = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  )
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { taskId, taskTitle, projectName, context, workloadType } = req.body
  if (!taskId || !taskTitle) return res.status(400).json({ error: 'taskId and taskTitle required' })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Insert agent run record
  const { data: run, error: insertErr } = await supabase.from('agent_runs').insert({
    task_id: taskId,
    task_title: taskTitle,
    project_name: projectName || null,
    context: JSON.stringify({ workloadType: workloadType || 'standard', runtime: 'cloud-run', ...JSON.parse(context || '{}') }),
    prompt: `[Cloud Run] Execute: ${taskTitle}`,
    status: 'queued'
  }).select().single()

  if (insertErr) return res.status(500).json({ error: 'Failed to create agent run' })

  const cloudRunUrl = process.env.CLOUD_RUN_AGENT_URL
  const cloudRunToken = process.env.CLOUD_RUN_AUTH_TOKEN

  if (cloudRunUrl) {
    // Dispatch to Cloud Run
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (cloudRunToken) headers['Authorization'] = `Bearer ${cloudRunToken}`

      const cloudRes = await fetch(cloudRunUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          runId: run.id,
          taskId,
          taskTitle,
          projectName,
          context,
          workloadType: workloadType || 'standard',
          webhookUrl: `https://${req.headers.host}/api/agent/webhook`
        })
      })

      if (!cloudRes.ok) throw new Error(`Cloud Run returned ${cloudRes.status}`)

      await supabase.from('agent_runs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', run.id)

      return res.status(200).json({ success: true, runId: run.id, runtime: 'cloud-run', status: 'dispatched' })
    } catch (err) {
      // Fall back to local processing
      console.warn('Cloud Run dispatch failed, falling back to local')
    }
  }

  // Fallback: trigger local Vercel processor
  try {
    const baseUrl = `https://${req.headers.host}`
    fetch(`${baseUrl}/api/agent/process`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET || 'manual'}` }
    }).catch(() => {})
  } catch (e) { /* fire and forget */ }

  return res.status(200).json({
    success: true,
    runId: run.id,
    runtime: cloudRunUrl ? 'cloud-run-fallback' : 'vercel-local',
    status: 'queued',
    note: !cloudRunUrl ? 'Set CLOUD_RUN_AGENT_URL and CLOUD_RUN_AUTH_TOKEN env vars to enable Cloud Run dispatch' : undefined
  })
}
