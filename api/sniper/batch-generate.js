// Blog Batch Generation API
// Processes multiple SOAP notes from a queue, generates blog posts, saves as drafts
// POST /api/sniper/batch-generate — processes up to 5 queued SOAP notes

import { createClient } from '@supabase/supabase-js';
import { isLance } from '../lib/auth.js';
import { logTokenUsage } from '../lib/token-logger.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.split(' ')[1]);
  if (authErr || !user || !isLance(user.email)) {
    return res.status(403).json({ error: 'Only admins can batch-generate blog posts' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_SNIPER_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  // Fetch queued SOAP notes (from blog_queue table or request body)
  const soapNotes = req.body?.soap_notes || [];
  if (!Array.isArray(soapNotes) || soapNotes.length === 0) {
    return res.status(400).json({ error: 'Provide soap_notes array with at least one note' });
  }

  const batch = soapNotes.slice(0, 5); // Max 5 per batch
  const results = [];

  const systemPrompt = `You are the 'Sniper Agent' for Movement Solutions.
Your strict objective:
1. Read the provided physical therapy SOAP note.
2. STRIP ALL HIPAA IDENTIFIERS (Names, exact ages, dates, locations, employers).
3. Transform the clinical data into an engaging, anonymous 500-word blog post in Markdown.

Output JSON format ONLY:
{
  "title": "...",
  "slug": "...",
  "excerpt": "A one-sentence hook",
  "markdown_body": "...",
  "seo_tags": ["tag1", "tag2"],
  "category": "Clinical Pearls"
}`;

  for (const note of batch) {
    if (!note || note.length < 50) {
      results.push({ status: 'skipped', reason: 'Too short' });
      continue;
    }

    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: note }],
        }),
      });

      if (!anthropicRes.ok) {
        results.push({ status: 'error', reason: 'API error' });
        continue;
      }

      const aiResult = await anthropicRes.json();
      if (aiResult.usage) {
        logTokenUsage({
          endpoint: '/api/sniper/batch-generate',
          model: 'claude-3-5-haiku-20241022',
          inputTokens: aiResult.usage.input_tokens,
          outputTokens: aiResult.usage.output_tokens,
          agentName: 'sniper-batch',
        });
      }
      const rawText = aiResult.content?.[0]?.text || '';

      let post;
      try { post = JSON.parse(rawText); } catch {
        results.push({ status: 'error', reason: 'JSON parse failed' });
        continue;
      }

      const { error: insertErr } = await supabase.from('blog_posts').insert({
        title: post.title,
        slug: post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        excerpt: post.excerpt || '',
        content: post.markdown_body,
        author: 'Lance Labno, DPT',
        category: post.category || 'Clinical Pearls',
        status: 'draft',
        published_at: null,
      });

      results.push({ status: insertErr ? 'save_error' : 'success', title: post.title });
    } catch (err) {
      results.push({ status: 'error', reason: err.message });
    }
  }

  // Log to agent_runs
  await supabase.from('agent_runs').insert({
    task_title: `Blog Batch Generate (${results.filter(r => r.status === 'success').length}/${batch.length})`,
    status: 'completed',
    agent_route: 'api',
    result: JSON.stringify({ total: batch.length, results }),
  });

  return res.status(200).json({
    processed: batch.length,
    successful: results.filter(r => r.status === 'success').length,
    results,
  });
}
