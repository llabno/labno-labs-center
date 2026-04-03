import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import { logTokenUsage } from '../lib/token-logger.js'

// Vercel Cron: processes queued agent runs
// Routing modes:
//   AGENT_ROUTE=local  → spawns local Claude CLI (Pro sub, no API cost)
//   AGENT_ROUTE=api    → uses Anthropic API (paid per-token)
//   ANTHROPIC_API_KEY set without AGENT_ROUTE → defaults to api
//   Neither set → simulation mode

export const config = { maxDuration: 60 }

function getRouteMode() {
  const explicit = process.env.AGENT_ROUTE
  if (explicit === 'local') return 'local'
  if (explicit === 'api' || process.env.ANTHROPIC_API_KEY) return 'api'
  return 'simulation'
}

function buildAgentPrompt(run) {
  return `You are an autonomous agent working on a task for Labno Labs.

Task: ${run.task_title}
Project: ${run.project_name || 'Unassigned'}
Context: ${run.context || 'None'}

Analyze this task and provide:
1. A brief plan of action (3-5 steps)
2. Any blockers or dependencies
3. Estimated complexity (low/medium/high)
4. Recommended next steps

Be concise and actionable.`
}

async function executeViaAPI(prompt, taskId) {
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
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const data = await response.json()
  if (data.usage) {
    logTokenUsage({
      endpoint: '/api/agent/process',
      model: 'claude-sonnet-4-20250514',
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      taskId,
      agentName: 'process-agent',
    })
  }
  return data.content?.[0]?.text || 'No response from Claude API'
}

function executeViaLocalCLI(prompt) {
  // Pipes prompt through local Claude CLI using Pro subscription
  // Uses --print flag for non-interactive single-shot execution
  const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')
  const result = execSync(
    `echo "${escaped}" | claude --print --model sonnet --output-format text`,
    { encoding: 'utf-8', timeout: 55000, maxBuffer: 1024 * 1024 }
  )
  return result.trim() || 'No response from local Claude CLI'
}

function executeSimulation(run) {
  return `[Simulation] Agent analyzed task: "${run.task_title}"

Plan:
1. Review current state of ${run.project_name || 'project'}
2. Identify dependencies and blockers
3. Execute primary implementation
4. Run validation checks
5. Update task status

Complexity: Medium
Route: Set AGENT_ROUTE=local (free, uses Claude Pro) or AGENT_ROUTE=api (paid, uses API key).`
}

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

  const routeMode = getRouteMode()

  // Fetch queued runs
  const { data: queuedRuns, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(3)

  if (error) return res.status(500).json({ error: error.message })
  if (!queuedRuns || queuedRuns.length === 0) {
    return res.status(200).json({ message: 'No queued runs', processed: 0, route: routeMode })
  }

  const results = []

  for (const run of queuedRuns) {
    // Re-check if the associated task is blocked before processing
    if (run.task_id) {
      const { data: task } = await supabase
        .from('global_tasks')
        .select('is_blocked, title')
        .eq('id', run.task_id)
        .single()

      if (task?.is_blocked) {
        console.log(`Skipping blocked task: ${task.title || run.task_title}`)
        results.push({ id: run.id, status: 'skipped', reason: 'blocked' })
        continue
      }
    }

    // Mark as running
    await supabase.from('agent_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', run.id)

    try {
      let result
      const prompt = buildAgentPrompt(run)

      if (routeMode === 'local') {
        result = executeViaLocalCLI(prompt)
      } else if (routeMode === 'api') {
        result = await executeViaAPI(prompt, run.task_id)
      } else {
        await new Promise(r => setTimeout(r, 1500))
        result = executeSimulation(run)
      }

      // Tag the result with routing info
      result = `[Route: ${routeMode}]\n${result}`

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

      results.push({ id: run.id, status: 'completed', route: routeMode })

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

  return res.status(200).json({ processed: results.length, route: routeMode, results })
}
