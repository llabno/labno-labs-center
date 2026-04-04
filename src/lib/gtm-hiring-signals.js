/**
 * GTM Hiring Signal Detection Module
 *
 * Analyzes job postings to detect intent signals indicating companies
 * that may need Labno Labs services (AI consulting, automation, migration).
 *
 * @module gtm-hiring-signals
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DEPARTMENT_MAP = {
  engineering: ['engineer', 'developer', 'software', 'sre', 'devops', 'platform', 'backend', 'frontend', 'fullstack', 'full-stack', 'full stack'],
  data: ['data', 'analytics', 'machine learning', 'ml', 'ai', 'scientist', 'data engineer'],
  operations: ['operations', 'it ', 'infrastructure', 'systems', 'cloud', 'reliability'],
};

const TECH_KEYWORDS = {
  python: ['python'],
  javascript: ['javascript', 'typescript', 'node', 'react', 'vue', 'angular'],
  java: ['java', 'spring', 'jvm', 'kotlin'],
  dotnet: ['.net', 'c#', 'csharp', 'asp.net'],
  cloud: ['aws', 'azure', 'gcp', 'cloud'],
  data: ['sql', 'spark', 'hadoop', 'snowflake', 'databricks', 'airflow', 'kafka'],
  ml: ['tensorflow', 'pytorch', 'scikit', 'ml', 'machine learning', 'llm', 'nlp'],
  devops: ['docker', 'kubernetes', 'k8s', 'terraform', 'ci/cd', 'jenkins', 'github actions'],
};

const DEBT_INDICATORS = {
  infrastructure: {
    label: 'Infrastructure Debt',
    patterns: [
      'legacy monolith', 'python 2', 'on-premise', 'on premise', 'mainframe',
      'cobol', 'migration from', 'legacy system', 'legacy infrastructure',
      'legacy application', 'technical debt', 'end of life', 'end-of-life',
      'deprecated', 'outdated', 'aging infrastructure',
    ],
  },
  workflow: {
    label: 'Workflow Debt',
    patterns: [
      'manual spreadsheets', 'data entry', 'streamline processes',
      'reduce errors', 'manual process', 'manual workflow', 'paper-based',
      'eliminate manual', 'automate existing', 'repetitive tasks',
      'error-prone', 'time-consuming process',
    ],
  },
  aiReadiness: {
    label: 'AI Readiness',
    patterns: [
      'ai/ml', 'machine learning', 'data pipeline', 'model deployment',
      'artificial intelligence', 'deep learning', 'llm', 'generative ai',
      'computer vision', 'natural language processing', 'nlp',
      'ml ops', 'mlops', 'feature store', 'model serving',
    ],
  },
  cloudMigration: {
    label: 'Cloud Migration',
    patterns: [
      'cloud migration', 'aws', 'azure', 'gcp', 'containerization',
      'kubernetes', 'docker', 'microservices', 'cloud-native',
      'cloud native', 'lift and shift', 'hybrid cloud', 'multi-cloud',
      'serverless', 'cloud transformation',
    ],
  },
};

const NEW_DEPT_PATTERNS = [
  { pattern: /ai center of excellence/i, type: 'AI/ML' },
  { pattern: /data science team/i, type: 'Data Science' },
  { pattern: /head of ml/i, type: 'Machine Learning' },
  { pattern: /head of ai/i, type: 'AI/ML' },
  { pattern: /head of data/i, type: 'Data' },
  { pattern: /chief (ai|data|digital|technology)/i, type: 'Digital Transformation' },
  { pattern: /vp.*(ai|data|machine learning|digital)/i, type: 'AI/ML' },
  { pattern: /director.*(ai|data|machine learning|digital)/i, type: 'AI/ML' },
  { pattern: /founding engineer/i, type: 'New Engineering Team' },
  { pattern: /build.*team from (scratch|ground)/i, type: 'New Team' },
  { pattern: /greenfield/i, type: 'New Initiative' },
  { pattern: /new.*division/i, type: 'New Division' },
  { pattern: /stand.*up.*team/i, type: 'New Team' },
];

const EXECUTIVE_PATTERNS = [
  { pattern: /\b(cto|cio|cdo|ciso|chief.*technology|chief.*information|chief.*data|chief.*digital)\b/i, level: 'C-Suite' },
  { pattern: /\bvp\b.*\b(technology|engineering|data|operations|revenue|product|digital|it)\b/i, level: 'VP' },
  { pattern: /\bvice president\b.*\b(technology|engineering|data|operations|revenue|product|digital|it)\b/i, level: 'VP' },
  { pattern: /\bdirector\b.*\b(technology|engineering|data|operations|it|infrastructure|platform)\b/i, level: 'Director' },
  { pattern: /\bsvp\b/i, level: 'SVP' },
  { pattern: /\bevp\b/i, level: 'EVP' },
];

const LEGACY_TECH = [
  'cobol', 'fortran', 'perl', 'php 5', 'python 2', 'java 6', 'java 7',
  'jquery', 'angularjs', 'backbone', 'svn', 'subversion', 'cvs',
  'oracle forms', 'visual basic', 'vb6', 'vba', 'classic asp',
  'mainframe', 'as/400', 'on-premise', 'on premise', 'monolith',
  'legacy', 'soap', 'xml-rpc',
];

const MODERN_TECH = [
  'kubernetes', 'docker', 'terraform', 'react', 'vue', 'next.js', 'nuxt',
  'graphql', 'rust', 'go', 'golang', 'typescript', 'deno', 'bun',
  'serverless', 'lambda', 'cloud functions', 'microservices',
  'kafka', 'spark', 'airflow', 'snowflake', 'databricks',
  'pytorch', 'tensorflow', 'llm', 'langchain', 'vector database',
  'github actions', 'gitlab ci', 'argocd', 'istio', 'envoy',
];

/**
 * Normalize a string for case-insensitive matching.
 * @param {string} s
 * @returns {string}
 */
function norm(s) {
  return (s || '').toLowerCase().trim();
}

/**
 * Safely get the array of postings, filtering out nullish entries.
 * @param {Array} postings
 * @returns {Array}
 */
function safe(postings) {
  if (!Array.isArray(postings)) return [];
  return postings.filter(Boolean);
}

/**
 * Detect which department a title/description belongs to.
 * @param {string} title
 * @param {string} [description]
 * @returns {string|null}
 */
function detectDepartment(title, description) {
  const text = norm(title) + ' ' + norm(description);
  for (const [dept, keywords] of Object.entries(DEPARTMENT_MAP)) {
    for (const kw of keywords) {
      if (text.includes(kw)) return dept;
    }
  }
  return null;
}

/**
 * Detect which tech stacks appear in the text.
 * @param {string} text
 * @returns {string[]}
 */
function detectTechStack(text) {
  const lower = norm(text);
  const stacks = [];
  for (const [stack, keywords] of Object.entries(TECH_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        stacks.push(stack);
        break;
      }
    }
  }
  return stacks;
}

/**
 * Parse a date value into a Date object. Accepts Date objects, ISO strings,
 * and unix timestamps (ms).
 * @param {*} val
 * @returns {Date|null}
 */
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect a hiring spike for a single company.
 *
 * A spike is flagged when 3 or more related technical roles are posted
 * within `windowDays`. Related means same tech stack OR same department.
 *
 * @param {Array<{title: string, description?: string, postedDate?: string|Date}>} jobPostings
 * @param {number} [windowDays=30]
 * @returns {{ isSpike: boolean, spikeCount: number, relatedRoles: string[], windowStart: Date|null, windowEnd: Date|null, confidence: number }}
 */
export function detectHiringSpike(jobPostings, windowDays = 30) {
  const posts = safe(jobPostings);
  const noSpike = { isSpike: false, spikeCount: 0, relatedRoles: [], windowStart: null, windowEnd: null, confidence: 0 };
  if (posts.length < 3) return noSpike;

  // Enrich each posting
  const enriched = posts.map((p) => ({
    title: p.title || '',
    description: p.description || '',
    date: parseDate(p.postedDate),
    department: detectDepartment(p.title, p.description),
    techStack: detectTechStack((p.title || '') + ' ' + (p.description || '')),
  }));

  // Sort by date (undated pushed to end)
  enriched.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date - b.date;
  });

  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  let bestCluster = [];

  // Sliding window: for each starting posting, gather related within window
  for (let i = 0; i < enriched.length; i++) {
    const anchor = enriched[i];
    const cluster = [anchor];

    for (let j = 0; j < enriched.length; j++) {
      if (i === j) continue;
      const other = enriched[j];

      // Check date window (if both have dates)
      if (anchor.date && other.date) {
        const diff = Math.abs(other.date - anchor.date);
        if (diff > windowMs) continue;
      }

      // Check relatedness: same department or overlapping tech stack
      const sameDept = anchor.department && other.department && anchor.department === other.department;
      const sharedTech = anchor.techStack.some((t) => other.techStack.includes(t));

      if (sameDept || sharedTech) {
        cluster.push(other);
      }
    }

    if (cluster.length > bestCluster.length) {
      bestCluster = cluster;
    }
  }

  if (bestCluster.length < 3) return noSpike;

  const dates = bestCluster.map((p) => p.date).filter(Boolean);
  const windowStart = dates.length ? new Date(Math.min(...dates)) : null;
  const windowEnd = dates.length ? new Date(Math.max(...dates)) : null;

  // Confidence: 3 roles = 0.6, 5+ = 0.9, scale linearly
  const confidence = Math.min(0.9, 0.4 + bestCluster.length * 0.1);

  return {
    isSpike: true,
    spikeCount: bestCluster.length,
    relatedRoles: bestCluster.map((p) => p.title),
    windowStart,
    windowEnd,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Detect signals that a company is creating a new department.
 *
 * Looks for clusters of roles suggesting new team formation: multiple
 * senior hires plus a director/VP hire in the same domain.
 *
 * @param {Array<{title: string, description?: string}>} jobPostings
 * @returns {{ detected: boolean, departmentType: string|null, evidence: string[], confidence: number }}
 */
export function detectNewDepartmentSignal(jobPostings) {
  const posts = safe(jobPostings);
  const none = { detected: false, departmentType: null, evidence: [], confidence: 0 };
  if (posts.length === 0) return none;

  const evidence = [];
  const typeVotes = {};

  for (const p of posts) {
    const text = (p.title || '') + ' ' + (p.description || '');
    for (const { pattern, type } of NEW_DEPT_PATTERNS) {
      if (pattern.test(text)) {
        evidence.push(p.title || text.slice(0, 80));
        typeVotes[type] = (typeVotes[type] || 0) + 1;
      }
    }
  }

  if (evidence.length === 0) return none;

  // Check for the senior + director/VP pattern
  const titles = posts.map((p) => norm(p.title));
  const hasSenior = titles.some((t) => /senior|staff|principal|lead/.test(t));
  const hasLeadership = titles.some((t) => /director|vp|vice president|head of|chief/.test(t));

  let confidence = 0.3 + evidence.length * 0.1;
  if (hasSenior && hasLeadership) confidence += 0.2;
  if (evidence.length >= 3) confidence += 0.1;
  confidence = Math.min(0.95, confidence);

  // Pick the department type with the most votes
  const departmentType = Object.entries(typeVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    detected: true,
    departmentType,
    evidence: [...new Set(evidence)],
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Detect executive-level hiring that signals upcoming tech stack audits.
 *
 * Flags VP, C-Suite, and Director postings in technology, operations,
 * or revenue roles. These typically trigger tech evaluations within 90 days.
 *
 * @param {Array<{title: string, description?: string, postedDate?: string|Date}>} jobPostings
 * @returns {{ detected: boolean, roles: Array<{title: string, level: string}>, urgencyWindow: string, confidence: number }}
 */
export function detectExecutiveTurnover(jobPostings) {
  const posts = safe(jobPostings);
  const none = { detected: false, roles: [], urgencyWindow: '90 days', confidence: 0 };
  if (posts.length === 0) return none;

  const roles = [];

  for (const p of posts) {
    const title = p.title || '';
    for (const { pattern, level } of EXECUTIVE_PATTERNS) {
      if (pattern.test(title)) {
        roles.push({ title, level });
        break; // one match per posting is enough
      }
    }
  }

  if (roles.length === 0) return none;

  // Higher confidence for C-suite, multiple exec hires
  let confidence = 0.5;
  if (roles.some((r) => r.level === 'C-Suite')) confidence += 0.2;
  if (roles.length >= 2) confidence += 0.15;
  confidence = Math.min(0.95, confidence);

  return {
    detected: true,
    roles,
    urgencyWindow: '90 days',
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Infer technical debt signals from job descriptions.
 *
 * Scans job description text for indicators of infrastructure debt,
 * workflow debt, AI readiness initiatives, and cloud migration efforts.
 *
 * @param {Array<{title?: string, description?: string}>} jobPostings
 * @returns {{ debtTypes: Array<{type: string, confidence: number, evidence: string[]}>, overallDebtScore: number }}
 */
export function inferTechDebt(jobPostings) {
  const posts = safe(jobPostings);
  const empty = { debtTypes: [], overallDebtScore: 0 };
  if (posts.length === 0) return empty;

  const allText = posts
    .map((p) => ((p.title || '') + ' ' + (p.description || '')).toLowerCase())
    .join(' ');

  const debtTypes = [];

  for (const [key, { label, patterns }] of Object.entries(DEBT_INDICATORS)) {
    const found = [];
    for (const phrase of patterns) {
      if (allText.includes(phrase)) {
        found.push(phrase);
      }
    }
    if (found.length > 0) {
      // Confidence based on number of distinct indicators found
      const confidence = Math.min(0.95, 0.3 + found.length * 0.12);
      debtTypes.push({
        type: label,
        confidence: Math.round(confidence * 100) / 100,
        evidence: [...new Set(found)],
      });
    }
  }

  // Overall debt score: 0-100 based on number of categories hit and evidence depth
  let overallDebtScore = 0;
  if (debtTypes.length > 0) {
    const categoryWeight = debtTypes.length * 20; // up to 80 for 4 categories
    const evidenceWeight = Math.min(20, debtTypes.reduce((sum, d) => sum + d.evidence.length, 0) * 3);
    overallDebtScore = Math.min(100, categoryWeight + evidenceWeight);
  }

  return { debtTypes, overallDebtScore };
}

/**
 * Classify all job postings for a company and produce a comprehensive
 * signal report by running all detectors and cross-referencing results.
 *
 * @param {Array<{title?: string, description?: string, postedDate?: string|Date, company?: string}>} jobPostings
 * @returns {{
 *   company: string|null,
 *   totalPostings: number,
 *   hiringSpike: object,
 *   newDepartment: object,
 *   executiveTurnover: object,
 *   techDebt: object,
 *   overallSignalStrength: 'critical'|'high'|'medium'|'low',
 *   recommendedAction: string,
 *   labnoServiceMatch: string[]
 * }}
 */
export function classifyJobPostings(jobPostings) {
  const posts = safe(jobPostings);

  const company = posts[0]?.company || null;
  const hiringSpike = detectHiringSpike(posts);
  const newDepartment = detectNewDepartmentSignal(posts);
  const executiveTurnover = detectExecutiveTurnover(posts);
  const techDebt = inferTechDebt(posts);

  // --- Determine overall signal strength ---
  let score = 0;
  if (hiringSpike.isSpike) score += 2;
  if (newDepartment.detected) score += 2;
  if (executiveTurnover.detected) score += 2;
  if (techDebt.overallDebtScore >= 60) score += 2;
  else if (techDebt.overallDebtScore >= 30) score += 1;

  // Cross-reference bonus: hiring spike + tech debt = very high intent
  if (hiringSpike.isSpike && techDebt.overallDebtScore >= 30) score += 2;

  /** @type {'critical'|'high'|'medium'|'low'} */
  let overallSignalStrength;
  if (score >= 7) overallSignalStrength = 'critical';
  else if (score >= 4) overallSignalStrength = 'high';
  else if (score >= 2) overallSignalStrength = 'medium';
  else overallSignalStrength = 'low';

  // --- Recommended action ---
  const actions = [];
  if (executiveTurnover.detected) actions.push('Reach out within 90 days — new leadership evaluates tech stack');
  if (hiringSpike.isSpike && techDebt.overallDebtScore >= 30) actions.push('High-priority outreach — hiring surge combined with tech debt signals budget and urgency');
  if (newDepartment.detected) actions.push(`Position for ${newDepartment.departmentType || 'new team'} buildout consulting`);
  if (techDebt.overallDebtScore >= 60) actions.push('Lead with modernization / migration case studies');
  if (actions.length === 0) actions.push('Monitor — insufficient signals for outreach');
  const recommendedAction = actions.join('. ');

  // --- Service matching ---
  const labnoServiceMatch = [];
  const debtLabels = techDebt.debtTypes.map((d) => d.type);
  if (debtLabels.includes('Infrastructure Debt') || debtLabels.includes('Cloud Migration')) {
    labnoServiceMatch.push('Cloud Migration & Modernization');
  }
  if (debtLabels.includes('Workflow Debt')) {
    labnoServiceMatch.push('Process Automation');
  }
  if (debtLabels.includes('AI Readiness')) {
    labnoServiceMatch.push('AI/ML Strategy & Implementation');
  }
  if (newDepartment.detected) {
    labnoServiceMatch.push('Team Buildout & Architecture Consulting');
  }
  if (executiveTurnover.detected) {
    labnoServiceMatch.push('Technology Audit & Roadmapping');
  }
  if (hiringSpike.isSpike) {
    labnoServiceMatch.push('Fractional CTO / Technical Leadership');
  }
  if (labnoServiceMatch.length === 0) {
    labnoServiceMatch.push('General Technology Consulting');
  }

  return {
    company,
    totalPostings: posts.length,
    hiringSpike,
    newDepartment,
    executiveTurnover,
    techDebt,
    overallSignalStrength,
    recommendedAction,
    labnoServiceMatch,
  };
}

/**
 * Extract current vs desired tech stacks from a job description.
 *
 * Parses "required", "nice to have", and "experience with" sections to
 * identify legacy vs modern technologies and migration signals.
 *
 * @param {string} jobDescription
 * @returns {{ required: string[], preferred: string[], legacy: string[], modern: string[], migrationSignals: string[] }}
 */
export function extractTechStackFromJD(jobDescription) {
  const empty = { required: [], preferred: [], legacy: [], modern: [], migrationSignals: [] };
  if (!jobDescription || typeof jobDescription !== 'string') return empty;

  const text = jobDescription.toLowerCase();

  // --- Section splitting heuristics ---
  // We look for common headings then gather tech terms after them.

  /**
   * Find all known tech terms in a block of text.
   * @param {string} block
   * @returns {string[]}
   */
  function findTech(block) {
    const allTech = [
      ...LEGACY_TECH,
      ...MODERN_TECH,
      // common ones not in either list
      'python', 'java', 'javascript', 'typescript', 'ruby', 'scala',
      'c++', 'c#', '.net', 'sql', 'nosql', 'mongodb', 'postgresql',
      'mysql', 'redis', 'elasticsearch', 'node.js', 'express',
      'django', 'flask', 'spring boot', 'rails',
    ];
    const found = [];
    for (const tech of allTech) {
      if (block.includes(tech)) found.push(tech);
    }
    return [...new Set(found)];
  }

  // Required section
  const requiredBlocks = [];
  const requiredPatterns = [
    /(?:required|requirements|must have|qualifications)[:\s\-]*([\s\S]{0,1500}?)(?=\n\s*\n|(?:nice to have|preferred|bonus|desired|about)|\Z)/gi,
  ];
  for (const rp of requiredPatterns) {
    let m;
    while ((m = rp.exec(text)) !== null) {
      requiredBlocks.push(m[1]);
    }
  }
  const required = findTech(requiredBlocks.join(' ') || text);

  // Preferred section
  const preferredBlocks = [];
  const preferredPatterns = [
    /(?:nice to have|preferred|bonus|desired|plus)[:\s\-]*([\s\S]{0,1500}?)(?=\n\s*\n|(?:required|about|responsibilities)|\Z)/gi,
  ];
  for (const pp of preferredPatterns) {
    let m;
    while ((m = pp.exec(text)) !== null) {
      preferredBlocks.push(m[1]);
    }
  }
  const preferred = findTech(preferredBlocks.join(' '));

  // Legacy and modern from full text
  const legacy = [];
  for (const tech of LEGACY_TECH) {
    if (text.includes(tech)) legacy.push(tech);
  }

  const modern = [];
  for (const tech of MODERN_TECH) {
    if (text.includes(tech)) modern.push(tech);
  }

  // Migration signals
  const migrationSignals = [];
  const migrationPatterns = [
    /migrat\w+\s+(?:from|to)\s+[\w\s]+/gi,
    /transition\w*\s+(?:from|to)\s+[\w\s]+/gi,
    /replac\w+\s+(?:legacy|existing|current)\s+[\w\s]+/gi,
    /moderniz\w+/gi,
    /re-?architect/gi,
    /re-?platform/gi,
    /cloud.?native\s+transformation/gi,
    /digital\s+transformation/gi,
  ];
  for (const mp of migrationPatterns) {
    let m;
    while ((m = mp.exec(text)) !== null) {
      migrationSignals.push(m[0].trim());
    }
  }

  return {
    required: [...new Set(required)],
    preferred: [...new Set(preferred)],
    legacy: [...new Set(legacy)],
    modern: [...new Set(modern)],
    migrationSignals: [...new Set(migrationSignals)],
  };
}
