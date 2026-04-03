/**
 * model-router.js — Smart Model Selection for Labno Labs Center
 *
 * Scores a task on 5 dimensions and returns the cheapest AI model
 * that meets the quality threshold. Import this in any API route
 * before making an AI call.
 *
 * Usage:
 *   import { selectModel } from '../lib/model-router.js'
 *   const { model, tier, estimatedCost } = selectModel({
 *     task: 'Summarize a clinical protocol',
 *     inputTokens: 5000,
 *     quality: 'high'
 *   })
 */

import { PRICING } from './token-logger.js';

// ── Model catalog with capabilities ─────────────────────────────────
const MODELS = {
  // Tier 0: Nano / Free
  'gemini-flash-lite':    { tier: 0, tierName: 'nano',     provider: 'google',    maxContext: 1_000_000, speed: 'fast'    },
  // Tier 1: Budget
  'gemini-2.0-flash':     { tier: 1, tierName: 'budget',   provider: 'google',    maxContext: 1_000_000, speed: 'fast'    },
  'claude-haiku-4-5-20251001': { tier: 1, tierName: 'budget', provider: 'anthropic', maxContext: 200_000, speed: 'fast'  },
  'gpt-4o-mini':          { tier: 1, tierName: 'budget',   provider: 'openai',    maxContext: 128_000,  speed: 'fast'    },
  // Tier 2: Mid
  'claude-sonnet-4-6-20250514': { tier: 2, tierName: 'mid', provider: 'anthropic', maxContext: 200_000, speed: 'medium' },
  'gpt-4o':               { tier: 2, tierName: 'mid',      provider: 'openai',    maxContext: 128_000,  speed: 'medium'  },
  'gemini-2.5-pro':       { tier: 2, tierName: 'mid',      provider: 'google',    maxContext: 1_000_000, speed: 'medium' },
  // Tier 3: Frontier
  'claude-opus-4-6':      { tier: 3, tierName: 'frontier', provider: 'anthropic', maxContext: 1_000_000, speed: 'slow'   },
  'gpt-o3':               { tier: 3, tierName: 'frontier', provider: 'openai',    maxContext: 200_000,  speed: 'slow'    },
};

// ── Task pattern heuristics ──────────────────────────────────────────
// Returns [reasoning, context, speed, precision, domain]
const TASK_PATTERNS = {
  'reformat':       [1, 1, 2, 2, 1],
  'classify':       [2, 1, 3, 2, 1],
  'extract text':   [2, 2, 2, 3, 1],
  'extract table':  [2, 2, 2, 3, 1],
  'summarize':      [3, 3, 2, 3, 2],
  'condense':       [3, 3, 2, 3, 2],
  'generate code':  [3, 2, 3, 3, 3],
  'write code':     [3, 2, 3, 3, 3],
  'debug':          [4, 4, 3, 4, 3],
  'clinical':       [3, 3, 2, 4, 4],
  'hipaa':          [5, 3, 2, 5, 5],
  'billing':        [3, 2, 2, 4, 4],
  'legal':          [4, 3, 2, 5, 4],
  'agent system':   [5, 4, 1, 4, 5],
  'architect':      [5, 4, 1, 4, 5],
  'oracle query':   [2, 2, 4, 3, 2],
  'blog post':      [2, 1, 3, 2, 2],
  'briefing':       [2, 2, 3, 3, 2],
  'lead scoring':   [2, 1, 3, 2, 2],
};

const QUALITY_MINIMUMS = { exact: 3, high: 2, 'good-enough': 0 };

// ── Scoring ──────────────────────────────────────────────────────────
function autoScore(taskDescription) {
  const lower = taskDescription.toLowerCase();
  let best = null;
  let bestLen = 0;

  for (const [pattern, scores] of Object.entries(TASK_PATTERNS)) {
    if (lower.includes(pattern) && pattern.length > bestLen) {
      best = scores;
      bestLen = pattern.length;
    }
  }

  if (best) {
    return { reasoning: best[0], context: best[1], speed: best[2], precision: best[3], domain: best[4], matched: true };
  }
  return { reasoning: 3, context: 2, speed: 3, precision: 3, domain: 2, matched: false };
}

function adjustForContext(scores, inputTokens) {
  if (inputTokens > 200_000) scores.context = Math.max(scores.context, 5);
  else if (inputTokens > 64_000) scores.context = Math.max(scores.context, 4);
  else if (inputTokens > 16_000) scores.context = Math.max(scores.context, 3);
  else if (inputTokens > 4_000) scores.context = Math.max(scores.context, 2);
  return scores;
}

function determineTier(scores, quality = 'good-enough') {
  const total = scores.reasoning + scores.context + scores.speed + scores.precision + scores.domain;
  const maxDim = Math.max(scores.reasoning, scores.context, scores.speed, scores.precision, scores.domain);
  let minTier = QUALITY_MINIMUMS[quality] ?? 0;

  if (scores.precision >= 5) minTier = Math.max(minTier, 3);
  if (scores.context >= 5) minTier = Math.max(minTier, 2);

  let tier;
  if (total <= 8 && maxDim <= 2) tier = 0;
  else if (total <= 14 && maxDim <= 3) tier = 1;
  else if (total <= 19 || maxDim === 4) tier = 2;
  else tier = 3;

  return Math.max(tier, minTier);
}

// ── Main export ──────────────────────────────────────────────────────

/**
 * Select the optimal model for a task.
 *
 * @param {Object} params
 * @param {string} params.task - Description of what the AI needs to do
 * @param {number} [params.inputTokens=2000] - Estimated input tokens
 * @param {string} [params.quality='good-enough'] - 'exact' | 'high' | 'good-enough'
 * @param {string} [params.preferProvider] - 'anthropic' | 'openai' | 'google' (optional preference)
 * @returns {{ model: string, tier: number, tierName: string, provider: string, scores: Object, estimatedCost: number }}
 */
export function selectModel({ task, inputTokens = 2000, quality = 'good-enough', preferProvider = null }) {
  let scores = autoScore(task);
  scores = adjustForContext(scores, inputTokens);
  const tier = determineTier(scores, quality);

  // Find cheapest model at this tier
  const contextNeeded = { 1: 4_000, 2: 16_000, 3: 64_000, 4: 200_000, 5: 500_000 };
  const minContext = contextNeeded[scores.context] || 4_000;

  let candidates = Object.entries(MODELS)
    .filter(([, m]) => m.tier === tier && m.maxContext >= minContext)
    .map(([id, m]) => {
      const rates = PRICING[id] || { input: 0, output: 0 };
      return { model: id, ...m, inputRate: rates.input, outputRate: rates.output };
    })
    .sort((a, b) => a.inputRate - b.inputRate);

  // Apply provider preference if specified
  if (preferProvider && candidates.length > 1) {
    const preferred = candidates.filter(c => c.provider === preferProvider);
    if (preferred.length > 0) candidates = preferred;
  }

  // Fallback: try next tier up
  if (candidates.length === 0) {
    candidates = Object.entries(MODELS)
      .filter(([, m]) => m.tier === tier + 1 && m.maxContext >= minContext)
      .map(([id, m]) => {
        const rates = PRICING[id] || { input: 0, output: 0 };
        return { model: id, ...m, inputRate: rates.input, outputRate: rates.output };
      })
      .sort((a, b) => a.inputRate - b.inputRate);
  }

  const selected = candidates[0] || { model: 'claude-sonnet-4-6-20250514', tier: 2, tierName: 'mid', provider: 'anthropic' };

  // Estimate cost for this request
  const outputEstimate = Math.max(500, Math.floor(inputTokens / 4));
  const rates = PRICING[selected.model] || { input: 3, output: 15 };
  const estimatedCost = (inputTokens * rates.input + outputEstimate * rates.output) / 1_000_000;

  return {
    model: selected.model,
    tier: selected.tier ?? tier,
    tierName: selected.tierName ?? ['nano', 'budget', 'mid', 'frontier'][tier],
    provider: selected.provider ?? 'anthropic',
    scores,
    estimatedCost: Math.round(estimatedCost * 1_000_000) / 1_000_000,
  };
}

/**
 * Compare costs across all models for given token counts.
 * Useful for dashboard display.
 */
export function compareModels(inputTokens, outputTokens) {
  return Object.entries(MODELS)
    .map(([id, m]) => {
      const rates = PRICING[id] || { input: 0, output: 0 };
      const cost = (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
      return { model: id, ...m, cost: Math.round(cost * 1_000_000) / 1_000_000 };
    })
    .sort((a, b) => a.cost - b.cost);
}
