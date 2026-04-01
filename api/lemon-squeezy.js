// Lemon Squeezy revenue proxy endpoint
// Fetches order/revenue data from Lemon Squeezy API for dashboard stats

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

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY

  if (!apiKey) {
    return res.status(200).json({
      configured: false,
      revenue: { today: 0, week: 0, month: 0, total: 0 },
      orders: { today: 0, week: 0, month: 0, total: 0 },
      note: 'Set LEMON_SQUEEZY_API_KEY in Vercel env vars to enable real revenue data'
    })
  }

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Fetch orders from Lemon Squeezy
    const ordersRes = await fetch('https://api.lemonsqueezy.com/v1/orders?sort=-created_at&page[size]=100', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.api+json'
      }
    })

    if (!ordersRes.ok) throw new Error(`Lemon Squeezy API returned ${ordersRes.status}`)

    const ordersData = await ordersRes.json()
    const orders = ordersData.data || []

    let todayRevenue = 0, weekRevenue = 0, monthRevenue = 0, totalRevenue = 0
    let todayOrders = 0, weekOrders = 0, monthOrders = 0

    orders.forEach(order => {
      const amount = order.attributes.total / 100 // cents to dollars
      const createdAt = order.attributes.created_at

      totalRevenue += amount

      if (createdAt >= todayStart) { todayRevenue += amount; todayOrders++ }
      if (createdAt >= weekStart) { weekRevenue += amount; weekOrders++ }
      if (createdAt >= monthStart) { monthRevenue += amount; monthOrders++ }
    })

    return res.status(200).json({
      configured: true,
      revenue: {
        today: todayRevenue,
        week: weekRevenue,
        month: monthRevenue,
        total: totalRevenue
      },
      orders: {
        today: todayOrders,
        week: weekOrders,
        month: monthOrders,
        total: orders.length
      }
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch revenue data', configured: true })
  }
}
