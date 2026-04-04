/**
 * Agent Task Decomposition
 * ========================
 * Takes a wishlist item or high-level task and breaks it into
 * ordered sub-tasks with dependency chains.
 *
 * Flow:
 * 1. Receives wishlist item or task description
 * 2. Calls AI to decompose into 3-7 concrete sub-tasks
 * 3. Creates global_tasks records with parent_task_id + depends_on + step_order
 * 4. Optionally auto-dispatches the first unblocked sub-task
 *
 * POST /api/agent/decompose
 * Body: { taskId?, wishlistId?, title, description, projectName, autoDispatch? }
 */

import { createClient } from '@supabase/supabase-js'
import { logTokenUsage } from '../lib/token-logger.js'

export const config = { maxDuration: 30 }

const DECOMPOSITION_PROMPT = `You are a task decomposition agent for Labno Labs.

Break the following task into 3-7 concrete, actionable sub-tasks that can each be completed independently by an AI agent.

RULES:
- Each sub-task must be self-contained and verifiable
- Order them by dependency (what must happen first)
- Mark which sub-tasks depend on which (by step number)
- Keep each sub-task focused on ONE thing
- Include a brief description of what "done" looks like for each

Respond ONLY with valid JSON in this exact format:
{
  "subtasks": [
    {
      "step": 1,
      "title": "Short action title",
      "description": "What to do and what done looks like",
      "depends_on_steps": [],
      "complexity": "low|medium|high"
    }
  ],
  "summary": "One sentence describing the overall goal"
}

TASK TO DECOMPOSE:
`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { taskId, wishlistId, title, description, projectName, projectId, autoDispatch } = req.body

  if (!title) return res.status(400).json({ error: 'title is required' })

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Build the decomposition prompt
  const taskDescription = [
    `Title: ${title}`,
    description ? `Description: ${description}` : '',
    projectName ? `Project: ${projectName}` : '',
  ].filter(Boolean).join('\n')

  const fullPrompt = DECOMPOSITION_PROMPT + taskDescription

  // Call AI for decomposition
  let subtasks, summary
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: fullPrompt }],
      }),
    })

    const data = await response.json()

    // Log token usage
    if (data.usage) {
      logTokenUsage({
        endpoint: '/api/agent/decompose',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        taskId: taskId || null,
        agentName: 'decompose-agent',
      })
    }

    // Parse the JSON response
    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'AI did not return valid JSON', raw: text })
    }

    const parsed = JSON.parse(jsonMatch[0])
    subtasks = parsed.subtasks
    summary = parsed.summary

    if (!subtasks || !Array.isArray(subtasks) || subtasks.length === 0) {
      return res.status(500).json({ error: 'No subtasks returned', raw: text })
    }
  } catch (err) {
    return res.status(500).json({ error: `Decomposition failed: ${err.message}` })
  }

  // Create parent task (or use existing taskId)
  let parentTaskId = taskId
  if (!parentTaskId) {
    const { data: parentTask, error: parentErr } = await supabase
      .from('global_tasks')
      .insert({
        title: title,
        description: summary || description,
        column_id: 'triage',
        project_id: projectId || null,
        source: wishlistId ? 'wishlist' : 'manual',
      })
      .select('id')
      .single()

    if (parentErr) return res.status(500).json({ error: `Failed to create parent task: ${parentErr.message}` })
    parentTaskId = parentTask.id
  }

  // Create sub-tasks with dependency chains
  const createdTasks = []
  const stepToTitle = {}

  for (const sub of subtasks) {
    stepToTitle[sub.step] = sub.title
  }

  for (const sub of subtasks) {
    // Build depends_on array from step references
    const dependsOn = (sub.depends_on_steps || [])
      .map(stepNum => stepToTitle[stepNum])
      .filter(Boolean)

    const isBlocked = dependsOn.length > 0

    const { data: created, error: createErr } = await supabase
      .from('global_tasks')
      .insert({
        title: sub.title,
        description: sub.description,
        column_id: 'backlog',
        project_id: projectId || null,
        parent_task_id: parentTaskId,
        step_order: sub.step,
        depends_on: JSON.stringify(dependsOn),
        is_blocked: isBlocked,
        blocked_reason: isBlocked ? `Waiting on: ${dependsOn.join(', ')}` : null,
        source: 'decomposition',
      })
      .select('id, title, step_order, is_blocked')
      .single()

    if (createErr) {
      console.error(`Failed to create subtask "${sub.title}":`, createErr.message)
      continue
    }

    createdTasks.push(created)
  }

  // Link wishlist item to parent task if applicable
  if (wishlistId) {
    await supabase
      .from('wishlist')
      .update({ status: 'Decomposed', linked_project_id: projectId })
      .eq('id', wishlistId)
  }

  // Auto-dispatch first unblocked sub-task if requested
  let dispatchedRun = null
  if (autoDispatch) {
    const firstUnblocked = createdTasks.find(t => !t.is_blocked)
    if (firstUnblocked) {
      try {
        const baseUrl = `https://${req.headers.host}`
        const dispatchRes = await fetch(`${baseUrl}/api/agent/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization || '',
          },
          body: JSON.stringify({
            taskId: firstUnblocked.id,
            taskTitle: firstUnblocked.title,
            projectName: projectName || 'Unassigned',
            context: `This is step ${firstUnblocked.step_order} of: "${title}"\n\n${description || ''}`,
          }),
        })
        dispatchedRun = await dispatchRes.json()
      } catch (err) {
        console.error('Auto-dispatch failed:', err.message)
      }
    }
  }

  return res.status(200).json({
    success: true,
    parentTaskId,
    subtasks: createdTasks,
    totalSubtasks: createdTasks.length,
    summary,
    dispatched: dispatchedRun,
  })
}
