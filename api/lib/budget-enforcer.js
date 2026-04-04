/**
 * budget-enforcer.js — Token Budget Enforcement for Agent Dispatch
 *
 * Checks remaining budget before any AI API call. Acts as a circuit breaker
 * to prevent recursive debugging loops and hallucination spirals from
 * burning through the $25/mo API budget.
 *
 * Usage:
 *   import { checkBudget, recordSpend } from '../lib/budget-enforcer.js'
 *
 *   const check = await checkBudget({ agentName: 'mechanic', estimatedCostUsd: 0.05 })
 *   if (!check.allowed) return res.status(429).json({ error: check.reason })
 *
 *   // ... make AI call ...
 *   await recordSpend({ agentName: 'mechanic', actualCostUsd: 0.03 })
 */

import { createClient } from '@supabase/supabase-js';
import permissions from './agent-permissions.json' with { type: 'json' };

const { agents: AGENT_PERMS, global_rules: GLOBAL } = permissions;

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Get total spend for an agent within a time window.
 */
async function getAgentSpend(supabase, agentName, windowStart) {
  const { data, error } = await supabase
    .from('token_usage_log')
    .select('estimated_cost_usd')
    .eq('agent_name', agentName)
    .gte('created_at', windowStart.toISOString());

  if (error) {
    console.error('[budget-enforcer] query failed:', error.message);
    return 0;
  }
  return (data || []).reduce((sum, row) => sum + (parseFloat(row.estimated_cost_usd) || 0), 0);
}

/**
 * Get total spend across ALL agents this month.
 */
async function getMonthlySpend(supabase) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('token_usage_log')
    .select('estimated_cost_usd')
    .gte('created_at', monthStart.toISOString());

  if (error) {
    console.error('[budget-enforcer] monthly query failed:', error.message);
    return 0;
  }
  return (data || []).reduce((sum, row) => sum + (parseFloat(row.estimated_cost_usd) || 0), 0);
}

/**
 * Check if an agent is allowed to spend the estimated cost.
 *
 * Returns { allowed: boolean, reason?: string, budgetStatus: object }
 */
export async function checkBudget({ agentName, estimatedCostUsd = 0, taskId = null }) {
  const supabase = getSupabase();
  const agentConfig = AGENT_PERMS[agentName];

  // Unknown agent — deny by default
  if (!agentConfig) {
    return {
      allowed: false,
      reason: `Unknown agent "${agentName}" — not in permission matrix`,
      budgetStatus: {}
    };
  }

  const now = new Date();

  // 1. Check per-run budget
  if (estimatedCostUsd > agentConfig.budget_per_run_usd) {
    return {
      allowed: false,
      reason: `Estimated cost $${estimatedCostUsd.toFixed(4)} exceeds per-run limit $${agentConfig.budget_per_run_usd} for ${agentName}`,
      budgetStatus: { per_run_limit: agentConfig.budget_per_run_usd, estimated: estimatedCostUsd }
    };
  }

  // 2. Check daily budget
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dailySpend = await getAgentSpend(supabase, agentName, dayStart);
  const dailyRemaining = agentConfig.budget_daily_usd - dailySpend;

  if (estimatedCostUsd > dailyRemaining) {
    return {
      allowed: false,
      reason: `Daily budget exhausted for ${agentName}: spent $${dailySpend.toFixed(4)} of $${agentConfig.budget_daily_usd} limit. Estimated cost $${estimatedCostUsd.toFixed(4)} exceeds remaining $${dailyRemaining.toFixed(4)}`,
      budgetStatus: {
        daily_limit: agentConfig.budget_daily_usd,
        daily_spent: dailySpend,
        daily_remaining: dailyRemaining,
        estimated: estimatedCostUsd
      }
    };
  }

  // 3. Check global monthly budget
  const monthlySpend = await getMonthlySpend(supabase);
  const monthlyLimit = GLOBAL.max_monthly_budget_usd;
  const monthlyRemaining = monthlyLimit - monthlySpend;
  const monthlyPct = (monthlySpend / monthlyLimit) * 100;

  // Hard stop at 95%
  if (monthlyPct >= GLOBAL.hard_stop_threshold_pct) {
    return {
      allowed: false,
      reason: `GLOBAL MONTHLY BUDGET HARD STOP: $${monthlySpend.toFixed(2)} of $${monthlyLimit} spent (${monthlyPct.toFixed(1)}%). All agent operations halted until next month or manual override.`,
      budgetStatus: {
        monthly_limit: monthlyLimit,
        monthly_spent: monthlySpend,
        monthly_remaining: monthlyRemaining,
        monthly_pct: monthlyPct,
        hard_stop: true
      }
    };
  }

  // Alert at 80%
  const alert = monthlyPct >= GLOBAL.budget_alert_threshold_pct;

  return {
    allowed: true,
    alert,
    alertMessage: alert ? `WARNING: Monthly budget at ${monthlyPct.toFixed(1)}% ($${monthlySpend.toFixed(2)} of $${monthlyLimit})` : null,
    budgetStatus: {
      agent: agentName,
      per_run_limit: agentConfig.budget_per_run_usd,
      daily_limit: agentConfig.budget_daily_usd,
      daily_spent: dailySpend,
      daily_remaining: dailyRemaining,
      monthly_limit: monthlyLimit,
      monthly_spent: monthlySpend,
      monthly_remaining: monthlyRemaining,
      monthly_pct: monthlyPct,
      estimated: estimatedCostUsd
    }
  };
}

/**
 * Record actual spend after an API call completes.
 * This is a convenience wrapper — most callers already use logTokenUsage().
 * Use this for budget alert side-effects (logging warnings).
 */
export async function recordSpend({ agentName, actualCostUsd }) {
  const supabase = getSupabase();
  const monthlySpend = await getMonthlySpend(supabase);
  const monthlyPct = ((monthlySpend + actualCostUsd) / GLOBAL.max_monthly_budget_usd) * 100;

  if (monthlyPct >= GLOBAL.budget_alert_threshold_pct) {
    console.warn(`[budget-enforcer] ⚠ Monthly spend at ${monthlyPct.toFixed(1)}% after ${agentName} spent $${actualCostUsd.toFixed(4)}`);
  }

  return { monthlySpend: monthlySpend + actualCostUsd, monthlyPct };
}

/**
 * Get full budget dashboard data for all agents.
 * Used by the Agent Observability Dashboard.
 */
export async function getBudgetDashboard() {
  const supabase = getSupabase();
  const now = new Date();

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const agentSummaries = {};

  for (const [name, config] of Object.entries(AGENT_PERMS)) {
    const dailySpend = await getAgentSpend(supabase, name, dayStart);
    const monthlySpend = await getAgentSpend(supabase, name, monthStart);

    agentSummaries[name] = {
      daily_limit: config.budget_daily_usd,
      daily_spent: dailySpend,
      daily_remaining: config.budget_daily_usd - dailySpend,
      daily_pct: (dailySpend / config.budget_daily_usd) * 100,
      monthly_spent: monthlySpend,
      per_run_limit: config.budget_per_run_usd,
      model: config.preferred_model,
    };
  }

  const totalMonthlySpend = await getMonthlySpend(supabase);

  return {
    global: {
      monthly_limit: GLOBAL.max_monthly_budget_usd,
      monthly_spent: totalMonthlySpend,
      monthly_remaining: GLOBAL.max_monthly_budget_usd - totalMonthlySpend,
      monthly_pct: (totalMonthlySpend / GLOBAL.max_monthly_budget_usd) * 100,
      alert_threshold_pct: GLOBAL.budget_alert_threshold_pct,
      hard_stop_pct: GLOBAL.hard_stop_threshold_pct,
    },
    agents: agentSummaries,
    generated_at: now.toISOString(),
  };
}
