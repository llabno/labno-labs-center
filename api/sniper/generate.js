import { createClient } from '@supabase/supabase-js';
import { callAnthropic } from '../lib/call-anthropic.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { soap_note } = req.body || {};
  if (!soap_note || typeof soap_note !== 'string' || soap_note.trim().length < 50) {
    return res.status(400).json({ error: 'SOAP note must be at least 50 characters' });
  }
  if (soap_note.length > 5000) {
    return res.status(400).json({ error: 'SOAP note too long (max 5000 chars)' });
  }

  // Auth — verify Supabase JWT, restrict to Lance only
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

  if (userEmail !== 'lance@labnolabs.com' && userEmail !== 'lance.labno@movement-solutions.com') {
    return res.status(403).json({ error: 'Only admins can generate clinical blog posts' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_SNIPER_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel' });
  }

  const systemPrompt = `You are the 'Sniper Agent' for Movement Solutions.
Your strict objective:
1. Read the provided physical therapy SOAP note.
2. STRIP ALL HIPAA IDENTIFIERS (Names, exact ages, dates, locations, employers).
3. Transform the clinical data (diagnosis, exercises prescribed, outcomes) into an engaging,
   educational, and anonymous 500-word blog post in Markdown format.

The blog post should follow the 'Oversubscribed' high-value marketing method:
- Title: Catchy, problem-solving.
- Intro: Explain the common mechanism of injury.
- The Fix: Explain the biomechanical solution used in the clinic today.
- Conclusion: Call to action to book an assessment.

Output JSON format ONLY:
{
  "title": "...",
  "slug": "...",
  "excerpt": "A one-sentence hook for the post",
  "markdown_body": "...",
  "seo_tags": ["tag1", "tag2"],
  "category": "Clinical Pearls"
}`;

  try {
    const { text: rawText } = await callAnthropic({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: soap_note }],
      endpoint: '/api/sniper/generate',
      agentName: 'sniper',
      apiKeyOverride: apiKey,
    });

    let post;
    try {
      post = JSON.parse(rawText);
    } catch {
      return res.status(500).json({ error: 'Failed to parse generated blog post as JSON', raw: rawText.slice(0, 500) });
    }

    return res.json({ status: 'success', post });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
