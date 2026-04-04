import { createClient } from '@supabase/supabase-js';
import { callAnthropic } from '../lib/call-anthropic.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TIME_TRAVEL_STEPS = {
  arrival: 'You are guiding the user to arrive at a memory. Help them see their younger self. Ask: "How old are you? Where are you? What is happening?" Use present tense. Be gentle — this is fragile ground.',
  witness: 'The user is witnessing what happened to their younger self. Your job is resonant witnessing — reflect back what the younger self experienced using felt-sense language. "It sounds like there was no one there who could see what was happening to you." Do not fix or reframe yet.',
  resonance: 'Now offer resonant language. Use Sarah Peyton\'s form: "Did your body ever get the message that [what they needed]?" or "Would it be accurate to say that there\'s a part of you that has been carrying [burden] since then?" Find the statement that lands — the one that brings tears or a deep exhale.',
  rewrite: 'The younger self has been witnessed. Now ask: "If your current self could go back, what would you say to that child? What would you do?" Let the user offer what was needed — safety, words, a hug, removal from the situation. This is the corrective experience.',
  return: 'Guide the user to bring the younger self forward into the present. "Can you imagine bringing that child with you, out of that memory, into now? What does it feel like to have them with you here?" Check for unconscious contracts: "Is there a vow that was made in that moment? Something like: I will never... or I will always..."',
  integrate: 'Close the session. Notice somatic shifts. Thank the younger self and the current self. Ask: "What is different in your body right now?" and "What does this part want to be called now?" End with: "This younger self has a new companion now — you."',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, message, advanceStep } = req.body || {};

  // Auth
  const authHeader = req.headers.authorization;
  let userId;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(authHeader.split(' ')[1]);
      if (error || !user) return res.status(401).json({ error: 'Invalid token' });
      userId = user.id;
    } catch {
      return res.status(401).json({ error: 'Token verification failed' });
    }
  } else {
    return res.status(401).json({ error: 'Missing authorization' });
  }

  // Create new session or fetch existing
  let session;
  if (sessionId) {
    const { data } = await supabase.from('ifs_time_travel_sessions').select('*').eq('id', sessionId).single();
    if (!data || data.user_id !== userId) return res.status(404).json({ error: 'Session not found' });
    session = data;
  } else {
    // New session
    const { target_age, target_memory, target_part_id } = req.body;
    const { data } = await supabase.from('ifs_time_travel_sessions').insert({
      user_id: userId, target_age, target_memory, target_part_id,
      messages: [{ role: 'system', content: `Beginning time travel session. Target: ${target_age}, Memory: ${target_memory}`, step: 'arrival', timestamp: new Date().toISOString() }],
    }).select().single();
    session = data;
  }

  if (!session) return res.status(500).json({ error: 'Failed to create/load session' });

  // Advance step if requested
  let currentStep = session.current_step;
  const steps = ['arrival', 'witness', 'resonance', 'rewrite', 'return', 'integrate'];
  if (advanceStep) {
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) {
      currentStep = steps[idx + 1];
      await supabase.from('ifs_time_travel_sessions').update({ current_step: currentStep }).eq('id', session.id);
    }
  }

  // Add user message
  const messages = [...(session.messages || [])];
  if (message) {
    messages.push({ role: 'user', content: message, step: currentStep, timestamp: new Date().toISOString() });
    await supabase.from('ifs_time_travel_sessions').update({ messages }).eq('id', session.id);
  }

  // Generate guide response
  const stepGuidance = TIME_TRAVEL_STEPS[currentStep] || '';
  const systemPrompt = `You are the Time Travel Guide in The Internal Mechanic. You are using resonant language (inspired by right-hemisphere communication and the neuroscience of accompaniment) to help someone revisit a memory and offer their younger self what they needed.

Target age: ${session.target_age || 'unknown'}
Target memory: ${session.target_memory || 'unknown'}
Current step: ${currentStep}

${stepGuidance}

Guidelines:
- Use warm, present-tense language when in the memory
- "It sounds like..." and "Would it be accurate to say..." are your primary tools
- The younger self is real — speak to them directly when appropriate
- Watch for unconscious contracts (vows) that were formed in this moment
- Keep responses to 2-4 sentences. This is a conversation, not a lecture.
- If you sense a somatic shift, name it: "I notice something shifting..."
- Never diagnose, pathologize, or rush. Honor the pace completely.`;

  const anthropicMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: m.content }))
    .slice(-12);

  if (anthropicMessages.length === 0) {
    anthropicMessages.push({ role: 'user', content: `I want to visit a memory from ${session.target_age || 'my past'}. ${session.target_memory || ''}` });
  }

  try {
    const { text: guideResponse } = await callAnthropic({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: systemPrompt,
      messages: anthropicMessages,
      endpoint: '/api/mechanic/time-travel',
      agentName: 'mechanic-time-travel',
    });

    // Save guide response
    messages.push({ role: 'assistant', content: guideResponse, step: currentStep, timestamp: new Date().toISOString() });
    await supabase.from('ifs_time_travel_sessions').update({ messages }).eq('id', session.id);

    return res.status(200).json({
      status: 'ok',
      sessionId: session.id,
      currentStep,
      response: guideResponse,
      stepIndex: steps.indexOf(currentStep),
      totalSteps: steps.length,
    });

  } catch (err) {
    return res.status(500).json({ error: 'Guide response failed', details: err.message });
  }
}
