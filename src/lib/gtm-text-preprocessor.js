/**
 * GTM Text Preprocessor
 *
 * Preprocesses raw review text (App Store, G2, job postings) before
 * sending to the LLM for semantic parsing. Handles messy real-world
 * text: HTML, emoji, ALL CAPS, URLs, abbreviations, Unicode artifacts.
 *
 * Zero external dependencies — Node.js built-ins only.
 *
 * @module gtm-text-preprocessor
 */

// ---------------------------------------------------------------------------
// Emoji map — top 50 most common in reviews
// ---------------------------------------------------------------------------

const EMOJI_MAP = new Map([
  // Faces — positive
  ['😊', 'smiling face'],
  ['😀', 'grinning face'],
  ['😁', 'beaming face'],
  ['😃', 'grinning face with big eyes'],
  ['😄', 'grinning squinting face'],
  ['🙂', 'slightly smiling face'],
  ['😍', 'heart eyes'],
  ['🥰', 'smiling face with hearts'],
  ['😎', 'cool face'],
  ['🤩', 'star struck'],

  // Faces — negative
  ['😡', 'angry face'],
  ['😠', 'angry face'],
  ['😤', 'frustrated face'],
  ['😢', 'crying face'],
  ['😭', 'loudly crying face'],
  ['😩', 'weary face'],
  ['😫', 'tired face'],
  ['🤬', 'face with symbols on mouth'],
  ['😒', 'unamused face'],
  ['🙄', 'eye roll'],
  ['😑', 'expressionless face'],
  ['😞', 'disappointed face'],
  ['😔', 'pensive face'],
  ['🤮', 'vomiting face'],
  ['🤢', 'nauseated face'],
  ['😱', 'screaming face'],

  // Faces — neutral / thinking
  ['🤔', 'thinking face'],
  ['🤷', 'shrug'],
  ['😐', 'neutral face'],

  // Gestures
  ['👍', 'thumbs up'],
  ['👎', 'thumbs down'],
  ['👏', 'clapping hands'],
  ['🙏', 'folded hands'],
  ['💪', 'flexed biceps'],
  ['🤝', 'handshake'],
  ['✌️', 'peace sign'],

  // Symbols / objects
  ['⭐', 'star'],
  ['🌟', 'glowing star'],
  ['💯', '100 points'],
  ['❤️', 'red heart'],
  ['💔', 'broken heart'],
  ['🔥', 'fire'],
  ['💩', 'pile of poo'],
  ['🚀', 'rocket'],
  ['💡', 'light bulb'],
  ['⚠️', 'warning'],
  ['❌', 'cross mark'],
  ['✅', 'check mark'],
  ['✨', 'sparkles'],
  ['🎉', 'party popper'],
  ['💰', 'money bag'],
]);

// ---------------------------------------------------------------------------
// HTML entity map
// ---------------------------------------------------------------------------

const HTML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&trade;': '™',
  '&copy;': '©',
  '&reg;': '®',
  '&bull;': '•',
  '&ldquo;': '\u201C',
  '&rdquo;': '\u201D',
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
};

// ---------------------------------------------------------------------------
// Common abbreviations (boundary-aware)
// ---------------------------------------------------------------------------

/** @type {Array<[RegExp, string]>} */
const ABBREVIATIONS = [
  [/\bu\b/gi, 'you'],
  [/\bur\b/gi, 'your'],
  [/\br\b/gi, 'are'],
  [/\bb\/c\b/gi, 'because'],
  [/\bbc\b/gi, 'because'],
  [/\bw\//gi, 'with '],
  [/\bw\/o\b/gi, 'without'],
  [/\bthx\b/gi, 'thanks'],
  [/\bpls\b/gi, 'please'],
  [/\bplz\b/gi, 'please'],
  [/\bimo\b/gi, 'in my opinion'],
  [/\bimho\b/gi, 'in my humble opinion'],
  [/\btbh\b/gi, 'to be honest'],
  [/\bfyi\b/gi, 'for your information'],
  [/\bbtw\b/gi, 'by the way'],
  [/\bafaik\b/gi, 'as far as I know'],
  [/\basap\b/gi, 'as soon as possible'],
  [/\bsmh\b/gi, 'shaking my head'],
  [/\bngl\b/gi, 'not gonna lie'],
  [/\bidk\b/gi, "I don't know"],
  [/\bomg\b/gi, 'oh my god'],
  [/\baka\b/gi, 'also known as'],
  [/\bdev\b/gi, 'developer'],
  [/\bdevs\b/gi, 'developers'],
  [/\bapp\b/gi, 'application'],
  [/\bapps\b/gi, 'applications'],
  [/\binfo\b/gi, 'information'],
  [/\bcust\b/gi, 'customer'],
  [/\bmgmt\b/gi, 'management'],
];

// ---------------------------------------------------------------------------
// URL regex
// ---------------------------------------------------------------------------

const URL_REGEX =
  /https?:\/\/[^\s)<>]+(?:\([^\s)<>]*\))*[^\s.,;:!?)"'<>]|www\.[^\s)<>]+/gi;

// ---------------------------------------------------------------------------
// Urgency indicators
// ---------------------------------------------------------------------------

/** @type {Record<string, string[]>} */
const URGENCY_PHRASES = {
  time_pressure: [
    'immediately',
    'asap',
    'as soon as possible',
    'urgent',
    'urgently',
    "can't wait",
    "cannot wait",
    'right now',
    'time sensitive',
    'time-sensitive',
    'deadline',
    'overdue',
    'critical timeline',
  ],
  financial_impact: [
    'losing money',
    'costing us',
    'revenue loss',
    'wasting hours',
    'wasting time',
    'lost revenue',
    'budget impact',
    'cost us',
    'financial loss',
    'billing issue',
    'overcharged',
    'refund',
  ],
  threat_signals: [
    'switching to',
    'canceling',
    'cancelling',
    'looking for alternatives',
    'last straw',
    'final straw',
    'deal breaker',
    'dealbreaker',
    'deal-breaker',
    'leaving for',
    'moving to',
    'considering alternatives',
    'competitor',
    'unsubscribe',
    'not renewing',
    'will not renew',
    "won't renew",
  ],
  severity: [
    'broken',
    'unusable',
    'crashes',
    'crash',
    'data loss',
    'security breach',
    'security issue',
    'vulnerability',
    'down for',
    'outage',
    'critical bug',
    'show stopper',
    'showstopper',
    'show-stopper',
    'blocker',
    'regression',
    'corrupted',
    'destroyed',
  ],
};

// ---------------------------------------------------------------------------
// Company name suffixes to strip
// ---------------------------------------------------------------------------

const COMPANY_SUFFIXES =
  /\b(inc\.?|llc\.?|ltd\.?|limited|corp\.?|corporation|co\.?|company|gmbh|s\.?a\.?|s\.?r\.?l\.?|plc|pty\.?\s*ltd\.?|ag|n\.?v\.?|b\.?v\.?|s\.?p\.?a\.?|a\.?s\.?|ab|oy|k\.?k\.?|pte\.?\s*ltd\.?|l\.?p\.?|l\.?l\.?p\.?)\s*$/i;

// ---------------------------------------------------------------------------
// Tech stack dictionary
// ---------------------------------------------------------------------------

/** @type {Record<string, Array<{ pattern: RegExp; name: string }>>} */
const TECH_STACK = {
  language: [
    { pattern: /\bPython\b/i, name: 'Python' },
    { pattern: /\bJavaScript\b/i, name: 'JavaScript' },
    { pattern: /\bTypeScript\b/i, name: 'TypeScript' },
    { pattern: /\bJava\b(?!\s*Script)/i, name: 'Java' },
    { pattern: /\bGo(?:lang)?\b/i, name: 'Go' },
    { pattern: /\bRust\b/i, name: 'Rust' },
    { pattern: /\bC#\b|\.NET\s+C#/i, name: 'C#' },
    { pattern: /\bRuby\b/i, name: 'Ruby' },
    { pattern: /\bPHP\b/i, name: 'PHP' },
    { pattern: /\bSwift\b/i, name: 'Swift' },
    { pattern: /\bKotlin\b/i, name: 'Kotlin' },
    { pattern: /\bScala\b/i, name: 'Scala' },
    { pattern: /\bR\b(?=\s+(programming|language|studio))/i, name: 'R' },
    { pattern: /\bC\+\+\b/i, name: 'C++' },
    { pattern: /\bElixir\b/i, name: 'Elixir' },
    { pattern: /\bClojure\b/i, name: 'Clojure' },
    { pattern: /\bDart\b/i, name: 'Dart' },
    { pattern: /\bPerl\b/i, name: 'Perl' },
    { pattern: /\bSQL\b/i, name: 'SQL' },
    { pattern: /\bGraphQL\b/i, name: 'GraphQL' },
  ],
  framework: [
    { pattern: /\bReact(?:\.js|JS)?\b/i, name: 'React' },
    { pattern: /\bAngular(?:\.js|JS)?\b/i, name: 'Angular' },
    { pattern: /\bVue(?:\.js|JS)?\b/i, name: 'Vue' },
    { pattern: /\bSvelte\b/i, name: 'Svelte' },
    { pattern: /\bNext(?:\.js|JS)\b/i, name: 'Next.js' },
    { pattern: /\bNuxt(?:\.js|JS)?\b/i, name: 'Nuxt' },
    { pattern: /\bDjango\b/i, name: 'Django' },
    { pattern: /\bFlask\b/i, name: 'Flask' },
    { pattern: /\bFastAPI\b/i, name: 'FastAPI' },
    { pattern: /\bSpring(?:\s+Boot)?\b/i, name: 'Spring' },
    { pattern: /\b\.NET\b/i, name: '.NET' },
    { pattern: /\bRails\b|Ruby\s+on\s+Rails/i, name: 'Rails' },
    { pattern: /\bLaravel\b/i, name: 'Laravel' },
    { pattern: /\bExpress(?:\.js|JS)?\b/i, name: 'Express' },
    { pattern: /\bNest(?:\.js|JS)\b/i, name: 'NestJS' },
    { pattern: /\bFlutter\b/i, name: 'Flutter' },
    { pattern: /\bReact\s+Native\b/i, name: 'React Native' },
    { pattern: /\bTailwind(?:\s+CSS)?\b/i, name: 'Tailwind CSS' },
    { pattern: /\bBootstrap\b/i, name: 'Bootstrap' },
    { pattern: /\bNode(?:\.js|JS)\b/i, name: 'Node.js' },
  ],
  infrastructure: [
    { pattern: /\bAWS\b|Amazon\s+Web\s+Services/i, name: 'AWS' },
    { pattern: /\bAzure\b/i, name: 'Azure' },
    { pattern: /\bGCP\b|Google\s+Cloud(?:\s+Platform)?\b/i, name: 'GCP' },
    { pattern: /\bDocker\b/i, name: 'Docker' },
    { pattern: /\bKubernetes\b|\bk8s\b/i, name: 'Kubernetes' },
    { pattern: /\bTerraform\b/i, name: 'Terraform' },
    { pattern: /\bAnsible\b/i, name: 'Ansible' },
    { pattern: /\bJenkins\b/i, name: 'Jenkins' },
    { pattern: /\bGitHub\s+Actions\b/i, name: 'GitHub Actions' },
    { pattern: /\bCircleCI\b/i, name: 'CircleCI' },
    { pattern: /\bVercel\b/i, name: 'Vercel' },
    { pattern: /\bNetlify\b/i, name: 'Netlify' },
    { pattern: /\bHeroku\b/i, name: 'Heroku' },
    { pattern: /\bCloudflare\b/i, name: 'Cloudflare' },
    { pattern: /\bNginx\b/i, name: 'Nginx' },
    { pattern: /\bDatadog\b/i, name: 'Datadog' },
    { pattern: /\bGrafana\b/i, name: 'Grafana' },
    { pattern: /\bPrometheus\b/i, name: 'Prometheus' },
  ],
  database: [
    { pattern: /\bPostgreSQL\b|\bPostgres\b/i, name: 'PostgreSQL' },
    { pattern: /\bMySQL\b/i, name: 'MySQL' },
    { pattern: /\bMongoDB\b|\bMongo\b/i, name: 'MongoDB' },
    { pattern: /\bRedis\b/i, name: 'Redis' },
    { pattern: /\bElasticsearch\b|\bElastic\s+Search\b/i, name: 'Elasticsearch' },
    { pattern: /\bSQLite\b/i, name: 'SQLite' },
    { pattern: /\bDynamoDB\b/i, name: 'DynamoDB' },
    { pattern: /\bCassandra\b/i, name: 'Cassandra' },
    { pattern: /\bSupabase\b/i, name: 'Supabase' },
    { pattern: /\bFirebase\b/i, name: 'Firebase' },
    { pattern: /\bSnowflake\b/i, name: 'Snowflake' },
    { pattern: /\bBigQuery\b/i, name: 'BigQuery' },
  ],
  tool: [
    { pattern: /\bSalesforce\b/i, name: 'Salesforce' },
    { pattern: /\bHubSpot\b/i, name: 'HubSpot' },
    { pattern: /\bJira\b/i, name: 'Jira' },
    { pattern: /\bSlack\b/i, name: 'Slack' },
    { pattern: /\bZendesk\b/i, name: 'Zendesk' },
    { pattern: /\bIntercom\b/i, name: 'Intercom' },
    { pattern: /\bStripe\b/i, name: 'Stripe' },
    { pattern: /\bTwilio\b/i, name: 'Twilio' },
    { pattern: /\bSendGrid\b/i, name: 'SendGrid' },
    { pattern: /\bSegment\b/i, name: 'Segment' },
    { pattern: /\bMixpanel\b/i, name: 'Mixpanel' },
    { pattern: /\bAmplitude\b/i, name: 'Amplitude' },
    { pattern: /\bNotion\b/i, name: 'Notion' },
    { pattern: /\bConfluence\b/i, name: 'Confluence' },
    { pattern: /\bFigma\b/i, name: 'Figma' },
    { pattern: /\bPostman\b/i, name: 'Postman' },
    { pattern: /\bGitHub\b/i, name: 'GitHub' },
    { pattern: /\bGitLab\b/i, name: 'GitLab' },
    { pattern: /\bBitbucket\b/i, name: 'Bitbucket' },
    { pattern: /\bZapier\b/i, name: 'Zapier' },
  ],
};

// ---------------------------------------------------------------------------
// Language detection word lists
// ---------------------------------------------------------------------------

/** @type {Record<string, string[]>} */
const LANGUAGE_WORDS = {
  en: [
    'the', 'is', 'are', 'was', 'were', 'have', 'has', 'been', 'being',
    'this', 'that', 'with', 'from', 'they', 'would', 'could', 'should',
    'will', 'just', 'about', 'which', 'their', 'there', 'than', 'other',
    'into', 'very', 'when', 'what', 'your', 'also', 'after', 'before',
  ],
  es: [
    'el', 'la', 'los', 'las', 'es', 'en', 'un', 'una', 'por', 'con',
    'para', 'que', 'del', 'al', 'como', 'pero', 'sus', 'muy', 'este',
    'esta', 'estos', 'estas', 'tiene', 'tiene', 'son', 'fue', 'ser',
    'hay', 'nos', 'ya', 'todo', 'esta', 'desde', 'hace', 'puede',
  ],
  fr: [
    'le', 'la', 'les', 'des', 'est', 'en', 'un', 'une', 'dans', 'pour',
    'que', 'qui', 'sur', 'pas', 'avec', 'mais', 'par', 'cette', 'sont',
    'nous', 'vous', 'ils', 'elle', 'ses', 'tout', 'aux', 'bien', 'ont',
    'fait', 'comme', 'peut', 'aussi', 'plus', 'leur', 'entre',
  ],
  de: [
    'der', 'die', 'das', 'ist', 'ein', 'eine', 'und', 'ich', 'mit',
    'auf', 'den', 'dem', 'nicht', 'sich', 'von', 'auch', 'als', 'noch',
    'aber', 'wie', 'hat', 'nur', 'oder', 'war', 'nach', 'kann', 'sehr',
    'sind', 'wird', 'wenn', 'sein', 'vor', 'zum', 'zur', 'haben',
  ],
  pt: [
    'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'em', 'no',
    'na', 'para', 'com', 'por', 'que', 'se', 'mas', 'como', 'mais',
    'foi', 'ser', 'tem', 'muito', 'este', 'esta', 'nos', 'seu', 'sua',
    'isso', 'ele', 'ela', 'pode', 'quando', 'entre',
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip all HTML tags from text.
 * @param {string} text
 * @returns {string}
 */
function stripHtml(text) {
  return text.replace(/<[^>]*>/g, ' ');
}

/**
 * Decode HTML entities.
 * @param {string} text
 * @returns {string}
 */
function decodeHtmlEntities(text) {
  let result = text;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.split(entity).join(char);
  }
  // Handle numeric entities: &#123; and &#x1F600;
  result = result.replace(/&#(\d+);/g, (_, dec) =>
    String.fromCodePoint(parseInt(dec, 10)),
  );
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16)),
  );
  return result;
}

/**
 * Fix common text artifacts — escaped quotes, stray backslashes, etc.
 * @param {string} text
 * @returns {string}
 */
function fixTextArtifacts(text) {
  return text
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

/**
 * Convert known emoji to bracketed text descriptions.
 * Returns the converted text and whether any emoji were found.
 * @param {string} text
 * @returns {{ text: string; found: boolean }}
 */
function convertEmoji(text) {
  let found = false;
  let result = text;
  for (const [emoji, desc] of EMOJI_MAP) {
    if (result.includes(emoji)) {
      found = true;
      result = result.split(emoji).join(`[${desc}]`);
    }
  }
  return { text: result, found };
}

/**
 * Detect ALL-CAPS words (3+ chars) and lowercase them, flagging their presence.
 * @param {string} text
 * @returns {{ text: string; found: boolean }}
 */
function handleAllCaps(text) {
  let found = false;
  const result = text.replace(/\b([A-Z]{3,})\b/g, (match) => {
    // Skip known acronyms that should stay uppercase
    const KEEP_UPPER =
      /^(API|URL|HTML|CSS|SQL|AWS|GCP|SDK|CLI|SLA|ROI|KPI|CEO|CTO|CFO|COO|CIO|VP|HR|IT|UI|UX|QA|DNS|SSL|TLS|SSH|HTTP|HTTPS|SMTP|IMAP|REST|CRUD|JSON|XML|CSV|PDF|RAM|CPU|GPU|SSD|HDD|LAN|WAN|VPN|CDN|JWT|SSO|SAAS|PAAS|IAAS|IOT|ETL|ERP|CRM|CMS|LMS|NLP|ML|AI|FAQ|ASAP|FYI|POC|MVP|EOD|ETA|RSVP|TBD|TBA|WIP|LGTM|IMO|IMHO|FYI|BTW|DIY)$/;
    if (KEEP_UPPER.test(match)) return match;
    found = true;
    return match.toLowerCase();
  });
  return { text: result, found };
}

/**
 * Remove URLs and flag their presence.
 * @param {string} text
 * @returns {{ text: string; found: boolean }}
 */
function removeUrls(text) {
  let found = false;
  const result = text.replace(URL_REGEX, () => {
    found = true;
    return '[URL]';
  });
  return { text: result, found };
}

/**
 * Normalize common abbreviations to full words.
 * @param {string} text
 * @returns {string}
 */
function normalizeAbbreviations(text) {
  let result = text;
  for (const [pattern, replacement] of ABBREVIATIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Normalize whitespace — collapse runs, trim.
 * @param {string} text
 * @returns {string}
 */
function normalizeWhitespace(text) {
  return text.replace(/[\s\u00A0]+/g, ' ').trim();
}

/**
 * Truncate text to maxLen, preserving sentence boundaries.
 * @param {string} text
 * @param {number} maxLen
 * @returns {{ text: string; truncated: boolean }}
 */
function truncateAtSentence(text, maxLen) {
  if (text.length <= maxLen) return { text, truncated: false };

  // Find the last sentence-ending punctuation before maxLen
  const chunk = text.slice(0, maxLen);
  const lastSentenceEnd = Math.max(
    chunk.lastIndexOf('. '),
    chunk.lastIndexOf('! '),
    chunk.lastIndexOf('? '),
    chunk.lastIndexOf('.\n'),
    chunk.lastIndexOf('!\n'),
    chunk.lastIndexOf('?\n'),
  );

  if (lastSentenceEnd > maxLen * 0.5) {
    // Found a sentence boundary in the latter half — cut there
    return { text: text.slice(0, lastSentenceEnd + 1).trim(), truncated: true };
  }
  // Fallback: cut at last space before maxLen
  const lastSpace = chunk.lastIndexOf(' ');
  if (lastSpace > 0) {
    return { text: text.slice(0, lastSpace).trim() + '...', truncated: true };
  }
  return { text: chunk.trim() + '...', truncated: true };
}

/**
 * Extract the sentence containing a match at the given index.
 * @param {string} text
 * @param {number} matchIndex
 * @param {number} matchLength
 * @returns {string}
 */
function extractSentenceContext(text, matchIndex, matchLength) {
  // Walk backward to sentence start
  let start = matchIndex;
  while (start > 0 && !/[.!?\n]/.test(text[start - 1])) start--;
  // Walk forward to sentence end
  let end = matchIndex + matchLength;
  while (end < text.length && !/[.!?\n]/.test(text[end])) end++;
  // Include the punctuation
  if (end < text.length) end++;
  return text.slice(start, end).trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Main preprocessing pipeline. Runs all cleaning steps and returns the
 * cleaned text plus metadata about what was found.
 *
 * @param {string} text - Raw review / job-posting text
 * @param {{ maxLength?: number }} [options]
 * @returns {{
 *   cleanText: string,
 *   metadata: {
 *     hasEmoji: boolean,
 *     hasAllCaps: boolean,
 *     hasUrls: boolean,
 *     originalLength: number,
 *     truncated: boolean,
 *     language: string
 *   }
 * }}
 */
function preprocessReviewText(text, options = {}) {
  const maxLength = options.maxLength ?? 2000;

  if (!text || typeof text !== 'string') {
    return {
      cleanText: '',
      metadata: {
        hasEmoji: false,
        hasAllCaps: false,
        hasUrls: false,
        originalLength: 0,
        truncated: false,
        language: 'en',
      },
    };
  }

  const originalLength = text.length;

  // 1. Strip HTML
  let processed = stripHtml(text);

  // 2. Decode HTML entities
  processed = decodeHtmlEntities(processed);

  // 3. Fix text artifacts (escaped quotes, etc.)
  processed = fixTextArtifacts(processed);

  // 4. Unicode NFKD normalization
  processed = processed.normalize('NFKD');

  // 5. Convert emoji to text descriptions
  const emojiResult = convertEmoji(processed);
  processed = emojiResult.text;

  // 6. Remove URLs
  const urlResult = removeUrls(processed);
  processed = urlResult.text;

  // 7. Handle ALL CAPS
  const capsResult = handleAllCaps(processed);
  processed = capsResult.text;

  // 8. Normalize abbreviations
  processed = normalizeAbbreviations(processed);

  // 9. Normalize whitespace
  processed = normalizeWhitespace(processed);

  // 10. Detect language (before truncation, on cleaned text)
  const { language } = detectLanguage(processed);

  // 11. Truncate
  const truncResult = truncateAtSentence(processed, maxLength);
  processed = truncResult.text;

  return {
    cleanText: processed,
    metadata: {
      hasEmoji: emojiResult.found,
      hasAllCaps: capsResult.found,
      hasUrls: urlResult.found,
      originalLength,
      truncated: truncResult.truncated,
      language,
    },
  };
}

/**
 * Simple heuristic language detection based on common-word frequency.
 *
 * @param {string} text
 * @returns {{ language: string, confidence: number }}
 */
function detectLanguage(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { language: 'other', confidence: 0 };
  }

  const words = text
    .toLowerCase()
    .replace(/[^a-záàâãäéèêëíìîïóòôõöúùûüñçß\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return { language: 'other', confidence: 0 };

  const totalWords = words.length;
  const scores = {};

  for (const [lang, commonWords] of Object.entries(LANGUAGE_WORDS)) {
    const wordSet = new Set(commonWords);
    let hits = 0;
    for (const word of words) {
      if (wordSet.has(word)) hits++;
    }
    scores[lang] = hits / totalWords;
  }

  let bestLang = 'other';
  let bestScore = 0;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  // Require a minimum threshold to claim a language
  if (bestScore < 0.05) {
    return { language: 'other', confidence: 0 };
  }

  return {
    language: bestLang,
    confidence: Math.round(bestScore * 100) / 100,
  };
}

/**
 * Scan text for urgency indicators and return categorized matches.
 *
 * @param {string} text
 * @returns {Array<{ phrase: string, category: string, index: number }>}
 */
function extractUrgencyIndicators(text) {
  if (!text || typeof text !== 'string') return [];

  const lower = text.toLowerCase();
  const results = [];

  for (const [category, phrases] of Object.entries(URGENCY_PHRASES)) {
    for (const phrase of phrases) {
      // Use word-boundary regex to avoid substring matches (e.g. "crash" inside "crashes")
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, 'gi');
      let match;
      while ((match = re.exec(lower)) !== null) {
        results.push({ phrase, category, index: match.index });
      }
    }
  }

  // Sort by position in text
  results.sort((a, b) => a.index - b.index);
  return results;
}

/**
 * Normalize a company name for deduplication.
 *
 * Strips legal suffixes, handles "The X Company" patterns,
 * normalizes case and whitespace.
 *
 * @param {string} name
 * @returns {string} Normalized company name
 */
function normalizeCompanyName(name) {
  if (!name || typeof name !== 'string') return '';

  let normalized = name.trim();

  // Remove surrounding quotes
  normalized = normalized.replace(/^["']+|["']+$/g, '');

  // Handle "The X Company" → "X"
  normalized = normalized.replace(/^The\s+/i, '');
  normalized = normalized.replace(/\s+Company$/i, '');

  // Remove trailing punctuation (commas, periods) before suffix matching
  normalized = normalized.replace(/[.,]+$/, '').trim();

  // Strip legal suffixes (may need multiple passes for "Pty Ltd" etc.)
  for (let i = 0; i < 3; i++) {
    const before = normalized;
    normalized = normalized.replace(COMPANY_SUFFIXES, '').trim();
    normalized = normalized.replace(/[.,]+$/, '').trim();
    if (normalized === before) break;
  }

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Lowercase for dedup
  normalized = normalized.toLowerCase();

  return normalized;
}

/**
 * Scan text for technology / tool mentions and return matches with context.
 *
 * @param {string} text
 * @returns {Array<{ name: string, category: string, context: string }>}
 */
function extractTechStackMentions(text) {
  if (!text || typeof text !== 'string') return [];

  const results = [];
  const seen = new Set();

  for (const [category, entries] of Object.entries(TECH_STACK)) {
    for (const { pattern, name } of entries) {
      const match = pattern.exec(text);
      if (match && !seen.has(name)) {
        seen.add(name);
        const context = extractSentenceContext(text, match.index, match[0].length);
        results.push({ name, category, context });
      }
      // Reset lastIndex for non-global patterns (safety)
      pattern.lastIndex = 0;
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  preprocessReviewText,
  detectLanguage,
  extractUrgencyIndicators,
  normalizeCompanyName,
  extractTechStackMentions,
};
