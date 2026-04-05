// Availability Invite API
// Generates a magic link token for clients to fill in their scheduling preferences
// POST /api/availability/invite { clientName, clientEmail, clientType }

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check — only internal users can generate invite links
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.split(' ')[1]);
  if (authErr || !user) {
    return res.status(403).json({ error: 'Authentication failed' });
  }

  const { clientName, clientEmail, clientType } = req.body || {};

  if (!clientName || !clientName.trim()) {
    return res.status(400).json({ error: 'clientName is required' });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const { error: insertErr } = await supabase.from('availability_invites').insert({
    token,
    client_name: clientName.trim(),
    client_email: clientEmail?.trim() || null,
    client_type: clientType || 'clinical',
    expires_at: expiresAt,
    used: false,
  });

  if (insertErr) {
    console.error('Failed to create invite:', insertErr);
    return res.status(500).json({ error: 'Failed to create invite', detail: insertErr.message });
  }

  const host = req.headers.host || 'labno-labs-center.vercel.app';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const link = `${protocol}://${host}/availability/fill?token=${token}`;

  return res.status(200).json({ success: true, token, link });
}
