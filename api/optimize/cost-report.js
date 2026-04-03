/**
 * GET /api/optimize/cost-report
 *
 * Returns token usage and cost data from the token_usage_log table.
 * Supports filtering by date range, model, endpoint, and agent.
 *
 * Query params:
 *   days=7        — look back N days (default: 7)
 *   model=...     — filter by model name
 *   endpoint=...  — filter by API endpoint
 *   agent=...     — filter by agent name
 *
 * Returns: { summary, byModel, byEndpoint, byDay, expensiveRequests }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authErr || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Parse filters
  const days = parseInt(req.query.days) || 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('token_usage_log')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (req.query.model) query = query.eq('model', req.query.model);
  if (req.query.endpoint) query = query.eq('endpoint', req.query.endpoint);
  if (req.query.agent) query = query.eq('agent_name', req.query.agent);

  const { data: logs, error } = await query;

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch usage data', details: error.message });
  }

  if (!logs || logs.length === 0) {
    return res.status(200).json({
      summary: { totalRequests: 0, totalCost: 0, totalTokens: 0 },
      byModel: {},
      byEndpoint: {},
      byDay: {},
      expensiveRequests: [],
    });
  }

  // Aggregate
  const totalCost = logs.reduce((sum, l) => sum + (l.estimated_cost_usd || 0), 0);
  const totalTokens = logs.reduce((sum, l) => sum + (l.total_tokens || 0), 0);

  // By model
  const byModel = {};
  for (const l of logs) {
    const m = l.model || 'unknown';
    if (!byModel[m]) byModel[m] = { requests: 0, cost: 0, tokens: 0 };
    byModel[m].requests++;
    byModel[m].cost += l.estimated_cost_usd || 0;
    byModel[m].tokens += l.total_tokens || 0;
  }

  // By endpoint
  const byEndpoint = {};
  for (const l of logs) {
    const e = l.endpoint || 'unknown';
    if (!byEndpoint[e]) byEndpoint[e] = { requests: 0, cost: 0, tokens: 0 };
    byEndpoint[e].requests++;
    byEndpoint[e].cost += l.estimated_cost_usd || 0;
    byEndpoint[e].tokens += l.total_tokens || 0;
  }

  // By day
  const byDay = {};
  for (const l of logs) {
    const d = (l.created_at || '').slice(0, 10);
    if (!byDay[d]) byDay[d] = { requests: 0, cost: 0, tokens: 0 };
    byDay[d].requests++;
    byDay[d].cost += l.estimated_cost_usd || 0;
    byDay[d].tokens += l.total_tokens || 0;
  }

  // Expensive requests (> $0.10)
  const expensiveRequests = logs
    .filter(l => (l.estimated_cost_usd || 0) > 0.10)
    .slice(0, 20)
    .map(l => ({
      endpoint: l.endpoint,
      model: l.model,
      cost: l.estimated_cost_usd,
      tokens: l.total_tokens,
      agent: l.agent_name,
      timestamp: l.created_at,
    }));

  // Projected monthly cost
  const avgDailyCost = totalCost / days;
  const projectedMonthlyCost = avgDailyCost * 30;

  return res.status(200).json({
    summary: {
      totalRequests: logs.length,
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalTokens,
      avgCostPerRequest: Math.round((totalCost / logs.length) * 10000) / 10000,
      avgDailyCost: Math.round(avgDailyCost * 10000) / 10000,
      projectedMonthlyCost: Math.round(projectedMonthlyCost * 100) / 100,
      periodDays: days,
    },
    byModel,
    byEndpoint,
    byDay,
    expensiveRequests,
  });
}
