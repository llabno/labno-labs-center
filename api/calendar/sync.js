/**
 * calendar/sync.js — Read-Only Google Calendar Sync
 *
 * GET /api/calendar/sync?timeMin=2026-04-01&timeMax=2026-04-30
 *
 * Fetches events from Google Calendar for the given date range.
 * Returns { events: [{ id, summary, start, end, description, location }] }
 *
 * Environment variables:
 *   GOOGLE_CALENDAR_ID       — Calendar ID to read from (e.g. "primary" or an email)
 *   GOOGLE_SERVICE_ACCOUNT_KEY — Base64-encoded service account JSON (preferred)
 *   GOOGLE_API_KEY            — Simple API key (fallback, read-only public calendars)
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const serviceAccountKeyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!calendarId) {
    return res.status(503).json({
      error: 'Google Calendar not configured',
      help: 'Set GOOGLE_CALENDAR_ID in your environment variables. Also set either GOOGLE_SERVICE_ACCOUNT_KEY (base64-encoded service account JSON) or GOOGLE_API_KEY for read-only access.',
    });
  }

  if (!serviceAccountKeyB64 && !apiKey) {
    return res.status(503).json({
      error: 'Google Calendar credentials not configured',
      help: 'Set either GOOGLE_SERVICE_ACCOUNT_KEY (base64-encoded service account JSON) or GOOGLE_API_KEY in your environment variables.',
    });
  }

  const { timeMin, timeMax } = req.query;
  if (!timeMin || !timeMax) {
    return res.status(400).json({
      error: 'Missing required query parameters: timeMin, timeMax (ISO date strings, e.g. 2026-04-01)',
    });
  }

  // Ensure full ISO datetime for Google Calendar API
  const timeMinISO = timeMin.includes('T') ? timeMin : `${timeMin}T00:00:00Z`;
  const timeMaxISO = timeMax.includes('T') ? timeMax : `${timeMax}T23:59:59Z`;

  try {
    let accessToken = null;

    // Prefer service account auth (supports private calendars)
    if (serviceAccountKeyB64) {
      accessToken = await getServiceAccountToken(serviceAccountKeyB64);
    }

    const encodedCalId = encodeURIComponent(calendarId);
    const params = new URLSearchParams({
      timeMin: timeMinISO,
      timeMax: timeMaxISO,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });

    // If using API key (no service account), append it as a query param
    if (!accessToken && apiKey) {
      params.set('key', apiKey);
    }

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalId}/events?${params}`;
    const headers = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Google Calendar API error:', response.status, errorBody);
      return res.status(502).json({
        error: 'Google Calendar API request failed',
        status: response.status,
        details: response.status === 403
          ? 'Calendar not shared with the service account, or API key lacks access.'
          : response.status === 404
            ? 'Calendar not found. Check GOOGLE_CALENDAR_ID.'
            : 'See server logs for details.',
      });
    }

    const data = await response.json();
    const events = (data.items || []).map(item => ({
      id: item.id,
      summary: item.summary || '(No title)',
      start: item.start?.dateTime || item.start?.date || null,
      end: item.end?.dateTime || item.end?.date || null,
      description: item.description || null,
      location: item.location || null,
    }));

    return res.status(200).json({ events });
  } catch (err) {
    console.error('Calendar sync error:', err);
    return res.status(500).json({
      error: 'Failed to sync Google Calendar',
      message: err.message,
    });
  }
}

/**
 * Generate an OAuth2 access token from a service account key.
 * Uses the JWT Bearer flow — no external dependencies needed.
 */
async function getServiceAccountToken(base64Key) {
  const keyJson = JSON.parse(Buffer.from(base64Key, 'base64').toString('utf-8'));
  const { client_email, private_key } = keyJson;

  if (!client_email || !private_key) {
    throw new Error('Service account key missing client_email or private_key');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const jwt = await signJWT(header, payload, private_key);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Token exchange failed: ${tokenRes.status} ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

/**
 * Sign a JWT using RS256 (Node.js crypto, no external deps).
 */
async function signJWT(header, payload, privateKeyPem) {
  const { createSign } = await import('crypto');

  const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const headerB64 = b64url(header);
  const payloadB64 = b64url(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKeyPem, 'base64url');

  return `${signingInput}.${signature}`;
}
