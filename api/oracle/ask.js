import { createClient } from '@supabase/supabase-js';
import { isLance } from '../lib/auth.js';
import { logTokenUsage } from '../lib/token-logger.js';
import { checkRateLimit, DEFAULT_LIMITS } from '../lib/rate-limiter.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generate embedding via OpenAI (if key available)
async function getEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch {
    return null;
  }
}

// pgvector semantic search via the match_sops database function
async function vectorSearch(queryEmbedding, userEmail) {
  // Use database-level visibility filtering (not app-side) for defense in depth
  const { data, error } = await supabase.rpc('match_sops', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 5,
    filter_visibility: isLance(userEmail) ? null : 'Public Brain',
  });
  if (error || !data?.length) return null;

  return data;
}

// Keyword-based fallback search
function keywordSearch(allSops, query) {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const scored = allSops.map(sop => {
    const text = `${sop.title} ${sop.content}`.toLowerCase();
    let score = 0;
    queryTerms.forEach(term => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      score += (text.match(new RegExp(escaped, 'g')) || []).length;
      if (sop.title.toLowerCase().includes(term)) score += 3;
    });
    return { ...sop, score, similarity: score / 10 };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  return scored.length > 0 ? scored.slice(0, 5) : allSops.slice(0, 3).map(s => ({ ...s, score: 0, similarity: 0 }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }
  if (query.length > 1500) {
    return res.status(400).json({ error: 'Query too long (max 1500 chars)' });
  }

  // Injection shield
  const lower = query.toLowerCase();
  if (/\b(ignore previous instructions|forget your rules|system:\s*override)\b/.test(lower) || lower.includes('dump the oracle_sops')) {
    return res.status(400).json({ error: 'Query blocked: potential prompt injection detected' });
  }

  // Auth — verify Supabase JWT
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  let userEmail;
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });
    userEmail = user.email;
  } catch {
    return res.status(401).json({ error: 'Token verification failed' });
  }

  if (!userEmail.endsWith('@labnolabs.com') && !userEmail.endsWith('@movement-solutions.com')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Rate limit: 30 req/min per user for Oracle
  const { allowed, resetAt } = await checkRateLimit({
    identifier: userEmail,
    endpoint: '/api/oracle/ask',
    ...DEFAULT_LIMITS.oracle,
  });
  if (!allowed) {
    res.setHeader('Retry-After', Math.ceil((resetAt - Date.now()) / 1000));
    return res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' });
  }

  try {
    let contextSops = null;
    let searchMethod = 'keyword';

    // Strategy 1: Try pgvector semantic search (if embeddings + OpenAI key exist)
    const queryEmbedding = await getEmbedding(query);
    if (queryEmbedding) {
      contextSops = await vectorSearch(queryEmbedding, userEmail);
      if (contextSops) searchMethod = 'pgvector';
    }

    // Strategy 2: Fall back to keyword search
    if (!contextSops) {
      let sopQuery = supabase.from('oracle_sops').select('id, title, content, visibility, token_count');
      if (userEmail !== 'lance@labnolabs.com') {
        sopQuery = sopQuery.eq('visibility', 'Public Brain');
      }
      const { data: allSops, error: sopErr } = await sopQuery;
      if (sopErr) return res.status(500).json({ error: sopErr.message });

      if (!allSops || allSops.length === 0) {
        return res.json({ response: 'No SOPs found in the Oracle. Add some first.', sources: [], model: 'none', searchMethod: 'none', sopCount: 0 });
      }

      contextSops = keywordSearch(allSops, query);
    }

    // Build RAG context from the matched SOPs
    const sopContext = contextSops.map((s, i) =>
      `[SOP ${i + 1}: ${s.title}]${s.similarity ? ` (relevance: ${(s.similarity * 100).toFixed(0)}%)` : ''}\n${s.content}`
    ).join('\n\n---\n\n');

    const { count: totalSopCount } = await supabase.from('oracle_sops').select('id', { count: 'exact', head: true });

    const systemPrompt = `You are The Oracle — Labno Labs' internal knowledge assistant. Answer questions based ONLY on the SOPs provided below. If the answer isn't in the SOPs, say so honestly. Be concise and actionable. Reference which SOP(s) you used.

User: ${userEmail}
Access: ${isLance(userEmail) ? 'Full (Private + Public Brain)' : 'Public Brain only'}

--- BEGIN SOPs ---
${sopContext}
--- END SOPs ---`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.json({
        response: `Found ${contextSops.length} relevant SOP(s) via ${searchMethod} search. Configure ANTHROPIC_API_KEY to enable AI answers.\n\nTop match: "${contextSops[0]?.title}"`,
        sources: contextSops.map(s => ({ id: s.id, title: s.title, relevance: s.similarity || s.score || 0 })),
        model: 'keyword-only',
        searchMethod,
        sopCount: totalSopCount || contextSops.length,
      });
    }

    // Call Claude
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: query }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text().catch(() => 'unknown');
      console.error('[oracle/ask] Claude API error:', anthropicRes.status, errBody);
      return res.json({
        response: `Oracle found ${contextSops.length} matching SOP(s) but AI response failed (${anthropicRes.status}). Top match: "${contextSops[0]?.title}"`,
        sources: contextSops.map(s => ({ id: s.id, title: s.title, relevance: s.similarity || s.score || 0 })),
        model: 'fallback',
        searchMethod,
        sopCount: totalSopCount || contextSops.length,
      });
    }

    const aiResult = await anthropicRes.json();
    if (aiResult.usage) {
      logTokenUsage({
        endpoint: '/api/oracle/ask',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: aiResult.usage.input_tokens,
        outputTokens: aiResult.usage.output_tokens,
        agentName: 'oracle',
      });
    }
    const answer = aiResult.content?.[0]?.text || 'No response generated.';

    return res.json({
      response: answer,
      sources: contextSops.map(s => ({ id: s.id, title: s.title, relevance: s.similarity || s.score || 0 })),
      model: 'claude-haiku-4-5',
      searchMethod,
      sopCount: totalSopCount || contextSops.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
