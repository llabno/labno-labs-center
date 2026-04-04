# GTM Layer 1: Omni-Channel Data Ingestion Architecture

> **System**: 5-Layer Go-To-Market Signal Extraction Engine
> **Layer**: 1 of 5 (Raw Data Ingestion)
> **Owner**: Labno Labs
> **Version**: 1.0.0
> **Last Updated**: 2026-04-02

This document is the operational reference for Layer 1 of the GTM Signal Extraction system. It covers every ingestion stream, the infrastructure that connects them, scheduling, cost tracking, and runbook procedures for day-to-day operations.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [App Store Ingestion Stream](#2-app-store-ingestion-stream)
3. [B2B Review Platform Stream](#3-b2b-review-platform-stream)
4. [Job Board Stream](#4-job-board-stream)
5. [Infrastructure](#5-infrastructure)
6. [Scheduling & Orchestration](#6-scheduling--orchestration)
7. [Estimated Monthly Costs](#7-estimated-monthly-costs)
8. [Runbook](#8-runbook)

---

## 1. Architecture Overview

### System Diagram

```
                         LAYER 1: OMNI-CHANNEL DATA INGESTION
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │   ┌─────────────────┐                                                   │
  │   │  Apple App Store │──┐                                               │
  │   └─────────────────┘  │  ┌──────────────┐   ┌──────────────────┐       │
  │                        ├─►│ Apify Actors  │──►│ Apify Webhook    │       │
  │   ┌─────────────────┐  │  │ (EasyAPI,     │   │ (POST on finish) │       │
  │   │ Google Play Store│──┘  │  NeatRat)     │   └───────┬──────────┘       │
  │   └─────────────────┘     └──────────────┘           │                  │
  │                                                       │                  │
  │   ┌─────────────────┐     ┌──────────────┐           │                  │
  │   │   G2            │──┐  │ Apify Actor   │           ▼                  │
  │   ├─────────────────┤  ├─►│ (Focused      │   ┌──────────────────┐       │
  │   │   Capterra      │──┘  │  Vanguard     │──►│ Vercel Serverless│       │
  │   ├─────────────────┤     │  Multi-Plat)  │   │ /api/gtm/ingest  │       │
  │   │   TrustRadius   │─x   └──────────────┘   │                  │       │
  │   └─────────────────┘                         │  - Validate      │       │
  │                                                │  - Transform     │       │
  │   ┌─────────────────┐     ┌──────────────┐   │  - Deduplicate   │       │
  │   │   LinkedIn Jobs │──┐  │ Bright Data   │   │  - Insert        │       │
  │   ├─────────────────┤  ├─►│ LinkedIn Jobs │──►│                  │       │
  │   │   Indeed        │──┘  │ Scraper API   │   └────────┬─────────┘       │
  │   └─────────────────┘     └──────────────┘            │                  │
  │                                                        │                  │
  │                                                        ▼                  │
  │                                              ┌──────────────────┐        │
  │                                              │    Supabase      │        │
  │                                              │  ┌──────────────┐│        │
  │                                              │  │gtm_mobile_   ││        │
  │                                              │  │  reviews     ││        │
  │                                              │  ├──────────────┤│        │
  │                                              │  │gtm_b2b_      ││        │
  │                                              │  │  reviews     ││        │
  │                                              │  ├──────────────┤│        │
  │                                              │  │gtm_job_      ││        │
  │                                              │  │  postings    ││        │
  │                                              │  └──────────────┘│        │
  │                                              └──────────────────┘        │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                        LAYER 2: Signal Parsing
                    (gtm_parsed_signals, gtm_hiring_signals)
```

### Data Flow Summary

Each ingestion stream follows this path:

```
Source Platform
  → Scraping Tool (Apify Actor or Bright Data API)
    → Webhook fires on completion (HTTP POST with run metadata)
      → Vercel Serverless Function (/api/gtm/ingest/[stream])
        → Fetch results from Apify dataset or Bright Data response
          → Schema validation (reject malformed records)
            → Field transformation (normalize dates, enums, arrays)
              → Deduplication check (UNIQUE constraint on review_id_external / composite key)
                → INSERT into Supabase staging table
                  → Log ingestion metrics (count, errors, duration)
```

### Staging Tables (Layer 1)

| Table | Source Streams | Dedup Key | Row Estimate (Month 1) |
|-------|---------------|-----------|------------------------|
| `gtm_mobile_reviews` | Apple App Store, Google Play | `review_id_external` (UNIQUE) | 10,000 |
| `gtm_b2b_reviews` | G2, Capterra, TrustRadius | `review_id_external` (UNIQUE) | 2,000 |
| `gtm_job_postings` | LinkedIn, Indeed | `source_platform` + `posting_url` | 1,000 |

---

## 2. App Store Ingestion Stream

### Actor Selection

| Platform | Actor | Actor ID | Pricing |
|----------|-------|----------|---------|
| **Apple App Store** | EasyAPI App Store Reviews Scraper | `easyapi/app-store-reviews-scraper` | $0.10 / 1,000 reviews |
| **Google Play Store** | NeatRat Google Play Store Reviews Scraper | `neatrat/google-play-store-reviews-scraper` | $0.10 / 1,000 reviews |

**Why these actors:**
- EasyAPI extracts 30+ fields per review, giving the richest data for downstream signal parsing. No URL or app ID required -- can search by app name and country.
- NeatRat includes built-in delays between requests to avoid Google Play rate limiting. Supports country and language parameters for targeted scraping.
- Both are pay-per-result, meaning Apify handles proxy rotation and retry logic internally.

**Alternative (single-vendor option):** The Wolves offers both iOS (`thewolves/appstore-reviews-scraper`) and Android (`thewolves/google-play-reviews-scraper`) at the same $0.10/1K price. Consider switching if EasyAPI or NeatRat become unreliable, to simplify vendor management.

### Actor Configuration

**Apple App Store (EasyAPI):**

```json
{
  "search": "Salesforce",
  "country": "us",
  "sort": "mostRecent",
  "maxReviews": 500,
  "proxyConfiguration": {
    "useApifyProxy": true
  }
}
```

**Google Play (NeatRat):**

```json
{
  "appUrl": "https://play.google.com/store/apps/details?id=com.salesforce.chatter",
  "country": "us",
  "language": "en",
  "sort": "newest",
  "maxReviews": 500
}
```

### Target App Selection Criteria

Apps are selected based on Labno Labs' ICP (Ideal Customer Profile). The target list lives in Supabase as a config table or in the Apify actor schedule inputs. Selection criteria:

| Criterion | What to Look For |
|-----------|-----------------|
| **Industry alignment** | Healthcare (EHR, telehealth, patient portals), Fintech (banking apps, payment platforms), Logistics (fleet management, supply chain), Enterprise SaaS (CRM, ERP, HRIS) |
| **Review volume** | Apps with 1,000+ reviews (enough signal density to find pain points) |
| **Recent negative reviews** | Apps with visible 1-2 star review spikes (indicates active pain) |
| **Company size** | Publisher is a company with 50-5,000 employees (Labno Labs' sweet spot) |
| **Technical surface area** | Apps that rely on APIs, integrations, or data pipelines (where Labno Labs can help) |

**Starter target list (20 apps):**
- Healthcare: Epic MyChart, Cerner, Athenahealth, DrChrono, Practice Fusion
- Fintech: Plaid, Stripe Dashboard, Square, Brex, Ramp
- Logistics: Samsara, KeepTruckin, FourKites, project44
- Enterprise: Salesforce, HubSpot, ServiceNow, Workday, Zendesk, Freshdesk

### Fields Captured

Maps to `gtm_mobile_reviews` table. Full schema in [gtm-schemas-and-taxonomies.md](./gtm-schemas-and-taxonomies.md#1-app-store-review-schema).

| Field | Source Mapping | Notes |
|-------|---------------|-------|
| `source_platform` | Set by pipeline (`apple_app_store` or `google_play`) | Enum, not from scraper |
| `app_name` | `appName` / `title` | |
| `app_id` | `appId` / `appPackage` | |
| `app_version` | `version` | Null for older Apple reviews |
| `review_id_external` | `id` / `reviewId` | Prefixed with `apple_` or `gp_` to ensure global uniqueness |
| `reviewer_name` | `userName` / `author` | |
| `rating` | `score` / `rating` | Integer 1-5 |
| `review_text` | `text` / `content` | Reviews with empty text are dropped |
| `review_date` | `date` / `at` | Normalized to ISO 8601 |
| `device_type` | `deviceType` (Google only) | Always null for Apple |
| `geo_location` | Derived from actor input `country` param | |
| `helpful_count` | `thumbsUp` / `voteCount` | |
| `developer_response` | `replyContent` / `developerResponse` | |

### Deduplication Strategy

- **Primary mechanism:** `review_id_external` has a `UNIQUE` constraint on `gtm_mobile_reviews`. Duplicate inserts fail with a constraint violation.
- **Prefix convention:** Apple review IDs are prefixed `apple_`, Google Play IDs are prefixed `gp_` to prevent cross-platform ID collisions.
- **Upsert behavior:** The Vercel function uses `INSERT ... ON CONFLICT (review_id_external) DO NOTHING`. This means re-running a scrape for the same app is idempotent -- duplicates are silently skipped, not errored.
- **Edge case:** If a user edits their review, it keeps the same `review_id_external` but the text changes. We do NOT update existing reviews (DO NOTHING, not DO UPDATE). Rationale: the original review text is what was parsed for signals; updating it would invalidate downstream data. If re-scraping is needed, a manual backfill with `DO UPDATE` can be run.

### Rate Limiting Approach

- **Apple App Store:** No known rate limits on the public RSS/API that EasyAPI uses. Apify's proxy rotation handles any IP-based throttling.
- **Google Play:** NeatRat includes configurable delays between requests (default: 1-3 seconds). Do not reduce below 1 second.
- **Apify platform limits:** Free tier allows 10 actor runs/day. Paid plans ($49/mo Starter) allow unlimited runs. At 20 apps x 2 platforms x daily = 40 runs/day, the Starter plan is required.
- **Concurrency:** Run at most 5 actors concurrently to stay within Apify compute limits and avoid platform-level throttling.

### Error Handling and Retry Logic

| Error Type | Detection | Response |
|-----------|-----------|----------|
| **Actor run fails** | Apify webhook sends `status: FAILED` | Log error, retry once after 30 minutes. If second attempt fails, alert via email. |
| **Partial results** | Dataset item count < expected (e.g., 0 reviews for an app that should have hundreds) | Accept what was returned, flag in monitoring dashboard, investigate manually. |
| **Schema validation failure** | Required field missing or wrong type | Skip the individual record, log it, continue processing remaining records. |
| **Supabase insert failure** | Non-duplicate database error (connection timeout, RLS violation) | Retry entire batch up to 3 times with exponential backoff (1s, 4s, 16s). If all fail, store raw data in Apify dataset (retained 7 days) for manual recovery. |
| **Webhook delivery failure** | Apify retries webhooks 3 times automatically | If all 3 fail, the actor run results remain in the Apify dataset. A daily sweep job checks for unprocessed datasets. |

### Estimated Costs at 10K Reviews/Month

| Item | Calculation | Monthly Cost |
|------|-------------|-------------|
| Apple App Store reviews (5K) | 5,000 x $0.10/1K | $0.50 |
| Google Play reviews (5K) | 5,000 x $0.10/1K | $0.50 |
| Apify platform (Starter, if needed) | Flat fee | $0.00 - $49.00 |
| **Subtotal** | | **$1.00 - $50.00** |

At commodity pricing of $0.10/1K reviews, the scraping cost is negligible. The Apify platform fee is the main variable -- free tier may suffice initially if runs are batched efficiently.

---

## 3. B2B Review Platform Stream

### Platform Assessment

| Platform | Actor | Feasibility | Key Challenge |
|----------|-------|-------------|---------------|
| **G2** | Focused Vanguard Multi-Platform (`focused_vanguard/multi-platform-reviews-scraper`) | Unreliable (~37% success rate) | DataDome WAF with AI-based detection, TLS fingerprinting, behavioral analysis |
| **Capterra** | Focused Vanguard Multi-Platform (same actor) | Good | Less aggressive anti-bot than G2 |
| **TrustRadius** | No reliable actor identified | Not feasible for v1 | Very low scraping volume in ecosystem; defer to manual collection |

### G2: The DataDome Problem

G2 uses DataDome, an AI-based Web Application Firewall that analyzes:
- TLS/SSL fingerprints
- Behavioral patterns (navigation timing, scroll behavior, mouse movement)
- IP reputation (flags datacenter and many residential proxies)
- Per-customer ML models that adapt to new scraping patterns
- Intent-based detection (identifies automated navigation even with perfect fingerprints)

**Industry benchmark:** G2 averages only 36.63% success rate across all scraping providers (Proxyway 2025 report). In March 2026, DataDome publicly disclosed blocking an 80M-request scraping attack on "a leading review platform" (widely believed to be G2).

**Practical implication:** Budget for 2-3x the Apify runs you expect to need. If you need 1,000 G2 reviews, expect to pay for 2,500-3,000 attempts.

### Actor Configuration

**Focused Vanguard Multi-Platform Scraper** is the recommended actor because one run covers G2 + Capterra + Trustpilot + Gartner. When G2 blocks, you still get reviews from fallback platforms for the same products.

```json
{
  "domains": [
    "hubspot.com",
    "salesforce.com",
    "servicenow.com",
    "zendesk.com",
    "freshdesk.com"
  ],
  "maxReviewsPerPlatform": 200,
  "platforms": ["g2", "capterra"],
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  }
}
```

**Pricing:** $6.49 per 1,000 results across all platforms combined.

**Fallback strategy:** If Focused Vanguard reliability drops below 25%, switch to ScrapePilot (`scrapepilot/g2-software-reviews-scraper`) which has the most robust anti-bot handling (exponential backoff, proxy rotation, realistic browser headers). Cost is compute-based rather than per-result.

### Firmographic Data Extraction

B2B review platforms are uniquely valuable because reviewers self-report company information. The `gtm_b2b_reviews` table captures:

| Field | Signal Value | Downstream Use |
|-------|-------------|----------------|
| `reviewer_job_title` | Identifies decision-maker seniority | Feeds `seniority_score` in Layer 3 intent scoring |
| `reviewer_company_name` | Identifies the company experiencing pain | Matched to `gtm_company_profiles` for enrichment |
| `reviewer_company_size` | Filters for ICP-aligned company sizes | ICP match scoring |
| `reviewer_industry` | Identifies vertical market | Routes to correct Labno Labs squad (medical_ai, revops, etc.) |

### Competitive Intelligence Extraction

Two fields in the B2B review schema feed directly into `gtm_competitive_intel` (Layer 3):

- **`alternatives_considered`** (array): Products the reviewer evaluated before choosing. Reveals competitive landscape and switching patterns.
- **`competitive_comparisons`** (JSONB): Free-text comparisons ("Compared to Salesforce, HubSpot lacks..."). Parsed in Layer 2 for weakness signals.

These fields enable automated battlecard generation in Layer 5.

### Scheduling

| Frequency | Rationale |
|-----------|-----------|
| **Weekly** (default) | B2B review volume is lower than app stores; weekly is sufficient for most categories |
| **2x/week** | For high-priority software categories where Labno Labs has active pipeline deals |
| **Daily** | Only during competitive research sprints or when a prospect mentions a specific product |

Runs are scheduled for **Sunday 02:00 UTC** (low traffic, better success rates against anti-bot systems).

### Estimated Costs

| Item | Calculation | Monthly Cost |
|------|-------------|-------------|
| Multi-platform scraper (2K target reviews, 3x retry budget = 6K attempts) | 6,000 x $6.49/1K | $39.00 |
| Residential proxy add-on (if needed beyond Apify defaults) | Variable | $0 - $20.00 |
| **Subtotal** | | **$13.00 - $59.00** |

The wide range reflects DataDome variability. Good weeks cost $13; bad weeks where G2 blocks heavily push toward $59.

---

## 4. Job Board Stream

### Platform & Tool Selection

| Platform | Tool | Approach | Pricing |
|----------|------|----------|---------|
| **LinkedIn** | Bright Data LinkedIn Jobs Scraper | Dedicated scraping API (not Apify) | $0.001/record ($1/1K jobs) |
| **Indeed** | Apify Indeed actor or Bright Data | Standard web scraping | $0.001 - $0.005/record |

### LinkedIn: Why Bright Data

Bright Data is the recommended tool for LinkedIn job postings because:

1. **Legal defensibility:** Bright Data won court cases against Meta and X, establishing precedent that scraping publicly visible data is legal. They only access public job listings -- no fake accounts, no login circumvention.
2. **Proxycurl is dead:** The former leading LinkedIn scraping API ($10M ARR) shut down in July 2025 after LinkedIn sued for fake account usage.
3. **Cost efficiency:** $0.001/record is 69x cheaper than PhantomBuster ($0.069/record equivalent) and doesn't risk your personal LinkedIn account.
4. **Reliability:** Bright Data maintains its own proxy infrastructure and browser fingerprint rotation, achieving higher success rates than Apify actors against LinkedIn's anti-scraping measures.

### Legal Considerations

| Approach | Legal Risk | Our Position |
|----------|-----------|--------------|
| Scraping public job postings (no login) | **Low** | This is what we do. Court-tested by Bright Data. |
| Scraping behind LinkedIn login wall | **High** | Never do this. LinkedIn sued Proxycurl into shutdown for this. |
| Using fake LinkedIn accounts | **Critical** | Absolutely prohibited. Violates CFAA and LinkedIn ToS. |
| Scraping Indeed public listings | **Low** | Public data, standard web scraping. |

### Tech Stack Extraction

Job descriptions are a rich source of tech stack signals. The `required_tech_stack` and `preferred_tech_stack` arrays in `gtm_job_postings` are populated by a keyword extraction step in the Vercel ingest function:

```
Job description text
  → Regex + keyword matching against tech taxonomy
    → Split into required_tech_stack[] and preferred_tech_stack[]
```

**Tech taxonomy categories:**
- Languages: Python, Java, TypeScript, Go, Rust, C#, Ruby
- Frameworks: React, Angular, Vue, Django, Spring, .NET, Rails
- Databases: PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch
- Cloud: AWS, GCP, Azure, Kubernetes, Docker, Terraform
- AI/ML: TensorFlow, PyTorch, OpenAI, LangChain, Hugging Face
- Data: Snowflake, dbt, Airflow, Kafka, Spark, Fivetran

### Hiring Signal Detection

Job postings feed into `gtm_hiring_signals` (Layer 2) where patterns are detected:

| Signal Type | Detection Logic | What It Means |
|-------------|----------------|---------------|
| `hiring_spike` | Company posts 5+ jobs in same department within 30 days | Rapid growth or backfill after attrition; budget is flowing |
| `new_department` | Job titles reference a function the company hasn't hired for before | New initiative, likely needs tooling and consulting |
| `executive_turnover` | VP/C-level role posted for a function that had one recently | New leader = new vendor evaluation cycle |
| `tech_stack_shift` | Required tech changes from previous postings (e.g., Java to Python) | Migration project, needs implementation help |
| `legacy_migration` | Job description mentions "modernize", "migrate", "replace legacy" | Active tech debt remediation, strong Labno Labs fit |

### Configuration

**Bright Data LinkedIn Jobs:**

```json
{
  "keyword": "software engineer",
  "location": "United States",
  "country": "US",
  "time_range": "past_24_hours",
  "limit": 100,
  "include_description": true
}
```

Run separate queries for each target keyword set:
- `"data engineer"`, `"DevOps engineer"`, `"platform engineer"` (infrastructure signals)
- `"AI engineer"`, `"ML engineer"`, `"LLM"` (AI readiness signals)
- `"Salesforce administrator"`, `"HubSpot"`, `"RevOps"` (RevOps signals)
- `"legacy migration"`, `"cloud migration"`, `"modernization"` (tech debt signals)

### Scheduling

| Frequency | Rationale |
|-----------|-----------|
| **Daily** | Job postings have a short shelf life (median 30 days). Daily scraping captures new postings before they expire. |

Runs scheduled for **06:00 UTC daily** (captures overnight postings from US market).

### Estimated Costs

| Item | Calculation | Monthly Cost |
|------|-------------|-------------|
| LinkedIn job postings (1K/month) | 1,000 x $0.001 | $1.00 |
| Indeed job postings (500/month) | 500 x $0.005 | $2.50 |
| Bright Data minimum plan (if required) | Variable | $0 - $5.00 |
| **Subtotal** | | **$1.00 - $8.50** |

---

## 5. Infrastructure

### Webhook → Serverless Architecture

```
Apify Actor completes run
  → Apify fires webhook (POST) to:
      https://labno-labs-center.vercel.app/api/gtm/ingest/mobile-reviews
      https://labno-labs-center.vercel.app/api/gtm/ingest/b2b-reviews
      https://labno-labs-center.vercel.app/api/gtm/ingest/job-postings

Bright Data job completes
  → Bright Data fires callback (POST) to:
      https://labno-labs-center.vercel.app/api/gtm/ingest/job-postings
```

**Vercel function responsibilities:**

1. **Authenticate** -- Verify webhook signature (Apify sends `X-Apify-Webhook-Secret` header; Bright Data uses a shared secret in query param).
2. **Fetch results** -- Call Apify Dataset API (`GET /v2/datasets/{datasetId}/items`) or parse Bright Data response body.
3. **Validate** -- Check each record against the JSON schema (see [gtm-schemas-and-taxonomies.md](./gtm-schemas-and-taxonomies.md)). Drop records missing required fields.
4. **Transform** -- Normalize field names from actor-specific output to our schema. Prefix review IDs. Parse dates to ISO 8601. Extract tech stack keywords from job descriptions.
5. **Deduplicate** -- Use `INSERT ... ON CONFLICT DO NOTHING` to skip existing records.
6. **Insert** -- Batch insert into Supabase using the service_role key (bypasses RLS).
7. **Log** -- Write ingestion metrics to a `gtm_pipeline_runs` log table (or console logs captured by Vercel).

**Environment variables required:**

| Variable | Purpose |
|----------|---------|
| `APIFY_WEBHOOK_SECRET` | Verify incoming Apify webhooks |
| `APIFY_API_TOKEN` | Fetch actor run datasets |
| `BRIGHT_DATA_API_TOKEN` | Authenticate Bright Data API calls |
| `BRIGHT_DATA_WEBHOOK_SECRET` | Verify Bright Data callbacks |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Insert data bypassing RLS |

### Data Quality Checks at Ingestion Boundary

Every record passes these checks before insertion:

| Check | Rule | Action on Failure |
|-------|------|-------------------|
| **Required fields present** | `source_platform`, `review_id_external`, `rating`/`overall_rating`, `review_text`/`job_title` | Drop record, increment `skipped_count` |
| **Rating in range** | 1-5 (app store), 0.0-5.0 (B2B) | Drop record |
| **Review text not empty** | `review_text.trim().length > 0` | Drop record (rating-only reviews have no signal value) |
| **Date is valid** | Parseable ISO 8601, not in the future, not before 2020 | Set to `null` if invalid (don't drop) |
| **Text length cap** | `review_text.length <= 10000` | Truncate to 10,000 chars |
| **review_id_external format** | Non-empty string | Drop record |

### Pipeline Monitoring and Alerting

**Metrics tracked per pipeline run:**

| Metric | Purpose |
|--------|---------|
| `total_fetched` | Raw records from scraper |
| `passed_validation` | Records that passed schema checks |
| `skipped_duplicate` | Records rejected by UNIQUE constraint |
| `skipped_invalid` | Records rejected by validation |
| `inserted` | Records successfully written to Supabase |
| `duration_ms` | Total processing time |
| `error_message` | If the run failed, why |

**Alert triggers (email to lance@labnolabs.com):**
- Pipeline has not run in 2x its expected interval (e.g., daily pipeline hasn't run in 48 hours)
- Success rate drops below 50% (inserted / total_fetched)
- Actor run returns 0 results for an app/company that normally returns 50+
- Supabase insert fails after all retries

**Implementation:** Start with Vercel function console logs + a daily Supabase query that checks for missing runs. Graduate to a proper monitoring stack (Upstash/Inngest) when pipeline count exceeds 10.

### Cost Tracking Per Pipeline

Add a `pipeline_cost_estimate` column to run logs:

```sql
-- Rough cost tracking (append to pipeline run log)
cost_estimate = records_fetched * cost_per_record_for_this_actor
```

Roll up monthly in a Supabase view:

```sql
SELECT
  pipeline_name,
  DATE_TRUNC('month', run_at) AS month,
  SUM(cost_estimate) AS monthly_cost,
  SUM(inserted) AS monthly_records
FROM gtm_pipeline_runs
GROUP BY pipeline_name, DATE_TRUNC('month', run_at);
```

### Backfill Capability

When a new target app or company is added to the watch list:

1. Run the relevant actor manually via Apify Console or API with `maxReviews` set high (e.g., 5,000) and no date filter.
2. The same Vercel ingest function processes the backfill -- deduplication ensures no conflicts with existing data.
3. For job postings, Bright Data supports `time_range: "past_month"` for initial backfill.
4. Tag backfill runs with `is_backfill: true` in the pipeline run log so they don't skew monitoring metrics.

### Data Lineage Tracking

Every record carries implicit lineage through:

- `scraped_at` timestamp (when the record entered our system)
- `source_platform` enum (which external source)
- `review_id_external` / `posting_url` (link back to the original record)

For explicit lineage, the Vercel ingest function logs the Apify `runId` and `datasetId` with each batch insert. This allows tracing any record back to the exact scraper run that produced it.

---

## 6. Scheduling & Orchestration

### Cron Schedule

| Pipeline | Actor / Tool | Frequency | Cron Expression | Time (UTC) | Notes |
|----------|-------------|-----------|-----------------|------------|-------|
| Apple App Store Reviews | EasyAPI | Daily | `0 4 * * *` | 04:00 | One run per target app, batched |
| Google Play Reviews | NeatRat | Daily | `0 4 * * *` | 04:00 | Same window as Apple |
| G2 + Capterra Reviews | Focused Vanguard | Weekly | `0 2 * * 0` | Sun 02:00 | Low-traffic window for better anti-bot success |
| LinkedIn Jobs | Bright Data | Daily | `0 6 * * *` | 06:00 | Catches overnight US postings |
| Indeed Jobs | Apify / Bright Data | Daily | `0 7 * * *` | 07:00 | Staggered from LinkedIn |

### Orchestration Method

**Phase 1 (current):** Apify's built-in scheduler handles actor cron schedules. Bright Data has its own scheduler. Webhooks connect to Vercel functions. No external orchestrator needed.

**Phase 2 (when complexity grows):** Migrate to Inngest or Trigger.dev for:
- Cross-pipeline dependency management
- Fan-out/fan-in patterns (e.g., "after all app store scrapes finish, trigger a signal parsing batch")
- Retry with circuit breaker patterns
- Visual run history dashboard

### Dependencies Between Pipelines

```
App Store Reviews ──────────┐
                             ├──► Layer 2: Signal Parsing (runs after any Layer 1 pipeline completes)
B2B Reviews ────────────────┤
                             │
Job Postings ───────────────┤
                             ├──► Layer 2: Hiring Signal Detection (runs after job posting ingestion)
                             │
Layer 2 complete ───────────┴──► Layer 3: Scoring & Enrichment
```

Layer 1 pipelines are independent of each other and can run in parallel. Layer 2 is triggered after each Layer 1 pipeline completes (via a second webhook from the Vercel ingest function or a Supabase trigger).

### Failure Recovery Procedures

| Scenario | Recovery |
|----------|----------|
| **Single actor run fails** | Apify auto-retries once. If that fails, the webhook sends `status: FAILED`. The Vercel function logs it. Next scheduled run picks up where it left off (dedup handles overlap). |
| **Apify platform outage** | Pipelines queue and run when platform recovers. Monitor Apify status page. If outage exceeds 24 hours, trigger manual runs via API. |
| **Vercel function timeout** | Vercel functions have a 60s timeout (Hobby) or 300s (Pro). If dataset is too large, paginate: fetch 1,000 records at a time. |
| **Supabase down** | Vercel function retries 3x with backoff. If all fail, raw data persists in Apify dataset (7-day retention). Run manual recovery when Supabase returns. |
| **Bright Data quota exceeded** | Scraping stops. Alerts fire. Increase quota or wait for monthly reset. |
| **All pipelines fail for 48+ hours** | Manual investigation required. Check: (1) Apify account status, (2) Vercel deployment health, (3) Supabase project status, (4) webhook endpoint accessibility. |

---

## 7. Estimated Monthly Costs

### By Source (Baseline Volume)

| Source | Volume | Unit Cost | Monthly Cost | Notes |
|--------|--------|-----------|-------------|-------|
| Apple App Store reviews | 5,000 | $0.10/1K | $0.50 | Commodity pricing |
| Google Play reviews | 5,000 | $0.10/1K | $0.50 | Commodity pricing |
| G2/Capterra reviews (with 3x retry) | 6,000 attempts | $6.49/1K | $39.00 | DataDome makes G2 expensive |
| LinkedIn job postings | 1,000 | $0.001/record | $1.00 | Bright Data |
| Indeed job postings | 500 | $0.005/record | $2.50 | |
| LinkedIn profile enrichment (ad hoc) | 200 | $0.009/profile | $1.80 | Scrapingdog, as needed |
| Apify platform | -- | -- | $0 - $49 | Free tier may suffice initially |
| **TOTAL** | | | **$45.30 - $94.30** | |

### By Volume Tier

| Tier | Description | Monthly Cost |
|------|-------------|-------------|
| **Starter** | 10K app reviews, 1K B2B reviews, 500 job postings | $17 - $45 |
| **Growth** | 25K app reviews, 3K B2B reviews, 2K job postings | $55 - $120 |
| **Scale** | 50K app reviews, 5K B2B reviews, 5K job postings | $110 - $250 |

The dominant cost driver at every tier is G2/Capterra scraping due to DataDome's low success rate requiring retry budget. App store and job board scraping remain negligible.

### Vercel and Supabase Costs (Infrastructure)

| Service | Tier | Monthly Cost | Included |
|---------|------|-------------|----------|
| Vercel | Pro | $20 | 1M function invocations, 300s timeout |
| Supabase | Free | $0 | 500MB database, 50K auth users |
| Supabase | Pro (when needed) | $25 | 8GB database, daily backups |
| **Infrastructure subtotal** | | **$20 - $45** | |

### Total Monthly Budget

| Scenario | Scraping | Infrastructure | Total |
|----------|----------|---------------|-------|
| **Minimum viable** | $17 | $20 | **$37/month** |
| **Expected operating** | $45 | $20 | **$65/month** |
| **Worst case (heavy retries)** | $94 | $45 | **$139/month** |

---

## 8. Runbook

### How to Add a New Target App

1. **Identify the app:**
   - Find the Apple App Store ID (e.g., `id1141657108` from the app's App Store URL)
   - Find the Google Play package name (e.g., `com.salesforce.chatter` from the Play Store URL)

2. **Add to Apify actor schedule:**
   - Go to Apify Console → Schedules
   - Find the `gtm-apple-reviews-daily` schedule
   - Add a new input configuration with the app's search term or ID
   - Repeat for `gtm-google-play-reviews-daily`

3. **Run initial backfill:**
   ```bash
   # Via Apify CLI
   apify call easyapi/app-store-reviews-scraper \
     --input='{"search":"MyNewApp","country":"us","maxReviews":5000}'

   apify call neatrat/google-play-store-reviews-scraper \
     --input='{"appUrl":"https://play.google.com/store/apps/details?id=com.newapp.package","maxReviews":5000}'
   ```

4. **Verify ingestion:**
   ```sql
   SELECT COUNT(*), MIN(review_date), MAX(review_date)
   FROM gtm_mobile_reviews
   WHERE app_name ILIKE '%MyNewApp%';
   ```

### How to Add a New Target Company (B2B Reviews)

1. **Find the company's software product page on G2:**
   - URL format: `https://www.g2.com/products/[product-slug]/reviews`

2. **Add the company's domain to the multi-platform scraper input:**
   - Edit the Apify schedule for `gtm-b2b-reviews-weekly`
   - Add the domain to the `domains` array

3. **Run backfill:**
   ```bash
   apify call focused_vanguard/multi-platform-reviews-scraper \
     --input='{"domains":["newcompany.com"],"maxReviewsPerPlatform":500}'
   ```

4. **Verify:**
   ```sql
   SELECT source_platform, COUNT(*), AVG(overall_rating)
   FROM gtm_b2b_reviews
   WHERE software_name ILIKE '%NewCompany%'
   GROUP BY source_platform;
   ```

### How to Add a New Target Company (Job Postings)

1. **Add keyword or company filter to Bright Data configuration:**
   - Update the Bright Data collector with the company name filter
   - Or add a new keyword query to the daily schedule

2. **Backfill last 30 days:**
   - Set `time_range: "past_month"` in the Bright Data request
   - Run manually via API

3. **Verify:**
   ```sql
   SELECT COUNT(*), array_agg(DISTINCT job_title)
   FROM gtm_job_postings
   WHERE company_name ILIKE '%NewCompany%';
   ```

### How to Investigate Pipeline Failures

**Step 1: Check what ran recently**

```sql
-- If using a pipeline_runs log table:
SELECT pipeline_name, status, error_message, total_fetched, inserted, run_at
FROM gtm_pipeline_runs
ORDER BY run_at DESC
LIMIT 20;
```

**Step 2: Check Apify Console**

- Go to https://console.apify.com/actors/runs
- Filter by actor name
- Look for `FAILED` or `TIMED_OUT` status
- Check run log for error details

**Step 3: Check Vercel function logs**

- Go to https://vercel.com/[team]/labno-labs-center/logs
- Filter by `/api/gtm/ingest`
- Look for 500 errors or timeout entries

**Step 4: Check Supabase**

```sql
-- Check for recent inserts (are records landing?)
SELECT 'mobile_reviews' AS table_name, COUNT(*) AS last_24h
FROM gtm_mobile_reviews WHERE scraped_at > now() - interval '24 hours'
UNION ALL
SELECT 'b2b_reviews', COUNT(*)
FROM gtm_b2b_reviews WHERE scraped_at > now() - interval '24 hours'
UNION ALL
SELECT 'job_postings', COUNT(*)
FROM gtm_job_postings WHERE scraped_at > now() - interval '24 hours';
```

**Step 5: Common fixes**

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 0 records inserted, no errors | Actor returned empty dataset | Check if target app/URL changed. Re-test actor manually. |
| Webhook never fired | Apify schedule disabled or webhook URL changed | Check Apify Console → Webhooks. Verify Vercel deployment URL. |
| 403/429 from Apify | Account limit or actor rate limit | Check Apify billing. Reduce concurrency. |
| Supabase connection refused | Supabase project paused (free tier inactivity) | Wake project from Supabase dashboard. |
| All G2 records skipped | DataDome blocking 100% of requests | Wait 24-48 hours, retry. Consider switching to ScrapePilot actor. |

### How to Run a Manual Backfill

**When to backfill:**
- New target app/company added
- Pipeline was down for multiple days
- Schema change requires re-ingesting historical data

**Procedure:**

1. **Set backfill parameters:** Increase `maxReviews` to capture the full history (up to 5,000 per app). For job postings, set `time_range: "past_month"`.

2. **Run via Apify CLI or Console:**
   ```bash
   # Example: backfill Salesforce Apple reviews
   apify call easyapi/app-store-reviews-scraper \
     --input='{"search":"Salesforce","country":"us","maxReviews":5000}' \
     --wait-for-finish=300
   ```

3. **Trigger ingestion manually** (if webhook doesn't fire):
   ```bash
   # Fetch the dataset ID from the run output, then POST to ingest endpoint
   curl -X POST https://labno-labs-center.vercel.app/api/gtm/ingest/mobile-reviews \
     -H "Authorization: Bearer $APIFY_WEBHOOK_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"datasetId":"DATASET_ID_HERE","isBackfill":true}'
   ```

4. **Monitor:** Watch Vercel logs for the ingest function. Check `inserted` count matches expectations.

5. **Verify no duplicates:**
   ```sql
   SELECT review_id_external, COUNT(*)
   FROM gtm_mobile_reviews
   GROUP BY review_id_external
   HAVING COUNT(*) > 1;
   -- Should return 0 rows (UNIQUE constraint prevents this, but verify)
   ```

### How to Adjust Scraping Frequency

1. **Apify schedules:**
   - Go to Apify Console → Schedules
   - Edit the cron expression for the relevant schedule
   - Common adjustments: `0 4 * * *` (daily) → `0 4 * * 1,4` (Mon/Thu) or `0 */12 * * *` (twice daily)

2. **Bright Data schedules:**
   - Update the collector schedule in Bright Data dashboard
   - Or modify the cron trigger that calls the Bright Data API

3. **Update this document** with the new schedule so it stays accurate.

4. **Monitor costs** after the change -- doubling frequency roughly doubles cost for that pipeline.

---

## Appendix: File References

| Document | Path | What It Contains |
|----------|------|------------------|
| Research: Apify & G2 | `docs/gtm-research-apify-and-g2.md` | Actor comparison tables, G2 DataDome analysis, LinkedIn legal landscape, cost benchmarks |
| Schemas & Taxonomies | `docs/gtm-schemas-and-taxonomies.md` | JSON schemas for all 3 ingestion streams, pain point taxonomies, scoring formulas |
| Database Migration | `supabase/migrations/20260402_gtm_signal_extraction_tables.sql` | CREATE TABLE statements for all 11 GTM tables across 5 layers |
| This Document | `docs/gtm-layer1-architecture.md` | Layer 1 architecture, ops runbook, cost tracking |
