import { createClient } from '@supabase/supabase-js'

// MOSO Bridge: syncs agent outputs from the MOSO Overseer system
// into the Labno Labs Center Supabase database.
//
// This endpoint accepts structured payloads from:
// 1. The Coach — Weekly Pulse, Pattern Alerts, Monthly Reports
// 2. The Chief — Morning Briefings, Communication Drafts
// 3. The Architect — Strategy outputs, client audits
// 4. Manual paste from Claude Code IDE (local sync)
//
// Two ways to use:
// A) POST from Apps Script (daily_briefing.js, etc.) → production automation
// B) POST from Claude Code CLI → local IDE integration
//
// Autonomy: A2 — syncs are autonomous, Lance reviews in the Dashboard.

export const config = { maxDuration: 30 }

const VALID_AGENTS = ['chief', 'coach', 'architect', 'voice', 'librarian', 'overseer']
const VALID_OUTPUT_TYPES = [
  // Coach
  'weekly_pulse', 'pattern_alert', 'monthly_report',
  // Chief
  'morning_briefing', 'communication_draft', 'calendar_defense',
  // Architect
  'client_audit', 'roadmap', 'strategy_brief',
  // Voice
  'content_draft', 'social_post',
  // Librarian
  'research_summary',
  // Overseer
  'system_audit', 'drift_check',
  // Generic
  'general'
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
  // Auth: accept bridge secret OR Supabase bearer token
  const authHeader = req.headers.authorization || ''
  const bridgeSecret = process.env.MOSO_BRIDGE_SECRET

  let authenticated = false

  // Check bridge secret (for Apps Script / CLI calls)
  if (bridgeSecret && authHeader === `Bearer ${bridgeSecret}`) {
    authenticated = true
  }

  // Check Supabase auth (for dashboard-initiated syncs)
  if (!authenticated && authHeader.startsWith('Bearer ')) {
    const supabaseAuth = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    )
    const { data: { user } } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''))
    if (user?.email?.endsWith('@labnolabs.com')) {
      authenticated = true
    }
  }

  if (!authenticated) {
    return res.status(401).json({ error: 'Unauthorized. Provide MOSO_BRIDGE_SECRET or valid Supabase token.' })
  }

  const { agent, output_type, title, content, metadata, energy_state, domains_active } = req.body

  // Validate required fields
  if (!agent || !output_type || !content) {
    return res.status(400).json({
      error: 'Missing required fields: agent, output_type, content',
      valid_agents: VALID_AGENTS,
      valid_output_types: VALID_OUTPUT_TYPES
    })
  }

  if (!VALID_AGENTS.includes(agent)) {
    return res.status(400).json({ error: `Invalid agent: ${agent}`, valid_agents: VALID_AGENTS })
  }

  if (!VALID_OUTPUT_TYPES.includes(output_type)) {
    return res.status(400).json({ error: `Invalid output_type: ${output_type}`, valid_output_types: VALID_OUTPUT_TYPES })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 1. Log to moso_sync_log (audit trail)
  const { data: syncEntry, error: syncErr } = await supabase.from('moso_sync_log').insert({
    agent,
    output_type,
    title: title || `${agent}/${output_type}`,
    content,
    metadata: metadata || {},
    energy_state: energy_state || null,
    domains_active: domains_active || [],
    synced_at: new Date().toISOString()
  }).select().single()

  if (syncErr) {
    return res.status(500).json({ error: 'Failed to write sync log', detail: syncErr.message })
  }

  // 2. Route to appropriate Supabase table based on output type
  const sideEffects = []

  // Coach pattern alerts → create agent_run record so it shows in Autonomous feed
  if (output_type === 'pattern_alert' || output_type === 'weekly_pulse' || output_type === 'monthly_report') {
    const { error: runErr } = await supabase.from('agent_runs').insert({
      task_id: null,
      task_title: `[MOSO Coach] ${title || output_type}`,
      project_name: 'MOSO Personal System',
      context: JSON.stringify({ agent, output_type, energy_state }),
      prompt: `MOSO Coach ${output_type} sync`,
      status: 'completed',
      result: content,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })
    if (!runErr) sideEffects.push('agent_runs')
  }

  // Chief morning briefings → create agent_run + optionally create tasks
  if (output_type === 'morning_briefing') {
    const { error: runErr } = await supabase.from('agent_runs').insert({
      task_id: null,
      task_title: `[MOSO Chief] Morning Briefing`,
      project_name: 'MOSO Personal System',
      context: JSON.stringify({ agent, energy_state, domains_active }),
      prompt: `MOSO Chief morning briefing sync`,
      status: 'completed',
      result: content,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })
    if (!runErr) sideEffects.push('agent_runs')
  }

  // Coach alerts with 🔴 level → also create a triage task for visibility
  if (output_type === 'pattern_alert' && content.includes('🔴')) {
    // Find or create the MOSO Personal System project
    let { data: mosoProject } = await supabase
      .from('internal_projects')
      .select('id')
      .eq('name', 'MOSO Personal System')
      .single()

    if (!mosoProject) {
      const { data: newProj } = await supabase.from('internal_projects').insert({
        name: 'MOSO Personal System',
        status: 'Active'
      }).select().single()
      mosoProject = newProj
    }

    if (mosoProject) {
      const { error: taskErr } = await supabase.from('global_tasks').insert({
        project_id: mosoProject.id,
        title: `🔴 Coach Alert: ${title || 'Pattern detected'}`,
        description: content,
        column_id: 'triage',
        assigned_to: 'lance'
      })
      if (!taskErr) sideEffects.push('global_tasks')
    }
  }

  // Oracle-worthy outputs → sync to oracle_sops for the Second Brain
  if (output_type === 'strategy_brief' || output_type === 'research_summary' || output_type === 'system_audit') {
    const { error: sopErr } = await supabase.from('oracle_sops').insert({
      title: `[${agent}] ${title || output_type}`,
      content,
      visibility: 'Private Brain (Internal Only)',
      status: 'Pending Approval',
      token_count: Math.ceil(content.length / 4)
    })
    if (!sopErr) sideEffects.push('oracle_sops')
  }

  return res.status(200).json({
    success: true,
    sync_id: syncEntry.id,
    agent,
    output_type,
    side_effects: sideEffects,
    message: `Synced ${agent}/${output_type} to Dashboard. ${sideEffects.length > 0 ? `Also wrote to: ${sideEffects.join(', ')}` : 'No side effects.'}`
  })
  } catch (err) {
    return res.status(500).json({ error: 'Bridge sync failed', detail: err.message })
  }
}
