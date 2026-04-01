// RingCentral Click-to-Call API
// Requires: RINGCENTRAL_SERVER_URL, RINGCENTRAL_CLIENT_ID, RINGCENTRAL_CLIENT_SECRET, RINGCENTRAL_JWT_TOKEN

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { phoneNumber, leadName, leadId } = req.body
  if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber required' })

  const rcServer = process.env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
  const clientId = process.env.RINGCENTRAL_CLIENT_ID
  const clientSecret = process.env.RINGCENTRAL_CLIENT_SECRET
  const jwtToken = process.env.RINGCENTRAL_JWT_TOKEN

  if (!clientId || !clientSecret || !jwtToken) {
    return res.status(200).json({
      success: false,
      mode: 'scaffold',
      message: 'RingCentral not configured. Add RINGCENTRAL_CLIENT_ID, RINGCENTRAL_CLIENT_SECRET, and RINGCENTRAL_JWT_TOKEN to Vercel env vars.',
      fallback: `tel:${phoneNumber}`
    })
  }

  try {
    // Step 1: Get access token via JWT
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

    // Step 2: Ring Out (initiates call from Lance's phone to the patient)
    const callRes = await fetch(`${rcServer}/restapi/v1.0/account/~/extension/~/ring-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`
      },
      body: JSON.stringify({
        from: { phoneNumber: process.env.RINGCENTRAL_FROM_NUMBER },
        to: { phoneNumber },
        callerId: { phoneNumber: process.env.RINGCENTRAL_FROM_NUMBER },
        playPrompt: true
      })
    })
    const callData = await callRes.json()

    // Log the call
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      await supabase.from('communication_log').insert({
        lead_id: leadId || null,
        lead_name: leadName || null,
        comm_type: 'call',
        direction: 'outbound',
        subject: `Call to ${phoneNumber}`,
        status: callData.status?.callStatus || 'initiated',
        user_email: 'lance@movement-solutions.com'
      })
    }

    return res.status(200).json({ success: true, callId: callData.id, status: callData.status })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
