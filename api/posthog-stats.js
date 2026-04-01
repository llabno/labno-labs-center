// PostHog analytics proxy endpoint
// Fetches DAU, pageviews, and event counts for dashboard stats

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Verify Supabase auth
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const apiKey = process.env.POSTHOG_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  const host = process.env.POSTHOG_HOST || 'https://us.posthog.com'

  if (!apiKey || !projectId) {
    return res.status(200).json({
      configured: false,
      dau: 0,
      weeklyActive: 0,
      pageviews: { today: 0, week: 0 },
      topPages: [],
      note: 'Set POSTHOG_API_KEY and POSTHOG_PROJECT_ID in Vercel env vars'
    })
  }

  try {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const weekAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Fetch insights: DAU trend
    const insightRes = await fetch(`${host}/api/projects/${projectId}/insights/trend/?events=[{"id":"$pageview"}]&date_from=${weekAgoStr}&date_to=${todayStr}&interval=day`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })

    let dau = 0
    let weeklyPageviews = 0
    let dailyData = []

    if (insightRes.ok) {
      const insightData = await insightRes.json()
      const results = insightData.result?.[0]
      if (results?.data) {
        dailyData = results.data
        dau = dailyData[dailyData.length - 1] || 0
        weeklyPageviews = dailyData.reduce((sum, v) => sum + v, 0)
      }
    }

    // Fetch persons count for weekly active
    const personsRes = await fetch(`${host}/api/projects/${projectId}/insights/trend/?events=[{"id":"$pageview","math":"dau"}]&date_from=${weekAgoStr}&date_to=${todayStr}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })

    let weeklyActive = 0
    if (personsRes.ok) {
      const personsData = await personsRes.json()
      const dauData = personsData.result?.[0]?.data || []
      weeklyActive = Math.max(...dauData, 0)
    }

    return res.status(200).json({
      configured: true,
      dau,
      weeklyActive,
      pageviews: {
        today: dailyData[dailyData.length - 1] || 0,
        week: weeklyPageviews
      },
      dailyTrend: dailyData
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch analytics data', configured: true })
  }
}
