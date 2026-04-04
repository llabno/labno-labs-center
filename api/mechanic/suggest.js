import { createClient } from '@supabase/supabase-js';
import { callAnthropic } from '../lib/call-anthropic.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STEP_GUIDANCE = {
  check_readiness: 'You are helping the user check if a part is ready to begin unburdening. Ask gentle questions about willingness. Honor any resistance — it is protective, not obstructive. Speak to both the part and the Self.',
  listen: 'You are helping the user witness what this part has to say. Reflect back what the part is sharing with resonant language. Do not fix, advise, or interpret. Use "It sounds like..." and "Is that right?" Mirror the felt sense.',
  do_over: 'You are helping the user offer a corrective experience. Ask what the part needed then — safety, protection, being seen, being held. Guide the user to imagine providing that now from Self energy.',
  release: 'You are guiding a burden release visualization. Ask how the part wants to let go — fire, water, wind, earth, light. Let the part choose. Watch for somatic shifts. Encourage noticing what changes in the body.',
  new_qualities: 'Space has opened. Help the part choose what to fill it with — confidence, playfulness, peace, trust, curiosity, joy. The part gets to choose, not the Self. Ask what it wants.',
  integrate: 'You are closing the session. Help welcome the unburdened part back. Check in with other parts — how do they respond? Notice shifts in the body. Express gratitude for the courage this took.',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, currentStep, partName } = req.body || {};
  if (!messages || !currentStep) {
    return res.status(400).json({ error: 'Missing messages or currentStep' });
  }

  // Auth — verify Supabase JWT
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.split(' ')[1]);
      if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });
    } catch {
      return res.status(401).json({ error: 'Token verification failed' });
    }
  }

  // API key validated inside callAnthropic

  const stepGuidance = STEP_GUIDANCE[currentStep] || '';

  const systemPrompt = `You are a compassionate IFS (Internal Family Systems) guide integrated with Sarah Peyton's resonant language approach. You are helping someone work with their internal parts.

Current part being worked with: ${partName || 'Unknown'}
Current step: ${currentStep}

${stepGuidance}

Guidelines:
- Use warm, resonant language. Speak to the person's Self energy.
- Reference somatic awareness — "What do you notice in your body?"
- Never rush. Honor the pace of the part.
- Use Sarah Peyton's resonant language patterns: "It sounds like there might be a part of you that..." and "Would it be accurate to say..."
- Keep responses to 2-4 sentences. This is a conversation, not a lecture.
- If you sense an unconscious contract, gently name it: "I wonder if there's a vow here — something like 'I will always ___ in order to ___'"
- Never diagnose, pathologize, or give medical advice.
- This is a self-guided process. You are a mirror, not an authority.`;

  // Build conversation from session messages
  const anthropicMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: m.content }));

  // Add context prompt if this is the first user message at a new step
  if (anthropicMessages.length === 0) {
    anthropicMessages.push({ role: 'user', content: `I'm starting the ${currentStep} step with my part called ${partName}. Guide me.` });
  }

  try {
    const { text } = await callAnthropic({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: systemPrompt,
      messages: anthropicMessages.slice(-10),
      endpoint: '/api/mechanic/suggest',
      agentName: 'mechanic-suggest',
    });

    if (text) {
      return res.status(200).json({ suggestion: text });
    }
    return res.status(500).json({ error: 'No response from model' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get suggestion', details: err.message });
  }
}
