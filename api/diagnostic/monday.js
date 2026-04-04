/**
 * Monday Diagnostic Loop
 * ======================
 * Automated weekly health check for the Labno Labs ecosystem.
 * Runs via Vercel cron every Monday at 7:00 AM CT.
 *
 * Checks:
 * 1. Supabase health — table row counts, RLS status
 * 2. Stale tasks — anything in triage/backlog for >7 days
 * 3. Agent activity — runs in last 7 days, failure rate
 * 4. Token spend — weekly cost across all models
 * 5. Exercise DB gaps — NS classification coverage
 * 6. Wishlist queue — unprocessed items
 * 7. Intent compliance — escalation trigger activations
 *
 * Output: Structured briefing inserted into Supabase + optional webhook
 *
 * Cron config (vercel.json):
 *   { "path": "/api/diagnostic/monday", "schedule": "0 12 * * 1" }
 *   (12:00 UTC = 7:00 AM CT)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const weekAgoISO = weekAgo.toISOString();

  const briefing = {
    generated_at: now.toISOString(),
    type: 'monday_diagnostic',
    sections: {},
  };

  // ── 1. Table Health ──────────────────────────────────────
  const tables = ['internal_projects', 'global_tasks', 'agent_runs', 'wishlist', 'moso_rx', 'oracle_sops'];
  const tableCounts = {};
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    tableCounts[table] = error ? `ERROR: ${error.message}` : count;
  }
  briefing.sections.table_health = tableCounts;

  // ── 2. Stale Tasks ───────────────────────────────────────
  const { data: staleTasks } = await supabase
    .from('global_tasks')
    .select('id, title, column_id, updated_at')
    .in('column_id', ['backlog', 'triage'])
    .lt('updated_at', weekAgoISO)
    .order('updated_at', { ascending: true })
    .limit(20);

  briefing.sections.stale_tasks = {
    count: staleTasks?.length || 0,
    oldest: staleTasks?.slice(0, 5).map(t => ({
      title: t.title,
      column: t.column_id,
      last_updated: t.updated_at,
    })),
  };

  // ── 3. Agent Activity ────────────────────────────────────
  const { data: recentRuns } = await supabase
    .from('agent_runs')
    .select('id, status, created_at, task_id')
    .gte('created_at', weekAgoISO);

  const agentStats = {
    total_runs: recentRuns?.length || 0,
    completed: recentRuns?.filter(r => r.status === 'completed').length || 0,
    failed: recentRuns?.filter(r => r.status === 'failed').length || 0,
    queued: recentRuns?.filter(r => r.status === 'queued').length || 0,
    failure_rate: 0,
  };
  if (agentStats.total_runs > 0) {
    agentStats.failure_rate = Math.round((agentStats.failed / agentStats.total_runs) * 100) + '%';
  }
  briefing.sections.agent_activity = agentStats;

  // ── 4. Token Spend ───────────────────────────────────────
  const { data: tokenData } = await supabase
    .from('token_usage_log')
    .select('model, input_tokens, output_tokens, estimated_cost_usd')
    .gte('created_at', weekAgoISO);

  const tokenSummary = { total_cost: 0, by_model: {} };
  if (tokenData) {
    for (const row of tokenData) {
      const cost = Number(row.estimated_cost_usd) || 0;
      tokenSummary.total_cost += cost;
      if (!tokenSummary.by_model[row.model]) {
        tokenSummary.by_model[row.model] = { calls: 0, cost: 0 };
      }
      tokenSummary.by_model[row.model].calls++;
      tokenSummary.by_model[row.model].cost += cost;
    }
    tokenSummary.total_cost = Math.round(tokenSummary.total_cost * 100) / 100;
    for (const model of Object.keys(tokenSummary.by_model)) {
      tokenSummary.by_model[model].cost = Math.round(tokenSummary.by_model[model].cost * 100) / 100;
    }
  }
  briefing.sections.token_spend = tokenSummary;

  // ── 5. Exercise DB Coverage ──────────────────────────────
  const { count: totalExercises } = await supabase
    .from('moso_rx')
    .select('*', { count: 'exact', head: true });

  const { count: nsTagged } = await supabase
    .from('moso_rx')
    .select('*', { count: 'exact', head: true })
    .not('ns_color', 'is', null);

  briefing.sections.exercise_db = {
    total: totalExercises || 0,
    ns_classified: nsTagged || 0,
    ns_coverage: totalExercises ? Math.round((nsTagged / totalExercises) * 1000) / 10 + '%' : '0%',
    gap: (totalExercises || 0) - (nsTagged || 0),
  };

  // ── 6. Wishlist Queue ────────────────────────────────────
  const { data: wishlistItems } = await supabase
    .from('wishlist')
    .select('id, raw_text, status, created_at')
    .in('status', ['New', 'Pending'])
    .order('created_at', { ascending: true });

  briefing.sections.wishlist_queue = {
    unprocessed: wishlistItems?.length || 0,
    oldest: wishlistItems?.[0]?.created_at || null,
    items: wishlistItems?.slice(0, 5).map(w => ({
      text: w.raw_text?.substring(0, 80),
      status: w.status,
      created: w.created_at,
    })),
  };

  // ── 7. Escalation Triggers (last 7 days) ─────────────────
  const { data: escalations } = await supabase
    .from('agent_runs')
    .select('id, result, created_at')
    .gte('created_at', weekAgoISO)
    .like('result', '%ESCALATED%');

  briefing.sections.escalations = {
    count: escalations?.length || 0,
    details: escalations?.slice(0, 5).map(e => ({
      run_id: e.id,
      excerpt: e.result?.substring(0, 120),
      when: e.created_at,
    })),
  };

  // ── Generate Briefing Text ──────────────────────────────
  const s = briefing.sections;
  const briefingText = `
# Monday Diagnostic — ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

## Table Health
${Object.entries(s.table_health).map(([t, c]) => `- ${t}: ${c} rows`).join('\n')}

## Stale Tasks (${s.stale_tasks.count} items stuck >7 days)
${s.stale_tasks.oldest?.map(t => `- "${t.title}" in ${t.column} since ${new Date(t.last_updated).toLocaleDateString()}`).join('\n') || 'None'}

## Agent Activity (last 7 days)
- Total runs: ${s.agent_activity.total_runs}
- Completed: ${s.agent_activity.completed} | Failed: ${s.agent_activity.failed} | Queued: ${s.agent_activity.queued}
- Failure rate: ${s.agent_activity.failure_rate}

## Token Spend
- Weekly total: $${s.token_spend.total_cost}
${Object.entries(s.token_spend.by_model).map(([m, d]) => `- ${m}: ${d.calls} calls, $${d.cost}`).join('\n') || '- No API calls this week'}

## Exercise DB Coverage
- Total: ${s.exercise_db.total} | NS classified: ${s.exercise_db.ns_classified} (${s.exercise_db.ns_coverage})
- Gap: ${s.exercise_db.gap} exercises still need NS color

## Wishlist Queue (${s.wishlist_queue.unprocessed} unprocessed)
${s.wishlist_queue.items?.map(w => `- "${w.text}..." (${w.status})`).join('\n') || 'Empty'}

## Escalation Triggers (${s.escalations.count} this week)
${s.escalations.details?.map(e => `- ${e.excerpt}`).join('\n') || 'None fired'}
`.trim();

  // ── Store in Supabase ────────────────────────────────────
  const { error: insertError } = await supabase
    .from('agent_runs')
    .insert({
      status: 'completed',
      result: briefingText,
      task_id: null,
      created_at: now.toISOString(),
    });

  if (insertError) {
    console.error('Failed to store briefing:', insertError.message);
  }

  // Return briefing
  return res.status(200).json({
    success: true,
    briefing: briefingText,
    raw: briefing,
  });
}
