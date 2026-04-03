// GitHub Webhook: auto-log pushes to work_history
// Set up in GitHub repo Settings > Webhooks:
//   URL: https://labno-labs-center.vercel.app/api/hooks/github-push
//   Content type: application/json
//   Secret: (use GITHUB_WEBHOOK_SECRET env var)
//   Events: Just the push event

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify GitHub signature
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (secret) {
    const sig = req.headers['x-hub-signature-256']
    const body = JSON.stringify(req.body)
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
    if (sig !== expected) return res.status(401).json({ error: 'Invalid signature' })
  }

  const event = req.headers['x-github-event']
  if (event !== 'push') return res.status(200).json({ skipped: true, reason: `Event ${event} not tracked` })

  const payload = req.body
  const commits = payload.commits || []
  if (commits.length === 0) return res.status(200).json({ skipped: true, reason: 'No commits' })

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const branch = (payload.ref || '').replace('refs/heads/', '')
  const pusher = payload.pusher?.name || 'unknown'
  const repo = payload.repository?.name || 'unknown'

  const rows = commits.map(commit => {
    // Parse commit stats
    const added = (commit.added || []).length
    const modified = (commit.modified || []).length
    const removed = (commit.removed || []).length
    const filesChanged = added + modified + removed

    // Detect author — check for Co-Authored-By
    const msg = commit.message || ''
    const isClaudeAuthored = msg.includes('Co-Authored-By: Claude')
    const authorName = commit.author?.name || pusher

    // Infer category from commit message prefix
    let category = 'Feature'
    const lower = msg.toLowerCase()
    if (lower.startsWith('fix')) category = 'Bug Fix'
    else if (lower.startsWith('feat')) category = 'Feature'
    else if (lower.includes('ui') || lower.includes('ux') || lower.includes('style')) category = 'UI/UX'
    else if (lower.includes('infra') || lower.includes('ci') || lower.includes('deploy')) category = 'Infrastructure'
    else if (lower.includes('devops') || lower.includes('docker') || lower.includes('devcontainer')) category = 'DevOps'
    else if (lower.includes('auth') || lower.includes('rls') || lower.includes('security')) category = 'Auth'
    else if (lower.includes('integration') || lower.includes('webhook') || lower.includes('api')) category = 'Integration'
    else if (lower.includes('hipaa') || lower.includes('compliance') || lower.includes('audit')) category = 'Compliance'

    // First line of commit message as title
    const title = msg.split('\n')[0].substring(0, 200)

    // Full message minus co-author line as notes
    const notes = msg.split('\n').filter(l => !l.includes('Co-Authored-By:')).join('\n').trim()

    return {
      task_title: title,
      project_name: repo,
      requested_by: isClaudeAuthored ? 'Lance' : authorName,
      executed_by: isClaudeAuthored ? 'Claude Code' : authorName,
      agent_or_mcp: isClaudeAuthored ? 'Claude Opus' : 'Manual',
      category,
      status: 'completed',
      duration_minutes: null,
      notes: notes.length > 500 ? notes.substring(0, 500) + '...' : notes,
      files_changed: filesChanged,
      lines_added: null,
      lines_removed: null,
    }
  })

  const { data, error } = await supabase.from('work_history').insert(rows).select('id')

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({
    logged: rows.length,
    branch,
    ids: (data || []).map(r => r.id),
  })
}
