// GTM Layer 2: Job Posting Signal Parsing
// Fetches unparsed job postings from gtm_job_postings,
// runs them through Claude for debt signal extraction + the local hiring signals lib,
// and inserts results into gtm_parsed_signals and gtm_hiring_signals.

import { authenticateRequest } from '../lib/webhook-auth.js'
import { createAuthClient, createServiceClient } from '../lib/supabase.js'
import { classifyWithClaude, SYSTEM_PROMPTS, USER_PROMPT_TEMPLATES } from '../lib/llm-client.js'

const MAX_ITEMS_PER_RUN = 50

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const startTime = Date.now()
  const supabaseAuth = createAuthClient()
  const auth = await authenticateRequest(req, supabaseAuth)
  if (!auth.valid) return res.status(401).json({ error: auth.error })

  const supabase = createServiceClient()
  const { limit = MAX_ITEMS_PER_RUN } = req.body || {}

  const stats = { postings_processed: 0, signals_created: 0, hiring_signals_created: 0, errors: 0 }
  const errors = []

  try {
    // Get already-parsed posting IDs
    const { data: parsedIds } = await supabase
      .from('gtm_parsed_signals')
      .select('source_review_id')
      .eq('source_type', 'job_posting')
      .not('source_review_id', 'is', null)

    const parsedSet = new Set((parsedIds || []).map(r => r.source_review_id))

    // Fetch recent job postings
    const { data: postings, error: fetchError } = await supabase
      .from('gtm_job_postings')
      .select('*')
      .eq('is_active', true)
      .order('scraped_at', { ascending: false })
      .limit(limit + parsedSet.size)

    if (fetchError) throw new Error(`Failed to fetch postings: ${fetchError.message}`)

    const unparsed = (postings || []).filter(p => !parsedSet.has(p.id)).slice(0, limit)

    // Process each posting individually (Sonnet model, higher quality needed)
    for (const posting of unparsed) {
      try {
        // LLM classification
        const parsed = await classifyWithClaude({
          systemPrompt: SYSTEM_PROMPTS.job_posting,
          userPrompt: USER_PROMPT_TEMPLATES.job_posting(posting),
          model: 'claude-sonnet-4-20250514',
          temperature: 0.15,
          maxTokens: 2048
        })

        // Insert parsed signals
        if (parsed?.signals) {
          for (const signal of parsed.signals) {
            const { error: insertError } = await supabase
              .from('gtm_parsed_signals')
              .insert({
                source_review_id: posting.id,
                source_type: 'job_posting',
                company_name: parsed.company_name || posting.company_name,
                pain_point_category: signal.pain_point_category,
                pain_point_description: signal.pain_point,
                severity: signal.severity,
                confidence_score: signal.confidence_score,
                labno_service_match: signal.labno_service_match,
                evidence_quote: signal.evidence_quote,
                proposed_solution: signal.proposed_solution,
                reviewer_seniority: signal.reviewer_seniority,
                nfr_categories: signal.nfr_categories,
                overall_sentiment: parsed.overall_sentiment,
                urgency_indicators: parsed.urgency_indicators,
                competitive_mentions: parsed.competitive_mentions,
                parsed_at: new Date().toISOString()
              })

            if (insertError) {
              errors.push({ posting_id: posting.id, error: insertError.message })
            } else {
              stats.signals_created++
            }
          }
        }

        // Also run local hiring signal detection (tech stack, hiring spikes, etc.)
        // These are lightweight and don't need LLM
        await insertLocalHiringSignals(supabase, posting, errors, stats)

        stats.postings_processed++
      } catch (err) {
        errors.push({ posting_id: posting.id, error: err.message })
      }
    }

    stats.errors = errors.length
    const duration_ms = Date.now() - startTime

    await supabase.from('gtm_agent_actions').insert({
      action_type: 'signal_classification',
      target_company: 'job_postings_parse',
      action_details: { ...stats, duration_ms },
      requires_approval: false,
      executed_at: new Date().toISOString()
    }).catch(() => {})

    return res.status(200).json({ success: true, ...stats, duration_ms, errors: errors.length ? errors : undefined })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

async function insertLocalHiringSignals(supabase, posting, errors, stats) {
  // Detect tech stack from description
  const techSignals = []

  const description = posting.job_description || ''
  const title = posting.job_title || ''

  // Check for hiring spike signal type
  if (/\b(urgent|asap|immediately|start date.*immediate)\b/i.test(description)) {
    techSignals.push({
      source_posting_id: posting.id,
      company_name: posting.company_name,
      signal_type: 'hiring_spike',
      signal_details: { urgency: true, title, evidence: 'Urgent hiring language detected' },
      inferred_debt_type: 'capacity_gap',
      confidence: 0.7,
      detected_at: new Date().toISOString()
    })
  }

  // Check for executive turnover
  if (/\b(chief|cto|coo|vp|vice president|director)\b/i.test(title)) {
    techSignals.push({
      source_posting_id: posting.id,
      company_name: posting.company_name,
      signal_type: 'executive_turnover',
      signal_details: { role: title, evidence: 'Executive-level hire detected' },
      inferred_debt_type: 'leadership_transition',
      confidence: 0.6,
      detected_at: new Date().toISOString()
    })
  }

  // Check for tech stack migration signals
  if (/\b(migrate|migration|rewrite|modernize|re-architect|legacy)\b/i.test(description)) {
    techSignals.push({
      source_posting_id: posting.id,
      company_name: posting.company_name,
      signal_type: 'tech_stack_shift',
      signal_details: {
        required_stack: posting.required_tech_stack,
        preferred_stack: posting.preferred_tech_stack,
        evidence: 'Migration/modernization language detected'
      },
      inferred_debt_type: 'infrastructure_modernization',
      confidence: 0.75,
      detected_at: new Date().toISOString()
    })
  }

  // Check for new department creation
  if (/\b(first|founding|build.*team|establish|stand.*up|greenfield)\b/i.test(description)) {
    techSignals.push({
      source_posting_id: posting.id,
      company_name: posting.company_name,
      signal_type: 'new_department',
      signal_details: { title, evidence: 'Founding/first-hire language detected' },
      inferred_debt_type: 'capability_gap',
      confidence: 0.65,
      detected_at: new Date().toISOString()
    })
  }

  for (const signal of techSignals) {
    const { error } = await supabase.from('gtm_hiring_signals').insert(signal)
    if (error) {
      errors.push({ posting_id: posting.id, signal_type: signal.signal_type, error: error.message })
    } else {
      stats.hiring_signals_created++
    }
  }
}
