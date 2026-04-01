import { createClient } from '@supabase/supabase-js'

// Claude Agent SDK integration: trigger task execution from dashboard
// Uses Claude API to analyze and execute tasks autonomously

export const config = { maxDuration: 120 }

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

  // Build detailed prompt from task metadata
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

    if (process.env.ANTHROPIC_API_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        })
      })

      const data = await response.json()
      result = data.content?.[0]?.text || JSON.stringify(data)
    } else {
      // Simulation mode
      await new Promise(r => setTimeout(r, 1000))
      result = `[SDK Agent] Analyzed: "${taskTitle}"

Plan:
1. Parse task requirements for ${projectName || 'project'}
2. Identify code/data dependencies
3. Execute primary implementation steps
4. Validate output and update status

Status: Ready for real execution — set ANTHROPIC_API_KEY in Vercel env vars.`
    }

    // Update run as completed
    await supabase.from('agent_runs').update({
      status: 'completed',
      result,
      completed_at: new Date().toISOString()
    }).eq('id', run.id)

    // Move task to review
    await supabase.from('global_tasks').update({ column_id: 'review' }).eq('id', taskId)

    return res.status(200).json({ success: true, runId: run.id, result })
  } catch (err) {
    await supabase.from('agent_runs').update({
      status: 'failed',
      error: 'Agent execution failed',
      completed_at: new Date().toISOString()
    }).eq('id', run.id)

    return res.status(500).json({ error: 'Agent execution failed', runId: run.id })
  }
}
