import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth — Lance only
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authErr || !user || user.email !== 'lance@labnolabs.com') {
      return res.status(403).json({ error: 'Only admins can trigger embedding generation' });
    }
  } catch {
    return res.status(401).json({ error: 'Token verification failed' });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured. Add it in Vercel env vars to enable pgvector semantic search.' });
  }

  try {
    // Fetch SOPs without embeddings
    const { data: sops, error: sopErr } = await supabase
      .from('oracle_sops')
      .select('id, title, content')
      .is('embedding', null);

    if (sopErr) return res.status(500).json({ error: sopErr.message });
    if (!sops || sops.length === 0) {
      return res.json({ message: 'All SOPs already have embeddings.', embedded: 0 });
    }

    let embedded = 0;
    const errors = [];

    // Process in batches of 10
    for (let i = 0; i < sops.length; i += 10) {
      const batch = sops.slice(i, i + 10);
      const texts = batch.map(s => `${s.title}\n\n${s.content}`);

      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
      });

      if (!embRes.ok) {
        errors.push(`OpenAI API error for batch ${i}: ${await embRes.text()}`);
        continue;
      }

      const embData = await embRes.json();

      for (let j = 0; j < batch.length; j++) {
        const embedding = embData.data?.[j]?.embedding;
        if (!embedding) { errors.push(`No embedding for SOP: ${batch[j].title}`); continue; }

        const { error: updateErr } = await supabase
          .from('oracle_sops')
          .update({ embedding: JSON.stringify(embedding) })
          .eq('id', batch[j].id);

        if (updateErr) errors.push(`Update failed for ${batch[j].title}: ${updateErr.message}`);
        else embedded++;
      }
    }

    return res.json({
      message: `Embedded ${embedded}/${sops.length} SOPs.`,
      embedded,
      total: sops.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
