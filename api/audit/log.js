// HIPAA Access Log + Audit Trail API
// Logs every CRM access and data modification

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth gate: verify Bearer token and restrict to employees
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  const authClient = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  )
  const { data: { user }, error: authError } = await authClient.auth.getUser(authHeader.split(' ')[1])
  if (authError || !user || !(user.email?.endsWith('@labnolabs.com') || user.email?.endsWith('@movement-solutions.com'))) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { type, data } = req.body

  if (type === 'access') {
    // Log page access (HIPAA requirement)
    const { user_email, page, record_count } = data
    await supabase.from('access_log').insert({ user_email, page, action: 'view', record_count })
    return res.status(200).json({ logged: true })
  }

  if (type === 'audit') {
    // Log data modification
    const { table_name, record_id, field_name, old_value, new_value, action, user_email } = data
    await supabase.from('audit_log').insert({ table_name, record_id, field_name, old_value, new_value, action, user_email })
    return res.status(200).json({ logged: true })
  }

  return res.status(400).json({ error: 'Invalid type. Use "access" or "audit".' })
}
