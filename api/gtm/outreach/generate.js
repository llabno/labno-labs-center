// GTM Layer 4: Outreach Message Generator
// Takes a scored company + its signal history and generates
// a personalized outreach draft using one of 6 templates.
// All messages are saved as drafts — nothing sends without approval.

import { authenticateRequest } from '../lib/webhook-auth.js'
import { createAuthClient, createServiceClient } from '../lib/supabase.js'
import { classifyWithClaude } from '../lib/llm-client.js'

const TEMPLATE_TRIGGERS = {
  frontend_tech_debt: 'frontend_technical_debt',
  ux_debt: 'frontend_technical_debt',
  manual_data_entry: 'operational_bottleneck',
  workflow_automation_need: 'operational_bottleneck',
  post_sale_chaos: 'operational_bottleneck',
  infrastructure_debt: 'infrastructure_debt',
  api_limit_exhaustion: 'infrastructure_debt',
  bulk_data_failure: 'infrastructure_debt',
  ai_readiness: 'ai_readiness',
  integration_failure: 'competitive_displacement',
  reporting_gap: 'operational_bottleneck',
  support_delay: 'operational_bottleneck'
}

const HEALTHCARE_KEYWORDS = /\b(clinic|hospital|medical|health|patient|EHR|EMR|therapy|physical therapy|dental|optometry|chiropractic|wellness|telehealth)\b/i

const OUTREACH_SYSTEM_PROMPT = `You are a cold outreach writer for Labno Labs, an AI consulting firm that builds purpose-built multi-agent AI systems for business owners and operators. The founder, Lance Labno, is also a physical therapist who runs Movement Solutions — so for healthcare prospects, the outreach can lead with practitioner credibility.

You generate personalized cold outreach messages. Every message must:
1. Open with a SPECIFIC signal (review quote, job posting detail, metric) — never generic
2. Translate the signal into a technical or operational diagnosis
3. Bridge to a specific Labno Labs capability
4. Close with a low-friction ask (15-min call, async audit, etc.)

Output a JSON object:
{
  "subject_line": "Email subject (under 50 chars, no spam words)",
  "body": "The email body (under 150 words, plain text, no HTML)",
  "linkedin_note": "Optional LinkedIn connection note (under 300 chars)",
  "personalization_score": 1-5 (self-rated per the scoring rubric),
  "template_used": "which template pattern was applied",
  "channel_recommendation": "email | linkedin | both",
  "follow_up_angle": "What angle to use for Touch 2 if no reply"
}

Anti-spam rules:
- Never open with "I hope this email finds you well"
- Never say "I noticed your company" — spam fingerprint
- Never use "synergy," "leverage," "unlock," "game-changer," "holistic," "empower," "transform," "circle back"
- Keep under 150 words
- Use their first name exactly once at the opening
- Plain text only, no attachments, max one link
- Minimum personalization score to save as draft: 4`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseAuth = createAuthClient()
  const auth = await authenticateRequest(req, supabaseAuth)
  if (!auth.valid) return res.status(401).json({ error: auth.error })

  const supabase = createServiceClient()
  const { company_name, contact_name, contact_title, channel = 'email' } = req.body || {}

  if (!company_name) return res.status(400).json({ error: 'company_name required' })

  try {
    // Fetch company data
    const [
      { data: signals },
      { data: intentScore },
      { data: profile },
      { data: hiringSignals }
    ] = await Promise.all([
      supabase.from('gtm_parsed_signals').select('*').eq('company_name', company_name).order('confidence_score', { ascending: false }).limit(10),
      supabase.from('gtm_intent_scores').select('*').eq('company_name', company_name).single(),
      supabase.from('gtm_company_profiles').select('*').eq('company_name', company_name).single(),
      supabase.from('gtm_hiring_signals').select('*').eq('company_name', company_name).limit(5)
    ])

    if (!signals?.length) {
      return res.status(404).json({ error: `No signals found for ${company_name}` })
    }

    // Determine template type from dominant pain category
    const categories = signals.map(s => s.pain_point_category)
    const primaryCategory = mode(categories)
    let templateType = TEMPLATE_TRIGGERS[primaryCategory] || 'operational_bottleneck'

    // Override to healthcare-specific if signals suggest healthcare
    const allText = signals.map(s => `${s.evidence_quote || ''} ${s.pain_point_description || ''}`).join(' ')
    if (HEALTHCARE_KEYWORDS.test(allText)) {
      templateType = 'healthcare_specific'
    }

    const userPrompt = `Generate a cold outreach message for this account.

Company: ${company_name}
${contact_name ? `Contact Name: ${contact_name}` : ''}
${contact_title ? `Contact Title: ${contact_title}` : ''}
Channel: ${channel}
Template Type: ${templateType}
Intent Score: ${intentScore?.composite_score || 'Unknown'}/100
Score Tier: ${intentScore?.score_tier || 'Unknown'}

Top Signals:
${JSON.stringify(signals.slice(0, 5).map(s => ({
  pain: s.pain_point_description,
  category: s.pain_point_category,
  severity: s.severity,
  evidence: s.evidence_quote,
  service_match: s.labno_service_match,
  seniority: s.reviewer_seniority
})), null, 2)}

${hiringSignals?.length ? `Hiring Signals:\n${JSON.stringify(hiringSignals.map(h => ({
  type: h.signal_type,
  details: h.signal_details,
  debt_type: h.inferred_debt_type
})), null, 2)}` : ''}

${profile ? `Company Profile:
Industry: ${profile.industry || 'Unknown'}
Tech Stack: ${JSON.stringify(profile.tech_stack_known || [])}
ICP Match: ${profile.icp_match_score || 0}/100` : ''}

Key context: Lance Labno (the sender) is a Doctor of Physical Therapy who also runs Movement Solutions, a PT clinic. For healthcare prospects, lead with practitioner credibility. For non-healthcare, position as AI consulting firm.

Output the structured JSON outreach message.`

    const outreach = await classifyWithClaude({
      systemPrompt: OUTREACH_SYSTEM_PROMPT,
      userPrompt,
      model: 'claude-sonnet-4-20250514',
      temperature: 0.4,
      maxTokens: 1024
    })

    // Only save as draft if personalization score >= 4
    if (outreach.personalization_score >= 4) {
      const { data: profileData } = await supabase
        .from('gtm_company_profiles')
        .select('id')
        .eq('company_name', company_name)
        .single()

      const { error: insertError } = await supabase
        .from('gtm_outreach_messages')
        .insert({
          company_profile_id: profileData?.id || null,
          channel,
          template_type: templateType,
          subject_line: outreach.subject_line,
          body_text: outreach.body,
          personalization_data: {
            contact_name,
            contact_title,
            linkedin_note: outreach.linkedin_note,
            personalization_score: outreach.personalization_score,
            follow_up_angle: outreach.follow_up_angle,
            template_used: outreach.template_used,
            channel_recommendation: outreach.channel_recommendation
          },
          status: 'draft',
          created_at: new Date().toISOString()
        })

      if (insertError) {
        return res.status(200).json({
          success: true,
          outreach,
          saved: false,
          save_error: insertError.message
        })
      }
    }

    return res.status(200).json({
      success: true,
      outreach,
      saved: outreach.personalization_score >= 4,
      rejected_reason: outreach.personalization_score < 4 ? `Personalization score ${outreach.personalization_score} below threshold 4` : null
    })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

function mode(arr) {
  const counts = {}
  let maxCount = 0
  let maxVal = arr[0]
  for (const v of arr) {
    counts[v] = (counts[v] || 0) + 1
    if (counts[v] > maxCount) { maxCount = counts[v]; maxVal = v }
  }
  return maxVal
}
