// GTM Layer 1: Mobile App Review Ingestion
// Receives webhooks from Apify (EasyAPI for Apple, NeatRat for Google Play)
// Validates, transforms, deduplicates, and inserts into gtm_mobile_reviews

import { authenticateRequest } from '../lib/webhook-auth.js'
import { createAuthClient, createServiceClient } from '../lib/supabase.js'
import { fetchAllDatasetItems } from '../lib/apify-client.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const startTime = Date.now()

  // Auth
  const supabaseAuth = createAuthClient()
  const auth = await authenticateRequest(req, supabaseAuth)
  if (!auth.valid) return res.status(401).json({ error: auth.error })

  const supabase = createServiceClient()

  try {
    let rawItems

    // Apify webhook payload contains run metadata, not data
    if (req.body.resource?.defaultDatasetId) {
      const { status } = req.body.resource
      if (status !== 'SUCCEEDED') {
        return res.status(200).json({ success: true, skipped: true, reason: `Run status: ${status}` })
      }
      rawItems = await fetchAllDatasetItems(req.body.resource.defaultDatasetId)
    } else if (Array.isArray(req.body.reviews)) {
      // Direct payload (manual upload or testing)
      rawItems = req.body.reviews
    } else if (Array.isArray(req.body)) {
      rawItems = req.body
    } else {
      return res.status(400).json({ error: 'Expected Apify webhook payload or { reviews: [...] }' })
    }

    const stats = { total: rawItems.length, inserted: 0, skipped_duplicate: 0, skipped_invalid: 0 }
    const errors = []

    // Determine platform from first item or request header
    const platform = req.headers['x-gtm-platform']
      || (rawItems[0]?.appId?.startsWith('com.') ? 'google_play' : 'apple_app_store')

    // Transform and validate
    const rows = []
    for (const item of rawItems) {
      const row = transformMobileReview(item, platform)
      if (!row) {
        stats.skipped_invalid++
        continue
      }
      rows.push(row)
    }

    // Batch insert with conflict handling (ON CONFLICT DO NOTHING via upsert)
    if (rows.length > 0) {
      const BATCH_SIZE = 100
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const { data, error, count } = await supabase
          .from('gtm_mobile_reviews')
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

    // Log ingestion run
    await supabase.from('gtm_agent_actions').insert({
      action_type: 'data_ingestion',
      target_company: `mobile_reviews_${platform}`,
      action_details: { ...stats, errors, duration_ms, platform },
      requires_approval: false,
      executed_at: new Date().toISOString()
    }).catch(() => {}) // non-critical

    return res.status(200).json({ success: true, ...stats, errors: errors.length ? errors : undefined, duration_ms })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function transformMobileReview(item, platform) {
  // Apple (EasyAPI) field mapping
  if (platform === 'apple_app_store') {
    const reviewText = item.text || item.review || item.content || ''
    if (!reviewText.trim()) return null

    const rating = parseInt(item.score || item.rating, 10)
    if (!rating || rating < 1 || rating > 5) return null

    return {
      source_platform: 'apple_app_store',
      app_name: item.appName || item.app_name || item.title || null,
      app_id: item.appId || item.app_id || null,
      app_version: item.version || null,
      review_id_external: `apple_${item.id || item.reviewId}`,
      reviewer_name: item.userName || item.author || null,
      rating,
      review_text: reviewText.slice(0, 10000),
      review_date: normalizeDate(item.date || item.updated),
      device_type: null,
      geo_location: item.country || null,
      helpful_count: parseInt(item.voteCount, 10) || 0,
      developer_response: item.developerResponse || item.replyContent || null,
      scraped_at: new Date().toISOString()
    }
  }

  // Google Play (NeatRat) field mapping
  if (platform === 'google_play') {
    const reviewText = item.text || item.content || item.review || ''
    if (!reviewText.trim()) return null

    const rating = parseInt(item.score || item.rating || item.stars, 10)
    if (!rating || rating < 1 || rating > 5) return null

    return {
      source_platform: 'google_play',
      app_name: item.appName || item.title || item.app_name || null,
      app_id: item.appId || item.appPackage || item.app_id || null,
      app_version: item.version || item.appVersion || null,
      review_id_external: `gp_${item.id || item.reviewId}`,
      reviewer_name: item.userName || item.author || null,
      rating,
      review_text: reviewText.slice(0, 10000),
      review_date: normalizeDate(item.date || item.at),
      device_type: item.deviceType || item.device || null,
      geo_location: item.country || null,
      helpful_count: parseInt(item.thumbsUp || item.thumbsUpCount, 10) || 0,
      developer_response: item.replyContent || item.developerResponse || null,
      scraped_at: new Date().toISOString()
    }
  }

  return null
}

function normalizeDate(value) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d.toISOString()
}
