// Database Backup Export API — Enhanced Disaster Recovery
// Exports all data as JSON. Can store in Supabase Storage bucket.
// Trigger manually or via Vercel cron (daily recommended)
//
// GET /api/backup/export              → download JSON
// GET /api/backup/export?store=true   → save to Supabase Storage + return metadata
// GET /api/backup/export?cron=true    → cron trigger (requires CRON_SECRET)

import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Cron auth
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
    // All tables to back up — comprehensive list
    const tables = [
      // Core data
      'moso_clinical_leads',
      'labno_consulting_leads',
      'clients',
      'projects',
      'global_tasks',
      'oracle_sops',
      // Agent system
      'agent_runs',
      'moso_sync_log',
      // Clinical
      'soap_notes',
      'session_briefs',
      'exercise_library',
      'client_availability',
      // CRM & Sales
      'client_documents',
      'client_onboarding_submissions',
      'communication_log',
      'reactivation_queue',
      // Operations
      'wishlist',
      'activity_log',
      'pipeline_task_templates',
      'project_pipelines',
      // Billing
      'billing_sessions',
      'invoices',
      // Security
      'audit_log',
      'access_log',
      'token_usage_log',
    ]

    const backup = {
      exported_at: new Date().toISOString(),
      version: '2.0',
      source: 'labno-labs-center',
      supabase_project: 'jlvxubslxzwmzslvzgxs',
      tables: {},
      errors: [],
    }

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*')
        if (error) {
          backup.tables[table] = { count: 0, error: error.message }
          backup.errors.push(`${table}: ${error.message}`)
        } else {
          backup.tables[table] = { count: data?.length || 0, data: data || [] }
        }
      } catch (e) {
        backup.tables[table] = { count: 0, error: e.message }
        backup.errors.push(`${table}: ${e.message}`)
      }
    }

    const totalRecords = Object.values(backup.tables).reduce((s, t) => s + (t.count || 0), 0)
    backup.total_records = totalRecords
    backup.table_count = Object.keys(backup.tables).length
    backup.error_count = backup.errors.length

    const filename = `labno-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`

    // If store=true, save to Supabase Storage bucket "backups"
    if (req.query.store === 'true' || req.query.cron === 'true') {
      try {
        const jsonBlob = JSON.stringify(backup)
        const { error: uploadErr } = await supabase.storage
          .from('backups')
          .upload(filename, jsonBlob, {
            contentType: 'application/json',
            upsert: false,
          })

        if (uploadErr) {
          // Bucket may not exist — try to create it
          if (uploadErr.message?.includes('not found') || uploadErr.statusCode === 404) {
            await supabase.storage.createBucket('backups', { public: false })
            await supabase.storage.from('backups').upload(filename, jsonBlob, {
              contentType: 'application/json',
              upsert: false,
            })
          } else {
            backup.storage_error = uploadErr.message
          }
        }

        backup.stored_as = filename
        backup.storage_bucket = 'backups'

        // Clean up old backups — keep last 30
        const { data: files } = await supabase.storage.from('backups').list('', { limit: 100, sortBy: { column: 'created_at', order: 'asc' } })
        if (files && files.length > 30) {
          const toDelete = files.slice(0, files.length - 30).map(f => f.name)
          await supabase.storage.from('backups').remove(toDelete)
          backup.cleaned_up = toDelete.length
        }

        // Log the backup event
        await supabase.from('activity_log').insert({
          source_type: 'Task',
          title: `Database backup: ${totalRecords} records across ${backup.table_count} tables`,
          action: 'backup_completed',
          details: JSON.stringify({ filename, records: totalRecords, tables: backup.table_count, errors: backup.error_count }),
        }).catch(() => {})

        return res.status(200).json({
          success: true,
          filename,
          total_records: totalRecords,
          table_count: backup.table_count,
          error_count: backup.error_count,
          stored: true,
        })
      } catch (storeErr) {
        backup.storage_error = storeErr.message
      }
    }

    // Default: return as downloadable JSON
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.status(200).json(backup)

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
