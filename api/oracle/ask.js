import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  try {
    // Fetch SOPs — filter by visibility for non-Lance users
    let sopQuery = supabase.from('oracle_sops').select('id, title, content, visibility, token_count');
    if (userEmail !== 'lance@labnolabs.com') {
      sopQuery = sopQuery.eq('visibility', 'Public Brain');
    }
    const { data: allSops, error: sopErr } = await sopQuery;
    if (sopErr) return res.status(500).json({ error: sopErr.message });

    if (!allSops || allSops.length === 0) {
      return res.json({ response: 'No SOPs found in the Oracle. Add some first.', sources: [], model: 'none', sopCount: 0 });
    }

    // Keyword-based relevance ranking (until pgvector embeddings are wired)
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const scored = allSops.map(sop => {
      const text = `${sop.title} ${sop.content}`.toLowerCase();
      let score = 0;
      queryTerms.forEach(term => {
        score += (text.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (sop.title.toLowerCase().includes(term)) score += 3;
      });
      return { ...sop, score };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    const contextSops = scored.length > 0 ? scored.slice(0, 5) : allSops.slice(0, 3);

    // Build RAG context
    const sopContext = contextSops.map((s, i) => `[SOP ${i + 1}: ${s.title}]\n${s.content}`).join('\n\n---\n\n');

    const systemPrompt = `You are The Oracle — Labno Labs' internal knowledge assistant. Answer questions based ONLY on the SOPs provided below. If the answer isn't in the SOPs, say so honestly. Be concise and actionable. Reference which SOP(s) you used.

User: ${userEmail}
Access: ${userEmail === 'lance@labnolabs.com' ? 'Full (Private + Public Brain)' : 'Public Brain only'}

--- BEGIN SOPs ---
${sopContext}
--- END SOPs ---`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Fallback if API key not configured — return the matched SOPs directly
      return res.json({
        response: `Found ${contextSops.length} relevant SOP(s) for your query. Configure ANTHROPIC_API_KEY in Vercel to enable AI-powered answers.\n\nTop match: "${contextSops[0]?.title}"`,
        sources: contextSops.map(s => ({ id: s.id, title: s.title, relevance: s.score || 0 })),
        model: 'keyword-only',
        sopCount: allSops.length,
      });
    }

    // Call Claude via raw fetch (no SDK dependency needed)
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: query }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      return res.json({
        response: `Oracle found ${contextSops.length} matching SOP(s) but the AI response failed. Top match: "${contextSops[0]?.title}"\n\nTry again or check the ANTHROPIC_API_KEY.`,
        sources: contextSops.map(s => ({ id: s.id, title: s.title, relevance: s.score || 0 })),
        model: 'fallback',
        sopCount: allSops.length,
      });
    }

    const aiResult = await anthropicRes.json();
    const answer = aiResult.content?.[0]?.text || 'No response generated.';

    return res.json({
      response: answer,
      sources: contextSops.map(s => ({ id: s.id, title: s.title, relevance: s.score || 0 })),
      model: 'claude-3-haiku',
      sopCount: allSops.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
