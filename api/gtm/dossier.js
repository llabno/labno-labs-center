// GTM Layer 4: Account Dossier Generator (Signal #10)
// Synthesizes all public signals for a company into a pre-call briefing.
// Uses Claude to generate a human-readable sales intelligence narrative.

import { authenticateRequest } from './lib/webhook-auth.js'
import { createAuthClient, createServiceClient } from './lib/supabase.js'
import { classifyWithClaude } from './lib/llm-client.js'

const INTENT_EXPLANATION_SYSTEM = `You are a sales intelligence narrator for Labno Labs, an AI consulting firm. Given a company's signal history and composite intent score, you generate a concise, human-readable explanation that a sales rep can use to understand WHY this account scored high and WHAT to lead with in outreach.

Your output must be a JSON object with these fields:

{
  "company_name": "string",
  "composite_score": number,
  "score_tier": "hot | warm | nurture | cold",
  "headline": "One-sentence summary of why this account is interesting (max 120 chars)",
  "pain_summary": "2-3 sentence narrative of the company's core pain points, written in language a sales rep would use in a call",
  "primary_pain": "The single biggest pain point to lead outreach with",
  "recommended_service": "The Labno Labs service to propose first",
  "recommended_angle": "The specific angle or value prop to use (max 30 words)",
  "supporting_evidence": ["Array of 2-3 direct quotes from reviews/postings"],
  "risk_factors": ["Array of 0-2 reasons this lead might not convert"],
  "suggested_outreach_channel": "email | linkedin | warm_intro | event",
  "urgency_note": "If time-sensitive signals exist, explain why NOW. Otherwise null.",
  "tech_stack": ["Known or inferred tech stack"],
  "decision_maker_profile": "What we know about likely decision makers"
}

Score tier mapping:
- 80-100: hot — multiple critical signals, clear budget, decision-maker involvement
- 60-79: warm — strong signals but missing one key indicator
- 40-59: nurture — real pain exists but timing or authority unclear
- 0-39: cold — weak or speculative signals

Writing style:
- Write like a sharp SDR briefing a sales rep, not like a formal report
- Be specific: name the exact pain, the exact product, the exact quote
- Never be vague — always be concrete
- Keep pain_summary under 50 words
- Keep recommended_angle under 30 words`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseAuth = createAuthClient()
  const auth = await authenticateRequest(req, supabaseAuth)
  if (!auth.valid) return res.status(401).json({ error: auth.error })

  const supabase = createServiceClient()
  const { company_name } = req.body || {}

  if (!company_name) return res.status(400).json({ error: 'company_name required' })

  try {
    // Fetch all data for this company in parallel
    const [
      { data: intentScore },
      { data: signals },
      { data: hiringSignals },
      { data: profile },
      { data: competitiveIntel }
    ] = await Promise.all([
      supabase.from('gtm_intent_scores').select('*').eq('company_name', company_name).single(),
      supabase.from('gtm_parsed_signals').select('*').eq('company_name', company_name).order('parsed_at', { ascending: false }).limit(20),
      supabase.from('gtm_hiring_signals').select('*').eq('company_name', company_name).order('detected_at', { ascending: false }).limit(10),
      supabase.from('gtm_company_profiles').select('*').eq('company_name', company_name).single(),
      supabase.from('gtm_competitive_intel').select('*').eq('competitor_name', company_name).limit(5)
    ])

    if (!signals?.length && !hiringSignals?.length) {
      return res.status(404).json({ error: `No signals found for ${company_name}` })
    }

    // Build the LLM prompt
    const scoreComponents = intentScore ? {
      recency_score: intentScore.recency_score,
      frequency_score: intentScore.frequency_score,
      depth_score: intentScore.depth_score,
      seniority_score: intentScore.seniority_score,
      composite_score: intentScore.composite_score,
      score_tier: intentScore.score_tier
    } : { composite_score: 0, score_tier: 'cold' }

    const signalHistory = (signals || []).map(s => ({
      source_type: s.source_type,
      pain_point: s.pain_point_description,
      pain_point_category: s.pain_point_category,
      severity: s.severity,
      labno_service_match: s.labno_service_match,
      evidence_quote: s.evidence_quote,
      reviewer_seniority: s.reviewer_seniority,
      date: s.parsed_at
    }))

    const hiringContext = (hiringSignals || []).map(hs => ({
      signal_type: hs.signal_type,
      details: hs.signal_details,
      debt_type: hs.inferred_debt_type,
      date: hs.detected_at
    }))

    const userPrompt = `Generate an intent score explanation and pre-call dossier for this account.

Company: ${company_name}
Composite Score: ${scoreComponents.composite_score || 0}/100

Score Components:
${JSON.stringify(scoreComponents, null, 2)}

Signal History:
${JSON.stringify(signalHistory, null, 2)}

Hiring Signals:
${JSON.stringify(hiringContext, null, 2)}

${profile ? `Company Profile:
Industry: ${profile.industry || 'Unknown'}
Employee Count: ${profile.employee_count || 'Unknown'}
Tech Stack: ${JSON.stringify(profile.tech_stack_known || [])}
ICP Match Score: ${profile.icp_match_score || 0}` : ''}

${competitiveIntel?.length ? `Competitive Intelligence:
${JSON.stringify(competitiveIntel, null, 2)}` : ''}

Output the structured JSON dossier.`

    const dossier = await classifyWithClaude({
      systemPrompt: INTENT_EXPLANATION_SYSTEM,
      userPrompt,
      model: 'claude-sonnet-4-20250514',
      temperature: 0.3,
      maxTokens: 1024
    })

    return res.status(200).json({
      success: true,
      dossier,
      raw: {
        signal_count: signals?.length || 0,
        hiring_signal_count: hiringSignals?.length || 0,
        intent_score: intentScore,
        profile
      }
    })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
