/**
 * GTM Intent Scoring Engine
 *
 * Multi-dimensional intent scoring algorithm for the GTM Signal Extraction
 * system. Takes parsed signals and calculates composite intent scores per
 * company account across four dimensions: recency, frequency, depth, and
 * seniority.
 *
 * Reference: docs/gtm-schemas-and-taxonomies.md Section 7
 *
 * Zero external dependencies — Node.js built-ins only.
 *
 * @module gtm-intent-scorer
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Exponential decay half-life in days */
const HALF_LIFE_DAYS = 30;

/** Decay constant: lambda = ln(2) / half_life */
const LAMBDA = Math.log(2) / HALF_LIFE_DAYS;

/** Minimum recency score floor */
const RECENCY_MIN = 5;

/** Maximum recency score ceiling */
const RECENCY_MAX = 100;

/** Composite weight: recency */
const W_RECENCY = 0.30;

/** Composite weight: frequency */
const W_FREQUENCY = 0.25;

/** Composite weight: depth */
const W_DEPTH = 0.25;

/** Composite weight: seniority */
const W_SENIORITY = 0.20;

/** Multi-source compounding multiplier */
const COMPOUNDING_MULTIPLIER = 1.15;

/** Minimum distinct source types to trigger compounding */
const COMPOUNDING_THRESHOLD = 2;

// ---------------------------------------------------------------------------
// Depth signal type weights (proximity to buying decision)
// ---------------------------------------------------------------------------

/** @type {Record<string, number>} */
const DEPTH_WEIGHTS = {
  pricing_page_view: 100,
  competitor_comparison: 90,
  alternatives_viewed: 85,
  negative_review_critical: 80,
  hiring_spike: 75,
  negative_review_high: 60,
  job_posting: 50,
  negative_review_medium: 40,
  app_review_low: 20,
};

// ---------------------------------------------------------------------------
// Seniority title patterns (evaluated in order, first match wins)
// ---------------------------------------------------------------------------

/**
 * @type {Array<{ level: string, score: number, patterns: RegExp[] }>}
 */
const SENIORITY_TIERS = [
  {
    level: 'C-Suite',
    score: 100,
    patterns: [
      /\b(CEO|CTO|CIO|CRO|COO|CFO|CMO|CPO)\b/i,
      /\bChief\s+\w+\s*(Officer|Executive)?\b/i,
    ],
  },
  {
    level: 'VP',
    score: 85,
    patterns: [
      /\b(SVP|EVP)\b/i,
      /\bVice\s+President\b/i,
      /\bVP\b/i,
    ],
  },
  {
    level: 'Director',
    score: 70,
    patterns: [
      /\bSr\.?\s*Director\b/i,
      /\bSenior\s+Director\b/i,
      /\bDirector\b/i,
      /\bHead\s+of\b/i,
    ],
  },
  {
    level: 'Manager',
    score: 55,
    patterns: [
      /\bSenior\s+Manager\b/i,
      /\bSr\.?\s*Manager\b/i,
      /\bGroup\s+Manager\b/i,
      /\bProgram\s+Manager\b/i,
      /\bProject\s+Manager\b/i,
      /\bTeam\s+Lead\b/i,
      /\bManager\b/i,
    ],
  },
  {
    level: 'Senior IC',
    score: 40,
    patterns: [
      /\b(Senior|Sr\.?|Staff|Principal|Lead)\s+(Engineer|Developer|Analyst|Architect|Consultant|Designer)\b/i,
    ],
  },
  {
    level: 'Junior',
    score: 20,
    patterns: [
      /\b(Junior|Jr\.?|Associate|Entry)\b/i,
      /\b(Engineer|Developer|Analyst|Designer|Consultant|Coordinator|Specialist|Representative)\b/i,
    ],
  },
];

/** Score when title is null, undefined, or does not match any pattern */
const SENIORITY_UNKNOWN = 10;

// ---------------------------------------------------------------------------
// Score tier definitions
// ---------------------------------------------------------------------------

/**
 * @type {Array<{ min: number, max: number, tier: string, action: string }>}
 */
const SCORE_TIERS = [
  { min: 90, max: 100, tier: 'immediate', action: 'trigger outreach now' },
  { min: 70, max: 89, tier: 'nurture', action: 'enter nurture sequence' },
  { min: 50, max: 69, tier: 'watch', action: 'monitor for additional signals' },
  { min: 0, max: 49, tier: 'archive', action: 'low priority, check quarterly' },
];

// ---------------------------------------------------------------------------
// Helper: safe date parsing
// ---------------------------------------------------------------------------

/**
 * Parse a value into a Date, returning null on failure.
 * @param {string|number|Date|null|undefined} val
 * @returns {Date|null}
 */
function safeDate(val) {
  if (val == null) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// 1. Recency Score
// ---------------------------------------------------------------------------

/**
 * Calculate recency score using exponential decay.
 *
 * Newer signals score higher. Uses a 30-day half-life so a signal from
 * 30 days ago scores ~50. Scores are clamped to [5, 100].
 *
 * @param {string|number|Date|null|undefined} signalDate - Date of the signal
 * @param {Date} [now] - Reference date (defaults to current time)
 * @returns {number} Score between 5 and 100
 *
 * @example
 * calculateRecencyScore(new Date()) // 100
 * calculateRecencyScore('2026-03-03') // ~50 if today is 2026-04-02
 */
export function calculateRecencyScore(signalDate, now = new Date()) {
  const parsed = safeDate(signalDate);
  if (!parsed) return RECENCY_MIN;

  const msPerDay = 86_400_000;
  const daysSince = (now.getTime() - parsed.getTime()) / msPerDay;

  // Future dates get max score
  if (daysSince <= 0) return RECENCY_MAX;

  const raw = 100 * Math.exp(-LAMBDA * daysSince);
  return clamp(Math.round(raw * 100) / 100, RECENCY_MIN, RECENCY_MAX);
}

// ---------------------------------------------------------------------------
// 2. Frequency Score
// ---------------------------------------------------------------------------

/**
 * Calculate frequency score based on signal count within a time window.
 *
 * More signals in the window indicate persistent pain points.
 *
 * @param {number} signalCount - Number of signals in the window
 * @param {number} [windowDays=30] - Size of the counting window in days (unused in calculation but documents the context)
 * @returns {number} Score: 20, 40, 60, 80, or 100
 *
 * @example
 * calculateFrequencyScore(1)  // 20
 * calculateFrequencyScore(5)  // 60
 * calculateFrequencyScore(15) // 100
 */
export function calculateFrequencyScore(signalCount, windowDays = 30) {
  if (signalCount == null || signalCount <= 0) return 0;
  if (signalCount === 1) return 20;
  if (signalCount <= 3) return 40;
  if (signalCount <= 6) return 60;
  if (signalCount <= 10) return 80;
  return 100;
}

// ---------------------------------------------------------------------------
// 3. Depth Score
// ---------------------------------------------------------------------------

/**
 * Calculate depth score from an array of signal types.
 *
 * Returns the highest weighted score among the provided signal types,
 * reflecting proximity to a buying decision.
 *
 * @param {string[]} signalTypes - Array of signal type identifiers
 * @returns {number} Highest matching weight (0-100), or 0 if no match
 *
 * @example
 * calculateDepthScore(['job_posting', 'pricing_page_view']) // 100
 * calculateDepthScore(['negative_review_medium'])            // 40
 * calculateDepthScore([])                                    // 0
 */
export function calculateDepthScore(signalTypes) {
  if (!Array.isArray(signalTypes) || signalTypes.length === 0) return 0;

  let maxScore = 0;
  for (const t of signalTypes) {
    if (t != null && typeof t === 'string') {
      const normalized = t.trim().toLowerCase();
      const weight = DEPTH_WEIGHTS[normalized];
      if (weight !== undefined && weight > maxScore) {
        maxScore = weight;
      }
    }
  }
  return maxScore;
}

// ---------------------------------------------------------------------------
// 4. Seniority Score
// ---------------------------------------------------------------------------

/**
 * Score a single title string against the seniority tiers.
 * @param {string|null|undefined} title
 * @returns {{ level: string, score: number }}
 */
function scoreSingleTitle(title) {
  if (title == null || typeof title !== 'string' || title.trim() === '') {
    return { level: 'Unknown', score: SENIORITY_UNKNOWN };
  }
  const trimmed = title.trim();
  for (const tier of SENIORITY_TIERS) {
    for (const pattern of tier.patterns) {
      if (pattern.test(trimmed)) {
        return { level: tier.level, score: tier.score };
      }
    }
  }
  return { level: 'Unknown', score: SENIORITY_UNKNOWN };
}

/**
 * Calculate the highest seniority score from an array of reviewer titles.
 *
 * Matches titles against known patterns for C-Suite, VP, Director,
 * Manager, Senior IC, and Junior roles. Returns the maximum score found.
 *
 * @param {Array<string|null|undefined>} reviewerTitles - Array of job titles
 * @returns {number} Highest seniority score (10-100)
 *
 * @example
 * calculateSeniorityScore(['CTO', 'Senior Engineer'])       // 100
 * calculateSeniorityScore(['Director of Engineering'])       // 70
 * calculateSeniorityScore([null, undefined, ''])             // 10
 */
export function calculateSeniorityScore(reviewerTitles) {
  if (!Array.isArray(reviewerTitles) || reviewerTitles.length === 0) {
    return SENIORITY_UNKNOWN;
  }

  let maxScore = SENIORITY_UNKNOWN;
  for (const title of reviewerTitles) {
    const { score } = scoreSingleTitle(title);
    if (score > maxScore) maxScore = score;
  }
  return maxScore;
}

// ---------------------------------------------------------------------------
// 5. Composite Score
// ---------------------------------------------------------------------------

/**
 * Calculate the composite intent score from an array of signal objects.
 *
 * Combines recency, frequency, depth, and seniority scores using
 * weighted averaging: Recency*0.30 + Frequency*0.25 + Depth*0.25 +
 * Seniority*0.20.
 *
 * Applies a 1.15x compounding multiplier when signals come from 2+
 * distinct source types (capped at 100).
 *
 * @param {Array<{ date?: string|Date|null, type?: string|null, severity?: string|null, reviewerTitle?: string|null, source?: string|null }>} signals
 * @param {Date} [now] - Reference date for recency calculation
 * @returns {{
 *   compositeScore: number,
 *   recencyScore: number,
 *   frequencyScore: number,
 *   depthScore: number,
 *   seniorityScore: number,
 *   scoreTier: string,
 *   signalCount: number,
 *   sourceTypes: string[],
 *   compoundingApplied: boolean
 * }}
 *
 * @example
 * const result = calculateCompositeScore([
 *   { date: '2026-04-01', type: 'negative_review_critical', reviewerTitle: 'CTO', source: 'g2' },
 *   { date: '2026-03-20', type: 'job_posting', reviewerTitle: null, source: 'linkedin' },
 * ]);
 * // result.compositeScore => ~87
 * // result.scoreTier => 'nurture'
 */
export function calculateCompositeScore(signals, now = new Date()) {
  // Handle empty / invalid input
  if (!Array.isArray(signals) || signals.length === 0) {
    return {
      compositeScore: 0,
      recencyScore: 0,
      frequencyScore: 0,
      depthScore: 0,
      seniorityScore: 0,
      scoreTier: getScoreTier(0),
      signalCount: 0,
      sourceTypes: [],
      compoundingApplied: false,
    };
  }

  // --- Recency: max across all signals ---
  let recencyScore = RECENCY_MIN;
  for (const s of signals) {
    const r = calculateRecencyScore(s?.date, now);
    if (r > recencyScore) recencyScore = r;
  }

  // --- Frequency: count of signals ---
  const frequencyScore = calculateFrequencyScore(signals.length);

  // --- Depth: highest weighted signal type ---
  const signalTypes = signals
    .map((s) => s?.type)
    .filter((t) => t != null && typeof t === 'string');
  const depthScore = calculateDepthScore(signalTypes);

  // --- Seniority: highest title ---
  const titles = signals
    .map((s) => s?.reviewerTitle)
    .filter((t) => t != null && typeof t === 'string');
  const seniorityScore = calculateSeniorityScore(titles);

  // --- Weighted composite ---
  let composite =
    W_RECENCY * recencyScore +
    W_FREQUENCY * frequencyScore +
    W_DEPTH * depthScore +
    W_SENIORITY * seniorityScore;

  // --- Multi-source compounding ---
  const sourceSet = new Set();
  for (const s of signals) {
    if (s?.source != null && typeof s.source === 'string' && s.source.trim() !== '') {
      sourceSet.add(s.source.trim().toLowerCase());
    }
  }
  const sourceTypes = [...sourceSet].sort();
  const compoundingApplied = sourceTypes.length >= COMPOUNDING_THRESHOLD;

  if (compoundingApplied) {
    composite = composite * COMPOUNDING_MULTIPLIER;
  }

  composite = clamp(Math.round(composite * 100) / 100, 0, 100);

  return {
    compositeScore: composite,
    recencyScore,
    frequencyScore,
    depthScore,
    seniorityScore,
    scoreTier: getScoreTier(composite),
    signalCount: signals.length,
    sourceTypes,
    compoundingApplied,
  };
}

// ---------------------------------------------------------------------------
// 6. Score Tier
// ---------------------------------------------------------------------------

/**
 * Map a composite score to an action tier.
 *
 * | Range   | Tier        | Action                              |
 * |---------|-------------|-------------------------------------|
 * | 90-100  | immediate   | Trigger outreach now                |
 * | 70-89   | nurture     | Enter nurture sequence              |
 * | 50-69   | watch       | Monitor for additional signals      |
 * | 0-49    | archive     | Low priority, check quarterly       |
 *
 * @param {number} score - Composite score (0-100)
 * @returns {string} Tier label
 *
 * @example
 * getScoreTier(95) // 'immediate'
 * getScoreTier(72) // 'nurture'
 * getScoreTier(55) // 'watch'
 * getScoreTier(30) // 'archive'
 */
export function getScoreTier(score) {
  if (score == null || typeof score !== 'number' || isNaN(score)) return 'archive';
  if (score >= 90) return 'immediate';
  if (score >= 70) return 'nurture';
  if (score >= 50) return 'watch';
  return 'archive';
}

// ---------------------------------------------------------------------------
// 7. Score Explanation
// ---------------------------------------------------------------------------

/**
 * Generate a human-readable explanation of a score result.
 *
 * Produces a narrative string suitable for sales reps or dashboards,
 * identifying the primary driver and recommending an approach.
 *
 * @param {{
 *   compositeScore: number,
 *   recencyScore: number,
 *   frequencyScore: number,
 *   depthScore: number,
 *   seniorityScore: number,
 *   scoreTier: string,
 *   signalCount: number,
 *   sourceTypes: string[],
 *   compoundingApplied: boolean
 * }} scoreResult - Output from calculateCompositeScore
 * @param {Array<{ date?: string|Date|null, type?: string|null, severity?: string|null, reviewerTitle?: string|null, source?: string|null, companyName?: string|null, details?: string|null }>} signals
 * @returns {string} Human-readable explanation
 *
 * @example
 * const explanation = generateScoreExplanation(scoreResult, signals);
 * // "Acme Corp scores 87/100 (NURTURE). Primary driver: ..."
 */
export function generateScoreExplanation(scoreResult, signals) {
  if (!scoreResult || !Array.isArray(signals) || signals.length === 0) {
    return 'No signals available to generate explanation.';
  }

  const {
    compositeScore,
    scoreTier,
    signalCount,
    sourceTypes,
    compoundingApplied,
  } = scoreResult;

  // --- Company name ---
  const companyName = findCompanyName(signals) || 'This company';

  // --- Tier label ---
  const tierLabel = scoreTier.toUpperCase();

  // --- Primary driver (highest depth signal) ---
  const primarySignal = findPrimarySignal(signals);
  const primaryDescription = describePrimarySignal(primarySignal);

  // --- Additional signals summary ---
  const additionalSummary = describeAdditionalSignals(signals, primarySignal);

  // --- Recommended approach ---
  const approach = recommendApproach(scoreResult, signals);

  // --- Build explanation ---
  const parts = [
    `${companyName} scores ${Math.round(compositeScore)}/100 (${tierLabel}).`,
  ];

  if (primaryDescription) {
    parts.push(`Primary driver: ${primaryDescription}.`);
  }

  if (additionalSummary) {
    parts.push(`Additional signals: ${additionalSummary}.`);
  }

  if (compoundingApplied) {
    parts.push(`Multi-source boost applied (signals from ${sourceTypes.join(', ')}).`);
  }

  if (approach) {
    parts.push(`Recommended approach: ${approach}.`);
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Explanation helpers (internal)
// ---------------------------------------------------------------------------

/**
 * Extract company name from the first signal that has one.
 * @param {Array<{ companyName?: string|null }>} signals
 * @returns {string|null}
 */
function findCompanyName(signals) {
  for (const s of signals) {
    if (s?.companyName && typeof s.companyName === 'string' && s.companyName.trim() !== '') {
      return s.companyName.trim();
    }
  }
  return null;
}

/**
 * Find the signal with the highest depth weight.
 * @param {Array<{ type?: string|null }>} signals
 * @returns {object|null}
 */
function findPrimarySignal(signals) {
  let best = null;
  let bestWeight = -1;
  for (const s of signals) {
    if (s?.type && typeof s.type === 'string') {
      const w = DEPTH_WEIGHTS[s.type.trim().toLowerCase()] ?? 0;
      if (w > bestWeight) {
        bestWeight = w;
        best = s;
      }
    }
  }
  return best;
}

/**
 * Human-readable description of the primary signal.
 * @param {object|null} signal
 * @returns {string}
 */
function describePrimarySignal(signal) {
  if (!signal) return '';

  const parts = [];

  // Reviewer title
  if (signal.reviewerTitle) {
    parts.push(signal.reviewerTitle);
  }

  // Action verb based on type
  const type = (signal.type || '').toLowerCase();
  if (type.includes('review')) {
    parts.push('posted');
    if (type.includes('critical')) parts.push('a critical');
    else if (type.includes('high')) parts.push('a high-severity');
    else if (type.includes('medium')) parts.push('a medium-severity');
    else parts.push('a');
    if (signal.source) parts.push(`${signal.source} review`);
    else parts.push('review');
  } else if (type.includes('job_posting') || type.includes('hiring')) {
    parts.push('has active hiring signals');
    if (type.includes('hiring_spike')) parts.push('(hiring spike detected)');
  } else if (type.includes('pricing')) {
    parts.push('visited pricing page');
  } else if (type.includes('competitor') || type.includes('alternative')) {
    parts.push('is evaluating competitors');
  } else {
    parts.push(`triggered signal: ${signal.type}`);
  }

  // Recency
  if (signal.date) {
    const parsed = safeDate(signal.date);
    if (parsed) {
      const daysAgo = Math.round((Date.now() - parsed.getTime()) / 86_400_000);
      if (daysAgo === 0) parts.push('today');
      else if (daysAgo === 1) parts.push('yesterday');
      else parts.push(`${daysAgo} days ago`);
    }
  }

  // Details
  if (signal.details && typeof signal.details === 'string') {
    const snippet = signal.details.trim();
    if (snippet.length > 0) {
      const truncated = snippet.length > 120 ? snippet.slice(0, 117) + '...' : snippet;
      parts.push(`about ${truncated}`);
    }
  }

  return parts.join(' ');
}

/**
 * Summarize non-primary signals.
 * @param {Array<object>} signals
 * @param {object|null} primarySignal
 * @returns {string}
 */
function describeAdditionalSignals(signals, primarySignal) {
  if (signals.length <= 1) return '';

  const others = signals.filter((s) => s !== primarySignal);
  if (others.length === 0) return '';

  // Group by type
  const typeCounts = {};
  for (const s of others) {
    const type = s?.type || 'unknown';
    const label = formatSignalType(type);
    typeCounts[label] = (typeCounts[label] || 0) + 1;
  }

  const descriptions = Object.entries(typeCounts).map(
    ([label, count]) => `${count} ${label}${count > 1 ? 's' : ''}`
  );

  // Window description
  const dates = others
    .map((s) => safeDate(s?.date))
    .filter((d) => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  let timeframe = '';
  if (dates.length > 0) {
    const oldestDays = Math.round((Date.now() - dates[0].getTime()) / 86_400_000);
    timeframe = ` in last ${oldestDays} days`;
  }

  return `${descriptions.join(', ')}${timeframe}`;
}

/**
 * Format a signal type slug into readable text.
 * @param {string} type
 * @returns {string}
 */
function formatSignalType(type) {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bIc\b/g, 'IC');
}

/**
 * Recommend an outreach approach based on the dominant signals.
 * @param {object} scoreResult
 * @param {Array<object>} signals
 * @returns {string}
 */
function recommendApproach(scoreResult, signals) {
  const types = signals
    .map((s) => (s?.type || '').toLowerCase())
    .filter((t) => t !== '');

  const hasPricing = types.some((t) => t.includes('pricing'));
  const hasCompetitor = types.some((t) => t.includes('competitor') || t.includes('alternative'));
  const hasNegativeReview = types.some((t) => t.includes('negative_review'));
  const hasHiring = types.some((t) => t.includes('hiring') || t.includes('job_posting'));

  if (hasPricing && hasCompetitor) {
    return 'Lead with competitive comparison and migration support';
  }
  if (hasNegativeReview && hasHiring) {
    return 'Lead with implementation expertise and team augmentation';
  }
  if (hasNegativeReview) {
    return 'Lead with technical consulting to address pain points identified in reviews';
  }
  if (hasHiring) {
    return 'Lead with staff augmentation and knowledge transfer';
  }
  if (hasPricing) {
    return 'Lead with ROI analysis and cost optimization';
  }
  if (hasCompetitor) {
    return 'Lead with vendor evaluation framework and migration planning';
  }

  const { scoreTier } = scoreResult;
  if (scoreTier === 'immediate') return 'Personalized outreach highlighting relevant capabilities';
  if (scoreTier === 'nurture') return 'Template-based nurture sequence with case studies';
  if (scoreTier === 'watch') return 'Add to monitoring list and set signal alerts';
  return 'Archive and revisit quarterly';
}
