// Telemetry Aggregation Cron
// Runs hourly — pulls PostHog pageview data and writes to geo_telemetry table

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const cronAuth = req.headers.authorization;
  if (cronAuth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Invalid cron secret' });
  }

  const apiKey = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.POSTHOG_HOST || 'https://us.posthog.com';

  if (!apiKey || !projectId) {
    return res.status(200).json({ skipped: true, reason: 'PostHog not configured' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Fetch recent events with geo properties
    const eventsRes = await fetch(`${host}/api/projects/${projectId}/events/?after=${hourAgo.toISOString()}&event=$pageview&limit=500`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!eventsRes.ok) {
      return res.status(502).json({ error: 'PostHog API error', status: eventsRes.status });
    }

    const eventsData = await eventsRes.json();
    const events = eventsData.results || [];

    // Aggregate by city/state/zipcode
    const buckets = new Map();

    events.forEach(event => {
      const props = event.properties || {};
      const city = props.$geoip_city_name || 'Unknown';
      const state = props.$geoip_subdivision_1_name || 'Unknown';
      const zip = props.$geoip_postal_code || null;
      const key = `${city}|${state}|${zip || 'none'}`;

      if (!buckets.has(key)) {
        buckets.set(key, { city, state, zipcode: zip, pageviews: 0, unique_ips: new Set() });
      }
      const bucket = buckets.get(key);
      bucket.pageviews++;
      if (props.$ip) bucket.unique_ips.add(props.$ip);
    });

    // Upsert aggregated data
    const today = now.toISOString().split('T')[0];
    let upserted = 0;

    for (const [, bucket] of buckets) {
      const { error } = await supabase.from('geo_telemetry').upsert({
        date: today,
        city: bucket.city,
        state: bucket.state,
        zipcode: bucket.zipcode,
        pageviews: bucket.pageviews,
        unique_visitors: bucket.unique_ips.size,
        updated_at: now.toISOString(),
      }, { onConflict: 'date,city,state' });

      if (!error) upserted++;
    }

    return res.status(200).json({
      success: true,
      eventsProcessed: events.length,
      bucketsUpserted: upserted,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
