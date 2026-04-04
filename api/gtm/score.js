// GTM Layer 3: Intent Scoring Orchestration
// Groups parsed signals by company, calculates composite intent scores,
// and upserts into gtm_intent_scores and gtm_company_profiles.
// Triggered via cron or dashboard.

import { authenticateRequest } from './lib/webhook-auth.js'
import { createAuthClient, createServiceClient } from './lib/supabase.js'

// Import scoring functions — these are in src/lib but we inline the logic
// since Vercel serverless can't import from src/lib at runtime.
// We replicate the core scoring algorithm here.

const HALF_LIFE_DAYS = 30
const LAMBDA = Math.log(2) / HALF_LIFE_DAYS
const W_RECENCY = 0.30
const W_FREQUENCY = 0.25
const W_DEPTH = 0.25
const W_SENIORITY = 0.20
const COMPOUNDING_MULTIPLIER = 1.15
const COMPOUNDING_THRESHOLD = 2

const DEPTH_WEIGHTS = {
  api_limit_exhaustion: 90, post_sale_chaos: 85, bulk_data_failure: 80,
  support_delay: 40, manual_data_entry: 75, integration_failure: 95,
  reporting_gap: 60, frontend_tech_debt: 70, ux_debt: 55,
  infrastructure_debt: 85, workflow_automation_need: 80, ai_readiness: 90
}

const SENIORITY_TIERS = {
  c_suite: 100, vp: 85, director: 70, manager: 55,
  senior_ic: 45, junior: 20, unknown: 10
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const startTime = Date.now()
  const supabaseAuth = createAuthClient()
  const auth = await authenticateRequest(req, supabaseAuth)
  if (!auth.valid) return res.status(401).json({ error: auth.error })

  const supabase = createServiceClient()
  const { company = null } = req.body || {} // optional: score a specific company

  const stats = { companies_scored: 0, scores_upserted: 0, profiles_upserted: 0, errors: 0 }
  const errors = []

  try {
    // Fetch all parsed signals (or for a specific company)
    let query = supabase
      .from('gtm_parsed_signals')
      .select('*')
      .order('parsed_at', { ascending: false })

    if (company) {
      query = query.eq('company_name', company)
    }

    const { data: signals, error: fetchError } = await query.limit(5000)
    if (fetchError) throw new Error(`Failed to fetch signals: ${fetchError.message}`)

    // Group signals by company
    const byCompany = new Map()
    for (const signal of (signals || [])) {
      const name = signal.company_name
      if (!name) continue
      if (!byCompany.has(name)) byCompany.set(name, [])
      byCompany.get(name).push(signal)
    }

    // Also pull hiring signals
    const { data: hiringSignals } = await supabase
      .from('gtm_hiring_signals')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(5000)

    const hiringByCompany = new Map()
    for (const hs of (hiringSignals || [])) {
      const name = hs.company_name
      if (!name) continue
      if (!hiringByCompany.has(name)) hiringByCompany.set(name, [])
      hiringByCompany.get(name).push(hs)
    }

    // Score each company
    const now = new Date()
    for (const [companyName, companySignals] of byCompany) {
      try {
        const score = calculateCompositeScore(companySignals, now)
        const companyHiring = hiringByCompany.get(companyName) || []

        // Build top signals summary
        const topSignals = companySignals
          .sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0))
          .slice(0, 5)
          .map(s => ({
            category: s.pain_point_category,
            severity: s.severity,
            service_match: s.labno_service_match,
            evidence: s.evidence_quote?.slice(0, 200)
          }))

        // Upsert intent score
        const { error: scoreError } = await supabase
          .from('gtm_intent_scores')
          .upsert({
            company_name: companyName,
            recency_score: score.recencyScore,
            frequency_score: score.frequencyScore,
            depth_score: score.depthScore,
            seniority_score: score.seniorityScore,
            composite_score: score.compositeScore,
            score_tier: score.scoreTier,
            signal_count: score.signalCount,
            top_signals: topSignals,
            last_signal_at: companySignals[0]?.parsed_at || now.toISOString(),
            scored_at: now.toISOString()
          }, { onConflict: 'company_name' })

        if (scoreError) {
          errors.push({ company: companyName, error: scoreError.message })
        } else {
          stats.scores_upserted++
        }

        // Upsert company profile with inferred data
        const techStack = extractTechStackFromSignals(companySignals, companyHiring)
        const painCategories = [...new Set(companySignals.map(s => s.pain_point_category).filter(Boolean))]
        const serviceMatches = [...new Set(companySignals.map(s => s.labno_service_match).filter(Boolean))]

        const { error: profileError } = await supabase
          .from('gtm_company_profiles')
          .upsert({
            company_name: companyName,
            industry: inferIndustry(companySignals),
            tech_stack_known: techStack.length ? techStack : null,
            icp_match_score: calculateICPMatch(companySignals, companyHiring),
            dynamic_icp_tags: [...painCategories, ...serviceMatches].slice(0, 20),
            last_enriched_at: now.toISOString()
          }, { onConflict: 'company_name' })

        if (profileError) {
          errors.push({ company: companyName, type: 'profile', error: profileError.message })
        } else {
          stats.profiles_upserted++
        }

        stats.companies_scored++
      } catch (err) {
        errors.push({ company: companyName, error: err.message })
      }
    }

    stats.errors = errors.length
    const duration_ms = Date.now() - startTime

    await supabase.from('gtm_agent_actions').insert({
      action_type: 'intent_scoring',
      target_company: company || 'all',
      action_details: { ...stats, duration_ms },
      requires_approval: false,
      executed_at: now.toISOString()
    }).catch(() => {})

    return res.status(200).json({ success: true, ...stats, duration_ms, errors: errors.length ? errors : undefined })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function calculateCompositeScore(signals, now) {
  // Recency: exponential decay on most recent signal
  const dates = signals.map(s => new Date(s.parsed_at || s.created_at)).filter(d => !isNaN(d))
  const mostRecent = dates.length ? Math.max(...dates.map(d => d.getTime())) : now.getTime()
  const daysSince = (now.getTime() - mostRecent) / (1000 * 60 * 60 * 24)
  const recencyScore = Math.max(5, Math.min(100, 100 * Math.exp(-LAMBDA * daysSince)))

  // Frequency: discrete tiers
  const count = signals.length
  let frequencyScore = 0
  if (count >= 11) frequencyScore = 100
  else if (count >= 7) frequencyScore = 80
  else if (count >= 4) frequencyScore = 60
  else if (count >= 2) frequencyScore = 40
  else if (count >= 1) frequencyScore = 20

  // Depth: highest pain point weight
  const categories = signals.map(s => s.pain_point_category).filter(Boolean)
  const depthScore = Math.max(0, ...categories.map(c => DEPTH_WEIGHTS[c] || 30))

  // Seniority: highest seniority level
  const seniorities = signals.map(s => s.reviewer_seniority).filter(Boolean)
  const seniorityScore = Math.max(10, ...seniorities.map(s => SENIORITY_TIERS[s] || 10))

  // Composite
  let compositeScore = (W_RECENCY * recencyScore) + (W_FREQUENCY * frequencyScore) +
    (W_DEPTH * depthScore) + (W_SENIORITY * seniorityScore)

  // Multi-source compounding
  const sourceTypes = new Set(signals.map(s => s.source_type).filter(Boolean))
  if (sourceTypes.size >= COMPOUNDING_THRESHOLD) {
    compositeScore = Math.min(100, compositeScore * COMPOUNDING_MULTIPLIER)
  }

  compositeScore = Math.round(compositeScore * 100) / 100

  return {
    recencyScore: Math.round(recencyScore * 100) / 100,
    frequencyScore,
    depthScore,
    seniorityScore,
    compositeScore,
    scoreTier: getScoreTier(compositeScore),
    signalCount: count,
    compoundingApplied: sourceTypes.size >= COMPOUNDING_THRESHOLD
  }
}

function getScoreTier(score) {
  if (score >= 90) return 'immediate'
  if (score >= 70) return 'nurture'
  if (score >= 50) return 'watch'
  return 'archive'
}

function extractTechStackFromSignals(signals, hiringSignals) {
  const stack = new Set()
  for (const hs of hiringSignals) {
    const details = hs.signal_details || {}
    if (details.required_stack) details.required_stack.forEach(t => stack.add(t))
    if (details.preferred_stack) details.preferred_stack.forEach(t => stack.add(t))
  }
  // Also extract from competitive mentions
  for (const s of signals) {
    if (s.competitive_mentions) {
      for (const m of s.competitive_mentions) {
        stack.add(m)
      }
    }
  }
  return [...stack]
}

function inferIndustry(signals) {
  const categories = signals.map(s => s.pain_point_category).filter(Boolean)
  if (signals.some(s => s.labno_service_match === 'ai_medical_assistant')) return 'healthcare'
  if (categories.includes('ai_readiness') && signals.some(s => /\b(financial|wealth|banking|insurance)\b/i.test(s.evidence_quote || ''))) return 'financial_services'
  return null
}

function calculateICPMatch(signals, hiringSignals) {
  let score = 0
  // Pain category diversity
  const categories = new Set(signals.map(s => s.pain_point_category))
  score += Math.min(30, categories.size * 10)
  // Severity weight
  const criticals = signals.filter(s => s.severity === 'critical').length
  score += Math.min(30, criticals * 15)
  // Seniority
  if (signals.some(s => s.reviewer_seniority === 'c_suite')) score += 20
  else if (signals.some(s => s.reviewer_seniority === 'vp' || s.reviewer_seniority === 'director')) score += 15
  else if (signals.some(s => s.reviewer_seniority === 'manager')) score += 10
  // Hiring signals
  if (hiringSignals.length > 0) score += 10
  // Multi-source
  const sources = new Set(signals.map(s => s.source_type))
  if (sources.size >= 2) score += 10

  return Math.min(100, score)
}
