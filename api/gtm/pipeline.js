// GTM Full Pipeline Orchestrator
// Runs the complete Layer 2→3→4 pipeline in sequence:
// 1. Parse unparsed reviews and job postings (Layer 2)
// 2. Score all companies with new signals (Layer 3)
// 3. Generate dossiers for high-intent accounts (Layer 4)
//
// Can be triggered via Vercel cron or dashboard button.
// Does NOT handle Layer 1 ingestion (that's webhook-driven from Apify/Bright Data).

import { authenticateRequest } from './lib/webhook-auth.js'
import { createAuthClient, createServiceClient } from './lib/supabase.js'

const PIPELINE_BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const startTime = Date.now()
  const supabaseAuth = createAuthClient()
  const auth = await authenticateRequest(req, supabaseAuth)
  if (!auth.valid) return res.status(401).json({ error: auth.error })

  const supabase = createServiceClient()
  const authHeader = req.headers.authorization
  const results = { layer2: null, layer3: null, layer4: null, errors: [] }

  try {
    // Layer 2: Parse reviews
    try {
      const parseReviews = await callInternal('/api/gtm/parse/reviews', { source: 'all' }, authHeader)
      results.layer2 = { reviews: parseReviews }
    } catch (err) {
      results.errors.push({ layer: 2, step: 'reviews', error: err.message })
    }

    // Layer 2: Parse jobs
    try {
      const parseJobs = await callInternal('/api/gtm/parse/jobs', {}, authHeader)
      if (results.layer2) results.layer2.jobs = parseJobs
      else results.layer2 = { jobs: parseJobs }
    } catch (err) {
      results.errors.push({ layer: 2, step: 'jobs', error: err.message })
    }

    // Layer 3: Score
    try {
      const score = await callInternal('/api/gtm/score', {}, authHeader)
      results.layer3 = score
    } catch (err) {
      results.errors.push({ layer: 3, error: err.message })
    }

    // Layer 4: Generate dossiers for new high-intent accounts
    try {
      const { data: highIntent } = await supabase
        .from('gtm_intent_scores')
        .select('company_name, composite_score, score_tier')
        .gte('composite_score', 70)
        .order('composite_score', { ascending: false })
        .limit(10)

      const dossiers = []
      for (const account of (highIntent || [])) {
        try {
          const dossier = await callInternal('/api/gtm/dossier', { company_name: account.company_name }, authHeader)
          dossiers.push({ company: account.company_name, score: account.composite_score, success: true })
        } catch (err) {
          dossiers.push({ company: account.company_name, score: account.composite_score, error: err.message })
        }
      }
      results.layer4 = { dossiers_generated: dossiers.length, accounts: dossiers }
    } catch (err) {
      results.errors.push({ layer: 4, error: err.message })
    }

    const duration_ms = Date.now() - startTime

    await supabase.from('gtm_agent_actions').insert({
      action_type: 'pipeline_run',
      target_company: 'full_pipeline',
      action_details: { ...results, duration_ms },
      requires_approval: false,
      executed_at: new Date().toISOString()
    }).catch(() => {})

    return res.status(200).json({ success: true, ...results, duration_ms })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

async function callInternal(path, body, authHeader) {
  const url = `${PIPELINE_BASE_URL}${path}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {})
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${path} failed (${response.status}): ${text}`)
  }

  return response.json()
}
