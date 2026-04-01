// RingCentral SMS API
// Requires: RINGCENTRAL_SERVER_URL, RINGCENTRAL_CLIENT_ID, RINGCENTRAL_CLIENT_SECRET, RINGCENTRAL_JWT_TOKEN

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { phoneNumber, message, leadName, leadId } = req.body
  if (!phoneNumber || !message) return res.status(400).json({ error: 'phoneNumber and message required' })

  const rcServer = process.env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
  const clientId = process.env.RINGCENTRAL_CLIENT_ID
  const clientSecret = process.env.RINGCENTRAL_CLIENT_SECRET
  const jwtToken = process.env.RINGCENTRAL_JWT_TOKEN

  if (!clientId || !clientSecret || !jwtToken) {
    return res.status(200).json({
      success: false,
      mode: 'scaffold',
      message: 'RingCentral not configured. Add env vars to Vercel.',
      fallback: `sms:${phoneNumber}?body=${encodeURIComponent(message)}`
    })
  }

  try {
    // Get access token
    const tokenRes = await fetch(`${rcServer}/restapi/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwtToken}`
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('Failed to get RC access token')

    // Send SMS
    const smsRes = await fetch(`${rcServer}/restapi/v1.0/account/~/extension/~/sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`
      },
      body: JSON.stringify({
        from: { phoneNumber: process.env.RINGCENTRAL_FROM_NUMBER },
        to: [{ phoneNumber }],
        text: message
      })
    })
    const smsData = await smsRes.json()

    // Log the SMS
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      await supabase.from('communication_log').insert({
        lead_id: leadId || null,
        lead_name: leadName || null,
        comm_type: 'sms',
        direction: 'outbound',
        subject: `SMS to ${phoneNumber}`,
        body: message,
        status: smsData.messageStatus || 'sent',
        user_email: 'lance@movement-solutions.com'
      })
    }

    return res.status(200).json({ success: true, messageId: smsData.id, status: smsData.messageStatus })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
