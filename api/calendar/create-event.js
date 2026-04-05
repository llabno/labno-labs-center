/**
 * calendar/create-event.js — Create Google Calendar Events
 *
 * POST /api/calendar/create-event
 * Body: { summary, start, end, description?, location? }
 *
 * Creates an event on the configured Google Calendar.
 * Requires GOOGLE_SERVICE_ACCOUNT_KEY (base64) — API keys are read-only.
 *
 * If no service account is configured, returns instructions for setup.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const serviceAccountKeyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!calendarId) {
    return res.status(503).json({ error: 'GOOGLE_CALENDAR_ID not configured' });
  }

  if (!serviceAccountKeyB64) {
    return res.status(503).json({
      error: 'Google Calendar write requires a service account',
      help: 'API keys are read-only. To create events, set up a service account: 1) Google Cloud Console → IAM → Service Accounts → Create. 2) Download JSON key. 3) Base64 encode it: base64 -i key.json | tr -d \'\\n\'. 4) Set GOOGLE_SERVICE_ACCOUNT_KEY in Vercel. 5) Share your calendar with the service account email.',
      setup_steps: [
        'Go to Google Cloud Console → IAM & Admin → Service Accounts',
        'Click "+ Create Service Account" → name it "labno-calendar"',
        'Skip optional permissions → Click Done',
        'Click the service account → Keys tab → Add Key → JSON',
        'Download the JSON file',
        'In terminal: base64 -i downloaded-key.json | tr -d "\\n" | pbcopy',
        'Run: npx vercel env add GOOGLE_SERVICE_ACCOUNT_KEY production',
        'Paste the base64 string',
        'In Google Calendar → Settings → Share with → add the service account email (from the JSON file)',
        'Give it "Make changes to events" permission',
      ],
    });
  }

  const { summary, start, end, description, location } = req.body;
  if (!summary || !start || !end) {
    return res.status(400).json({ error: 'summary, start, and end are required' });
  }

  try {
    const accessToken = await getServiceAccountToken(serviceAccountKeyB64);
    const encodedCalId = encodeURIComponent(calendarId);

    // Build event object
    const event = {
      summary,
      description: description || '',
      location: location || '',
      start: start.includes('T')
        ? { dateTime: start, timeZone: 'America/Chicago' }
        : { date: start },
      end: end.includes('T')
        ? { dateTime: end, timeZone: 'America/Chicago' }
        : { date: end },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodedCalId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(502).json({
        error: 'Failed to create Google Calendar event',
        status: response.status,
        details: errorBody,
      });
    }

    const created = await response.json();
    return res.status(200).json({
      success: true,
      event: {
        id: created.id,
        summary: created.summary,
        start: created.start?.dateTime || created.start?.date,
        end: created.end?.dateTime || created.end?.date,
        htmlLink: created.htmlLink,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Generate OAuth2 access token from service account key (JWT Bearer flow)
 */
async function getServiceAccountToken(base64Key) {
  const keyJson = JSON.parse(Buffer.from(base64Key, 'base64').toString('utf-8'));
  const { client_email, private_key } = keyJson;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const { subtle } = globalThis.crypto;
  const enc = new TextEncoder();

  // Import RSA private key
  const pemBody = private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await subtle.importKey('pkcs8', keyData, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);

  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const signature = await subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, enc.encode(signingInput));
  const sig = Buffer.from(signature).toString('base64url');
  const jwt = `${signingInput}.${sig}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
  return tokenData.access_token;
}
