// GTM Layer 1: B2B Review Ingestion (G2, Capterra, TrustRadius)
// Receives webhooks from Apify (Focused Vanguard Multi-Platform actor)
// Validates, transforms, deduplicates, and inserts into gtm_b2b_reviews

import { authenticateRequest } from '../lib/webhook-auth.js'
import { createAuthClient, createServiceClient } from '../lib/supabase.js'
import { fetchAllDatasetItems } from '../lib/apify-client.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const startTime = Date.now()

  const supabaseAuth = createAuthClient()
  const auth = await authenticateRequest(req, supabaseAuth)
  if (!auth.valid) return res.status(401).json({ error: auth.error })

  const supabase = createServiceClient()

  try {
    let rawItems

    if (req.body.resource?.defaultDatasetId) {
      if (req.body.resource.status !== 'SUCCEEDED') {
        return res.status(200).json({ success: true, skipped: true, reason: `Run status: ${req.body.resource.status}` })
      }
      rawItems = await fetchAllDatasetItems(req.body.resource.defaultDatasetId)
    } else if (Array.isArray(req.body.reviews)) {
      rawItems = req.body.reviews
    } else if (Array.isArray(req.body)) {
      rawItems = req.body
    } else {
      return res.status(400).json({ error: 'Expected Apify webhook payload or { reviews: [...] }' })
    }

    const stats = { total: rawItems.length, inserted: 0, skipped_duplicate: 0, skipped_invalid: 0 }
    const errors = []

    const rows = []
    for (const item of rawItems) {
      const row = transformB2BReview(item)
      if (!row) {
        stats.skipped_invalid++
        continue
      }
      rows.push(row)
    }

    if (rows.length > 0) {
      const BATCH_SIZE = 100
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const { data, error } = await supabase
          .from('gtm_b2b_reviews')
          .upsert(batch, { onConflict: 'review_id_external', ignoreDuplicates: true })
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
      target_company: 'b2b_reviews',
      action_details: { ...stats, errors, duration_ms },
      requires_approval: false,
      executed_at: new Date().toISOString()
    }).catch(() => {})

    return res.status(200).json({ success: true, ...stats, errors: errors.length ? errors : undefined, duration_ms })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function transformB2BReview(item) {
  // Focused Vanguard outputs vary by platform — normalize across G2, Capterra, TrustRadius
  const platform = detectPlatform(item)
  const reviewText = item.cons || item.cons_text || item.review_text || item.text || ''
  const prosText = item.pros || item.pros_text || ''

  // Must have at least cons/review text to be useful for pain signal extraction
  if (!reviewText.trim() && !prosText.trim()) return null

  const rating = parseFloat(item.overall_rating || item.rating || item.score)
  if (isNaN(rating)) return null

  // Build external ID — platform-prefixed for global uniqueness
  const rawId = item.id || item.reviewId || item.review_id
  if (!rawId) return null
  const prefix = platform === 'g2' ? 'g2_' : platform === 'capterra' ? 'cap_' : 'tr_'

  return {
    source_platform: platform,
    software_name: item.software_name || item.product_name || item.productName || item.softwareName || null,
    review_id_external: `${prefix}${rawId}`,
    reviewer_name: item.reviewer_name || item.reviewerName || item.author || null,
    reviewer_job_title: item.reviewer_job_title || item.jobTitle || item.title || null,
    reviewer_company_name: item.reviewer_company_name || item.companyName || item.company || null,
    reviewer_company_size: item.reviewer_company_size || item.companySize || null,
    reviewer_industry: item.reviewer_industry || item.industry || null,
    overall_rating: Math.min(Math.max(rating, 0), 10),
    pros_text: prosText.slice(0, 10000) || null,
    cons_text: reviewText.slice(0, 10000) || null,
    review_date: normalizeDate(item.review_date || item.date || item.publishedAt),
    verified_user: item.verified_user ?? item.isVerified ?? null,
    alternatives_considered: normalizeArray(item.alternatives_considered || item.alternatives),
    competitive_comparisons: item.competitive_comparisons || item.comparisons || null,
    scraped_at: new Date().toISOString()
  }
}

function detectPlatform(item) {
  const url = item.url || item.reviewUrl || ''
  if (url.includes('g2.com')) return 'g2'
  if (url.includes('capterra.com')) return 'capterra'
  if (url.includes('trustradius.com')) return 'trustradius'
  return item.source_platform || item.platform || 'g2'
}

function normalizeDate(value) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function normalizeArray(value) {
  if (!value) return null
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean)
  return null
}
