/**
 * consolidate.js — Memory Consolidation Daemon (KAIROS-like)
 *
 * Runs nightly at 1:00 AM via Vercel Cron.
 * Compresses agent conversation history, summarizes old context,
 * discards irrelevant data, and logs token savings.
 *
 * What it does:
 * 1. Reads all agent_runs older than 24h with status=completed
 * 2. Groups by project, summarizes results into compressed digests
 * 3. Stores digests in memory_consolidation table
 * 4. Archives raw results (keeps them but marks as consolidated)
 * 5. Cleans up rate_limit_log entries older than 1 hour
 * 6. Reports token savings to token_usage_log
 *
 * Schedule: vercel.json → "0 6 * * *" (1 AM CST = 6 AM UTC)
 */

import { createClient } from '@supabase/supabase-js';
import { logTokenUsage, PRICING } from '../lib/token-logger.js';
import { checkBudget } from '../lib/budget-enforcer.js';

export const config = { maxDuration: 60 };

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Estimate token count from text (rough: ~4 chars per token).
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Summarize a batch of agent run results using Gemini Flash (cheapest).
 * Falls back to returning a simple concatenation if budget is exhausted.
 */
async function summarizeBatch(runs, projectName) {
  const combinedText = runs
    .map(r => `Task: ${r.task_title}\nResult: ${(r.result || '').slice(0, 500)}`)
    .join('\n---\n');

  const inputTokens = estimateTokens(combinedText + 200); // prompt overhead
  const estimatedCost = (inputTokens * PRICING['gemini-2.0-flash'].input + 500 * PRICING['gemini-2.0-flash'].output) / 1_000_000;

  // Check budget before calling AI
  const budgetCheck = await checkBudget({
    agentName: 'memory-consolidation',
    estimatedCostUsd: estimatedCost,
  });

  if (!budgetCheck.allowed) {
    console.warn(`[consolidate] Budget blocked: ${budgetCheck.reason}`);
    // Fallback: mechanical summary without AI
    return {
      summary: `[Budget-limited summary] ${runs.length} tasks completed for "${projectName}": ${runs.map(r => r.task_title).join(', ')}`,
      tokens_saved: estimateTokens(combinedText) - estimateTokens(runs.map(r => r.task_title).join(', ')),
      ai_used: false,
    };
  }

  // Use Gemini Flash for cheap summarization
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Summarize these ${runs.length} completed agent tasks for project "${projectName}" into a single concise paragraph. Focus on outcomes and key decisions. Discard debug info and intermediate steps.\n\n${combinedText}` }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.3 }
        })
      }
    );

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || `${runs.length} tasks completed for "${projectName}"`;
    const outputTokens = estimateTokens(summary);

    logTokenUsage({
      endpoint: '/api/memory/consolidate',
      model: 'gemini-2.0-flash',
      inputTokens,
      outputTokens,
      agentName: 'memory-consolidation',
      metadata: { project: projectName, runs_consolidated: runs.length }
    });

    return {
      summary,
      tokens_saved: estimateTokens(combinedText) - estimateTokens(summary),
      ai_used: true,
      cost_usd: estimatedCost,
    };
  } catch (err) {
    console.error('[consolidate] AI summarization failed:', err.message);
    return {
      summary: `[Fallback] ${runs.length} tasks completed for "${projectName}": ${runs.map(r => r.task_title).join(', ')}`,
      tokens_saved: estimateTokens(combinedText) - estimateTokens(runs.map(r => r.task_title).join(', ')),
      ai_used: false,
    };
  }
}

export default async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h ago

  console.log('[consolidate] Starting memory consolidation daemon...');

  // 1. Fetch completed agent runs older than 24h that haven't been consolidated
  const { data: runs, error: runErr } = await supabase
    .from('agent_runs')
    .select('id, task_title, project_name, result, completed_at')
    .eq('status', 'completed')
    .lt('completed_at', cutoff)
    .is('consolidated_at', null)
    .order('completed_at', { ascending: true })
    .limit(100);

  if (runErr) {
    console.error('[consolidate] Failed to fetch runs:', runErr.message);
    return res.status(500).json({ error: runErr.message });
  }

  if (!runs || runs.length === 0) {
    console.log('[consolidate] Nothing to consolidate');
    return res.status(200).json({ message: 'Nothing to consolidate', consolidated: 0 });
  }

  // 2. Group by project
  const byProject = {};
  for (const run of runs) {
    const proj = run.project_name || 'Unassigned';
    if (!byProject[proj]) byProject[proj] = [];
    byProject[proj].push(run);
  }

  let totalConsolidated = 0;
  let totalTokensSaved = 0;
  const digests = [];

  // 3. Summarize each project batch
  for (const [projectName, projectRuns] of Object.entries(byProject)) {
    console.log(`[consolidate] Processing ${projectRuns.length} runs for "${projectName}"...`);

    const result = await summarizeBatch(projectRuns, projectName);

    // 4. Store digest
    const { error: digestErr } = await supabase
      .from('memory_consolidation')
      .insert({
        project_name: projectName,
        summary: result.summary,
        runs_consolidated: projectRuns.length,
        tokens_saved: result.tokens_saved,
        ai_used: result.ai_used,
        cost_usd: result.cost_usd || 0,
        run_ids: projectRuns.map(r => r.id),
      });

    if (digestErr) {
      console.error(`[consolidate] Failed to store digest for "${projectName}":`, digestErr.message);
      continue;
    }

    // 5. Mark runs as consolidated
    const { error: updateErr } = await supabase
      .from('agent_runs')
      .update({ consolidated_at: new Date().toISOString() })
      .in('id', projectRuns.map(r => r.id));

    if (updateErr) {
      console.error(`[consolidate] Failed to mark runs as consolidated:`, updateErr.message);
    }

    totalConsolidated += projectRuns.length;
    totalTokensSaved += result.tokens_saved;
    digests.push({ project: projectName, runs: projectRuns.length, tokens_saved: result.tokens_saved });
  }

  // 6. Clean up old rate limit entries
  const rateCleanupCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await supabase.from('rate_limit_log').delete().lt('created_at', rateCleanupCutoff);

  // 7. Clean up old token usage detail (keep summary view, archive raw >30 days)
  // For now just log that we ran
  console.log(`[consolidate] Done. Consolidated ${totalConsolidated} runs, saved ~${totalTokensSaved} tokens.`);

  return res.status(200).json({
    consolidated: totalConsolidated,
    tokens_saved: totalTokensSaved,
    digests,
    ran_at: new Date().toISOString(),
  });
}
