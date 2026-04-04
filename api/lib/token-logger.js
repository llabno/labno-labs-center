import { createClient } from '@supabase/supabase-js';

// Per-million-token pricing (USD) — April 2026
const PRICING = {
  // Anthropic
  'claude-opus-4-6':            { input: 15.00, output: 75.00, cache_read: 1.50,  cache_creation: 18.75 },
  'claude-sonnet-4-6':          { input: 3.00,  output: 15.00, cache_read: 0.30,  cache_creation: 3.75  },
  'claude-sonnet-4-6': { input: 3.00,  output: 15.00, cache_read: 0.30,  cache_creation: 3.75  },
  'claude-sonnet-4-20250514':   { input: 3.00,  output: 15.00, cache_read: 0.30,  cache_creation: 3.75  },
  'claude-haiku-4-5':           { input: 0.80,  output: 4.00,  cache_read: 0.08,  cache_creation: 1.00  },
  'claude-haiku-4-5-20251001':  { input: 0.80,  output: 4.00,  cache_read: 0.08,  cache_creation: 1.00  },
  'claude-3-5-haiku-20241022':  { input: 0.80,  output: 4.00,  cache_read: 0.08,  cache_creation: 1.00  },
  // OpenAI
  'gpt-4o':                     { input: 2.50,  output: 10.00, cache_read: 1.25,  cache_creation: 2.50  },
  'gpt-4o-mini':                { input: 0.15,  output: 0.60,  cache_read: 0.075, cache_creation: 0.15  },
  'gpt-o3':                     { input: 10.00, output: 40.00, cache_read: 5.00,  cache_creation: 10.00 },
  // Google
  'gemini-2.0-flash':           { input: 0.10,  output: 0.40,  cache_read: 0.025, cache_creation: 0.10  },
  'gemini-2.5-pro':             { input: 1.25,  output: 10.00, cache_read: 0.315, cache_creation: 1.25  },
  'gemini-flash-lite':          { input: 0.00,  output: 0.00,  cache_read: 0.00,  cache_creation: 0.00  },
  // Embeddings
  'text-embedding-3-small':     { input: 0.02,  output: 0.00,  cache_read: 0.00,  cache_creation: 0.00  },
};

function estimateCost(model, inputTokens, outputTokens, cacheReadTokens = 0, cacheCreationTokens = 0) {
  const rates = PRICING[model];
  if (!rates) return 0;
  return (
    inputTokens * rates.input +
    outputTokens * rates.output +
    cacheReadTokens * (rates.cache_read || 0) +
    cacheCreationTokens * (rates.cache_creation || 0)
  ) / 1_000_000;
}

/** Expose pricing table for model-router and dashboard use */
export { PRICING };

/**
 * Log token usage from an AI API call. Fire-and-forget — does not throw.
 *
 * @param {Object} params
 * @param {string} params.endpoint   - e.g. '/api/oracle/ask'
 * @param {string} params.model      - e.g. 'claude-3-5-haiku-20241022'
 * @param {number} params.inputTokens
 * @param {number} params.outputTokens
 * @param {string} [params.taskId]   - FK to global_tasks
 * @param {string} [params.agentName]
 * @param {Object} [params.metadata] - arbitrary JSON
 */
export function logTokenUsage({ endpoint, model, inputTokens = 0, outputTokens = 0, taskId, agentName, metadata }) {
  const totalTokens = inputTokens + outputTokens;
  const estimatedCostUsd = estimateCost(model, inputTokens, outputTokens);

  // Fire-and-forget: intentionally not awaited by caller
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  supabase.from('token_usage_log').insert({
    endpoint,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    estimated_cost_usd: estimatedCostUsd,
    task_id: taskId || null,
    agent_name: agentName || null,
    metadata: metadata || {},
  }).then(({ error }) => {
    if (error) console.error('[token-logger] insert failed:', error.message);
  });
}
