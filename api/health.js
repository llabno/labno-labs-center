/**
 * health.js — Health Check Endpoint for Uptime Monitoring
 *
 * GET /api/health
 *
 * Returns system status: Supabase connectivity, cron job freshness,
 * agent run health, and API budget status. Use with any uptime
 * monitoring service (UptimeRobot, Better Stack, etc.).
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const start = Date.now();
  const checks = {};
  let healthy = true;

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Supabase connectivity
  try {
    const { count, error } = await supabase
      .from('internal_projects')
      .select('id', { count: 'exact', head: true });
    checks.supabase = error ? { status: 'fail', error: error.message } : { status: 'ok', projects: count };
    if (error) healthy = false;
  } catch (err) {
    checks.supabase = { status: 'fail', error: err.message };
    healthy = false;
  }

  // 2. Recent agent activity (any runs in last 24h?)
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentRuns } = await supabase
      .from('agent_runs')
      .select('id, status')
      .gte('created_at', cutoff);

    const total = recentRuns?.length || 0;
    const failed = recentRuns?.filter(r => r.status === 'failed').length || 0;
    const failRate = total > 0 ? (failed / total * 100).toFixed(1) : 0;

    checks.agent_runs_24h = {
      status: failed > total * 0.5 ? 'warn' : 'ok',
      total,
      failed,
      fail_rate_pct: parseFloat(failRate),
    };
    if (failed > total * 0.5 && total > 2) healthy = false;
  } catch {
    checks.agent_runs_24h = { status: 'skip', reason: 'agent_runs table may not exist' };
  }

  // 3. Token spend (current month)
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: tokenData } = await supabase
      .from('token_usage_log')
      .select('estimated_cost_usd')
      .gte('created_at', monthStart.toISOString());

    const monthlySpend = (tokenData || []).reduce((sum, r) => sum + parseFloat(r.estimated_cost_usd || 0), 0);
    const budgetPct = (monthlySpend / 25) * 100; // $25/mo cap

    checks.api_budget = {
      status: budgetPct > 95 ? 'critical' : budgetPct > 80 ? 'warn' : 'ok',
      monthly_spend_usd: parseFloat(monthlySpend.toFixed(4)),
      monthly_limit_usd: 25,
      utilization_pct: parseFloat(budgetPct.toFixed(1)),
    };
  } catch {
    checks.api_budget = { status: 'skip', reason: 'token_usage_log not available' };
  }

  // 4. Cron freshness — check if backup ran recently (weekly, Sunday 6 AM)
  try {
    const { data: recentBackup } = await supabase
      .from('work_history')
      .select('created_at')
      .ilike('task_title', '%backup%')
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentBackup && recentBackup.length > 0) {
      const daysSince = (Date.now() - new Date(recentBackup[0].created_at).getTime()) / (1000 * 60 * 60 * 24);
      checks.last_backup = {
        status: daysSince > 8 ? 'warn' : 'ok',
        days_ago: parseFloat(daysSince.toFixed(1)),
      };
    } else {
      checks.last_backup = { status: 'unknown', reason: 'No backup records found' };
    }
  } catch {
    checks.last_backup = { status: 'skip' };
  }

  // 5. Oracle SOPs count
  try {
    const { count } = await supabase
      .from('oracle_sops')
      .select('id', { count: 'exact', head: true });
    checks.oracle_sops = { status: 'ok', count: count || 0 };
  } catch {
    checks.oracle_sops = { status: 'skip' };
  }

  const duration = Date.now() - start;

  return res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    response_ms: duration,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    crons_configured: 8,
  });
}
