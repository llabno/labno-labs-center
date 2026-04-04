/**
 * agent-alerts.js — Monitor and Alert on Failed Agent Runs
 *
 * Checks for failed agent runs in the last hour.
 * Can be called on-demand or added to a cron schedule.
 *
 * Returns alert status + details for dashboard display.
 * Future: hook into email/Slack notifications.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Failed runs in last hour
  const { data: recentFails } = await supabase
    .from('agent_runs')
    .select('id, task_title, error, created_at')
    .eq('status', 'failed')
    .gte('created_at', hourAgo)
    .order('created_at', { ascending: false });

  // All runs in last 24h for rate calculation
  const { data: allRuns24h } = await supabase
    .from('agent_runs')
    .select('id, status')
    .gte('created_at', dayAgo);

  const total24h = allRuns24h?.length || 0;
  const failed24h = allRuns24h?.filter(r => r.status === 'failed').length || 0;
  const failRate = total24h > 0 ? (failed24h / total24h * 100) : 0;

  // Budget-blocked runs (from our new budget enforcer)
  const budgetBlocked = allRuns24h?.filter(r => r.status === 'budget_blocked')?.length || 0;

  // Stale queued runs (queued > 30 min = probably stuck)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: staleQueued } = await supabase
    .from('agent_runs')
    .select('id, task_title, created_at')
    .eq('status', 'queued')
    .lt('created_at', thirtyMinAgo);

  // Determine alert level
  let alertLevel = 'ok';
  const alerts = [];

  if ((recentFails?.length || 0) >= 3) {
    alertLevel = 'critical';
    alerts.push(`${recentFails.length} agent failures in last hour`);
  } else if ((recentFails?.length || 0) >= 1) {
    alertLevel = 'warn';
    alerts.push(`${recentFails.length} agent failure(s) in last hour`);
  }

  if (failRate > 50 && total24h > 2) {
    alertLevel = 'critical';
    alerts.push(`24h failure rate: ${failRate.toFixed(1)}% (${failed24h}/${total24h})`);
  }

  if (budgetBlocked > 0) {
    alertLevel = alertLevel === 'ok' ? 'warn' : alertLevel;
    alerts.push(`${budgetBlocked} run(s) blocked by budget enforcer`);
  }

  if ((staleQueued?.length || 0) > 0) {
    alertLevel = alertLevel === 'ok' ? 'warn' : alertLevel;
    alerts.push(`${staleQueued.length} queued run(s) stuck >30min`);
  }

  return res.status(200).json({
    alert_level: alertLevel,
    alerts,
    recent_failures: (recentFails || []).map(f => ({
      id: f.id,
      task: f.task_title,
      error: f.error?.slice(0, 200),
      when: f.created_at,
    })),
    stats_24h: {
      total_runs: total24h,
      failed: failed24h,
      budget_blocked: budgetBlocked,
      fail_rate_pct: parseFloat(failRate.toFixed(1)),
    },
    stale_queued: (staleQueued || []).map(s => ({
      id: s.id,
      task: s.task_title,
      queued_since: s.created_at,
    })),
    checked_at: new Date().toISOString(),
  });
}
