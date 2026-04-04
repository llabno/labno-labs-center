// GTM Layer 1: Job Posting Ingestion (LinkedIn, Indeed via Bright Data)
// Receives webhooks from Bright Data or manual uploads
// Validates, transforms, deduplicates, and inserts into gtm_job_postings

import { authenticateRequest } from '../lib/webhook-auth.js'
import { createAuthClient, createServiceClient } from '../lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const startTime = Date.now()

  const supabaseAuth = createAuthClient()
  const auth = await authenticateRequest(req, supabaseAuth)
  if (!auth.valid) return res.status(401).json({ error: auth.error })

  const supabase = createServiceClient()

  try {
    let rawItems

    // Bright Data sends results directly in the webhook body
    if (Array.isArray(req.body)) {
      rawItems = req.body
    } else if (Array.isArray(req.body.results)) {
      rawItems = req.body.results
    } else if (Array.isArray(req.body.postings)) {
      rawItems = req.body.postings
    } else {
      return res.status(400).json({ error: 'Expected array of job postings or { results: [...] }' })
    }

    const stats = { total: rawItems.length, inserted: 0, skipped_duplicate: 0, skipped_invalid: 0 }
    const errors = []

    const rows = []
    for (const item of rawItems) {
      const row = transformJobPosting(item)
      if (!row) {
        stats.skipped_invalid++
        continue
      }
      rows.push(row)
    }

    if (rows.length > 0) {
      // Dedup on composite key: source_platform + posting_url
      const BATCH_SIZE = 100
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const { data, error } = await supabase
          .from('gtm_job_postings')
          .upsert(batch, { onConflict: 'source_platform,posting_url', ignoreDuplicates: true })
          .select('id')

        if (error) {
          errors.push({ batch: i / BATCH_SIZE, error: error.message })
        } else {
          const insertedCount = data?.length || 0
          stats.inserted += insertedCount
          stats.skipped_duplicate += (batch.length - insertedCount)
        }
      }
    }

    const duration_ms = Date.now() - startTime

    await supabase.from('gtm_agent_actions').insert({
      action_type: 'data_ingestion',
      target_company: 'job_postings',
      action_details: { ...stats, errors, duration_ms },
      requires_approval: false,
      executed_at: new Date().toISOString()
    }).catch(() => {})

    return res.status(200).json({ success: true, ...stats, errors: errors.length ? errors : undefined, duration_ms })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function transformJobPosting(item) {
  const companyName = item.company_name || item.company || item.companyName
  const jobTitle = item.job_title || item.title || item.jobTitle
  if (!companyName || !jobTitle) return null

  const postingUrl = item.posting_url || item.url || item.link
  if (!postingUrl) return null

  const platform = detectPlatform(item, postingUrl)

  // Extract tech stack from description
  const description = item.job_description || item.description || ''
  const techStack = extractTechStack(description)

  return {
    source_platform: platform,
    company_name: companyName,
    job_title: jobTitle,
    job_description: description.slice(0, 50000) || null,
    posting_url: postingUrl,
    location: item.location || item.job_location || null,
    seniority_level: inferSeniority(jobTitle),
    required_tech_stack: techStack.required.length ? techStack.required : null,
    preferred_tech_stack: techStack.preferred.length ? techStack.preferred : null,
    posted_date: normalizeDate(item.posted_date || item.date || item.postedAt),
    is_active: item.is_active ?? true,
    scraped_at: new Date().toISOString()
  }
}

function detectPlatform(item, url) {
  if (url?.includes('linkedin.com')) return 'linkedin'
  if (url?.includes('indeed.com')) return 'indeed'
  return item.source_platform || item.platform || 'linkedin'
}

function inferSeniority(title) {
  const t = title.toLowerCase()
  if (/\b(chief|ceo|cto|coo|cfo|cmo|ciso|president)\b/.test(t)) return 'c_suite'
  if (/\b(vp|vice president)\b/.test(t)) return 'vp'
  if (/\bdirector\b/.test(t)) return 'director'
  if (/\b(manager|lead|head)\b/.test(t)) return 'manager'
  if (/\bsenior\b/.test(t)) return 'senior_ic'
  if (/\b(junior|entry|intern|associate|coordinator|assistant)\b/.test(t)) return 'junior'
  return 'unknown'
}

const TECH_PATTERNS = {
  python: /\bpython\b/i, javascript: /\bjavascript\b/i, typescript: /\btypescript\b/i,
  react: /\breact\b/i, node: /\bnode\.?js\b/i, sql: /\bsql\b/i,
  aws: /\baws\b/i, gcp: /\b(gcp|google cloud)\b/i, azure: /\bazure\b/i,
  docker: /\bdocker\b/i, kubernetes: /\bkubernetes\b/i, terraform: /\bterraform\b/i,
  salesforce: /\bsalesforce\b/i, hubspot: /\bhubspot\b/i,
  postgresql: /\bpostgres(ql)?\b/i, mongodb: /\bmongo(db)?\b/i,
  excel: /\bexcel\b/i, quickbooks: /\bquickbooks\b/i,
  java: /\bjava\b(?!script)/i, go: /\bgo(lang)?\b/i, ruby: /\bruby\b/i,
  tensorflow: /\btensorflow\b/i, pytorch: /\bpytorch\b/i
}

function extractTechStack(description) {
  const required = []
  const preferred = []
  const lines = description.split('\n')
  let inPreferred = false

  for (const line of lines) {
    if (/\b(preferred|nice to have|bonus|plus)\b/i.test(line)) inPreferred = true
    if (/\b(required|must have|minimum|essential)\b/i.test(line)) inPreferred = false

    for (const [tech, pattern] of Object.entries(TECH_PATTERNS)) {
      if (pattern.test(line)) {
        const list = inPreferred ? preferred : required
        if (!list.includes(tech)) list.push(tech)
      }
    }
  }

  return { required, preferred }
}

function normalizeDate(value) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d.toISOString()
}
