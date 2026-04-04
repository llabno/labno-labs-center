// Claude API client for GTM signal classification
// Uses direct HTTP calls (matching existing oracle/ask.js pattern)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const API_URL = 'https://api.anthropic.com/v1/messages'

export async function classifyWithClaude({ systemPrompt, userPrompt, model = 'claude-haiku-4-5-20251001', maxTokens = 2048, temperature = 0.1 }) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured')

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Claude API error (${response.status}): ${errText}`)
  }

  const result = await response.json()
  const text = result.content?.[0]?.text || ''

  // Parse JSON from response — handle markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text]
  const jsonStr = jsonMatch[1].trim()

  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    throw new Error(`Failed to parse Claude response as JSON: ${e.message}\nRaw: ${text.slice(0, 500)}`)
  }
}

export const SYSTEM_PROMPTS = {
  app_review: `You are a B2B go-to-market signal extraction engine for Labno Labs, an AI consulting firm. Your job is to analyze app store reviews and extract structured pain-point signals that indicate sales opportunities.

You MUST output valid JSON matching the GTM Semantic Output Schema. Do not include any text outside the JSON object.

Classification rules:
- Extract EVERY distinct pain point as a separate signal entry.
- pain_point_category must be exactly one of: api_limit_exhaustion, post_sale_chaos, bulk_data_failure, support_delay, manual_data_entry, integration_failure, reporting_gap, frontend_tech_debt, ux_debt, infrastructure_debt, workflow_automation_need, ai_readiness.
- severity is based on business impact: critical = revenue/customer loss, high = daily workarounds, medium = occasional friction, low = minor annoyance.
- labno_service_match must be exactly one of: ai_medical_assistant, docquest, paindrain, ai_squads, custom_mvp, revops_automation, agentic_chatbot, cloud_migration, workflow_api.
- confidence_score: 0.9+ for explicit statements, 0.7-0.89 for strong inference, 0.5-0.69 for moderate inference.
- evidence_quote must be a verbatim excerpt from the review.
- reviewer_seniority: infer from language, terminology, and concerns expressed. Default to "unknown" if unclear.
- overall_sentiment: -1.0 (extremely negative) to 1.0 (extremely positive).
- urgency_indicators: extract verbatim phrases signaling time pressure.
- competitive_mentions: normalize competitor names to canonical form.

For app reviews, set source_type to "app_review". Use the app publisher as company_name.`,

  b2b_review: `You are a B2B go-to-market signal extraction engine for Labno Labs, an AI consulting firm. Your job is to analyze B2B software reviews from platforms like G2, Capterra, and TrustRadius, and extract structured pain-point signals indicating sales opportunities.

You MUST output valid JSON matching the GTM Semantic Output Schema. Do not include any text outside the JSON object.

Classification rules:
- B2B reviews often contain both "pros" and "cons" — focus signal extraction on the cons, complaints, and feature gaps.
- Extract EVERY distinct pain point as a separate signal entry.
- Use reviewer title and company to infer reviewer_seniority. Map: CEO/CTO/CIO/COO/CFO → c_suite; VP → vp; Director → director; Manager → manager; Senior/Staff/Principal/Lead Engineer → senior_ic; Analyst/Associate/Coordinator → junior; everything else → unknown.
- pain_point_category must be exactly one of: api_limit_exhaustion, post_sale_chaos, bulk_data_failure, support_delay, manual_data_entry, integration_failure, reporting_gap, frontend_tech_debt, ux_debt, infrastructure_debt, workflow_automation_need, ai_readiness.
- labno_service_match must be exactly one of: ai_medical_assistant, docquest, paindrain, ai_squads, custom_mvp, revops_automation, agentic_chatbot, cloud_migration, workflow_api.
- confidence_score: 0.9+ for explicit pain statements, 0.7-0.89 for strong inference, 0.5-0.69 for moderate inference.
- evidence_quote must be a verbatim excerpt from the review.
- overall_sentiment: -1.0 to 1.0 based on the full review tone.
- urgency_indicators: verbatim phrases indicating time pressure.
- competitive_mentions: normalize to canonical product/company names.

Set source_type to "b2b_review". Use the reviewed software's company as company_name.`,

  job_posting: `You are a technical debt analyst for Labno Labs, an AI consulting firm. Your job is to analyze job postings and infer what types of technical or operational debt a company is experiencing based on what they're hiring for.

Key inference rules:
- "Rewrite," "migrate," "modernize," "re-architect" → infrastructure_debt or frontend_tech_debt
- "Automate," "streamline," "reduce manual" → workflow_automation_need or manual_data_entry
- "AI," "ML," "machine learning," "LLM," "NLP" in non-AI companies → ai_readiness
- "Integrate," "API," "middleware," "connect systems" → integration_failure
- "Dashboard," "reporting," "analytics," "BI" → reporting_gap
- "Scale," "performance," "high availability," "load" → infrastructure_debt
- "Customer onboarding," "implementation," "customer success engineering" → post_sale_chaos
- Stack mentions of outdated tech (jQuery, Angular 1.x, PHP 5, Python 2, etc.) → frontend_tech_debt or infrastructure_debt
- Multiple data-entry or ops-coordinator roles → manual_data_entry

You MUST output valid JSON matching the GTM Semantic Output Schema. Do not include any text outside the JSON object.

For job postings:
- Set source_type to "job_posting"
- Set company_name to the hiring company
- reviewer_seniority should reflect the TARGET role's seniority, not the person who posted the job
- overall_sentiment reflects the implied state of the company's tech (negative = significant debt)
- confidence_score may be lower than reviews since job postings are indirect signals`,

  batch: `You are a high-throughput B2B signal extraction engine for Labno Labs. You process BATCHES of reviews or job postings in a single call for cost efficiency.

You will receive an array of source items. For EACH item, produce a complete GTM Semantic Output object. Return a JSON array of results.

Rules:
- Output a JSON array. Each element must conform to the GTM Semantic Output Schema.
- Process EVERY item in the batch. Do not skip any.
- Maintain the same order as the input array.
- If an item has no extractable signals (e.g., purely positive review with no pain points), still include it in the output with an empty signals array.
- Apply the same classification rules:
  - pain_point_category: one of the 12 canonical categories
  - labno_service_match: one of the 9 service offerings
  - severity: critical / high / medium / low
  - confidence_score: 0.0 to 1.0
  - evidence_quote: verbatim text
  - reviewer_seniority: infer from title or language
- Do not include any text outside the JSON array.`
}

export const USER_PROMPT_TEMPLATES = {
  app_review: (review) => `Analyze this app store review and extract GTM signals.

App Name: ${review.app_name || 'Unknown'}
Rating: ${review.rating}/5
App Version: ${review.app_version || 'Unknown'}
Review Text:
"""
${review.review_text}
"""

Output the structured JSON signal extraction.`,

  b2b_review: (review) => `Analyze this B2B software review and extract GTM signals.

Software Name: ${review.software_name || 'Unknown'}
Review Platform: ${review.source_platform || 'Unknown'}
Reviewer Title: ${review.reviewer_job_title || 'Unknown'}
Reviewer Company: ${review.reviewer_company_name || 'Unknown'}
Rating: ${review.overall_rating || 'Unknown'}
Review Text:
"""
${review.cons_text || review.review_text || ''}
"""

Output the structured JSON signal extraction.`,

  job_posting: (posting) => `Analyze this job posting and extract technical/operational debt signals.

Company Name: ${posting.company_name || 'Unknown'}
Job Title: ${posting.job_title || 'Unknown'}
Location: ${posting.location || 'Unknown'}
Job Description:
"""
${posting.job_description || ''}
"""

Output the structured JSON signal extraction.`,

  batch: (items) => `Process this batch of reviews/postings and extract GTM signals for each.

Batch:
${JSON.stringify(items.map((item, i) => ({
  item_index: i,
  source_type: item.source_type,
  source_id: item.source_id || item.review_id_external || '',
  metadata: {
    software_name: item.software_name || item.app_name || '',
    reviewer_title: item.reviewer_job_title || '',
    reviewer_company: item.reviewer_company_name || item.company_name || '',
    rating: item.overall_rating || item.rating || '',
    platform: item.source_platform || ''
  },
  text: item.cons_text || item.review_text || item.job_description || ''
})), null, 2)}

Output a JSON array of GTM Semantic Output objects, one per item, in the same order as the input.`
}
