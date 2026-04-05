import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import { PRICING } from '../lib/token-logger.js'
import { checkBudget } from '../lib/budget-enforcer.js'
import { callAnthropic } from '../lib/call-anthropic.js'

// Vercel Cron: processes queued agent runs
// Routing modes:
//   AGENT_ROUTE=local  → spawns local Claude CLI (Pro sub, no API cost)
//   AGENT_ROUTE=api    → uses Anthropic API (paid per-token)
//   ANTHROPIC_API_KEY set without AGENT_ROUTE → defaults to api
//   Neither set → error (no silent simulation)

export const config = { maxDuration: 60 }

function getRouteMode() {
  const explicit = process.env.AGENT_ROUTE
  if (explicit === 'local') return 'local'
  if (explicit === 'api') return 'api'
  // No simulation — if AGENT_ROUTE is not set, that's an error.
  // Tasks should never silently fake results.
  return 'error'
}

async function buildAgentPrompt(run, supabase) {
  let siblingContext = ''

  // If this task has a parent, pull completed sibling results for context sharing
  if (run.task_id) {
    const { data: thisTask } = await supabase
      .from('global_tasks')
      .select('parent_task_id, step_order')
      .eq('id', run.task_id)
      .single()

    if (thisTask?.parent_task_id) {
      // Get completed sibling tasks and their agent run results
      const { data: siblings } = await supabase
        .from('global_tasks')
        .select('id, title, step_order')
        .eq('parent_task_id', thisTask.parent_task_id)
        .eq('column_id', 'completed')
        .order('step_order', { ascending: true })

      if (siblings && siblings.length > 0) {
        const siblingIds = siblings.map(s => s.id)
        const { data: siblingRuns } = await supabase
          .from('agent_runs')
          .select('task_id, task_title, result')
          .in('task_id', siblingIds)
          .eq('status', 'completed')
          .order('completed_at', { ascending: true })

        if (siblingRuns && siblingRuns.length > 0) {
          siblingContext = '\n\n## Prior Steps Completed\n' +
            siblingRuns.map(r =>
              `### ${r.task_title}\n${(r.result || '').substring(0, 500)}`
            ).join('\n\n')
        }
      }
    }
  }

  return `You are an autonomous agent working on a task for Labno Labs.

Task: ${run.task_title}
Project: ${run.project_name || 'Unassigned'}
Context: ${run.context || 'None'}
${siblingContext}

Execute this task. Provide:
1. What you did (concrete actions taken)
2. Results and outputs
3. Any issues encountered
4. What the next step should be

Respond with actionable results, not plans. Be concise.`
}

async function executeViaAPI(prompt, taskId) {
  const { text, usage } = await callAnthropic({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
    endpoint: '/api/agent/process',
    agentName: 'process-agent',
    taskId,
  })

  // Calculate cost using Haiku rates: input $0.80/M, output $4.00/M
  const inputTokens = usage?.input_tokens || 0
  const outputTokens = usage?.output_tokens || 0
  const costUsd = (inputTokens * 0.80 + outputTokens * 4.00) / 1_000_000

  return {
    text: text || 'No response from Claude API',
    inputTokens,
    outputTokens,
    costUsd,
  }
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

function buildRoutingError(run) {
  return `[ERROR] AGENT_ROUTE is not configured. Task "${run.task_title}" was NOT executed.

ACTION REQUIRED: Set AGENT_ROUTE in Vercel Environment Variables.
  - Go to Vercel Dashboard → Project → Settings → Environment Variables
  - Add: AGENT_ROUTE=api (uses Anthropic API, paid per-token)
  - Or: AGENT_ROUTE=local (uses local Claude CLI, free with Pro subscription)
  - Redeploy after adding the variable.

This task has been marked as FAILED and will appear in your Today dashboard pending actions.`
}

/**
 * Auto-chain: After a sub-task completes, refresh blocked status
 * and auto-dispatch the next unblocked sibling task.
 * This is how agents "talk to each other" — output from step N
 * becomes context for step N+1 via buildAgentPrompt's sibling injection.
 */
async function autoChainNext(supabase, completedTaskId, projectName, req) {
  try {
    // Get the completed task to find its parent
    const { data: completedTask } = await supabase
      .from('global_tasks')
      .select('parent_task_id, title')
      .eq('id', completedTaskId)
      .single()

    if (!completedTask?.parent_task_id) return // Not a sub-task, nothing to chain

    // Mark this task as completed so refresh_blocked_status() picks it up
    await supabase.from('global_tasks')
      .update({ column_id: 'completed' })
      .eq('id', completedTaskId)

    // Refresh blocked status for all tasks (triggers the DB function)
    await supabase.rpc('refresh_blocked_status')

    // Find the next unblocked sibling that hasn't been dispatched yet
    const { data: nextTask } = await supabase
      .from('global_tasks')
      .select('id, title, step_order, description')
      .eq('parent_task_id', completedTask.parent_task_id)
      .eq('is_blocked', false)
      .in('column_id', ['backlog'])
      .order('step_order', { ascending: true })
      .limit(1)
      .single()

    if (!nextTask) return // No more tasks to chain

    // Auto-dispatch the next task
    const baseUrl = `https://${req.headers.host}`
    fetch(`${baseUrl}/api/agent/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: nextTask.id,
        taskTitle: nextTask.title,
        projectName: projectName || 'Unassigned',
        context: nextTask.description || '',
      }),
    }).catch(err => console.error('Auto-chain dispatch failed:', err.message))

    console.log(`[auto-chain] Dispatched next task: "${nextTask.title}" (step ${nextTask.step_order})`)
  } catch (err) {
    console.error('[auto-chain] Error:', err.message)
  }
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

    // Budget enforcement — check before spending any tokens
    if (routeMode === 'api') {
      const prompt = await buildAgentPrompt(run, supabase)
      const estimatedInputTokens = Math.ceil(prompt.length / 4)
      const model = 'claude-haiku-4-5-20251001'
      const rates = PRICING[model] || { input: 0.80, output: 4.00 }
      const estimatedCost = (estimatedInputTokens * rates.input + 512 * rates.output) / 1_000_000

      const budgetCheck = await checkBudget({
        agentName: run.agent_name || 'process-agent',
        estimatedCostUsd: estimatedCost,
      })

      if (!budgetCheck.allowed) {
        console.warn(`[process] Budget blocked for run ${run.id}: ${budgetCheck.reason}`)
        await supabase.from('agent_runs')
          .update({
            status: 'failed',
            error: `Budget enforcement: ${budgetCheck.reason}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', run.id)
        results.push({ id: run.id, status: 'budget_blocked', reason: budgetCheck.reason })
        continue
      }

      if (budgetCheck.alert) {
        console.warn(`[process] ${budgetCheck.alertMessage}`)
      }
    }

    // Mark as running
    await supabase.from('agent_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', run.id)

    try {
      let result
      const prompt = await buildAgentPrompt(run, supabase)
      const taskTitle = (run.task_title || '').toLowerCase()

      // Special routing: Sniper tasks go to the dedicated blog generation endpoint
      if (taskTitle.includes('sniper') && taskTitle.includes('blog')) {
        try {
          const baseUrl = `https://${req.headers.host}`
          const sniperRes = await fetch(`${baseUrl}/api/sniper/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization || '' },
            body: JSON.stringify({ soap_note: run.context || prompt }),
          })
          const sniperData = await sniperRes.json()
          result = sniperData.blog_post || sniperData.error || JSON.stringify(sniperData)
        } catch (sniperErr) {
          result = `Sniper routing failed: ${sniperErr.message}. Falling back to generic agent.`
          // Fall through to generic processing
          if (routeMode === 'api') {
            const apiResult = await executeViaAPI(prompt, run.task_id)
            result = apiResult.text
            run._tokenMeta = { input: apiResult.inputTokens, output: apiResult.outputTokens, cost_usd: apiResult.costUsd }
          }
        }
      } else if (routeMode === 'local') {
        result = executeViaLocalCLI(prompt)
      } else if (routeMode === 'api') {
        const apiResult = await executeViaAPI(prompt, run.task_id)
        result = apiResult.text
        run._tokenMeta = { input: apiResult.inputTokens, output: apiResult.outputTokens, cost_usd: apiResult.costUsd }
      } else {
        // No valid route configured — fail the task loudly
        const errorMsg = buildRoutingError(run)
        await supabase.from('agent_runs')
          .update({
            status: 'failed',
            error: 'AGENT_ROUTE not configured. Set AGENT_ROUTE=api or AGENT_ROUTE=local in Vercel env vars.',
            result: errorMsg,
            completed_at: new Date().toISOString()
          })
          .eq('id', run.id)
        results.push({ id: run.id, status: 'failed', error: 'AGENT_ROUTE not configured' })
        continue
      }

      // Tag the result with routing info
      result = `[Route: ${routeMode}]\n${result}`

      // Append token usage metadata as JSON block if available
      if (run._tokenMeta) {
        const meta = run._tokenMeta
        result += `\n\n---\n${JSON.stringify({ tokens: { input: meta.input, output: meta.output }, cost_usd: parseFloat(meta.cost_usd.toFixed(6)) })}`
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

        // Auto-chain: if this task is a sub-task, refresh blocked status
        // and queue the next unblocked sibling
        await autoChainNext(supabase, run.task_id, run.project_name, req)
      }

      // Log to activity_log so Work History picks it up
      await supabase.from('activity_log').insert({
        source_type: 'Task',
        title: `Agent completed: ${run.task_title}`,
        description: result?.slice(0, 500) || 'No output',
        action: 'agent_completed',
        project: run.project_name || null,
        details: JSON.stringify({ run_id: run.id, route: routeMode, task_id: run.task_id }),
      }).then(() => {}).catch(() => {}) // graceful — table may not exist yet

      // If task came from wishlist, auto-mark wishlist item as done
      if (run.task_id) {
        await supabase.from('wishlist')
          .update({ status: 'Done', dispatched_at: new Date().toISOString() })
          .eq('id', run.task_id)
          .then(() => {}).catch(() => {})
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
