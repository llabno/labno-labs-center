/**
 * call-anthropic.js — Shared Anthropic API wrapper for Labno Labs Center
 *
 * Every Anthropic API call in the project should go through this wrapper.
 * It provides:
 *   1. Response status validation (no more silent 404s/500s)
 *   2. Structured error logging to console + Supabase api_error_log
 *   3. One retry on transient failures (429, 500, 503, 529)
 *   4. Model ID validation against known models
 *   5. Automatic token logging via token-logger.js
 *
 * Usage:
 *   import { callAnthropic } from '../lib/call-anthropic.js';
 *
 *   const { text, usage } = await callAnthropic({
 *     model: 'claude-sonnet-4-6',
 *     max_tokens: 800,
 *     system: 'You are a helpful assistant.',
 *     messages: [{ role: 'user', content: 'Hello' }],
 *     endpoint: '/api/mechanic/analyze',   // for logging
 *     agentName: 'mechanic-m9',            // for logging
 *     taskId: 'optional-task-id',          // for logging
 *   });
 */

import { logTokenUsage } from './token-logger.js';
import { createClient } from '@supabase/supabase-js';

// ── Valid model IDs ─────────────────────────────────────────────────
// If a model ID isn't in this set, callAnthropic throws immediately
// instead of sending a request that returns a 404.
const VALID_MODELS = new Set([
  // Current aliases (preferred — no date suffix, always points to latest)
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  // Date-pinned versions (use only when you need reproducibility)
  'claude-sonnet-4-6-20250514',
  'claude-haiku-4-5-20251001',
  // Legacy (still active as of April 2026)
  'claude-3-5-haiku-20241022',
]);

const RETRYABLE_STATUS_CODES = new Set([429, 500, 503, 529]);
const RETRY_DELAY_MS = 1500;

// ── Error logger (fire-and-forget to Supabase) ─────────────────────
function logApiError({ endpoint, model, statusCode, errorType, errorMessage, requestBody }) {
  // Always log to console so Vercel logs capture it
  console.error(`[call-anthropic] FAILED | ${endpoint} | model=${model} | status=${statusCode} | ${errorType}: ${errorMessage}`);

  // Fire-and-forget to Supabase (if configured)
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key);
    supabase.from('api_error_log').insert({
      endpoint,
      model,
      status_code: statusCode,
      error_type: errorType,
      error_message: errorMessage,
      request_body_preview: requestBody ? JSON.stringify(requestBody).slice(0, 500) : null,
    }).then(({ error }) => {
      if (error) console.error('[call-anthropic] Failed to log error to Supabase:', error.message);
    });
  } catch {
    // Don't let error logging break the caller
  }
}

// ── Main export ─────────────────────────────────────────────────────

/**
 * Call the Anthropic Messages API with validation, retries, and logging.
 *
 * @param {Object} params
 * @param {string} params.model - Model ID (validated against VALID_MODELS)
 * @param {number} params.max_tokens - Max output tokens
 * @param {string} [params.system] - System prompt
 * @param {Array}  params.messages - Conversation messages
 * @param {string} [params.endpoint] - Caller endpoint for logging (e.g. '/api/mechanic/analyze')
 * @param {string} [params.agentName] - Agent name for token logging
 * @param {string} [params.taskId] - Task ID for token logging
 * @param {number} [params.temperature] - Temperature (0-1)
 * @param {string} [params.apiKeyOverride] - Use a specific API key instead of ANTHROPIC_API_KEY (e.g. ANTHROPIC_SNIPER_KEY)
 * @returns {Promise<{ text: string, usage: { input_tokens: number, output_tokens: number } }>}
 * @throws {AnthropicApiError} on non-retryable failures or after retry exhaustion
 */
export async function callAnthropic({
  model,
  max_tokens,
  system,
  messages,
  endpoint = 'unknown',
  agentName,
  taskId,
  temperature,
  apiKeyOverride,
}) {
  // ── 1. Validate model ID ──────────────────────────────────────────
  if (!VALID_MODELS.has(model)) {
    const err = new AnthropicApiError(
      `Invalid model ID: "${model}". Valid models: ${[...VALID_MODELS].join(', ')}`,
      'INVALID_MODEL',
      0,
    );
    logApiError({ endpoint, model, statusCode: 0, errorType: 'INVALID_MODEL', errorMessage: err.message });
    throw err;
  }

  // ── 2. Validate API key ───────────────────────────────────────────
  const apiKey = apiKeyOverride || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new AnthropicApiError('ANTHROPIC_API_KEY is not set', 'MISSING_API_KEY', 0);
    logApiError({ endpoint, model, statusCode: 0, errorType: 'MISSING_API_KEY', errorMessage: err.message });
    throw err;
  }

  // ── 3. Build request body ─────────────────────────────────────────
  const body = { model, max_tokens, messages };
  if (system) body.system = system;
  if (temperature !== undefined) body.temperature = temperature;

  // ── 4. Send with one retry on transient failures ──────────────────
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      // ── 4a. Check response status ──────────────────────────────────
      if (!response.ok) {
        let errorBody;
        try { errorBody = await response.text(); } catch { errorBody = 'Could not read error body'; }

        const statusCode = response.status;
        const errorType = statusCode === 401 ? 'AUTH_ERROR'
          : statusCode === 404 ? 'MODEL_NOT_FOUND'
          : statusCode === 429 ? 'RATE_LIMITED'
          : statusCode === 529 ? 'API_OVERLOADED'
          : `HTTP_${statusCode}`;

        // Retry on transient errors (first attempt only)
        if (attempt === 0 && RETRYABLE_STATUS_CODES.has(statusCode)) {
          console.warn(`[call-anthropic] ${endpoint} | ${errorType} (${statusCode}), retrying in ${RETRY_DELAY_MS}ms...`);
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          lastError = new AnthropicApiError(
            `Anthropic API ${statusCode}: ${errorBody.slice(0, 300)}`,
            errorType,
            statusCode,
          );
          continue;
        }

        // Non-retryable or second attempt — throw
        const err = new AnthropicApiError(
          `Anthropic API ${statusCode}: ${errorBody.slice(0, 300)}`,
          errorType,
          statusCode,
        );
        logApiError({ endpoint, model, statusCode, errorType, errorMessage: errorBody.slice(0, 500), requestBody: body });
        throw err;
      }

      // ── 4b. Parse successful response ──────────────────────────────
      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      const usage = {
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: data.usage?.output_tokens || 0,
      };

      // ── 4c. Warn if response is empty (API succeeded but no content)
      if (!text) {
        console.warn(`[call-anthropic] ${endpoint} | model=${model} | API returned 200 but content is empty. Stop reason: ${data.stop_reason}`);
      }

      // ── 4d. Log token usage (fire-and-forget) ──────────────────────
      if (data.usage) {
        logTokenUsage({
          endpoint,
          model,
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          taskId,
          agentName,
        });
      }

      return { text, usage };

    } catch (err) {
      // If it's already our error type, re-throw
      if (err instanceof AnthropicApiError) throw err;

      // Network error / fetch failure
      if (attempt === 0) {
        console.warn(`[call-anthropic] ${endpoint} | NETWORK_ERROR: ${err.message}, retrying...`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        lastError = err;
        continue;
      }

      const apiErr = new AnthropicApiError(
        `Network error calling Anthropic API: ${err.message}`,
        'NETWORK_ERROR',
        0,
      );
      logApiError({ endpoint, model, statusCode: 0, errorType: 'NETWORK_ERROR', errorMessage: err.message, requestBody: body });
      throw apiErr;
    }
  }

  // Should not reach here, but safety net
  throw lastError || new AnthropicApiError('Unknown error after retries', 'UNKNOWN', 0);
}

// ── Custom error class ──────────────────────────────────────────────

export class AnthropicApiError extends Error {
  /**
   * @param {string} message
   * @param {string} errorType - e.g. 'RATE_LIMITED', 'MODEL_NOT_FOUND', 'NETWORK_ERROR'
   * @param {number} statusCode - HTTP status code (0 for non-HTTP errors)
   */
  constructor(message, errorType, statusCode) {
    super(message);
    this.name = 'AnthropicApiError';
    this.errorType = errorType;
    this.statusCode = statusCode;
  }
}
