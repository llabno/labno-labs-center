import { createClient } from '@supabase/supabase-js';

// Default limits per endpoint category
const DEFAULT_LIMITS = {
  oracle: { limit: 30, windowSeconds: 60 },
  agent: { limit: 10, windowSeconds: 60 },
  readonly: { limit: 60, windowSeconds: 60 },
};

/**
 * Check whether a request is allowed under the rate limit.
 *
 * @param {Object} params
 * @param {string} params.identifier - User email or IP address
 * @param {string} params.endpoint   - Endpoint path (e.g. '/api/oracle/ask')
 * @param {number} [params.limit]    - Max requests allowed in window
 * @param {number} [params.windowSeconds] - Window size in seconds
 * @returns {Promise<{ allowed: boolean, remaining: number, resetAt: Date }>}
 */
export async function checkRateLimit({
  identifier,
  endpoint,
  limit = DEFAULT_LIMITS.readonly.limit,
  windowSeconds = DEFAULT_LIMITS.readonly.windowSeconds,
}) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: allowed, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error('[rate-limiter] RPC failed:', error.message);
      // Fail open — allow the request if rate limiting itself fails
      return { allowed: true, remaining: limit, resetAt: new Date(Date.now() + windowSeconds * 1000) };
    }

    // Estimate remaining (approximate — the RPC already inserted this request)
    const remaining = allowed ? Math.max(limit - 1, 0) : 0;
    const resetAt = new Date(Date.now() + windowSeconds * 1000);

    return { allowed, remaining, resetAt };
  } catch (err) {
    console.error('[rate-limiter] unexpected error:', err.message);
    // Fail open
    return { allowed: true, remaining: limit, resetAt: new Date(Date.now() + windowSeconds * 1000) };
  }
}

export { DEFAULT_LIMITS };
