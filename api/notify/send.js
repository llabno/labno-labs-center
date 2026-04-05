/**
 * notify/send.js — Notification dispatcher
 *
 * POST /api/notify/send
 * Body: { type, recipient_email, subject, body, metadata }
 *
 * Types: 'proposal_sent', 'document_status', 'appointment_reminder', 'reactivation'
 *
 * Currently logs to notification_queue table. When an email service is configured
 * (RESEND_API_KEY or SENDGRID_API_KEY), it will send actual emails.
 * For now, notifications appear in the NotificationBell and activity_log.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { type, recipient_email, subject, body, metadata } = req.body;
  if (!type || !subject) return res.status(400).json({ error: 'type and subject required' });

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Log to activity_log regardless of email service
  await supabase.from('activity_log').insert({
    source_type: 'System',
    title: `Notification: ${subject}`,
    description: `${type} → ${recipient_email || 'internal'}. ${body?.slice(0, 200) || ''}`,
    action: 'notification_sent',
    details: { type, recipient_email, metadata },
  }).catch(() => {});

  // Try to send via email service if configured
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && recipient_email) {
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Labno Labs <notifications@labnolabs.com>',
          to: recipient_email,
          subject,
          html: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #b06050;">${subject}</h2>
            <div style="color: #333; line-height: 1.6;">${body || ''}</div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">Labno Labs · <a href="https://labnolabs.com">labnolabs.com</a></p>
          </div>`,
        }),
      });
      const emailData = await emailRes.json();
      return res.status(200).json({ success: true, sent: true, id: emailData.id });
    } catch (err) {
      // Email failed but notification is logged
      return res.status(200).json({ success: true, sent: false, error: err.message, logged: true });
    }
  }

  // No email service — just log it
  return res.status(200).json({
    success: true,
    sent: false,
    logged: true,
    note: 'Notification logged to activity_log. Set RESEND_API_KEY in Vercel to enable email delivery.',
  });
}
