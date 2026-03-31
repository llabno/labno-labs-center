import { createClient } from '@supabase/supabase-js'

// Vercel Cron: processes queued agent runs
// When ANTHROPIC_API_KEY is set, uses real Claude API
// Otherwise runs in simulation mode with realistic delays

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  // Verify cron secret or allow manual trigger
  const authHeader = req.headers.authorization
  if (req.method === 'GET' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow manual trigger without secret for now
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Fetch queued runs
  const { data: queuedRuns, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(3)

  if (error) return res.status(500).json({ error: error.message })
  if (!queuedRuns || queuedRuns.length === 0) {
    return res.status(200).json({ message: 'No queued runs', processed: 0 })
  }

  const results = []

  for (const run of queuedRuns) {
    // Mark as running
    await supabase.from('agent_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', run.id)

    try {
      let result

      if (process.env.ANTHROPIC_API_KEY) {
        // Real Claude API execution
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: `You are an autonomous agent working on a task for Labno Labs.

Task: ${run.task_title}
Project: ${run.project_name || 'Unassigned'}
Context: ${run.context || 'None'}

Analyze this task and provide:
1. A brief plan of action (3-5 steps)
2. Any blockers or dependencies
3. Estimated complexity (low/medium/high)
4. Recommended next steps

Be concise and actionable.`
            }]
          })
        })

        const data = await response.json()
        result = data.content?.[0]?.text || 'No response from Claude'
      } else {
        // Simulation mode — generate realistic output
        await new Promise(r => setTimeout(r, 1500))
        result = `[Simulation] Agent analyzed task: "${run.task_title}"

Plan:
1. Review current state of ${run.project_name || 'project'}
2. Identify dependencies and blockers
3. Execute primary implementation
4. Run validation checks
5. Update task status

Complexity: Medium
Status: Ready for execution when ANTHROPIC_API_KEY is configured.
Tip: Add ANTHROPIC_API_KEY to Vercel env vars to enable real Claude execution.`
      }

      // Mark completed
      await supabase.from('agent_runs')
        .update({
          status: 'completed',
          result,
          completed_at: new Date().toISOString()
        })
        .eq('id', run.id)

      // Move task to review
      if (run.task_id) {
        await supabase.from('global_tasks')
          .update({ column_id: 'review' })
          .eq('id', run.task_id)
      }

      results.push({ id: run.id, status: 'completed' })

    } catch (err) {
      await supabase.from('agent_runs')
        .update({
          status: 'failed',
          error: err.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', run.id)

      results.push({ id: run.id, status: 'failed', error: err.message })
    }
  }

  return res.status(200).json({ processed: results.length, results })
}
