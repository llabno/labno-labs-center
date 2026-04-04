/**
 * GTM Review Deduplication & Freshness Decay
 *
 * Handles two critical data quality functions for the GTM ingestion pipeline:
 * 1. Deduplication of reviews across platforms (App Store, G2, Capterra, etc.)
 * 2. Freshness weighting so recent reviews carry more signal than stale ones
 *
 * No external dependencies — uses only built-in Node.js / browser APIs.
 */

import { normalizeCompanyName } from './gtm-company-normalizer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simple string hash (djb2). Returns a hex string.
 * @param {string} str
 * @returns {string}
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}

/**
 * Normalize a reviewer name for comparison.
 * Lowercases, strips extra whitespace and punctuation.
 * @param {string|null|undefined} name
 * @returns {string}
 */
function normalizeReviewerName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compute Jaccard similarity between two sets of tokens.
 * @param {Set<string>} a
 * @param {Set<string>} b
 * @returns {number} 0–1
 */
function jaccardSimilarity(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Tokenize text into a set of lowercase word tokens (3+ chars).
 * @param {string} text
 * @returns {Set<string>}
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  return new Set(words);
}

/**
 * Parse a date value into a Date object. Handles Date instances, ISO strings,
 * and epoch timestamps.
 * @param {Date|string|number|null|undefined} value
 * @returns {Date|null}
 */
function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------
// generateReviewFingerprint
// ---------------------------------------------------------------------------

/**
 * Create a deduplication fingerprint for a review.
 *
 * - **primaryKey**: exact match on `source_platform + review_id_external`
 * - **secondaryKey**: cross-platform fuzzy match on normalized reviewer name
 *   plus a hash of the first 100 characters of review text
 *
 * @param {{ source_platform: string, review_id_external: string, app_name?: string, software_name?: string, reviewer_name?: string, review_text?: string }} review
 * @returns {{ primaryKey: string, secondaryKey: string }}
 */
export function generateReviewFingerprint(review) {
  const platform = (review.source_platform || '').toLowerCase().trim();
  const externalId = (review.review_id_external || '').trim();

  // Primary key: platform-scoped external ID
  const primaryKey = `${platform}::${externalId}`;

  // Secondary key: reviewer name + first 100 chars of review text hash
  const normName = normalizeReviewerName(review.reviewer_name);
  const textSnippet = (review.review_text || '').slice(0, 100).toLowerCase().trim();
  const textHash = hashString(textSnippet);
  const secondaryKey = `${normName}::${textHash}`;

  return { primaryKey, secondaryKey };
}

// ---------------------------------------------------------------------------
// deduplicateReviews
// ---------------------------------------------------------------------------

/**
 * Remove duplicate reviews from a batch.
 *
 * 1. **First pass** — exact match on primaryKey (same platform + external ID)
 * 2. **Second pass** — fuzzy match on secondaryKey (same reviewer, similar text
 *    across different platforms)
 *
 * @param {Array<object>} reviews - Array of review objects (must contain fields
 *   accepted by {@link generateReviewFingerprint})
 * @returns {{ unique: object[], duplicates: Array<object[]>, stats: { total: number, unique: number, duplicated: number } }}
 */
export function deduplicateReviews(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return { unique: [], duplicates: [], stats: { total: 0, unique: 0, duplicated: 0 } };
  }

  /** @type {Map<string, object>} primaryKey → first review seen */
  const primarySeen = new Map();
  /** @type {Map<string, object[]>} primaryKey → duplicate group */
  const primaryDupGroups = new Map();

  // First pass: exact match on primaryKey
  const afterPrimary = [];

  for (const review of reviews) {
    const { primaryKey } = generateReviewFingerprint(review);

    if (primarySeen.has(primaryKey)) {
      // Duplicate — add to group
      if (!primaryDupGroups.has(primaryKey)) {
        primaryDupGroups.set(primaryKey, [primarySeen.get(primaryKey)]);
      }
      primaryDupGroups.get(primaryKey).push(review);
    } else {
      primarySeen.set(primaryKey, review);
      afterPrimary.push(review);
    }
  }

  // Second pass: fuzzy match on secondaryKey (cross-platform)
  /** @type {Map<string, object>} secondaryKey → first review seen */
  const secondarySeen = new Map();
  /** @type {Map<string, object[]>} secondaryKey → duplicate group */
  const secondaryDupGroups = new Map();
  const unique = [];

  for (const review of afterPrimary) {
    const { secondaryKey } = generateReviewFingerprint(review);

    // Only apply secondary dedup if the reviewer name portion is non-empty
    const hasReviewerInfo = secondaryKey.split('::')[0].length > 0;

    if (hasReviewerInfo && secondarySeen.has(secondaryKey)) {
      if (!secondaryDupGroups.has(secondaryKey)) {
        secondaryDupGroups.set(secondaryKey, [secondarySeen.get(secondaryKey)]);
      }
      secondaryDupGroups.get(secondaryKey).push(review);
    } else {
      if (hasReviewerInfo) {
        secondarySeen.set(secondaryKey, review);
      }
      unique.push(review);
    }
  }

  // Merge all duplicate groups
  const duplicates = [
    ...primaryDupGroups.values(),
    ...secondaryDupGroups.values(),
  ];

  const duplicatedCount = duplicates.reduce((sum, group) => sum + group.length, 0);

  return {
    unique,
    duplicates,
    stats: {
      total: reviews.length,
      unique: unique.length,
      duplicated: duplicatedCount,
    },
  };
}

// ---------------------------------------------------------------------------
// calculateFreshnessWeight
// ---------------------------------------------------------------------------

/**
 * Calculate an exponential-decay freshness weight for a review.
 *
 * Recent reviews get a weight close to 1.0; older reviews decay toward 0.
 * Uses a configurable half-life (default 90 days).
 *
 * Formula: `weight = max(0.05, exp(-ln(2) * daysSince / halfLifeDays))`
 *
 * @param {Date|string|number} reviewDate - When the review was posted
 * @param {number} [halfLifeDays=90] - Number of days for the weight to halve
 * @returns {{ weight: number, daysSince: number, isStale: boolean }}
 */
export function calculateFreshnessWeight(reviewDate, halfLifeDays = 90) {
  const date = parseDate(reviewDate);
  if (!date) {
    return { weight: 0.05, daysSince: Infinity, isStale: true };
  }

  const now = new Date();
  const msPerDay = 86_400_000;
  const daysSince = Math.max(0, (now.getTime() - date.getTime()) / msPerDay);

  const rawWeight = Math.exp(-Math.log(2) * daysSince / halfLifeDays);
  const weight = Math.max(0.05, Math.round(rawWeight * 1000) / 1000);

  return {
    weight,
    daysSince: Math.round(daysSince * 10) / 10,
    isStale: weight < 0.2,
  };
}

// ---------------------------------------------------------------------------
// groupReviewsByCompany
// ---------------------------------------------------------------------------

/**
 * Group reviews by normalized company name.
 *
 * Accepts reviews from any platform (app store, G2, Capterra, etc.) and groups
 * them under the same canonical company name using {@link normalizeCompanyName}.
 *
 * @param {Array<{ app_name?: string, software_name?: string, company_name?: string, rating?: number, review_date?: string|Date, sentiment_score?: number, [key: string]: any }>} reviews
 * @returns {Map<string, { reviews: object[], totalCount: number, avgRating: number, freshestDate: Date|null, weightedSentiment: number }>}
 */
export function groupReviewsByCompany(reviews) {
  /** @type {Map<string, { reviews: object[], totalCount: number, ratings: number[], freshestDate: Date|null, sentimentWeights: Array<{ sentiment: number, weight: number }> }>} */
  const groups = new Map();

  if (!Array.isArray(reviews)) return new Map();

  for (const review of reviews) {
    const rawName = review.company_name || review.software_name || review.app_name || '';
    const normalized = normalizeCompanyName(rawName);
    if (!normalized) continue;

    if (!groups.has(normalized)) {
      groups.set(normalized, {
        reviews: [],
        totalCount: 0,
        ratings: [],
        freshestDate: null,
        sentimentWeights: [],
      });
    }

    const group = groups.get(normalized);
    group.reviews.push(review);
    group.totalCount++;

    if (review.rating != null && !isNaN(review.rating)) {
      group.ratings.push(Number(review.rating));
    }

    const reviewDate = parseDate(review.review_date);
    if (reviewDate && (!group.freshestDate || reviewDate > group.freshestDate)) {
      group.freshestDate = reviewDate;
    }

    if (review.sentiment_score != null && !isNaN(review.sentiment_score)) {
      const { weight } = calculateFreshnessWeight(review.review_date);
      group.sentimentWeights.push({ sentiment: Number(review.sentiment_score), weight });
    }
  }

  // Build final output map
  /** @type {Map<string, { reviews: object[], totalCount: number, avgRating: number, freshestDate: Date|null, weightedSentiment: number }>} */
  const result = new Map();

  for (const [name, group] of groups) {
    const avgRating =
      group.ratings.length > 0
        ? Math.round((group.ratings.reduce((a, b) => a + b, 0) / group.ratings.length) * 100) / 100
        : 0;

    let weightedSentiment = 0;
    if (group.sentimentWeights.length > 0) {
      const totalWeight = group.sentimentWeights.reduce((s, sw) => s + sw.weight, 0);
      if (totalWeight > 0) {
        weightedSentiment =
          Math.round(
            (group.sentimentWeights.reduce((s, sw) => s + sw.sentiment * sw.weight, 0) /
              totalWeight) *
              1000
          ) / 1000;
      }
    }

    result.set(name, {
      reviews: group.reviews,
      totalCount: group.totalCount,
      avgRating,
      freshestDate: group.freshestDate,
      weightedSentiment,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// detectReviewPatterns
// ---------------------------------------------------------------------------

/**
 * Detect temporal patterns in a company's reviews.
 *
 * Identified patterns:
 * - **declining_rating**: 3+ consecutive reviews with declining ratings
 * - **review_burst**: 5+ reviews within a 7-day window (may indicate incident/outage)
 * - **persistent_bug**: same complaint appears across 3+ app versions
 *
 * @param {Array<{ rating?: number, review_date?: string|Date, review_text?: string, app_version?: string, [key: string]: any }>} reviews
 * @returns {{ patterns: Array<{ type: string, description: string, evidence: any, severity: 'low'|'medium'|'high' }> }}
 */
export function detectReviewPatterns(reviews) {
  /** @type {Array<{ type: string, description: string, evidence: any, severity: 'low'|'medium'|'high' }>} */
  const patterns = [];

  if (!Array.isArray(reviews) || reviews.length < 3) {
    return { patterns };
  }

  // Sort by date ascending
  const dated = reviews
    .map((r) => ({ ...r, _parsedDate: parseDate(r.review_date) }))
    .filter((r) => r._parsedDate !== null)
    .sort((a, b) => a._parsedDate.getTime() - b._parsedDate.getTime());

  // --- Declining rating trend ---
  if (dated.length >= 3) {
    let maxDeclineRun = 0;
    let currentRun = 0;
    let declineStart = 0;

    for (let i = 1; i < dated.length; i++) {
      const prevRating = dated[i - 1].rating;
      const currRating = dated[i].rating;
      if (prevRating != null && currRating != null && currRating < prevRating) {
        if (currentRun === 0) {
          declineStart = i - 1;
        }
        currentRun++;
        if (currentRun > maxDeclineRun) maxDeclineRun = currentRun;
      } else {
        currentRun = 0;
      }
    }

    if (maxDeclineRun >= 2) {
      // 2 declines = 3 consecutive declining reviews
      const severity = maxDeclineRun >= 4 ? 'high' : maxDeclineRun >= 3 ? 'medium' : 'low';
      patterns.push({
        type: 'declining_rating',
        description: `${maxDeclineRun + 1} consecutive reviews with declining ratings`,
        evidence: {
          consecutiveDeclines: maxDeclineRun + 1,
        },
        severity,
      });
    }
  }

  // --- Review burst ---
  if (dated.length >= 5) {
    const msPerDay = 86_400_000;
    const windowDays = 7;

    let maxBurst = 0;
    let burstWindow = null;

    for (let i = 0; i < dated.length; i++) {
      const windowEnd = dated[i]._parsedDate.getTime() + windowDays * msPerDay;
      let count = 0;
      for (let j = i; j < dated.length; j++) {
        if (dated[j]._parsedDate.getTime() <= windowEnd) {
          count++;
        } else {
          break;
        }
      }
      if (count > maxBurst) {
        maxBurst = count;
        burstWindow = {
          start: dated[i]._parsedDate.toISOString(),
          end: new Date(windowEnd).toISOString(),
        };
      }
    }

    if (maxBurst >= 5) {
      const severity = maxBurst >= 15 ? 'high' : maxBurst >= 8 ? 'medium' : 'low';
      patterns.push({
        type: 'review_burst',
        description: `${maxBurst} reviews within a 7-day window — possible incident or outage`,
        evidence: {
          count: maxBurst,
          window: burstWindow,
        },
        severity,
      });
    }
  }

  // --- Persistent bug (same complaint across 3+ app versions) ---
  const versionedReviews = reviews.filter(
    (r) => r.app_version && r.review_text && r.review_text.length > 20
  );

  if (versionedReviews.length >= 3) {
    // Group by version, tokenize texts, look for shared complaint tokens
    /** @type {Map<string, Set<string>[]>} */
    const versionTokens = new Map();

    for (const r of versionedReviews) {
      const version = r.app_version.trim();
      if (!versionTokens.has(version)) {
        versionTokens.set(version, []);
      }
      versionTokens.get(version).push(tokenize(r.review_text));
    }

    if (versionTokens.size >= 3) {
      // Find tokens that appear in reviews across 3+ versions
      /** @type {Map<string, Set<string>>} token → set of versions containing it */
      const tokenVersions = new Map();

      for (const [version, tokenSets] of versionTokens) {
        const mergedTokens = new Set();
        for (const ts of tokenSets) {
          for (const t of ts) mergedTokens.add(t);
        }
        for (const token of mergedTokens) {
          if (!tokenVersions.has(token)) {
            tokenVersions.set(token, new Set());
          }
          tokenVersions.get(token).add(version);
        }
      }

      // Filter for meaningful complaint tokens appearing across 3+ versions
      const stopWords = new Set([
        'the', 'this', 'that', 'and', 'but', 'not', 'with', 'for', 'app',
        'use', 'get', 'has', 'was', 'are', 'have', 'been', 'just', 'very',
        'really', 'would', 'could', 'should', 'does', 'can', 'will', 'its',
      ]);

      const persistentTokens = [];
      for (const [token, versions] of tokenVersions) {
        if (versions.size >= 3 && !stopWords.has(token)) {
          persistentTokens.push({ token, versionCount: versions.size, versions: [...versions] });
        }
      }

      if (persistentTokens.length > 0) {
        // Sort by version count descending
        persistentTokens.sort((a, b) => b.versionCount - a.versionCount);
        const topComplaints = persistentTokens.slice(0, 5);

        patterns.push({
          type: 'persistent_bug',
          description: `Recurring complaint keywords found across ${topComplaints[0].versionCount}+ app versions`,
          evidence: {
            topKeywords: topComplaints.map((c) => ({
              keyword: c.token,
              acrossVersions: c.versions,
            })),
          },
          severity: topComplaints[0].versionCount >= 5 ? 'high' : 'medium',
        });
      }
    }
  }

  return { patterns };
}

// ---------------------------------------------------------------------------
// buildSemanticDeduplicationGroups
// ---------------------------------------------------------------------------

/**
 * Group semantically similar complaints after LLM classification.
 *
 * Takes an array of parsed signals (with fields like `company_name`,
 * `pain_point_category`, `severity`, `review_text`) and groups them by
 * company + category + severity. Within each group, reviews with high text
 * similarity are collapsed into a single deduplicated complaint with a count.
 *
 * Higher count = stronger signal (many users reporting the same problem).
 *
 * @param {Array<{ company_name?: string, software_name?: string, app_name?: string, pain_point_category?: string, severity?: string, review_text?: string, [key: string]: any }>} parsedSignals
 * @returns {Array<{ company: string, painPointCategory: string, severity: string, complaintCount: number, representativeText: string, signals: object[] }>}
 */
export function buildSemanticDeduplicationGroups(parsedSignals) {
  if (!Array.isArray(parsedSignals) || parsedSignals.length === 0) return [];

  // Step 1: Group by company + category + severity
  /** @type {Map<string, object[]>} */
  const coarseGroups = new Map();

  for (const signal of parsedSignals) {
    const company = normalizeCompanyName(
      signal.company_name || signal.software_name || signal.app_name || ''
    );
    if (!company) continue;

    const category = (signal.pain_point_category || 'uncategorized').toLowerCase().trim();
    const severity = (signal.severity || 'unknown').toLowerCase().trim();
    const groupKey = `${company}||${category}||${severity}`;

    if (!coarseGroups.has(groupKey)) {
      coarseGroups.set(groupKey, []);
    }
    coarseGroups.get(groupKey).push(signal);
  }

  // Step 2: Within each group, cluster by text similarity
  const SIMILARITY_THRESHOLD = 0.35; // Jaccard threshold for "same complaint"
  const results = [];

  for (const [groupKey, signals] of coarseGroups) {
    const [company, category, severity] = groupKey.split('||');

    // Tokenize all review texts
    const tokenized = signals.map((s) => ({
      signal: s,
      tokens: tokenize(s.review_text),
    }));

    // Greedy clustering
    const clusters = [];
    const assigned = new Set();

    for (let i = 0; i < tokenized.length; i++) {
      if (assigned.has(i)) continue;

      const cluster = [i];
      assigned.add(i);

      for (let j = i + 1; j < tokenized.length; j++) {
        if (assigned.has(j)) continue;

        const sim = jaccardSimilarity(tokenized[i].tokens, tokenized[j].tokens);
        if (sim >= SIMILARITY_THRESHOLD) {
          cluster.push(j);
          assigned.add(j);
        }
      }

      // Pick the longest text as representative
      const clusterSignals = cluster.map((idx) => tokenized[idx].signal);
      const representative = clusterSignals.reduce((best, s) => {
        const bestLen = (best.review_text || '').length;
        const currLen = (s.review_text || '').length;
        return currLen > bestLen ? s : best;
      }, clusterSignals[0]);

      results.push({
        company,
        painPointCategory: category,
        severity,
        complaintCount: clusterSignals.length,
        representativeText: representative.review_text || '',
        signals: clusterSignals,
      });
    }
  }

  // Sort by complaint count descending (strongest signals first)
  results.sort((a, b) => b.complaintCount - a.complaintCount);

  return results;
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  generateReviewFingerprint,
  deduplicateReviews,
  calculateFreshnessWeight,
  groupReviewsByCompany,
  detectReviewPatterns,
  buildSemanticDeduplicationGroups,
};
