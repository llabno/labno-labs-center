// Shared webhook authentication for GTM ingestion endpoints.
// Apify and Bright Data both send a secret in headers to verify webhook origin.

import crypto from 'crypto'

const APIFY_WEBHOOK_SECRET = process.env.APIFY_WEBHOOK_SECRET
const BRIGHT_DATA_WEBHOOK_SECRET = process.env.BRIGHT_DATA_WEBHOOK_SECRET

export function verifyApifyWebhook(req) {
  if (!APIFY_WEBHOOK_SECRET) return { valid: false, error: 'APIFY_WEBHOOK_SECRET not configured' }

  const signature = req.headers['x-apify-webhook-signature']
  if (!signature) return { valid: false, error: 'Missing x-apify-webhook-signature header' }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  const expected = crypto.createHmac('sha256', APIFY_WEBHOOK_SECRET).update(body).digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return { valid: false, error: 'Invalid webhook signature' }
  }

  return { valid: true }
}

export function verifyBrightDataWebhook(req) {
  if (!BRIGHT_DATA_WEBHOOK_SECRET) return { valid: false, error: 'BRIGHT_DATA_WEBHOOK_SECRET not configured' }

  const token = req.headers['x-brightdata-token'] || req.query?.token
  if (!token) return { valid: false, error: 'Missing Bright Data auth token' }

  if (token !== BRIGHT_DATA_WEBHOOK_SECRET) {
    return { valid: false, error: 'Invalid Bright Data token' }
  }

  return { valid: true }
}

// For local testing / manual ingestion via dashboard — uses standard Supabase JWT auth
export async function verifyDashboardAuth(req, supabaseAuth) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return { valid: false, error: 'Missing Bearer token' }

  const { data: { user }, error } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''))
  if (error || !user) return { valid: false, error: 'Invalid token' }

  const email = user.email
  if (!email?.endsWith('@labnolabs.com') && !email?.endsWith('@movement-solutions.com')) {
    return { valid: false, error: 'Unauthorized domain' }
  }

  return { valid: true, user }
}

// Determine auth method from request context
export async function authenticateRequest(req, supabaseAuth) {
  const source = req.headers['x-gtm-source']

  if (source === 'apify') return verifyApifyWebhook(req)
  if (source === 'brightdata') return verifyBrightDataWebhook(req)
  if (req.headers.authorization?.startsWith('Bearer ')) return verifyDashboardAuth(req, supabaseAuth)

  // Fallback: try Apify signature, then Bright Data token, then reject
  if (req.headers['x-apify-webhook-signature']) return verifyApifyWebhook(req)
  if (req.headers['x-brightdata-token'] || req.query?.token) return verifyBrightDataWebhook(req)

  return { valid: false, error: 'No recognized authentication method' }
}
