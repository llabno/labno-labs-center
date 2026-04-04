/**
 * GTM Architecture Bulk Insert Script
 * Extracts ~500 actionable tasks from the "AI Go-To-Market Architecture for Consulting" document
 * and inserts them into labno-labs-center Supabase as projects + tasks.
 *
 * Run: node scripts/gtm-bulk-insert.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jlvxubslxzwmzslvzgxs.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsdnh1YnNseHp3bXpzbHZ6Z3hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc5MTEzNiwiZXhwIjoyMDkwMzY3MTM2fQ.dbZllHJFZ7G8T5_OU_lnqluls9PFM1ac3Uj0cS3yltw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── All Projects ───────────────────────────────────────────────
const projects = [
  // LAYER 1
  { name: '[GTM] L1: App Store Ingestion Pipeline', status: 'Planning', complexity: 3 },
  { name: '[GTM] L1: B2B Review Platform Ingestion', status: 'Planning', complexity: 3 },
  { name: '[GTM] L1: Job Board & LinkedIn Ingestion', status: 'Planning', complexity: 3 },
  { name: '[GTM] L1: Ingestion Infrastructure & Orchestration', status: 'Planning', complexity: 3 },
  // LAYER 2
  { name: '[GTM] L2: Slang AI Semantic Parsing Engine', status: 'Planning', complexity: 3 },
  { name: '[GTM] L2: B2B Workflow Bottleneck Detector', status: 'Planning', complexity: 2 },
  { name: '[GTM] L2: Job Description Taxonomy Mapper', status: 'Planning', complexity: 2 },
  // LAYER 3
  { name: '[GTM] L3: Intent Scoring Engine', status: 'Planning', complexity: 3 },
  { name: '[GTM] L3: Competitive Intelligence Signals', status: 'Planning', complexity: 2 },
  // LAYER 4
  { name: '[GTM] L4: Identity Resolution & Dynamic ICP', status: 'Planning', complexity: 3 },
  { name: '[GTM] L4: RevOps CRM Integration & Lead Routing', status: 'Planning', complexity: 3 },
  // LAYER 5
  { name: '[GTM] L5: Vibe Coding Outreach Engine', status: 'Planning', complexity: 3 },
  { name: '[GTM] L5: Agentic Sales Orchestration', status: 'Planning', complexity: 3 },
  // STRATEGIC
  { name: '[GTM] Medical AI & Healthcare Pipeline', status: 'Planning', complexity: 2 },
  { name: '[GTM] AI Squads & Custom Dev Pipeline', status: 'Planning', complexity: 2 },
  { name: '[GTM] Foundation: Data Architecture & Storage', status: 'Planning', complexity: 3 },
  { name: '[GTM] Foundation: Compliance & Security', status: 'Planning', complexity: 2 },
  { name: '[GTM] Foundation: Monitoring & Analytics', status: 'Planning', complexity: 2 },
  { name: '[GTM] Go-To-Market Strategy & Planning', status: 'Planning', complexity: 1 },
];

// ─── Tasks per project (keyed by project name) ──────────────────
const tasksByProject = {
  // ═══════════════════════════════════════════════════════════════
  // LAYER 1: APP STORE INGESTION
  // ═══════════════════════════════════════════════════════════════
  '[GTM] L1: App Store Ingestion Pipeline': [
    // Apple App Store
    { title: 'Research Apify App Store Reviews Scraper actors (The Wolves, EasyAPI)', description: 'Evaluate pricing ($0.10/1K reviews), speed (100-200 reviews/sec), and field coverage for Apple App Store scraping', assigned_to: 'Agent' },
    { title: 'Set up Apify account and billing for App Store scraping', assigned_to: 'Lance' },
    { title: 'Configure Apple App Store scraper actor with target app list', description: 'Define initial list of healthcare, fintech, and logistics apps matching Labno Labs ICP', assigned_to: 'Agent' },
    { title: 'Define App Store review schema (12 structured fields per review)', description: 'Map fields: app_version, device_type, geo_location, rating, review_text, date, reviewer_name, helpful_count, etc.', assigned_to: 'Agent' },
    { title: 'Build App Store review ETL pipeline - extraction phase', assigned_to: 'Agent' },
    { title: 'Build App Store review ETL pipeline - transformation phase', description: 'Normalize ratings, clean text, extract metadata, handle Unicode and emoji', assigned_to: 'Agent' },
    { title: 'Build App Store review ETL pipeline - loading phase', description: 'Load transformed reviews into Supabase staging table', assigned_to: 'Agent' },
    { title: 'Implement app version tracking across review cycles', description: 'Track whether bugs persist across multiple app versions (indicates severe QA/architectural rot)', assigned_to: 'Agent' },
    { title: 'Implement device type and geo-location extraction from App Store reviews', assigned_to: 'Agent' },
    { title: 'Create ICP target app list for healthcare vertical', description: 'Identify top 50 healthcare apps (patient portals, EHR mobile, telehealth) for monitoring', assigned_to: 'Lance' },
    { title: 'Create ICP target app list for fintech vertical', description: 'Identify top 50 fintech apps (banking, payments, trading) for monitoring', assigned_to: 'Lance' },
    { title: 'Create ICP target app list for logistics vertical', description: 'Identify top 50 logistics/supply chain apps for monitoring', assigned_to: 'Lance' },
    { title: 'Create ICP target app list for enterprise SaaS vertical', description: 'Identify top 50 enterprise SaaS mobile apps for monitoring', assigned_to: 'Lance' },
    // Google Play Store
    { title: 'Configure Google Play Store Review Scraper actor', description: 'Set up neatrat/google-play-store-reviews-scraper on Apify', assigned_to: 'Agent' },
    { title: 'Build Google Play review extraction pipeline', assigned_to: 'Agent' },
    { title: 'Map Google Play review fields to unified review schema', description: 'Ratings, reviewer info, review text, device metadata, response from developer', assigned_to: 'Agent' },
    { title: 'Implement developer response tracking for Play Store', description: 'Track if/how companies respond to negative reviews - slow response = support debt signal', assigned_to: 'Agent' },
    { title: 'Build unified mobile review staging table in Supabase', description: 'CREATE TABLE gtm_mobile_reviews with all fields from both stores', assigned_to: 'Agent' },
    { title: 'Set up automated daily App Store scraping schedule', assigned_to: 'Agent' },
    { title: 'Set up automated daily Play Store scraping schedule', assigned_to: 'Agent' },
    { title: 'Implement review deduplication logic', description: 'Prevent duplicate reviews across scraping runs using review_id + app_id composite key', assigned_to: 'Agent' },
    { title: 'Build review freshness decay logic', description: 'Weight recent reviews higher, decay reviews older than 90 days', assigned_to: 'Agent' },
    { title: 'Implement rate limiting and retry logic for App Store scraper', assigned_to: 'Agent' },
    { title: 'Implement rate limiting and retry logic for Play Store scraper', assigned_to: 'Agent' },
    { title: 'Create monitoring dashboard for App Store ingestion pipeline health', assigned_to: 'Agent' },
    { title: 'Test App Store pipeline with 10 target apps end-to-end', assigned_to: 'Agent' },
    { title: 'Test Play Store pipeline with 10 target apps end-to-end', assigned_to: 'Agent' },
    { title: 'Scale App Store pipeline to full 200-app target list', assigned_to: 'Agent' },
    { title: 'Document App Store ingestion API and data dictionary', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // LAYER 1: B2B REVIEW PLATFORM INGESTION
  // ═══════════════════════════════════════════════════════════════
  '[GTM] L1: B2B Review Platform Ingestion': [
    // G2
    { title: 'Research G2 scraping challenges (Datadome WAF, AI fingerprinting)', description: 'G2 uses Datadome WAF with AI-driven SSL/TLS fingerprint analysis - standard proxy rotation is insufficient', assigned_to: 'Agent' },
    { title: 'Evaluate G2 scraper actors on Apify (samstorm, magicfingers, automation-lab)', description: 'Compare real-time vs cached data, cost, reliability, and anti-bot bypass capabilities', assigned_to: 'Agent' },
    { title: 'Set up G2.com Real-Time Reviews Scraper actor', description: 'Use real-time scraper to bypass stale cached data and get current pain points', assigned_to: 'Agent' },
    { title: 'Define G2 review data schema', description: 'Capture: reviewer firmographics (company size, industry, job title), categorical ratings (ease of use, support quality, implementation time), competitive data (alternatives considered)', assigned_to: 'Agent' },
    { title: 'Build G2 reviewer firmographic extraction module', description: 'Extract company size, industry vertical, and reviewer job title from each review', assigned_to: 'Agent' },
    { title: 'Build G2 categorical sub-rating extraction module', description: 'Extract ease_of_use, quality_of_support, implementation_time, feature_satisfaction scores', assigned_to: 'Agent' },
    { title: 'Build G2 competitive intelligence extraction module', description: 'Extract alternatives considered, category rankings, side-by-side comparisons from reviews', assigned_to: 'Agent' },
    { title: 'Implement G2 review seniority scoring', description: 'Weight CTO/VP complaints exponentially higher than intern complaints as buying signals', assigned_to: 'Agent' },
    { title: 'Create G2 target software category list for healthcare', description: 'EHR, patient portals, telehealth, medical billing, practice management', assigned_to: 'Lance' },
    { title: 'Create G2 target software category list for enterprise', description: 'CRM, ERP, project management, HR, accounting, BI tools', assigned_to: 'Lance' },
    // Capterra
    { title: 'Set up Capterra review scraper actor on Apify', assigned_to: 'Agent' },
    { title: 'Build Capterra review extraction pipeline', assigned_to: 'Agent' },
    { title: 'Map Capterra review fields to unified B2B review schema', assigned_to: 'Agent' },
    { title: 'Extract Capterra pros/cons structured data', description: 'Capterra reviews have explicit pros/cons sections - extract both for sentiment polarity', assigned_to: 'Agent' },
    // TrustRadius
    { title: 'Evaluate TrustRadius scraping feasibility', description: 'Research if Apify actors exist or if custom scraper needed', assigned_to: 'Agent' },
    { title: 'Build TrustRadius review extraction pipeline if feasible', assigned_to: 'Agent' },
    // Unified pipeline
    { title: 'Build unified B2B review staging table in Supabase', description: 'CREATE TABLE gtm_b2b_reviews with source platform, firmographics, ratings, competitive intel', assigned_to: 'Agent' },
    { title: 'Implement cross-platform review deduplication', description: 'Same company may review on G2 and Capterra - deduplicate while preserving both data points', assigned_to: 'Agent' },
    { title: 'Set up automated weekly B2B review scraping schedule', assigned_to: 'Agent' },
    { title: 'Build B2B ingestion pipeline monitoring and alerting', assigned_to: 'Agent' },
    { title: 'Handle G2 anti-bot detection failures gracefully', description: 'Implement exponential backoff, session rotation, and fallback to cached data', assigned_to: 'Agent' },
    { title: 'Implement reviewer company name extraction and normalization', description: 'Normalize company names across platforms (e.g. "Microsoft Corp" vs "Microsoft")', assigned_to: 'Agent' },
    { title: 'Test B2B pipeline with 20 target software categories end-to-end', assigned_to: 'Agent' },
    { title: 'Document B2B ingestion API and data dictionary', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // LAYER 1: JOB BOARD & LINKEDIN INGESTION
  // ═══════════════════════════════════════════════════════════════
  '[GTM] L1: Job Board & LinkedIn Ingestion': [
    { title: 'Set up LinkedIn Jobs Scraper actor on Apify', description: 'Use curious_coder/linkedin-jobs-search-scraper for systematic job monitoring', assigned_to: 'Agent' },
    { title: 'Define job posting data schema', description: 'Fields: company, title, description, tech_stack, location, posting_date, seniority_level', assigned_to: 'Agent' },
    { title: 'Build LinkedIn job extraction pipeline', assigned_to: 'Agent' },
    { title: 'Extract technology stack requirements from job descriptions', description: 'Parse required/preferred tech stacks to infer company infrastructure', assigned_to: 'Agent' },
    { title: 'Implement hiring spike detection algorithm', description: 'Flag companies posting 3+ related technical roles within 30-day window', assigned_to: 'Agent' },
    { title: 'Define target job title watchlist for AI consulting signals', description: 'AI Center of Excellence Director, Head of RevOps, VP Engineering, Cloud Migration Lead, etc.', assigned_to: 'Lance' },
    { title: 'Define target job title watchlist for app modernization signals', description: 'Legacy System Engineer, Senior React Developer, Platform Architect, DevOps Lead, etc.', assigned_to: 'Lance' },
    { title: 'Build Indeed job posting scraper', assigned_to: 'Agent' },
    { title: 'Implement job posting freshness tracking', description: 'Track posting age, reposting frequency, and time-to-fill estimates', assigned_to: 'Agent' },
    { title: 'Build unified job posting staging table in Supabase', description: 'CREATE TABLE gtm_job_postings with all extracted fields', assigned_to: 'Agent' },
    { title: 'Implement job posting deduplication across LinkedIn and Indeed', assigned_to: 'Agent' },
    { title: 'Extract implicit tech debt signals from job descriptions', description: 'Detect mentions of legacy monolith, Python 2, on-premise servers, manual spreadsheets', assigned_to: 'Agent' },
    { title: 'Track new department creation signals', description: 'Detect when companies create new AI, data science, or digital transformation departments', assigned_to: 'Agent' },
    { title: 'Monitor executive turnover signals', description: 'Track new CTO/CRO/VP hires - new leaders audit tech stacks within 90 days', assigned_to: 'Agent' },
    { title: 'Set up automated daily job board scraping schedule', assigned_to: 'Agent' },
    { title: 'Build job board ingestion monitoring dashboard', assigned_to: 'Agent' },
    { title: 'Implement LinkedIn rate limiting and session management', assigned_to: 'Agent' },
    { title: 'Cross-reference job postings with existing B2B review signals', description: 'Correlate: company posting React devs + same company has bad App Store reviews = high intent', assigned_to: 'Agent' },
    { title: 'Test job board pipeline with 100 target companies', assigned_to: 'Agent' },
    { title: 'Document job board ingestion API and data dictionary', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // LAYER 1: INGESTION INFRASTRUCTURE
  // ═══════════════════════════════════════════════════════════════
  '[GTM] L1: Ingestion Infrastructure & Orchestration': [
    { title: 'Design master ingestion orchestration architecture', description: 'Coordinate all 3 ingestion pipelines (app stores, B2B reviews, job boards) with shared scheduling', assigned_to: 'Lance' },
    { title: 'Set up Apify organization account with API keys', assigned_to: 'Lance' },
    { title: 'Create Apify webhook integrations for pipeline completion', assigned_to: 'Agent' },
    { title: 'Build central ingestion status dashboard', description: 'Show pipeline health, last run times, record counts, error rates across all 3 streams', assigned_to: 'Agent' },
    { title: 'Implement ingestion error alerting (Slack/email notifications)', assigned_to: 'Agent' },
    { title: 'Design data retention and archival policy', description: 'Define how long raw review data is kept vs archived vs purged', assigned_to: 'Lance' },
    { title: 'Build ingestion cost tracking and budget alerting', description: 'Track Apify compute costs per pipeline, alert when approaching budget limits', assigned_to: 'Agent' },
    { title: 'Implement data quality checks at ingestion boundary', description: 'Validate required fields, check for empty reviews, flag suspicious patterns', assigned_to: 'Agent' },
    { title: 'Build ingestion backfill capability', description: 'Ability to re-scrape historical data for new target companies added to watchlist', assigned_to: 'Agent' },
    { title: 'Create unified raw data lake table structure', description: 'Central staging area where all 3 streams land before semantic processing', assigned_to: 'Agent' },
    { title: 'Implement data lineage tracking', description: 'Track which Apify run produced each record for debugging and audit', assigned_to: 'Agent' },
    { title: 'Set up ingestion pipeline CI/CD', description: 'Automated testing and deployment for scraper configurations', assigned_to: 'Agent' },
    { title: 'Build ingestion rate governor', description: 'Prevent over-scraping that could trigger platform bans', assigned_to: 'Agent' },
    { title: 'Document complete Layer 1 architecture and runbook', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // LAYER 2: SLANG AI SEMANTIC PARSING
  // ═══════════════════════════════════════════════════════════════
  '[GTM] L2: Slang AI Semantic Parsing Engine': [
    { title: 'Design Slang AI framework architecture', description: 'NLP + LLM pipeline for transforming unstructured review text into structured, scorable intelligence', assigned_to: 'Lance' },
    { title: 'Select base LLM for semantic parsing (Claude Haiku vs Gemini Flash)', description: 'Evaluate cost, speed, and accuracy for high-volume review classification', assigned_to: 'Lance' },
    { title: 'Build Aspect-Based Sentiment Analysis (ABSA) module', description: 'Surgically attribute sentiment scores to specific features/NFRs rather than overall positive/negative', assigned_to: 'Agent' },
    { title: 'Define Non-Functional Requirement (NFR) taxonomy', description: 'Categories: security, scalability, maintainability, performance, usability, reliability, integration', assigned_to: 'Agent' },
    { title: 'Build app review code smell detector', description: 'Map colloquial terms to technical issues: "sluggishness" → main thread violations, "battery drain" → over-parallelization', assigned_to: 'Agent' },
    { title: 'Build UX debt classifier for app reviews', description: 'Detect forced account creation walls, spam notifications, poor onboarding as UX debt signals', assigned_to: 'Agent' },
    { title: 'Create LLM prompt templates for review classification', description: 'Structured prompts that extract pain_point, severity, proposed_solution from raw text', assigned_to: 'Agent' },
    { title: 'Build review text preprocessing pipeline', description: 'Handle slang, hyperbole, grammatical errors, emoji, multiple languages', assigned_to: 'Agent' },
    { title: 'Implement LoRA fine-tuning for domain-specific review parsing', description: 'Low-Rank Adaptation for efficient parameter updating on healthcare/fintech review corpora', assigned_to: 'Agent' },
    { title: 'Build semantic output schema', description: 'Structured JSON output: {pain_point, severity, category, proposed_solution, confidence_score}', assigned_to: 'Agent' },
    { title: 'Create training dataset from manually labeled reviews (500+ samples)', description: 'Hand-label reviews for ABSA training data across healthcare, fintech, enterprise categories', assigned_to: 'Lance' },
    { title: 'Build batch processing pipeline for high-volume review parsing', description: 'Process thousands of reviews efficiently through LLM pipeline', assigned_to: 'Agent' },
    { title: 'Implement semantic parsing quality metrics', description: 'Track precision, recall, F1 score for pain point extraction accuracy', assigned_to: 'Agent' },
    { title: 'Build A/B testing framework for parsing prompt variations', description: 'Compare different prompt templates for classification accuracy', assigned_to: 'Agent' },
    { title: 'Create parsed review output table in Supabase', description: 'CREATE TABLE gtm_parsed_signals with all structured semantic fields', assigned_to: 'Agent' },
    { title: 'Implement multi-language review parsing support', description: 'Handle reviews in Spanish, French, German, Portuguese for international coverage', assigned_to: 'Agent' },
    { title: 'Build semantic deduplication for similar complaints', description: 'Group semantically identical complaints from different reviewers about same company', assigned_to: 'Agent' },
    { title: 'Test semantic parser against 1000 manually verified reviews', assigned_to: 'Agent' },
    { title: 'Document Slang AI framework API and prompt library', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // LAYER 2: B2B WORKFLOW BOTTLENECK DETECTOR
  // ═══════════════════════════════════════════════════════════════
  '[GTM] L2: B2B Workflow Bottleneck Detector': [
    { title: 'Define B2B bottleneck pattern taxonomy', description: 'API limit exhaustion, post-sale chaos, bulk data failures, support delays, integration gaps', assigned_to: 'Agent' },
    { title: 'Build API Limit Exhaustion detector', description: 'Detect complaints about "service interruptions", "exceeded limits", "no warning" → poor monitoring signal', assigned_to: 'Agent' },
    { title: 'Build Post-Sale Management Chaos detector', description: 'Detect "tracking promises", "tasks lost", "finding notes" → CRM integration gap signal', assigned_to: 'Agent' },
    { title: 'Build Bulk Data Operation Failure detector', description: 'Detect "cannot bulk import/export", "huge time loss" → outdated architecture signal', assigned_to: 'Agent' },
    { title: 'Build Support Resolution Delay detector', description: 'Detect "waiting 24 hours", "critical moments" → need for AI chatbot/automation signal', assigned_to: 'Agent' },
    { title: 'Build Manual Data Entry bottleneck detector', description: 'Detect "hours on data entry", "copy-paste", "spreadsheet" → workflow automation opportunity', assigned_to: 'Agent' },
    { title: 'Build Integration Failure detector', description: 'Detect "won\'t talk to", "no API", "manual sync" → middleware/integration opportunity', assigned_to: 'Agent' },
    { title: 'Build Reporting & Analytics gap detector', description: 'Detect "can\'t get reports", "manual dashboards", "no visibility" → BI/analytics opportunity', assigned_to: 'Agent' },
    { title: 'Map each bottleneck pattern to Labno Labs service offering', description: 'API limits → custom middleware, Post-sale chaos → RevOps automation, Bulk data → AI pipelines, Support → Agentic chatbots', assigned_to: 'Lance' },
    { title: 'Build bottleneck severity scoring algorithm', description: 'Score bottleneck severity based on frequency, reviewer seniority, and business impact language', assigned_to: 'Agent' },
    { title: 'Create bottleneck-to-solution mapping table', description: 'Supabase lookup table mapping detected bottleneck → recommended Labno Labs solution', assigned_to: 'Agent' },
    { title: 'Build bottleneck trend analysis over time', description: 'Track if bottleneck complaints are increasing (growing opportunity) or decreasing (already solved)', assigned_to: 'Agent' },
    { title: 'Test bottleneck detector against 500 G2/Capterra reviews', assigned_to: 'Agent' },
    { title: 'Document bottleneck detection patterns and thresholds', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // LAYER 2: JOB DESCRIPTION TAXONOMY MAPPER
  // ═══════════════════════════════════════════════════════════════
  '[GTM] L2: Job Description Taxonomy Mapper': [
    { title: 'Design job description taxonomy framework', description: 'Map job descriptions to debt categories: Infrastructure Debt, Workflow Automation Readiness, AI Readiness', assigned_to: 'Agent' },
    { title: 'Build Infrastructure Debt detector from job descriptions', description: 'Detect "legacy monolith migration", "Python 2 scripts", "on-premise servers" → high infrastructure debt', assigned_to: 'Agent' },
    { title: 'Build Workflow Automation Readiness detector', description: 'Detect "eliminate manual spreadsheets", "streamline approvals", "reduce data entry" → automation opportunity', assigned_to: 'Agent' },
    { title: 'Build AI Readiness detector from job descriptions', description: 'Detect "AI Center of Excellence", "ML engineer", "data science team" → AI consulting opportunity', assigned_to: 'Agent' },
    { title: 'Build Cloud Migration Need detector', description: 'Detect "cloud migration", "AWS/Azure/GCP", "containerization" → cloud consulting opportunity', assigned_to: 'Agent' },
    { title: 'Build tech stack inference engine from job requirements', description: 'Extract current vs desired tech stacks to infer migration/modernization needs', assigned_to: 'Agent' },
    { title: 'Implement contextual analysis beyond keyword matching', description: 'Use LLM to understand broader role context, not just keywords', assigned_to: 'Agent' },
    { title: 'Map inferred debt categories to Labno Labs service lines', assigned_to: 'Lance' },
    { title: 'Build job-to-signal enrichment pipeline', description: 'Transform raw job postings into structured debt/opportunity signals', assigned_to: 'Agent' },
    { title: 'Create job taxonomy output table in Supabase', assigned_to: 'Agent' },
    { title: 'Test taxonomy mapper against 200 real job descriptions', assigned_to: 'Agent' },
    { title: 'Document taxonomy mapping rules and accuracy metrics', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // LAYER 3: INTENT SCORING ENGINE
  // ═══════════════════════════════════════════════════════════════
  '[GTM] L3: Intent Scoring Engine': [
    { title: 'Design composite Intent Score algorithm', description: 'Multi-dimensional scoring across Recency, Frequency, Depth, and Seniority heuristics', assigned_to: 'Lance' },
    { title: 'Implement Recency scoring dimension', description: 'Actions within 24-48 hours = max score, exponential decay over time', assigned_to: 'Agent' },
    { title: 'Implement Frequency scoring dimension', description: 'Multiple concurrent actions in short window = acute crisis, score multiplier', assigned_to: 'Agent' },
    { title: 'Implement Depth scoring dimension', description: 'Proximity to financial transaction: pricing page > case study > blog post', assigned_to: 'Agent' },
    { title: 'Implement Seniority scoring dimension', description: 'C-Suite/VP involvement = critical multiplier, junior analyst = minimal weight', assigned_to: 'Agent' },
    { title: 'Build score decay function for aging signals', description: 'Exponential decay: 48h review from CTO = near-perfect, 2-year-old intern review = zero', assigned_to: 'Agent' },
    { title: 'Define intent score thresholds for action tiers', description: 'Score 90+ = immediate outreach, 70-89 = nurture sequence, 50-69 = watch list, <50 = archive', assigned_to: 'Lance' },
    { title: 'Build multi-signal compounding algorithm', description: 'When account shows signals across multiple channels (review + job posting), compound the score', assigned_to: 'Agent' },
    { title: 'Build real-time score recalculation pipeline', description: 'Recalculate scores as new signals arrive, not just batch processing', assigned_to: 'Agent' },
    { title: 'Create intent score leaderboard table in Supabase', description: 'CREATE TABLE gtm_intent_scores with account_id, composite_score, dimension_scores, last_updated', assigned_to: 'Agent' },
    { title: 'Build intent score history tracking', description: 'Track how scores change over time per account for trend analysis', assigned_to: 'Agent' },
    { title: 'Implement account-level signal aggregation', description: 'Roll up individual review/job/app signals to account level for scoring', assigned_to: 'Agent' },
    { title: 'Build scoring calibration tool', description: 'Adjust scoring weights based on actual conversion data feedback loop', assigned_to: 'Agent' },
    { title: 'Implement score explanation generator', description: 'For each high-score account, generate human-readable explanation of why they scored high', assigned_to: 'Agent' },
    { title: 'Build intent score API endpoint', description: 'REST API for querying top-scored accounts with filters (industry, score range, signal type)', assigned_to: 'Agent' },
    { title: 'Create intent scoring unit tests with mock signal data', assigned_to: 'Agent' },
    { title: 'Build score distribution analytics', description: 'Dashboard showing score distribution, conversion rates by score band', assigned_to: 'Agent' },
    { title: 'Document intent scoring algorithm, weights, and thresholds', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // LAYER 3: COMPETITIVE INTELLIGENCE SIGNALS
  // ═══════════════════════════════════════════════════════════════
  '[GTM] L3: Competitive Intelligence Signals': [
    { title: 'Define "Alternative Intent" signal detection rules', description: 'User viewing alternatives to current software = disproportionately high intent score', assigned_to: 'Agent' },
    { title: 'Build competitor pricing page engagement detector', description: 'Track when target accounts deeply engage with competitor pricing architecture on G2', assigned_to: 'Agent' },
    { title: 'Build G2 category comparison tracker', description: 'Detect when accounts are doing side-by-side comparisons on G2', assigned_to: 'Agent' },
    { title: 'Build competitor switching signal detector', description: 'Detect reviews mentioning "switching from", "replacing", "migrating away from"', assigned_to: 'Agent' },
    { title: 'Create competitor battlecard database', description: 'For each major competitor in each category, build comparison battlecard for sales use', assigned_to: 'Lance' },
    { title: 'Build multi-vector validation algorithm', description: 'Critical review on Capterra + hiring for Systems Integration Architect = compounded score', assigned_to: 'Agent' },
    { title: 'Implement competitive intent score amplifier', description: 'Multiply base intent score when competitive signals detected', assigned_to: 'Agent' },
    { title: 'Build competitor technology stack tracking', description: 'Track what tech stacks competitors use to position Labno Labs alternatives', assigned_to: 'Agent' },
    { title: 'Create competitive intelligence dashboard', description: 'Show which competitors are losing customers, where, and why', assigned_to: 'Agent' },
    { title: 'Build competitive displacement opportunity alerts', description: 'Alert when competitor shows pattern of increasing negative reviews', assigned_to: 'Agent' },
    { title: 'Map competitor weaknesses to Labno Labs strengths', assigned_to: 'Lance' },
    { title: 'Test competitive intelligence signals against known account outcomes', assigned_to: 'Agent' },
    { title: 'Document competitive intelligence signal taxonomy', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // LAYER 4: IDENTITY RESOLUTION & DYNAMIC ICP
  // ═══════════════════════════════════════════════════════════════
  '[GTM] L4: Identity Resolution & Dynamic ICP': [
    { title: 'Evaluate identity resolution providers (Apollo, Clearbit, Clay)', description: 'Compare accuracy, coverage, pricing for matching anonymous signals to corporate entities', assigned_to: 'Lance' },
    { title: 'Set up Apollo/Clearbit API integration', assigned_to: 'Agent' },
    { title: 'Build anonymous reviewer deanonymization pipeline', description: 'Match pseudonym reviewers on G2/Capterra to actual companies using firmographic data', assigned_to: 'Agent' },
    { title: 'Build IP-to-company resolution module', description: 'Cross-reference IP addresses from web visits with company IP ranges', assigned_to: 'Agent' },
    { title: 'Build firmographic metadata enrichment pipeline', description: 'Enrich matched companies with employee count, revenue, industry, location, tech stack', assigned_to: 'Agent' },
    { title: 'Design Dynamic ICP scoring model', description: 'Replace static ICP (healthcare, 500+ employees, UK) with behavioral trigger-based scoring', assigned_to: 'Lance' },
    { title: 'Implement "New Sheriff" signal detector', description: 'Detect new VP/CRO/CTO hires - they audit tech stacks within 90 days', assigned_to: 'Agent' },
    { title: 'Implement "Technographic Gap" signal detector', description: 'Detect legacy infrastructure + mobile download surge = urgent cloud migration need', assigned_to: 'Agent' },
    { title: 'Build Dynamic ICP continuous evaluation engine', description: 'Continuously adjust targeting criteria based on real-time buying moments, not static firmographics', assigned_to: 'Agent' },
    { title: 'Create identity resolution match confidence scoring', description: 'Score 0-100 on how confident the identity match is', assigned_to: 'Agent' },
    { title: 'Build identity resolution audit trail', description: 'Track which data points were used to match anonymous signal to company', assigned_to: 'Agent' },
    { title: 'Implement identity graph deduplication', description: 'Prevent creating duplicate company records from different signal sources', assigned_to: 'Agent' },
    { title: 'Build company profile enrichment table in Supabase', description: 'CREATE TABLE gtm_company_profiles with all enriched firmographic data', assigned_to: 'Agent' },
    { title: 'Create ICP match scoring API endpoint', assigned_to: 'Agent' },
    { title: 'Build Dynamic ICP dashboard showing current targeting criteria', assigned_to: 'Agent' },
    { title: 'Implement ICP criteria auto-adjustment based on conversion feedback', description: 'Learn which ICP characteristics actually convert and adjust weights', assigned_to: 'Agent' },
    { title: 'Test identity resolution accuracy against 100 known accounts', assigned_to: 'Agent' },
    { title: 'Document identity resolution pipeline and accuracy metrics', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // LAYER 4: REVOPS CRM INTEGRATION & LEAD ROUTING
  // ═══════════════════════════════════════════════════════════════
  '[GTM] L4: RevOps CRM Integration & Lead Routing': [
    { title: 'Design CRM integration architecture', description: 'Decide primary CRM (HubSpot vs Salesforce vs custom Supabase CRM)', assigned_to: 'Lance' },
    { title: 'Build CRM record auto-creation from scored signals', description: 'When intent score crosses threshold, auto-create enriched CRM record', assigned_to: 'Agent' },
    { title: 'Build AI-generated prospect dossier module', description: 'For each CRM record, auto-generate dossier: pain points, hiring velocity, competitive signals timeline', assigned_to: 'Agent' },
    { title: 'Implement AI lead routing engine', description: 'Route leads to consultants based on domain expertise and historical win rates, not manual assignment', assigned_to: 'Agent' },
    { title: 'Build medical compliance lead auto-routing', description: 'Leads with medical compliance issues → AI Medical Assistant squad automatically', assigned_to: 'Agent' },
    { title: 'Build app modernization lead auto-routing', description: 'Leads with App Store crash signals → AI Squads automatically', assigned_to: 'Agent' },
    { title: 'Build workflow automation lead auto-routing', description: 'Leads with manual process complaints → RevOps automation team automatically', assigned_to: 'Agent' },
    { title: 'Implement lead handoff notification system', description: 'Notify assigned consultant via Slack with full dossier when new high-intent lead arrives', assigned_to: 'Agent' },
    { title: 'Build CRM data sync between Supabase and external CRM', description: 'Bidirectional sync to keep Supabase labno_consulting_leads and external CRM aligned', assigned_to: 'Agent' },
    { title: 'Build lead stage progression tracking', description: 'Track leads through: Signal Detected → Enriched → Scored → Routed → Contacted → Qualified → Won/Lost', assigned_to: 'Agent' },
    { title: 'Implement SLA tracking for lead response time', description: 'Track time from signal detection to first outreach, alert on SLA violations', assigned_to: 'Agent' },
    { title: 'Build lead attribution model', description: 'Track which signal type (review, job posting, app store) generates highest-converting leads', assigned_to: 'Agent' },
    { title: 'Create lead routing rules configuration UI', description: 'Allow Lance to adjust routing rules without code changes', assigned_to: 'Agent' },
    { title: 'Build lead volume and velocity dashboard', description: 'Show leads per day, conversion rates, pipeline value, time-to-close by source', assigned_to: 'Agent' },
    { title: 'Implement lead recycling logic', description: 'Re-score and re-route leads that went cold if new signals appear', assigned_to: 'Agent' },
    { title: 'Integrate with labno_consulting_leads Supabase table', description: 'Connect GTM pipeline output to existing CRM table in labno-labs-center', assigned_to: 'Agent' },
    { title: 'Test lead routing with 50 simulated high-intent signals', assigned_to: 'Agent' },
    { title: 'Document CRM integration and lead routing rules', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // LAYER 5: VIBE CODING OUTREACH ENGINE
  // ═══════════════════════════════════════════════════════════════
  '[GTM] L5: Vibe Coding Outreach Engine': [
    { title: 'Design Vibe Coding outreach framework', description: 'Instruct LLM on emotional tone, strategic context, and length constraints for unique message generation', assigned_to: 'Lance' },
    { title: 'Build Frontend Technical Debt outreach template', description: 'For apps with low ratings/crashes: reference specific performance issues, propose modernization audit', assigned_to: 'Agent' },
    { title: 'Build Operational Bottleneck outreach template', description: 'For G2 reviewers complaining about manual processes: highlight hidden costs, propose automation', assigned_to: 'Agent' },
    { title: 'Build Infrastructure Debt outreach template', description: 'For companies with legacy systems: reference hiring patterns, propose cloud migration', assigned_to: 'Agent' },
    { title: 'Build AI Readiness outreach template', description: 'For companies hiring AI roles: position Labno Labs AI Squads as acceleration partner', assigned_to: 'Agent' },
    { title: 'Build Healthcare-specific outreach template', description: 'Reference medical compliance, patient intake inefficiency, propose AI Medical Assistant', assigned_to: 'Agent' },
    { title: 'Build competitive displacement outreach template', description: 'When prospect is actively evaluating competitors, position Labno Labs advantages', assigned_to: 'Agent' },
    { title: 'Implement LLM-based unique message generation', description: 'Generate entirely unique messages per prospect - no variable-swap templates that get flagged', assigned_to: 'Agent' },
    { title: 'Build message personalization engine using parsed signals', description: 'Inject specific pain points, review quotes, hiring signals into generated messages', assigned_to: 'Agent' },
    { title: 'Implement message tone calibration system', description: 'Adjust tone based on recipient seniority: casual-technical for engineers, executive-strategic for C-suite', assigned_to: 'Agent' },
    { title: 'Build message length optimization', description: 'Test and optimize message length for maximum open and response rates', assigned_to: 'Agent' },
    { title: 'Create outreach message quality scoring', description: 'Auto-score generated messages for personalization depth, relevance, and spam-likelihood', assigned_to: 'Agent' },
    { title: 'Build email sending infrastructure', description: 'Set up email sending with proper SPF/DKIM/DMARC, warmup, and deliverability monitoring', assigned_to: 'Agent' },
    { title: 'Implement LinkedIn message outreach capability', description: 'Auto-generate LinkedIn connection request messages and follow-ups', assigned_to: 'Agent' },
    { title: 'Build outreach A/B testing framework', description: 'Test different message approaches, tones, and CTAs for conversion optimization', assigned_to: 'Agent' },
    { title: 'Implement anti-spam compliance', description: 'CAN-SPAM, GDPR compliance: unsubscribe links, opt-out tracking, consent management', assigned_to: 'Agent' },
    { title: 'Build outreach send scheduling and throttling', description: 'Optimize send times, prevent over-emailing, respect daily limits per domain', assigned_to: 'Agent' },
    { title: 'Create outreach message history table in Supabase', description: 'Track all sent messages, open rates, click rates, responses', assigned_to: 'Agent' },
    { title: 'Build outreach performance analytics dashboard', description: 'Open rates, click rates, response rates, conversion rates by template/industry/signal type', assigned_to: 'Agent' },
    { title: 'Test Vibe Coding outreach with 20 real prospects', assigned_to: 'Lance' },
    { title: 'Document Vibe Coding framework, templates, and guidelines', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // LAYER 5: AGENTIC SALES ORCHESTRATION
  // ═══════════════════════════════════════════════════════════════
  '[GTM] L5: Agentic Sales Orchestration': [
    { title: 'Design Agentic Sales AI architecture', description: 'Autonomous agents that monitor engagement, adjust cadences, compile battlecards, pre-populate pitch decks', assigned_to: 'Lance' },
    { title: 'Build email engagement tracking system', description: 'Track opens, clicks, replies, forwards for each outreach message', assigned_to: 'Agent' },
    { title: 'Build micro-progression detection engine', description: 'Detect sequences: email open → case study click → pricing page visit = intent acceleration', assigned_to: 'Agent' },
    { title: 'Implement dynamic cadence adjustment agent', description: 'Auto-adjust follow-up timing and messaging based on prospect engagement signals', assigned_to: 'Agent' },
    { title: 'Build competitive battlecard auto-generation', description: 'When prospect researches competitor, auto-compile Labno Labs vs competitor comparison', assigned_to: 'Agent' },
    { title: 'Build personalized pitch deck pre-population', description: 'Auto-fill pitch deck template with prospect-specific data before discovery call', assigned_to: 'Agent' },
    { title: 'Build engagement deceleration detector', description: 'Detect when prospect engagement drops, trigger messaging strategy pivot', assigned_to: 'Agent' },
    { title: 'Implement messaging pivot: features → business outcomes', description: 'When engagement stalls on technical features, shift to executive-level business outcome messaging', assigned_to: 'Agent' },
    { title: 'Build multi-channel cadence orchestrator', description: 'Coordinate email, LinkedIn, and phone touchpoints in intelligent sequence', assigned_to: 'Agent' },
    { title: 'Build call prep agent', description: 'Before scheduled calls, auto-generate brief with all signals, engagement history, and talking points', assigned_to: 'Agent' },
    { title: 'Implement follow-up sequence automation', description: 'Auto-generate and schedule follow-up messages based on engagement patterns', assigned_to: 'Agent' },
    { title: 'Build meeting booking integration', description: 'Auto-send calendar links when prospect shows booking-ready signals', assigned_to: 'Agent' },
    { title: 'Build sales velocity tracking per account', description: 'Track time from first signal to qualified opportunity to closed deal', assigned_to: 'Agent' },
    { title: 'Create agent activity log table in Supabase', description: 'Track all autonomous agent actions for audit and optimization', assigned_to: 'Agent' },
    { title: 'Build sales orchestration performance dashboard', description: 'Show agent actions taken, engagement improvements, deals influenced', assigned_to: 'Agent' },
    { title: 'Implement human-in-the-loop approval for high-stakes actions', description: 'Agent proposes actions for C-suite accounts, Lance approves before sending', assigned_to: 'Agent' },
    { title: 'Test agentic orchestration with 10 active prospect accounts', assigned_to: 'Lance' },
    { title: 'Document agentic sales orchestration architecture and rules', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // STRATEGIC: MEDICAL AI & HEALTHCARE PIPELINE
  // ═══════════════════════════════════════════════════════════════
  '[GTM] Medical AI & Healthcare Pipeline': [
    { title: 'Define healthcare ICP targets', description: 'Hospital networks, regional clinic groups, clinical tech providers', assigned_to: 'Lance' },
    { title: 'Configure healthcare-specific review monitoring on G2/Capterra', description: 'Target EHR, patient portal, telehealth, medical billing software categories', assigned_to: 'Agent' },
    { title: 'Train Slang AI for healthcare pain point detection', description: 'Detect "patient communication breakdowns", "inefficient symptom tracking", "manual pain logging"', assigned_to: 'Agent' },
    { title: 'Build AI Medical Assistant positioning content', description: 'Create case studies and ROI calculators for AI Medical Assistant offering', assigned_to: 'Lance' },
    { title: 'Build DocQuest positioning content', description: 'Create demos and case studies for interactive medical case simulation platform', assigned_to: 'Lance' },
    { title: 'Build PainDrain positioning content', description: 'Create demos for GPT-5 powered pain translator and tracking system', assigned_to: 'Lance' },
    { title: 'Create healthcare outreach sequence with compliance awareness', description: 'HIPAA-compliant messaging that references specific clinical workflow bottlenecks', assigned_to: 'Agent' },
    { title: 'Build healthcare signal-to-solution mapping', description: 'Patient intake complaints → AI Medical Assistant, symptom tracking → PainDrain, case simulation → DocQuest', assigned_to: 'Agent' },
    { title: 'Monitor healthcare App Store reviews for clinic patient portal apps', assigned_to: 'Agent' },
    { title: 'Track healthcare IT hiring trends', description: 'Monitor for "Health Informatics", "Clinical Systems Analyst", "EHR Implementation" roles', assigned_to: 'Agent' },
    { title: 'Build healthcare compliance signal detector', description: 'Detect HIPAA violation complaints, data breach mentions, compliance audit failures', assigned_to: 'Agent' },
    { title: 'Create healthcare pipeline dashboard in labno-labs-center', assigned_to: 'Agent' },
    { title: 'Build healthcare ROI calculator for outreach emails', description: 'Calculate hours saved, cost reduction from replacing manual processes with AI', assigned_to: 'Agent' },
    { title: 'Build list of top 100 target healthcare organizations', assigned_to: 'Lance' },
    { title: 'Test healthcare pipeline end-to-end with 5 real targets', assigned_to: 'Lance' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // STRATEGIC: AI SQUADS & CUSTOM DEV PIPELINE
  // ═══════════════════════════════════════════════════════════════
  '[GTM] AI Squads & Custom Dev Pipeline': [
    { title: 'Define AI Squads service offering and pricing tiers', assigned_to: 'Lance' },
    { title: 'Build cross-signal correlation engine for tech debt detection', description: 'Cross-reference App Store crashes + LinkedIn hiring for Legacy System Engineers = deep tech debt', assigned_to: 'Agent' },
    { title: 'Create CTO/VP Engineering targeted outreach sequences', description: 'Leverage App Store complaints as irrefutable proof, position AI Squads as rescue force', assigned_to: 'Agent' },
    { title: 'Build custom MVP development pipeline signals', description: 'Detect companies seeking "rapid prototyping", "MVP development", "proof of concept"', assigned_to: 'Agent' },
    { title: 'Create AI Squads case study library', description: 'Document past wins for use in automated outreach', assigned_to: 'Lance' },
    { title: 'Build app modernization urgency calculator', description: 'Calculate user churn risk based on App Store rating trajectory', assigned_to: 'Agent' },
    { title: 'Build enterprise modernization outreach sequence', description: 'Target companies showing architectural drift with platform stabilization messaging', assigned_to: 'Agent' },
    { title: 'Monitor for "architectural drift" signals in job postings', description: 'Companies hiring both legacy and modern stack developers simultaneously', assigned_to: 'Agent' },
    { title: 'Build custom development RFP detector', description: 'Monitor for companies posting RFPs for custom software development', assigned_to: 'Agent' },
    { title: 'Create AI Squads pipeline dashboard in labno-labs-center', assigned_to: 'Agent' },
    { title: 'Build technology migration opportunity tracker', description: 'Track companies moving from legacy to modern stacks', assigned_to: 'Agent' },
    { title: 'Build list of top 100 target enterprise organizations', assigned_to: 'Lance' },
    { title: 'Test AI Squads pipeline end-to-end with 5 real targets', assigned_to: 'Lance' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // FOUNDATION: DATA ARCHITECTURE & STORAGE
  // ═══════════════════════════════════════════════════════════════
  '[GTM] Foundation: Data Architecture & Storage': [
    { title: 'Design GTM data architecture in Supabase', description: 'Define all tables, relationships, and indexes for the entire 5-layer system', assigned_to: 'Lance' },
    { title: 'Create gtm_mobile_reviews table', description: 'Raw App Store + Play Store reviews with all extracted fields', assigned_to: 'Agent' },
    { title: 'Create gtm_b2b_reviews table', description: 'Raw G2, Capterra, TrustRadius reviews with firmographics and competitive intel', assigned_to: 'Agent' },
    { title: 'Create gtm_job_postings table', description: 'Raw LinkedIn and Indeed job postings with tech stack extraction', assigned_to: 'Agent' },
    { title: 'Create gtm_parsed_signals table', description: 'Semantically parsed signals from Layer 2 with pain_point, severity, solution mapping', assigned_to: 'Agent' },
    { title: 'Create gtm_intent_scores table', description: 'Composite intent scores per account with dimensional breakdown', assigned_to: 'Agent' },
    { title: 'Create gtm_company_profiles table', description: 'Enriched company profiles from identity resolution with firmographics', assigned_to: 'Agent' },
    { title: 'Create gtm_outreach_messages table', description: 'All generated and sent outreach messages with engagement tracking', assigned_to: 'Agent' },
    { title: 'Create gtm_agent_actions table', description: 'All autonomous agent actions for audit trail', assigned_to: 'Agent' },
    { title: 'Create gtm_competitive_intel table', description: 'Competitor analysis data, battlecards, switching signals', assigned_to: 'Agent' },
    { title: 'Create gtm_pipeline_stages table', description: 'Lead stage progression tracking from signal to closed deal', assigned_to: 'Agent' },
    { title: 'Implement RLS policies for all GTM tables', description: 'Secure access to @labnolabs.com employees only', assigned_to: 'Agent' },
    { title: 'Create database indexes for common query patterns', description: 'Index on company_name, intent_score, created_at, signal_type', assigned_to: 'Agent' },
    { title: 'Build data backup and recovery procedures', assigned_to: 'Agent' },
    { title: 'Implement data versioning for signal updates', description: 'Track how signals change over time without losing history', assigned_to: 'Agent' },
    { title: 'Create database migration scripts for all GTM tables', assigned_to: 'Agent' },
    { title: 'Document complete data architecture and ERD', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // FOUNDATION: COMPLIANCE & SECURITY
  // ═══════════════════════════════════════════════════════════════
  '[GTM] Foundation: Compliance & Security': [
    { title: 'Research GDPR compliance for scraping European company reviews', assigned_to: 'Lance' },
    { title: 'Implement CAN-SPAM compliance for outreach emails', description: 'Unsubscribe links, physical address, opt-out honoring within 10 business days', assigned_to: 'Agent' },
    { title: 'Build GDPR data subject request handling', description: 'Ability to delete all data for a specific company/person upon request', assigned_to: 'Agent' },
    { title: 'Implement consent management for email outreach', assigned_to: 'Agent' },
    { title: 'Build PII detection and masking in review data', description: 'Auto-detect and mask personal information in scraped reviews', assigned_to: 'Agent' },
    { title: 'Implement API key rotation and secret management', description: 'Rotate Apify, enrichment API, and LLM API keys on schedule', assigned_to: 'Agent' },
    { title: 'Build scraping terms-of-service compliance checker', description: 'Verify scraping activities comply with each platform\'s ToS', assigned_to: 'Lance' },
    { title: 'Implement data access audit logging', description: 'Log all access to GTM data for compliance audits', assigned_to: 'Agent' },
    { title: 'Create data processing agreement (DPA) templates', assigned_to: 'Lance' },
    { title: 'Build HIPAA compliance layer for healthcare lead data', description: 'Ensure healthcare prospect data is handled with HIPAA-level security', assigned_to: 'Agent' },
    { title: 'Implement email deliverability monitoring', description: 'Monitor blacklist status, spam scores, bounce rates', assigned_to: 'Agent' },
    { title: 'Document compliance posture and data handling policies', assigned_to: 'Lance' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // FOUNDATION: MONITORING & ANALYTICS
  // ═══════════════════════════════════════════════════════════════
  '[GTM] Foundation: Monitoring & Analytics': [
    { title: 'Build GTM system health dashboard', description: 'Overall system status: all 5 layers running, error rates, throughput', assigned_to: 'Agent' },
    { title: 'Create ingestion volume metrics', description: 'Reviews/day, job postings/day, companies tracked, new signals/day', assigned_to: 'Agent' },
    { title: 'Create semantic parsing accuracy metrics', description: 'Track classification accuracy, false positive/negative rates', assigned_to: 'Agent' },
    { title: 'Create intent scoring effectiveness metrics', description: 'Track score-to-conversion correlation, calibration accuracy', assigned_to: 'Agent' },
    { title: 'Create outreach performance metrics', description: 'Open rates, click rates, response rates, meeting rates, conversion rates', assigned_to: 'Agent' },
    { title: 'Build pipeline funnel analytics', description: 'Signals detected → Parsed → Scored → Enriched → Routed → Contacted → Qualified → Won', assigned_to: 'Agent' },
    { title: 'Build cost-per-lead analytics', description: 'Track total system cost divided by qualified leads generated', assigned_to: 'Agent' },
    { title: 'Build ROI tracking dashboard', description: 'Revenue attributed to GTM system vs system operating costs', assigned_to: 'Agent' },
    { title: 'Implement anomaly detection for pipeline metrics', description: 'Alert when metrics deviate significantly from baselines', assigned_to: 'Agent' },
    { title: 'Build weekly GTM system performance report', description: 'Auto-generate weekly report with key metrics, highlights, and recommendations', assigned_to: 'Agent' },
    { title: 'Create PostHog integration for GTM analytics', description: 'Connect GTM metrics to existing PostHog analytics in labno-labs-center', assigned_to: 'Agent' },
    { title: 'Build A/B test results dashboard', description: 'Show results of all active experiments across outreach, scoring, and parsing', assigned_to: 'Agent' },
    { title: 'Document metrics definitions and measurement methodology', assigned_to: 'Agent' },
  ],

  // ═══════════════════════════════════════════════════════════════
  // GTM STRATEGY & PLANNING
  // ═══════════════════════════════════════════════════════════════
  '[GTM] Go-To-Market Strategy & Planning': [
    { title: 'Define Phase 1 MVP scope for GTM system', description: 'Minimum viable pipeline: 1 review source + basic parsing + manual outreach', assigned_to: 'Lance' },
    { title: 'Define Phase 2 expansion scope', description: 'Add all 3 ingestion sources + full semantic parsing + intent scoring', assigned_to: 'Lance' },
    { title: 'Define Phase 3 automation scope', description: 'Full agentic outreach + dynamic cadences + competitive intelligence', assigned_to: 'Lance' },
    { title: 'Create GTM system project timeline and milestones', assigned_to: 'Lance' },
    { title: 'Define GTM system budget (Apify, enrichment APIs, LLM costs)', assigned_to: 'Lance' },
    { title: 'Identify pilot target accounts for initial testing', description: 'Select 20 accounts across healthcare and enterprise for pilot', assigned_to: 'Lance' },
    { title: 'Define success metrics for GTM system pilot', description: 'Target: X qualified leads, Y meetings booked, Z conversion rate', assigned_to: 'Lance' },
    { title: 'Research G2 buyer intent data API access', description: 'Evaluate G2\'s official intent data product vs scraping approach', assigned_to: 'Agent' },
    { title: 'Research Bombora/6sense intent data integration', description: 'Evaluate third-party intent data providers as complement to scraping', assigned_to: 'Agent' },
    { title: 'Build GTM system demo for internal stakeholders', assigned_to: 'Agent' },
    { title: 'Create GTM system documentation hub', assigned_to: 'Agent' },
    { title: 'Design GTM system integration with existing labno-labs-center dashboard', description: 'Plan new pages/components needed in the Vercel app', assigned_to: 'Lance' },
    { title: 'Evaluate Clay.com as unified GTM orchestration platform', description: 'Clay may replace some custom building with its waterfall enrichment and scoring', assigned_to: 'Lance' },
    { title: 'Research LinkedIn Sales Navigator API for enrichment', assigned_to: 'Agent' },
    { title: 'Define data freshness SLAs per signal type', description: 'App reviews: daily, B2B reviews: weekly, job postings: daily, intent scores: real-time', assigned_to: 'Lance' },
  ],
};

// ─── Main execution ──────────────────────────────────────────────
async function main() {
  console.log('🚀 GTM Architecture Bulk Insert Starting...\n');

  let totalProjects = 0;
  let totalTasks = 0;
  let errors = [];

  for (const project of projects) {
    // Insert project
    const { data: projData, error: projError } = await supabase
      .from('internal_projects')
      .insert({
        name: project.name,
        status: project.status,
        complexity: project.complexity,
        total_tasks: (tasksByProject[project.name] || []).length,
        completed_tasks: 0,
      })
      .select('id')
      .single();

    if (projError) {
      console.error(`❌ Project "${project.name}": ${projError.message}`);
      errors.push({ type: 'project', name: project.name, error: projError.message });
      continue;
    }

    totalProjects++;
    const projectId = projData.id;
    const tasks = tasksByProject[project.name] || [];

    if (tasks.length === 0) {
      console.log(`✅ Project "${project.name}" (0 tasks)`);
      continue;
    }

    // Insert tasks in batches of 50
    const batchSize = 50;
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize).map(t => ({
        project_id: projectId,
        title: t.title,
        description: t.description || null,
        column_id: 'backlog',
        assigned_to: t.assigned_to || 'Agent',
        complexity: t.complexity || 1,
        is_blocked: false,
      }));

      const { error: taskError } = await supabase
        .from('global_tasks')
        .insert(batch);

      if (taskError) {
        console.error(`❌ Tasks batch for "${project.name}": ${taskError.message}`);
        errors.push({ type: 'tasks', project: project.name, error: taskError.message });
      } else {
        totalTasks += batch.length;
      }
    }

    console.log(`✅ Project "${project.name}" (${tasks.length} tasks)`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`📊 SUMMARY`);
  console.log(`   Projects created: ${totalProjects}`);
  console.log(`   Tasks created: ${totalTasks}`);
  console.log(`   Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`   - ${e.type}: ${e.name || e.project}: ${e.error}`));
  }
  console.log('═'.repeat(60));
}

main().catch(console.error);
