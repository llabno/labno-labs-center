// RSS Feed endpoint for the Clinical Blog
// Returns valid RSS 2.0 XML with blog posts from Supabase (or sample posts)
// NOTE: RSS feeds are public by design — no auth required

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).end()
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  let posts = []

  // Try fetching from blog_posts table
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('title, slug, excerpt, markdown_body, published_at, category')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20)

    if (!error && data && data.length > 0) {
      posts = data
    }
  } catch (e) {
    // Table may not exist yet
  }

  // Fallback: sample posts for the Clinical Blog
  if (posts.length === 0) {
    posts = [
      {
        title: 'Why Your Back Pain Isn\'t About Your Back',
        slug: 'back-pain-nervous-system',
        excerpt: 'Most people negotiate with their body every morning. Our clients stopped negotiating.',
        published_at: new Date().toISOString(),
        author: 'Lance Labno, DPT',
        category: 'Clinical Pearls'
      },
      {
        title: 'The Breath You Hold Before Bending Down',
        slug: 'held-breath-movement',
        excerpt: 'That held breath is your nervous system voting "no" before you even try. Most rehab ignores that vote.',
        published_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        author: 'Lance Labno, DPT',
        category: 'Clinical Pearls'
      },
      {
        title: 'Confidence Is a Physical Skill',
        slug: 'confidence-physical-skill',
        excerpt: 'She grabbed something off a high shelf without thinking about it. No negotiation. No brace. Just movement.',
        published_at: new Date(Date.now() - 14 * 86400000).toISOString(),
        author: 'Lance Labno, DPT',
        category: 'Movement Science'
      }
    ]
  }

  const siteUrl = 'https://movementsolutions.com'
  const blogUrl = `${siteUrl}/blog`

  const items = posts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${blogUrl}/${post.slug || ''}</link>
      <description><![CDATA[${post.excerpt || ''}]]></description>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <author>${post.author || 'Lance Labno, DPT'}</author>
      ${post.category ? `<category>${post.category}</category>` : ''}
      <guid isPermaLink="true">${blogUrl}/${post.slug || ''}</guid>
    </item>`).join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Movement Solutions Clinical Blog</title>
    <link>${blogUrl}</link>
    <description>Clinical Pearls and movement science insights from Movement Solutions physical therapy.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/api/rss" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.status(200).send(rss)
}
