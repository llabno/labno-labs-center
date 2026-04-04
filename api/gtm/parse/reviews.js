// GTM Layer 2: Review Signal Parsing
// Fetches unparsed reviews from gtm_mobile_reviews and gtm_b2b_reviews,
// classifies them via Claude, and inserts parsed signals into gtm_parsed_signals.
// Can be triggered via cron, webhook, or dashboard button.

import { authenticateRequest } from '../lib/webhook-auth.js'
import { createAuthClient, createServiceClient } from '../lib/supabase.js'
import { classifyWithClaude, SYSTEM_PROMPTS, USER_PROMPT_TEMPLATES } from '../lib/llm-client.js'

const BATCH_SIZE = 10
const MAX_ITEMS_PER_RUN = 100

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const startTime = Date.now()
  const supabaseAuth = createAuthClient()
  const auth = await authenticateRequest(req, supabaseAuth)
  if (!auth.valid) return res.status(401).json({ error: auth.error })

  const supabase = createServiceClient()
  const { source = 'all', limit = MAX_ITEMS_PER_RUN } = req.body || {}

  const stats = { mobile_processed: 0, b2b_processed: 0, signals_created: 0, errors: 0 }
  const errors = []

  try {
    // Fetch unparsed mobile reviews (left join on parsed_signals to find unprocessed)
    if (source === 'all' || source === 'mobile') {
      const { data: mobileReviews } = await supabase
        .from('gtm_mobile_reviews')
        .select('id, source_platform, app_name, app_id, app_version, review_id_external, rating, review_text, review_date')
        .not('id', 'in', `(SELECT source_review_id FROM gtm_parsed_signals WHERE source_review_id IS NOT NULL)`)
        .order('scraped_at', { ascending: false })
        .limit(Math.min(limit, MAX_ITEMS_PER_RUN))

      // The subquery above won't work with Supabase JS client directly.
      // Instead, fetch IDs that are already parsed and exclude them.
      const unparsedMobile = await getUnparsedReviews(supabase, 'gtm_mobile_reviews', 'app_review', limit)

      if (unparsedMobile.length > 0) {
        const result = await processReviewBatch(supabase, unparsedMobile, 'app_review', errors)
        stats.mobile_processed = result.processed
        stats.signals_created += result.signals
      }
    }

    // Fetch unparsed B2B reviews
    if (source === 'all' || source === 'b2b') {
      const unparsedB2B = await getUnparsedReviews(supabase, 'gtm_b2b_reviews', 'b2b_review', limit)

      if (unparsedB2B.length > 0) {
        const result = await processReviewBatch(supabase, unparsedB2B, 'b2b_review', errors)
        stats.b2b_processed = result.processed
        stats.signals_created += result.signals
      }
    }

    stats.errors = errors.length
    const duration_ms = Date.now() - startTime

    await supabase.from('gtm_agent_actions').insert({
      action_type: 'signal_classification',
      target_company: 'batch_parse',
      action_details: { ...stats, duration_ms },
      requires_approval: false,
      executed_at: new Date().toISOString()
    }).catch(() => {})

    return res.status(200).json({ success: true, ...stats, duration_ms, errors: errors.length ? errors : undefined })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

async function getUnparsedReviews(supabase, table, sourceType, limit) {
  // Get IDs already parsed
  const { data: parsedIds } = await supabase
    .from('gtm_parsed_signals')
    .select('source_review_id')
    .eq('source_type', sourceType)
    .not('source_review_id', 'is', null)

  const parsedSet = new Set((parsedIds || []).map(r => r.source_review_id))

  // Fetch recent reviews
  const { data: reviews, error } = await supabase
    .from(table)
    .select('*')
    .order('scraped_at', { ascending: false })
    .limit(limit + parsedSet.size) // overfetch to account for filtering

  if (error) throw new Error(`Failed to fetch from ${table}: ${error.message}`)

  return (reviews || []).filter(r => !parsedSet.has(r.id)).slice(0, limit)
}

async function processReviewBatch(supabase, reviews, sourceType, errors) {
  let processed = 0
  let signals = 0

  // Process in batches of BATCH_SIZE using the batch classifier
  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    const batch = reviews.slice(i, i + BATCH_SIZE)

    // Tag each review with source_type for the batch processor
    const taggedBatch = batch.map(r => ({ ...r, source_type: sourceType }))

    try {
      let results

      if (batch.length === 1) {
        // Single item — use individual classifier for better quality
        const review = batch[0]
        const systemPrompt = SYSTEM_PROMPTS[sourceType]
        const userPrompt = USER_PROMPT_TEMPLATES[sourceType](review)
        const parsed = await classifyWithClaude({ systemPrompt, userPrompt })
        results = [parsed]
      } else {
        // Batch classify
        const parsed = await classifyWithClaude({
          systemPrompt: SYSTEM_PROMPTS.batch,
          userPrompt: USER_PROMPT_TEMPLATES.batch(taggedBatch),
          maxTokens: 4096
        })
        results = Array.isArray(parsed) ? parsed : [parsed]
      }

      // Insert parsed signals
      for (let j = 0; j < results.length; j++) {
        const result = results[j]
        const review = batch[j]
        if (!result || !result.signals) continue

        for (const signal of result.signals) {
          const { error: insertError } = await supabase
            .from('gtm_parsed_signals')
            .insert({
              source_review_id: review.id,
              source_type: sourceType,
              company_name: result.company_name || review.app_name || review.software_name,
              pain_point_category: signal.pain_point_category,
              pain_point_description: signal.pain_point,
              severity: signal.severity,
              confidence_score: signal.confidence_score,
              labno_service_match: signal.labno_service_match,
              evidence_quote: signal.evidence_quote,
              proposed_solution: signal.proposed_solution,
              reviewer_seniority: signal.reviewer_seniority,
              nfr_categories: signal.nfr_categories,
              overall_sentiment: result.overall_sentiment,
              urgency_indicators: result.urgency_indicators,
              competitive_mentions: result.competitive_mentions,
              parsed_at: new Date().toISOString()
            })

          if (insertError) {
            errors.push({ review_id: review.id, signal: signal.pain_point_category, error: insertError.message })
          } else {
            signals++
          }
        }
        processed++
      }
    } catch (err) {
      errors.push({ batch_start: i, error: err.message })
    }
  }

  return { processed, signals }
}
