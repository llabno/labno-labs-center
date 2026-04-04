import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import { callAnthropic } from '../lib/call-anthropic.js'

// Claude Agent SDK integration: trigger task execution from dashboard
// Routing modes:
//   AGENT_ROUTE=local  → local Claude CLI (Pro sub, free)
//   AGENT_ROUTE=api    → Anthropic API (paid per-token)
//   Neither → simulation mode

export const config = { maxDuration: 120 }

function getRouteMode() {
  const explicit = process.env.AGENT_ROUTE
  if (explicit === 'local') return 'local'
  if (explicit === 'api') return 'api'
  // Default to simulation — never spend money without explicit opt-in
  return 'simulation'
}

async function executeViaAPI(systemPrompt, userPrompt, taskId) {
  const { text } = await callAnthropic({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    endpoint: '/api/agent/sdk',
    agentName: 'sdk-agent',
    taskId,
  })
  return text || 'No response from Claude API'
}

function executeViaLocalCLI(systemPrompt, userPrompt) {
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`
  const escaped = fullPrompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')
  const result = execSync(
    `echo "${escaped}" | claude --print --model sonnet --output-format text`,
    { encoding: 'utf-8', timeout: 110000, maxBuffer: 1024 * 1024 }
  )
  return result.trim() || 'No response from local Claude CLI'
}

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

  const { taskId, taskTitle, projectName, context, autoExecute } = req.body
  if (!taskId || !taskTitle) return res.status(400).json({ error: 'taskId and taskTitle required' })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const routeMode = getRouteMode()

  const systemPrompt = `You are an autonomous agent for Labno Labs. You execute tasks for internal projects.
Your capabilities: code generation, data analysis, API integration, content creation, and task planning.
Always provide actionable output. If you cannot complete the task fully, provide a detailed plan with next steps.`

  const userPrompt = `Task: ${taskTitle}
Project: ${projectName || 'Unassigned'}
Context: ${context || 'None'}
Auto-execute: ${autoExecute ? 'Yes — take action and report results' : 'No — analyze and plan only'}

Provide:
1. Analysis of the task requirements
2. Step-by-step execution plan
3. ${autoExecute ? 'Execution results and output' : 'Dependencies and blockers'}
4. Recommended follow-up actions`

  // Insert run record
  const { data: run, error: insertErr } = await supabase.from('agent_runs').insert({
    task_id: taskId,
    task_title: taskTitle,
    project_name: projectName || null,
    context: context || '',
    prompt: userPrompt,
    status: 'running',
    started_at: new Date().toISOString()
  }).select().single()

  if (insertErr) return res.status(500).json({ error: 'Failed to create agent run' })

  // Move task to triage
  await supabase.from('global_tasks').update({ column_id: 'triage' }).eq('id', taskId)

  try {
    let result

    if (routeMode === 'local') {
      result = executeViaLocalCLI(systemPrompt, userPrompt)
    } else if (routeMode === 'api') {
      result = await executeViaAPI(systemPrompt, userPrompt, taskId)
    } else {
      await new Promise(r => setTimeout(r, 1000))
      result = `[Simulation] Analyzed: "${taskTitle}"

Plan:
1. Parse task requirements for ${projectName || 'project'}
2. Identify code/data dependencies
3. Execute primary implementation steps
4. Validate output and update status

Route: Set AGENT_ROUTE=local (free, uses Claude Pro) or AGENT_ROUTE=api (paid, uses API key).`
    }

    result = `[Route: ${routeMode}]\n${result}`

    // Update run as completed
    await supabase.from('agent_runs').update({
      status: 'completed',
      result,
      completed_at: new Date().toISOString()
    }).eq('id', run.id)

    // Move task to review
    await supabase.from('global_tasks').update({ column_id: 'review' }).eq('id', taskId)

    return res.status(200).json({ success: true, runId: run.id, route: routeMode, result })
  } catch (err) {
    await supabase.from('agent_runs').update({
      status: 'failed',
      error: 'Agent execution failed',
      completed_at: new Date().toISOString()
    }).eq('id', run.id)

    return res.status(500).json({ error: 'Agent execution failed', runId: run.id, route: routeMode })
  }
}
