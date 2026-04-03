// Database Backup Export API
// Exports all CRM data as JSON for disaster recovery
// Trigger manually or via cron

import { createClient } from '@supabase/supabase-js'
import { isLance } from '../lib/auth.js'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // When called by Vercel cron, verify CRON_SECRET
  if (req.query.cron === 'true') {
    const cronAuth = req.headers.authorization
    if (cronAuth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Invalid cron secret' })
    }
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' })
  }

  try {
    const tables = [
      'moso_clinical_leads',
      'labno_consulting_leads',
      'internal_projects',
      'global_tasks',
      'oracle_sops',
      'agent_runs',
      'reactivation_queue',
      'communication_log',
      'audit_log',
      'access_log'
    ]

    const backup = {
      exported_at: new Date().toISOString(),
      version: '1.0',
      tables: {}
    }

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*')
      if (error) {
        backup.tables[table] = { error: error.message, count: 0 }
      } else {
        backup.tables[table] = { count: data.length, data }
      }
    }

    const totalRecords = Object.values(backup.tables).reduce((s, t) => s + (t.count || 0), 0)
    backup.total_records = totalRecords

    // Return as downloadable JSON
    const filename = `labno-backup-${new Date().toISOString().split('T')[0]}.json`
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.status(200).json(backup)

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
