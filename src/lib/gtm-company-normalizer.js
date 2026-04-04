/**
 * GTM Company Name Normalizer & Deduplicator
 *
 * Handles matching company names across data sources:
 * G2 reviews, App Store reviews, LinkedIn job postings, enrichment APIs.
 *
 * Uses only built-in Node.js modules.
 */

/** Legal suffixes to strip, ordered longest-first to avoid partial matches */
const LEGAL_SUFFIXES = [
  'incorporated',
  'corporation',
  'international',
  'holdings',
  'limited',
  'company',
  'group',
  'pty ltd',
  'pty',
  'l\\.l\\.c\\.',
  'llc',
  'ltd\\.',
  'ltd',
  'inc\\.',
  'inc',
  'corp\\.',
  'corp',
  'gmbh',
  's\\.a\\.s\\.',
  's\\.a\\.',
  'b\\.v\\.',
  'n\\.v\\.',
  'plc',
  'co\\.',
  'ag',
  'intl',
];

/** Build a single regex from all suffixes (case-insensitive, word-boundary aware) */
const SUFFIX_REGEX = new RegExp(
  '[,\\s]+(?:' + LEGAL_SUFFIXES.join('|') + ')\\s*$',
  'i'
);

/** Abbreviation map — short form is canonical */
const ABBREVIATION_MAP = {
  international: 'intl',
};

/**
 * Source quality ranking for merge priority.
 * Higher number = higher trust.
 */
const SOURCE_PRIORITY = {
  enrichment: 100,
  api: 90,
  linkedin: 70,
  g2: 60,
  appstore: 50,
  scraped: 30,
  manual: 20,
};

// ---------------------------------------------------------------------------
// normalizeCompanyName
// ---------------------------------------------------------------------------

/**
 * Normalize a company name for comparison.
 *
 * - Lowercases
 * - Strips legal suffixes (Inc, LLC, Ltd, etc.)
 * - Removes "The " prefix
 * - Collapses whitespace
 * - Trims trailing punctuation
 * - Applies abbreviation canonicalization
 *
 * @param {string|null|undefined} name - Raw company name
 * @returns {string} Normalized name, or empty string for invalid input
 */
export function normalizeCompanyName(name) {
  if (name == null || typeof name !== 'string') return '';

  let n = name.trim();
  if (n.length === 0) return '';

  // Lowercase
  n = n.toLowerCase();

  // Remove "the " prefix
  if (n.startsWith('the ')) {
    n = n.slice(4);
  }

  // Strip legal suffixes (may need multiple passes for stacked suffixes)
  let prev;
  do {
    prev = n;
    n = n.replace(SUFFIX_REGEX, '').trim();
  } while (n !== prev);

  // Remove trailing punctuation (commas, periods, dashes)
  n = n.replace(/[,.\-;:!]+$/, '');

  // Collapse whitespace
  n = n.replace(/\s+/g, ' ').trim();

  // Apply abbreviation mapping
  for (const [long, short] of Object.entries(ABBREVIATION_MAP)) {
    // Replace whole-word occurrences
    n = n.replace(new RegExp('\\b' + long + '\\b', 'g'), short);
  }

  return n;
}

// ---------------------------------------------------------------------------
// Levenshtein distance
// ---------------------------------------------------------------------------

/**
 * Compute the Levenshtein edit distance between two strings.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshtein(a, b) {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Use single-row optimisation
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lb];
}

/**
 * Compute Levenshtein similarity ratio (0–1).
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function similarityRatio(a, b) {
  if (a.length === 0 && b.length === 0) return 1;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / maxLen;
}

// ---------------------------------------------------------------------------
// buildAcronymMap
// ---------------------------------------------------------------------------

/**
 * Generate possible acronyms from a company name.
 *
 * Examples:
 *   "International Business Machines" → ["IBM"]
 *   "Johnson & Johnson" → ["J&J", "JNJ"]
 *
 * @param {string|null|undefined} name - Company name
 * @returns {string[]} Array of possible acronyms (uppercased)
 */
export function buildAcronymMap(name) {
  if (name == null || typeof name !== 'string') return [];

  const cleaned = name.trim();
  if (cleaned.length === 0) return [];

  const acronyms = new Set();

  // Split on whitespace
  const words = cleaned.split(/\s+/);
  if (words.length < 2) return [];

  // Standard acronym: first letter of each word (skip minor words < 3 chars unless it's &)
  const letters = [];
  const allLetters = [];

  for (const w of words) {
    if (w === '&') {
      letters.push('&');
      allLetters.push('&');
      continue;
    }
    const ch = w[0]?.toUpperCase();
    if (!ch) continue;
    allLetters.push(ch);
    // Skip minor connector words for the filtered variant
    if (['of', 'the', 'and', 'for', 'in', 'on', 'at', 'to', 'a', 'an'].includes(w.toLowerCase())) {
      continue;
    }
    letters.push(ch);
  }

  if (letters.length >= 2) {
    acronyms.add(letters.join(''));
  }
  if (allLetters.length >= 2) {
    acronyms.add(allLetters.join(''));
  }

  // Variant without ampersand: replace '&' with nothing
  for (const acr of [...acronyms]) {
    if (acr.includes('&')) {
      acronyms.add(acr.replace(/&/g, ''));
    }
  }

  return [...acronyms];
}

// ---------------------------------------------------------------------------
// fuzzyMatch
// ---------------------------------------------------------------------------

/**
 * Fuzzy-match two company names.
 *
 * Checks in order: exact normalized match, containment, acronym match, then
 * Levenshtein similarity.
 *
 * @param {string|null|undefined} name1 - First company name
 * @param {string|null|undefined} name2 - Second company name
 * @param {number} [threshold=0.85] - Minimum similarity for a fuzzy match (0–1)
 * @returns {{ isMatch: boolean, similarity: number, matchType: 'exact'|'contains'|'fuzzy'|'acronym' }}
 */
export function fuzzyMatch(name1, name2, threshold = 0.85) {
  const NO_MATCH = { isMatch: false, similarity: 0, matchType: 'fuzzy' };

  const n1 = normalizeCompanyName(name1);
  const n2 = normalizeCompanyName(name2);

  if (n1.length === 0 || n2.length === 0) return NO_MATCH;

  // Exact match after normalization
  if (n1 === n2) {
    return { isMatch: true, similarity: 1, matchType: 'exact' };
  }

  // Containment check (one name is a substring of the other)
  if (n1.length >= 2 && n2.length >= 2) {
    const shorter = n1.length <= n2.length ? n1 : n2;
    const longer = n1.length > n2.length ? n1 : n2;
    if (longer.includes(shorter) && shorter.length / longer.length > 0.5) {
      return {
        isMatch: true,
        similarity: shorter.length / longer.length,
        matchType: 'contains',
      };
    }
  }

  // Acronym check
  const raw1 = (name1 || '').trim();
  const raw2 = (name2 || '').trim();
  const acronyms1 = buildAcronymMap(raw1);
  const acronyms2 = buildAcronymMap(raw2);
  const upper1 = n1.toUpperCase();
  const upper2 = n2.toUpperCase();

  // Check if name2 is an acronym of name1 or vice-versa
  if (acronyms1.includes(upper2) || acronyms2.includes(upper1)) {
    return { isMatch: true, similarity: 0.95, matchType: 'acronym' };
  }

  // Levenshtein fuzzy
  const sim = similarityRatio(n1, n2);
  return {
    isMatch: sim >= threshold,
    similarity: Math.round(sim * 1000) / 1000,
    matchType: 'fuzzy',
  };
}

// ---------------------------------------------------------------------------
// deduplicateCompanies
// ---------------------------------------------------------------------------

/**
 * Get numeric priority for a data source string.
 *
 * @param {string} source
 * @returns {number}
 */
function sourcePriority(source) {
  if (!source) return 0;
  const s = source.toLowerCase();
  for (const [key, val] of Object.entries(SOURCE_PRIORITY)) {
    if (s.includes(key)) return val;
  }
  return 10; // unknown source
}

/**
 * Deduplicate an array of company records by fuzzy-matching names.
 *
 * Each input object must have at least a `name` property. Additional fields
 * are preserved and merged, preferring data from higher-priority sources.
 *
 * @param {Array<{ name: string, source?: string, [key: string]: any }>} companies
 * @returns {Array<{ canonicalName: string, variants: string[], sources: string[], mergedData: object }>}
 */
export function deduplicateCompanies(companies) {
  if (!Array.isArray(companies) || companies.length === 0) return [];

  // Filter out invalid entries
  const valid = companies.filter(
    (c) => c && typeof c.name === 'string' && c.name.trim().length > 0
  );
  if (valid.length === 0) return [];

  /** @type {Array<{ canonicalName: string, normalizedName: string, variants: Set<string>, sources: Set<string>, records: Array }>} */
  const groups = [];

  for (const company of valid) {
    const norm = normalizeCompanyName(company.name);
    let matched = false;

    for (const group of groups) {
      const result = fuzzyMatch(company.name, group.canonicalName);
      if (result.isMatch) {
        group.variants.add(company.name.trim());
        if (company.source) group.sources.add(company.source);
        group.records.push(company);
        matched = true;
        break;
      }
    }

    if (!matched) {
      const g = {
        canonicalName: company.name.trim(),
        normalizedName: norm,
        variants: new Set([company.name.trim()]),
        sources: new Set(),
        records: [company],
      };
      if (company.source) g.sources.add(company.source);
      groups.push(g);
    }
  }

  // Build output, merge data with source-priority ordering
  return groups.map((g) => {
    // Sort records by source priority descending so high-trust wins
    const sorted = [...g.records].sort(
      (a, b) => sourcePriority(b.source) - sourcePriority(a.source)
    );

    // Merge data: spread in reverse priority order so highest priority overwrites
    const mergedData = {};
    for (let i = sorted.length - 1; i >= 0; i--) {
      const { name: _n, source: _s, ...rest } = sorted[i];
      Object.assign(mergedData, rest);
    }

    // Canonical name comes from highest-priority source
    const canonicalName = normalizeCompanyName(sorted[0].name) || sorted[0].name.trim();

    return {
      canonicalName,
      variants: [...g.variants],
      sources: [...g.sources],
      mergedData,
    };
  });
}

// ---------------------------------------------------------------------------
// extractDomainFromCompany
// ---------------------------------------------------------------------------

/**
 * Best-guess a domain name from a company name.
 *
 * Strips legal suffixes, special characters, and spaces, then appends ".com".
 * Result should be verified by an enrichment API.
 *
 * @param {string|null|undefined} name - Company name
 * @returns {string} Guessed domain, or empty string for invalid input
 */
export function extractDomainFromCompany(name) {
  if (name == null || typeof name !== 'string') return '';

  let n = normalizeCompanyName(name);
  if (n.length === 0) return '';

  // Remove everything except letters, digits, hyphens
  n = n.replace(/[^a-z0-9-]/g, '');

  if (n.length === 0) return '';

  return n + '.com';
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

// Default export for convenience
export default {
  normalizeCompanyName,
  fuzzyMatch,
  deduplicateCompanies,
  buildAcronymMap,
  extractDomainFromCompany,
};
