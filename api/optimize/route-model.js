/**
 * POST /api/optimize/route-model
 *
 * Smart model selection endpoint. Given a task description,
 * returns the optimal model, tier, estimated cost, and full comparison.
 *
 * Body: { task: string, inputTokens?: number, quality?: 'exact'|'high'|'good-enough' }
 * Returns: { recommended: {...}, comparison: [...], savings: string }
 */

import { selectModel, compareModels } from '../lib/model-router.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { task, inputTokens = 2000, outputTokens, quality = 'good-enough' } = req.body;

  if (!task) {
    return res.status(400).json({ error: 'Missing required field: task' });
  }

  const outTokens = outputTokens || Math.max(500, Math.floor(inputTokens / 4));

  // Get recommendation
  const recommended = selectModel({ task, inputTokens, quality });

  // Get full comparison
  const comparison = compareModels(inputTokens, outTokens);

  // Calculate savings vs Opus baseline
  const opusEntry = comparison.find(c => c.model === 'claude-opus-4-6');
  const opusCost = opusEntry ? opusEntry.cost : 0;
  const savingsPct = opusCost > 0
    ? Math.round((1 - recommended.estimatedCost / opusCost) * 100)
    : 0;

  return res.status(200).json({
    recommended,
    comparison,
    savings: `${savingsPct}% vs Opus`,
    opusCost,
  });
}
