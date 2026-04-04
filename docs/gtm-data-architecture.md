# GTM Signal Extraction System -- Data Architecture

> Single reference document for the Labno Labs GTM data layer.
> Source migration: `supabase/migrations/20260402_gtm_signal_extraction_tables.sql`
> Last updated: 2026-04-02

---

## 1. Entity Relationship Diagram

```
 LAYER 1: Raw Data Ingestion
 ============================

 +-------------------------+   +-------------------------+   +-------------------------+
 | gtm_mobile_reviews      |   | gtm_b2b_reviews         |   | gtm_job_postings        |
 |-------------------------|   |-------------------------|   |-------------------------|
 | id (PK, UUID)           |   | id (PK, UUID)           |   | id (PK, UUID)           |
 | source_platform         |   | source_platform         |   | source_platform         |
 | app_name                |   | software_name           |   | company_name            |
 | app_id                  |   | software_category       |   | job_title               |
 | review_id_external (UQ) |   | review_id_external (UQ) |   | job_description         |
 | rating                  |   | reviewer_company_name   |   | required_tech_stack[]   |
 | review_text             |   | reviewer_industry       |   | preferred_tech_stack[]  |
 | review_date             |   | overall_rating          |   | posting_date            |
 | scraped_at              |   | pros_text / cons_text   |   | is_active               |
 +----------+--------------+   | competitive_comparisons |   | scraped_at              |
            |                  | scraped_at              |   +----------+--------------+
            |                  +----------+--------------+              |
            |                             |                             |
            +------------+----------------+                             |
                         |                                              |
                         v                                              v
 LAYER 2: Signal Parsing                                                |
 ========================                                               |
                                                                        |
 +-------------------------------+          +---------------------------+-----+
 | gtm_parsed_signals            |          | gtm_hiring_signals              |
 |-------------------------------|          |---------------------------------|
 | id (PK, UUID)                 |          | id (PK, UUID)                   |
 | source_table (TEXT)     ------+-- refs   | company_name                    |
 | source_id (UUID)        ------+-- L1 ids | signal_type                     |
 | company_name                  |          | signal_details (JSONB)          |
 | pain_point                    |          | related_job_posting_ids (UUID[])|
 | pain_point_category           |          | inferred_debt_type              |
 | severity                      |          | confidence                      |
 | labno_service_match           |          | detected_at                     |
 | confidence_score              |          +---------------------------------+
 | parsed_at                     |
 +-------------------------------+
            |
            v
 LAYER 3: Scoring & Enrichment
 ==============================

 +-------------------------------+   +-------------------------------+   +---------------------------+
 | gtm_intent_scores             |   | gtm_company_profiles          |   | gtm_competitive_intel     |
 |-------------------------------|   |-------------------------------|   |---------------------------|
 | id (PK, UUID)                 |   | id (PK, UUID)                 |   | id (PK, UUID)             |
 | company_name (UQ)             |   | company_name (UQ)             |   | competitor_name            |
 | recency/frequency/depth/      |   | domain                        |   | category                  |
 |   seniority_score             |   | industry                      |   | weakness_signals (JSONB)  |
 | composite_score               |   | employee_count                |   | switching_signals_count   |
 | score_tier                    |   | revenue_estimate              |   | avg_competitor_rating     |
 | signal_count                  |   | tech_stack_known[]            |   | battlecard (JSONB)        |
 | top_signals (JSONB)           |   | enrichment_source             |   | displacement_opportunities|
 | last_signal_at                |   | icp_match_score               |   | last_updated              |
 | scored_at                     |   | dynamic_icp_tags[]            |   +---------------------------+
 +--------+----------------------+   | recent_executive_hires (JSONB)|
          |                          | enriched_at                   |
          |                          +--------+----------------------+
          |                                   |
          |      +----------------------------+
          |      |                            |
          v      v                            v
 LAYER 4: Routing & Outreach
 ============================

 +-------------------------------+   +-------------------------------+
 | gtm_pipeline_stages           |   | gtm_outreach_messages         |
 |-------------------------------|   |-------------------------------|
 | id (PK, UUID)                 |   | id (PK, UUID)                 |
 | company_profile_id (FK) ------+-->| company_profile_id (FK) ------+--> gtm_company_profiles
 | current_stage                 |   | intent_score_id (FK)  --------+--> gtm_intent_scores
 | assigned_to                   |   | channel                       |
 | assigned_squad                |   | template_type                 |
 | stage_entered_at              |   | subject_line                  |
 | first_signal_at               |   | message_body                  |
 | first_contact_at              |   | personalization_data (JSONB)  |
 | deal_value                    |   | tone                          |
 | loss_reason                   |   | status                        |
 | notes                         |   | sent_at / opened_at / ...     |
 +--------+----------------------+   +-------------------------------+
          |
          v
 LAYER 5: Autonomous Execution
 ==============================

 +-------------------------------+
 | gtm_agent_actions             |
 |-------------------------------|
 | id (PK, UUID)                 |
 | action_type                   |
 | target_company                |
 | target_contact                |
 | action_details (JSONB)        |
 | trigger_signal                |
 | outcome                       |
 | requires_approval             |
 | approved_by                   |
 | executed_at                   |
 +-------------------------------+


 EXISTING TABLES (cross-references)
 ====================================

 +-------------------------+     +-------------------------+     +-----------------------+
 | internal_projects       |     | global_tasks            |     | labno_consulting_leads|
 |-------------------------|     |-------------------------|     |-----------------------|
 | id (PK, UUID)           |<----| project_id (FK)         |     | id (PK, UUID)         |
 | name                    |     | title                   |     | company_name          |
 | status                  |     | column_id               |     | email                 |
 | total/completed_tasks   |     | assigned_to             |     | app_interest          |
 | due_date                |     | is_blocked              |     | lifetime_value        |
 | complexity              |     +-------------------------+     +-----------------------+
 +-------------------------+                                           ^
                                                                       |
                                  gtm_pipeline_stages ----- converts to (manual/agent)

 agent_runs (referenced in api/agent/run.js)
 +-------------------------+
 | agent_runs              |
 |-------------------------|
 | task_id                 |   <--- gtm_agent_actions maps conceptually
 | task_title              |        to this existing agent execution log
 | project_name            |
 +-------------------------+
```

### Foreign Key Summary

| From Table            | Column              | To Table              | Column | On Delete  |
|-----------------------|---------------------|-----------------------|--------|------------|
| gtm_pipeline_stages   | company_profile_id  | gtm_company_profiles  | id     | CASCADE    |
| gtm_outreach_messages | company_profile_id  | gtm_company_profiles  | id     | SET NULL   |
| gtm_outreach_messages | intent_score_id     | gtm_intent_scores     | id     | SET NULL   |

### Logical References (no FK constraint, joined by company_name)

| From Table            | Column         | To Table               | Column       |
|-----------------------|----------------|------------------------|--------------|
| gtm_parsed_signals    | source_table + source_id | gtm_mobile_reviews / gtm_b2b_reviews / gtm_job_postings | id |
| gtm_parsed_signals    | company_name   | gtm_company_profiles   | company_name |
| gtm_hiring_signals    | company_name   | gtm_company_profiles   | company_name |
| gtm_intent_scores     | company_name   | gtm_company_profiles   | company_name |
| gtm_hiring_signals    | related_job_posting_ids | gtm_job_postings | id        |

---

## 2. Table Reference

### 2.1 gtm_mobile_reviews

**Purpose:** Raw app store reviews scraped from Apple App Store and Google Play.

| Column             | Type         | Constraints / Default                              |
|--------------------|--------------|-----------------------------------------------------|
| id                 | UUID         | PK, DEFAULT gen_random_uuid()                       |
| source_platform    | TEXT         | NOT NULL, CHECK IN ('apple_app_store','google_play') |
| app_name           | TEXT         | NOT NULL                                            |
| app_id             | TEXT         | NOT NULL                                            |
| app_version        | TEXT         |                                                     |
| review_id_external | TEXT         | UNIQUE NOT NULL                                     |
| reviewer_name      | TEXT         |                                                     |
| rating             | INTEGER      | NOT NULL, CHECK 1-5                                 |
| review_text        | TEXT         |                                                     |
| review_date        | TIMESTAMPTZ  |                                                     |
| device_type        | TEXT         |                                                     |
| geo_location       | TEXT         |                                                     |
| helpful_count      | INTEGER      | DEFAULT 0                                           |
| developer_response | TEXT         |                                                     |
| scraped_at         | TIMESTAMPTZ  | DEFAULT now()                                       |

**Indexes:**
- `idx_gtm_mobile_reviews_app_name` -- (app_name)
- `idx_gtm_mobile_reviews_source` -- (source_platform)
- `idx_gtm_mobile_reviews_rating` -- (rating)
- `idx_gtm_mobile_reviews_review_date` -- (review_date DESC)
- `idx_gtm_mobile_reviews_scraped_at` -- (scraped_at DESC)

**RLS Policies:**
- SELECT: `@labnolabs.com` or `@movement-solutions.com` emails
- INSERT/UPDATE/DELETE: `@labnolabs.com` only
- ALL: `service_role`

**Example Row:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "source_platform": "apple_app_store",
  "app_name": "Salesforce Mobile",
  "app_id": "com.salesforce.chatter",
  "app_version": "245.012",
  "review_id_external": "appstore-12345678",
  "reviewer_name": "FrustratedAdmin",
  "rating": 2,
  "review_text": "Bulk data import keeps timing out after 500 records. We need to import 10k contacts weekly and this is unusable.",
  "review_date": "2026-03-28T14:30:00Z",
  "device_type": "iPhone 16",
  "geo_location": "US",
  "helpful_count": 12,
  "developer_response": null,
  "scraped_at": "2026-03-29T02:00:00Z"
}
```

**Common Queries:**
```sql
-- 1. Low-rated reviews with pain signal keywords
SELECT * FROM gtm_mobile_reviews
WHERE rating <= 2
  AND review_text ILIKE ANY(ARRAY['%api%', '%bulk%', '%timeout%', '%broken%'])
ORDER BY review_date DESC
LIMIT 50;

-- 2. Review volume by app over the last 30 days
SELECT app_name, COUNT(*) AS review_count, AVG(rating) AS avg_rating
FROM gtm_mobile_reviews
WHERE review_date > now() - INTERVAL '30 days'
GROUP BY app_name
ORDER BY review_count DESC;

-- 3. Reviews with no developer response (neglected users)
SELECT app_name, COUNT(*) AS unanswered
FROM gtm_mobile_reviews
WHERE developer_response IS NULL AND rating <= 2
GROUP BY app_name
ORDER BY unanswered DESC;

-- 4. Most recent scrape timestamp per platform
SELECT source_platform, MAX(scraped_at) AS last_scrape
FROM gtm_mobile_reviews
GROUP BY source_platform;
```

---

### 2.2 gtm_b2b_reviews

**Purpose:** B2B software reviews from G2, Capterra, and TrustRadius with reviewer company info.

| Column                   | Type      | Constraints / Default                          |
|--------------------------|-----------|------------------------------------------------|
| id                       | UUID      | PK, DEFAULT gen_random_uuid()                  |
| source_platform          | TEXT      | NOT NULL, CHECK IN ('g2','capterra','trustradius') |
| software_name            | TEXT      | NOT NULL                                       |
| software_category        | TEXT      |                                                |
| review_id_external       | TEXT      | UNIQUE NOT NULL                                |
| reviewer_name            | TEXT      |                                                |
| reviewer_job_title       | TEXT      |                                                |
| reviewer_company_name    | TEXT      |                                                |
| reviewer_company_size    | TEXT      |                                                |
| reviewer_industry        | TEXT      |                                                |
| overall_rating           | NUMERIC   |                                                |
| ease_of_use_rating       | NUMERIC   |                                                |
| support_quality_rating   | NUMERIC   |                                                |
| implementation_rating    | NUMERIC   |                                                |
| pros_text                | TEXT      |                                                |
| cons_text                | TEXT      |                                                |
| review_text              | TEXT      |                                                |
| review_date              | TIMESTAMPTZ |                                              |
| alternatives_considered  | TEXT[]    |                                                |
| competitive_comparisons  | JSONB     |                                                |
| scraped_at               | TIMESTAMPTZ | DEFAULT now()                                |

**Indexes:**
- `idx_gtm_b2b_reviews_software` -- (software_name)
- `idx_gtm_b2b_reviews_source` -- (source_platform)
- `idx_gtm_b2b_reviews_company` -- (reviewer_company_name)
- `idx_gtm_b2b_reviews_industry` -- (reviewer_industry)
- `idx_gtm_b2b_reviews_review_date` -- (review_date DESC)
- `idx_gtm_b2b_reviews_scraped_at` -- (scraped_at DESC)

**RLS Policies:** Same pattern as all GTM tables (see RLS section below).

**Example Row:**
```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "source_platform": "g2",
  "software_name": "HubSpot CRM",
  "software_category": "CRM",
  "review_id_external": "g2-rev-9876543",
  "reviewer_name": "Sarah K.",
  "reviewer_job_title": "VP of Operations",
  "reviewer_company_name": "MedTech Dynamics",
  "reviewer_company_size": "201-500",
  "reviewer_industry": "Healthcare",
  "overall_rating": 3.0,
  "ease_of_use_rating": 4.0,
  "support_quality_rating": 2.0,
  "implementation_rating": 2.5,
  "pros_text": "Good UI, easy for reps to adopt.",
  "cons_text": "API rate limits kill our integrations. Support takes 3+ days to respond. Custom reporting is basically non-existent.",
  "review_text": "We spent 6 months implementing and the API limits are destroying our automation workflows...",
  "review_date": "2026-03-15T10:00:00Z",
  "alternatives_considered": ["Salesforce", "Pipedrive"],
  "competitive_comparisons": {"salesforce": "more powerful but expensive", "pipedrive": "simpler but lacking"},
  "scraped_at": "2026-03-16T06:00:00Z"
}
```

**Common Queries:**
```sql
-- 1. Companies complaining about API limits or integration failures
SELECT reviewer_company_name, reviewer_industry, cons_text
FROM gtm_b2b_reviews
WHERE cons_text ILIKE ANY(ARRAY['%api%limit%', '%integration%fail%', '%rate limit%'])
  AND overall_rating <= 3
ORDER BY review_date DESC;

-- 2. Competitor weakness analysis
SELECT software_name, COUNT(*) AS negative_reviews, AVG(overall_rating) AS avg_rating
FROM gtm_b2b_reviews
WHERE overall_rating <= 2
GROUP BY software_name
ORDER BY negative_reviews DESC;

-- 3. Reviews from healthcare companies (ICP match)
SELECT * FROM gtm_b2b_reviews
WHERE reviewer_industry ILIKE '%health%'
  AND overall_rating <= 3
ORDER BY review_date DESC;

-- 4. Alternatives being considered (switching intent)
SELECT software_name, UNNEST(alternatives_considered) AS alternative, COUNT(*)
FROM gtm_b2b_reviews
WHERE alternatives_considered IS NOT NULL
GROUP BY software_name, alternative
ORDER BY COUNT(*) DESC;
```

---

### 2.3 gtm_job_postings

**Purpose:** Job postings scraped from LinkedIn and Indeed, used to detect hiring signals and tech stack shifts.

| Column               | Type         | Constraints / Default                        |
|----------------------|--------------|----------------------------------------------|
| id                   | UUID         | PK, DEFAULT gen_random_uuid()                |
| source_platform      | TEXT         | NOT NULL, CHECK IN ('linkedin','indeed')     |
| company_name         | TEXT         | NOT NULL                                     |
| job_title            | TEXT         | NOT NULL                                     |
| job_description      | TEXT         |                                              |
| location             | TEXT         |                                              |
| seniority_level      | TEXT         |                                              |
| required_tech_stack  | TEXT[]       |                                              |
| preferred_tech_stack | TEXT[]       |                                              |
| posting_date         | TIMESTAMPTZ  |                                              |
| posting_url          | TEXT         |                                              |
| is_active            | BOOLEAN      | DEFAULT true                                 |
| scraped_at           | TIMESTAMPTZ  | DEFAULT now()                                |

**Indexes:**
- `idx_gtm_job_postings_company` -- (company_name)
- `idx_gtm_job_postings_source` -- (source_platform)
- `idx_gtm_job_postings_title` -- (job_title)
- `idx_gtm_job_postings_active` -- (is_active) WHERE is_active = true (partial)
- `idx_gtm_job_postings_posting_date` -- (posting_date DESC)
- `idx_gtm_job_postings_scraped_at` -- (scraped_at DESC)
- `idx_gtm_job_postings_tech_stack` -- GIN (required_tech_stack)

**RLS Policies:** Standard GTM pattern.

**Example Row:**
```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "source_platform": "linkedin",
  "company_name": "MedTech Dynamics",
  "job_title": "Senior Data Engineer",
  "job_description": "Build and maintain data pipelines migrating from legacy Oracle to cloud...",
  "location": "Austin, TX (Hybrid)",
  "seniority_level": "Senior",
  "required_tech_stack": ["python", "airflow", "snowflake", "dbt"],
  "preferred_tech_stack": ["terraform", "kubernetes"],
  "posting_date": "2026-03-20T00:00:00Z",
  "posting_url": "https://linkedin.com/jobs/view/123456",
  "is_active": true,
  "scraped_at": "2026-03-21T04:00:00Z"
}
```

**Common Queries:**
```sql
-- 1. Companies hiring for AI/ML roles (ai_readiness signal)
SELECT company_name, job_title, required_tech_stack
FROM gtm_job_postings
WHERE is_active = true
  AND (job_title ILIKE '%ai%' OR job_title ILIKE '%machine learning%'
       OR required_tech_stack && ARRAY['tensorflow','pytorch','openai','langchain'])
ORDER BY posting_date DESC;

-- 2. Hiring spikes: companies with 5+ active postings
SELECT company_name, COUNT(*) AS open_roles
FROM gtm_job_postings
WHERE is_active = true
GROUP BY company_name
HAVING COUNT(*) >= 5
ORDER BY open_roles DESC;

-- 3. Legacy migration signals
SELECT company_name, job_title, job_description
FROM gtm_job_postings
WHERE job_description ILIKE ANY(ARRAY['%legacy%migration%', '%oracle%to%cloud%', '%mainframe%'])
  AND is_active = true;

-- 4. Tech stack popularity across job postings
SELECT UNNEST(required_tech_stack) AS tech, COUNT(*) AS demand
FROM gtm_job_postings
WHERE is_active = true
GROUP BY tech
ORDER BY demand DESC
LIMIT 20;
```

---

### 2.4 gtm_parsed_signals

**Purpose:** AI-extracted pain points and service opportunities parsed from Layer 1 raw data.

| Column              | Type         | Constraints / Default                                |
|---------------------|--------------|------------------------------------------------------|
| id                  | UUID         | PK, DEFAULT gen_random_uuid()                        |
| source_table        | TEXT         | NOT NULL                                             |
| source_id           | UUID         | NOT NULL                                             |
| company_name        | TEXT         |                                                      |
| pain_point          | TEXT         | NOT NULL                                             |
| pain_point_category | TEXT         | NOT NULL, CHECK IN (12 categories -- see below)      |
| severity            | TEXT         | NOT NULL, CHECK IN ('critical','high','medium','low') |
| proposed_solution   | TEXT         |                                                      |
| labno_service_match | TEXT         |                                                      |
| confidence_score    | NUMERIC      | NOT NULL, CHECK 0-1                                  |
| parsed_at           | TIMESTAMPTZ  | DEFAULT now()                                        |

**Pain Point Categories:**
`api_limit_exhaustion`, `post_sale_chaos`, `bulk_data_failure`, `support_delay`, `manual_data_entry`, `integration_failure`, `reporting_gap`, `frontend_tech_debt`, `ux_debt`, `infrastructure_debt`, `workflow_automation_need`, `ai_readiness`

**Indexes:**
- `idx_gtm_parsed_signals_company` -- (company_name)
- `idx_gtm_parsed_signals_category` -- (pain_point_category)
- `idx_gtm_parsed_signals_severity` -- (severity)
- `idx_gtm_parsed_signals_source` -- (source_table, source_id)
- `idx_gtm_parsed_signals_confidence` -- (confidence_score DESC)
- `idx_gtm_parsed_signals_parsed_at` -- (parsed_at DESC)
- `idx_gtm_parsed_signals_service` -- (labno_service_match)

**RLS Policies:** Standard GTM pattern.

**Example Row:**
```json
{
  "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
  "source_table": "gtm_b2b_reviews",
  "source_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "company_name": "MedTech Dynamics",
  "pain_point": "API rate limits destroying automation workflows, custom reporting non-existent",
  "pain_point_category": "api_limit_exhaustion",
  "severity": "critical",
  "proposed_solution": "Custom API middleware with rate-limit handling and async queue",
  "labno_service_match": "ai_squads",
  "confidence_score": 0.92,
  "parsed_at": "2026-03-16T07:00:00Z"
}
```

**Common Queries:**
```sql
-- 1. Critical pain points by category
SELECT pain_point_category, COUNT(*) AS signal_count
FROM gtm_parsed_signals
WHERE severity = 'critical'
GROUP BY pain_point_category
ORDER BY signal_count DESC;

-- 2. All signals for a specific company
SELECT * FROM gtm_parsed_signals
WHERE company_name = 'MedTech Dynamics'
ORDER BY confidence_score DESC;

-- 3. Signals that match a specific Labno service
SELECT company_name, pain_point, severity, confidence_score
FROM gtm_parsed_signals
WHERE labno_service_match = 'ai_squads'
  AND confidence_score >= 0.8
ORDER BY severity, confidence_score DESC;

-- 4. Trace signal back to source review
SELECT ps.*, br.review_text, br.cons_text
FROM gtm_parsed_signals ps
JOIN gtm_b2b_reviews br ON ps.source_id = br.id
WHERE ps.source_table = 'gtm_b2b_reviews'
  AND ps.severity = 'critical';
```

---

### 2.5 gtm_hiring_signals

**Purpose:** Aggregated hiring patterns inferred from job postings -- spikes, stack shifts, executive turnover.

| Column                  | Type         | Constraints / Default                              |
|-------------------------|--------------|-----------------------------------------------------|
| id                      | UUID         | PK, DEFAULT gen_random_uuid()                       |
| company_name            | TEXT         | NOT NULL                                            |
| signal_type             | TEXT         | NOT NULL, CHECK IN (5 types -- see below)           |
| signal_details          | JSONB        |                                                     |
| related_job_posting_ids | UUID[]       |                                                     |
| inferred_debt_type      | TEXT         | CHECK IN ('infrastructure','workflow','ai_readiness','cloud_migration') |
| confidence              | NUMERIC      | NOT NULL, CHECK 0-1                                 |
| detected_at             | TIMESTAMPTZ  | DEFAULT now()                                       |

**Signal Types:** `hiring_spike`, `new_department`, `executive_turnover`, `tech_stack_shift`, `legacy_migration`

**Indexes:**
- `idx_gtm_hiring_signals_company` -- (company_name)
- `idx_gtm_hiring_signals_type` -- (signal_type)
- `idx_gtm_hiring_signals_debt` -- (inferred_debt_type)
- `idx_gtm_hiring_signals_confidence` -- (confidence DESC)
- `idx_gtm_hiring_signals_detected_at` -- (detected_at DESC)

**RLS Policies:** Standard GTM pattern.

**Example Row:**
```json
{
  "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
  "company_name": "MedTech Dynamics",
  "signal_type": "tech_stack_shift",
  "signal_details": {
    "from": ["oracle", "java", "on-prem"],
    "to": ["snowflake", "python", "aws"],
    "open_roles": 8,
    "departments": ["Engineering", "Data"]
  },
  "related_job_posting_ids": [
    "c3d4e5f6-a7b8-9012-cdef-123456789012"
  ],
  "inferred_debt_type": "cloud_migration",
  "confidence": 0.87,
  "detected_at": "2026-03-22T00:00:00Z"
}
```

**Common Queries:**
```sql
-- 1. Companies undergoing cloud migration
SELECT company_name, signal_details, confidence
FROM gtm_hiring_signals
WHERE inferred_debt_type = 'cloud_migration'
  AND confidence >= 0.7
ORDER BY confidence DESC;

-- 2. Hiring spikes in the last 14 days
SELECT company_name, signal_details->>'open_roles' AS open_roles
FROM gtm_hiring_signals
WHERE signal_type = 'hiring_spike'
  AND detected_at > now() - INTERVAL '14 days'
ORDER BY detected_at DESC;

-- 3. Combined hiring + review signals for a company
SELECT 'hiring' AS source, hs.signal_type AS signal, hs.confidence
FROM gtm_hiring_signals hs WHERE hs.company_name = 'MedTech Dynamics'
UNION ALL
SELECT 'review', ps.pain_point_category, ps.confidence_score
FROM gtm_parsed_signals ps WHERE ps.company_name = 'MedTech Dynamics';
```

---

### 2.6 gtm_intent_scores

**Purpose:** Composite intent score per company, combining recency, frequency, depth, and seniority signals.

| Column          | Type         | Constraints / Default                                   |
|-----------------|--------------|----------------------------------------------------------|
| id              | UUID         | PK, DEFAULT gen_random_uuid()                            |
| company_name    | TEXT         | NOT NULL UNIQUE                                          |
| recency_score   | NUMERIC      | DEFAULT 0                                                |
| frequency_score | NUMERIC      | DEFAULT 0                                                |
| depth_score     | NUMERIC      | DEFAULT 0                                                |
| seniority_score | NUMERIC      | DEFAULT 0                                                |
| composite_score | NUMERIC      | DEFAULT 0                                                |
| score_tier      | TEXT         | CHECK IN ('immediate','nurture','watch','archive')       |
| signal_count    | INTEGER      | DEFAULT 0                                                |
| top_signals     | JSONB        |                                                          |
| last_signal_at  | TIMESTAMPTZ  |                                                          |
| scored_at       | TIMESTAMPTZ  | DEFAULT now()                                            |

**Indexes:**
- `idx_gtm_intent_scores_company` -- (company_name)
- `idx_gtm_intent_scores_composite` -- (composite_score DESC)
- `idx_gtm_intent_scores_tier` -- (score_tier)
- `idx_gtm_intent_scores_scored_at` -- (scored_at DESC)
- `idx_gtm_intent_scores_last_signal` -- (last_signal_at DESC)

**RLS Policies:** Standard GTM pattern.

**Example Row:**
```json
{
  "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
  "company_name": "MedTech Dynamics",
  "recency_score": 95,
  "frequency_score": 80,
  "depth_score": 85,
  "seniority_score": 70,
  "composite_score": 82.5,
  "score_tier": "immediate",
  "signal_count": 7,
  "top_signals": [
    {"type": "api_limit_exhaustion", "severity": "critical", "source": "g2_review"},
    {"type": "tech_stack_shift", "debt": "cloud_migration", "source": "hiring"}
  ],
  "last_signal_at": "2026-03-28T14:30:00Z",
  "scored_at": "2026-03-29T06:00:00Z"
}
```

**Common Queries:**
```sql
-- 1. Top 20 highest-intent companies
SELECT company_name, composite_score, score_tier, signal_count
FROM gtm_intent_scores
ORDER BY composite_score DESC
LIMIT 20;

-- 2. Immediate-tier accounts not yet contacted
SELECT is.company_name, is.composite_score
FROM gtm_intent_scores is
LEFT JOIN gtm_pipeline_stages ps
  ON is.company_name = (SELECT cp.company_name FROM gtm_company_profiles cp WHERE cp.id = ps.company_profile_id)
WHERE is.score_tier = 'immediate'
  AND ps.id IS NULL;

-- 3. Score distribution by tier
SELECT score_tier, COUNT(*), AVG(composite_score)
FROM gtm_intent_scores
GROUP BY score_tier
ORDER BY AVG(composite_score) DESC;

-- 4. Stale scores (not refreshed in 7+ days)
SELECT company_name, scored_at, composite_score
FROM gtm_intent_scores
WHERE scored_at < now() - INTERVAL '7 days'
ORDER BY composite_score DESC;
```

---

### 2.7 gtm_company_profiles

**Purpose:** Enriched company profiles aggregating all known data about a prospect.

| Column                  | Type         | Constraints / Default                                 |
|-------------------------|--------------|-------------------------------------------------------|
| id                      | UUID         | PK, DEFAULT gen_random_uuid()                         |
| company_name            | TEXT         | NOT NULL UNIQUE                                       |
| domain                  | TEXT         |                                                       |
| industry                | TEXT         |                                                       |
| employee_count          | INTEGER      |                                                       |
| revenue_estimate        | TEXT         |                                                       |
| location                | TEXT         |                                                       |
| tech_stack_known        | TEXT[]       |                                                       |
| enrichment_source       | TEXT         | CHECK IN ('apollo','clearbit','clay','manual')        |
| enrichment_confidence   | NUMERIC      | CHECK 0-1                                             |
| icp_match_score         | NUMERIC      | DEFAULT 0                                             |
| dynamic_icp_tags        | TEXT[]       |                                                       |
| recent_executive_hires  | JSONB        |                                                       |
| enriched_at             | TIMESTAMPTZ  | DEFAULT now()                                         |

**Indexes:**
- `idx_gtm_company_profiles_name` -- (company_name)
- `idx_gtm_company_profiles_domain` -- (domain)
- `idx_gtm_company_profiles_industry` -- (industry)
- `idx_gtm_company_profiles_icp` -- (icp_match_score DESC)
- `idx_gtm_company_profiles_enriched_at` -- (enriched_at DESC)
- `idx_gtm_company_profiles_tech_stack` -- GIN (tech_stack_known)
- `idx_gtm_company_profiles_icp_tags` -- GIN (dynamic_icp_tags)

**RLS Policies:** Standard GTM pattern.

**Example Row:**
```json
{
  "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
  "company_name": "MedTech Dynamics",
  "domain": "medtechdynamics.com",
  "industry": "Healthcare Technology",
  "employee_count": 350,
  "revenue_estimate": "$50M-$100M",
  "location": "Austin, TX",
  "tech_stack_known": ["hubspot", "salesforce", "oracle", "python", "aws"],
  "enrichment_source": "apollo",
  "enrichment_confidence": 0.85,
  "icp_match_score": 88,
  "dynamic_icp_tags": ["healthcare", "mid-market", "legacy-migration", "api-pain"],
  "recent_executive_hires": [
    {"name": "Jane Smith", "title": "CTO", "start_date": "2026-01-15", "previous": "Epic Systems"}
  ],
  "enriched_at": "2026-03-22T08:00:00Z"
}
```

**Common Queries:**
```sql
-- 1. ICP-matched companies with specific tech stack
SELECT company_name, industry, icp_match_score, tech_stack_known
FROM gtm_company_profiles
WHERE icp_match_score >= 75
  AND tech_stack_known && ARRAY['hubspot', 'salesforce']
ORDER BY icp_match_score DESC;

-- 2. Companies by dynamic ICP tag
SELECT company_name, dynamic_icp_tags, icp_match_score
FROM gtm_company_profiles
WHERE 'legacy-migration' = ANY(dynamic_icp_tags)
ORDER BY icp_match_score DESC;

-- 3. Enrichment coverage report
SELECT enrichment_source, COUNT(*), AVG(enrichment_confidence)
FROM gtm_company_profiles
GROUP BY enrichment_source;

-- 4. Companies needing re-enrichment (stale > 30 days)
SELECT company_name, enriched_at, enrichment_source
FROM gtm_company_profiles
WHERE enriched_at < now() - INTERVAL '30 days'
ORDER BY enriched_at ASC;
```

---

### 2.8 gtm_competitive_intel

**Purpose:** Aggregated competitive intelligence per competitor -- weakness signals, battlecards, displacement opportunities.

| Column                      | Type         | Constraints / Default       |
|-----------------------------|--------------|------------------------------|
| id                          | UUID         | PK, DEFAULT gen_random_uuid() |
| competitor_name             | TEXT         | NOT NULL                     |
| category                    | TEXT         |                              |
| weakness_signals            | JSONB        |                              |
| switching_signals_count     | INTEGER      | DEFAULT 0                    |
| avg_competitor_rating       | NUMERIC      |                              |
| negative_trend              | BOOLEAN      | DEFAULT false                |
| battlecard                  | JSONB        |                              |
| displacement_opportunities  | INTEGER      | DEFAULT 0                    |
| last_updated                | TIMESTAMPTZ  | DEFAULT now()                |

**Indexes:**
- `idx_gtm_competitive_intel_competitor` -- (competitor_name)
- `idx_gtm_competitive_intel_category` -- (category)
- `idx_gtm_competitive_intel_displacement` -- (displacement_opportunities DESC)
- `idx_gtm_competitive_intel_updated` -- (last_updated DESC)

**RLS Policies:** Standard GTM pattern.

**Example Row:**
```json
{
  "id": "b8c9d0e1-f2a3-4567-bcde-678901234567",
  "competitor_name": "HubSpot",
  "category": "CRM",
  "weakness_signals": {
    "api_limits": 42,
    "support_delays": 28,
    "reporting_gaps": 15,
    "implementation_pain": 11
  },
  "switching_signals_count": 23,
  "avg_competitor_rating": 3.2,
  "negative_trend": true,
  "battlecard": {
    "positioning": "Enterprise-grade API middleware that eliminates HubSpot rate limit pain",
    "key_differentiators": ["No rate limits", "Custom reporting", "24hr support SLA"],
    "common_objections": ["We already invested in HubSpot"],
    "win_stories": ["Acme Corp saved 40hrs/week after switching from HubSpot automation"]
  },
  "displacement_opportunities": 23,
  "last_updated": "2026-03-29T12:00:00Z"
}
```

**Common Queries:**
```sql
-- 1. Competitors with declining ratings (displacement targets)
SELECT competitor_name, avg_competitor_rating, displacement_opportunities
FROM gtm_competitive_intel
WHERE negative_trend = true
ORDER BY displacement_opportunities DESC;

-- 2. Battlecard lookup
SELECT competitor_name, battlecard
FROM gtm_competitive_intel
WHERE competitor_name = 'HubSpot';

-- 3. Top displacement opportunities
SELECT competitor_name, category, displacement_opportunities, switching_signals_count
FROM gtm_competitive_intel
ORDER BY displacement_opportunities DESC
LIMIT 10;
```

---

### 2.9 gtm_pipeline_stages

**Purpose:** Sales pipeline tracker with stage progression, squad assignment, and deal values.

| Column             | Type         | Constraints / Default                                   |
|--------------------|--------------|----------------------------------------------------------|
| id                 | UUID         | PK, DEFAULT gen_random_uuid()                            |
| company_profile_id | UUID         | FK -> gtm_company_profiles(id) ON DELETE CASCADE         |
| current_stage      | TEXT         | NOT NULL DEFAULT 'signal_detected', CHECK IN (10 stages) |
| assigned_to        | TEXT         |                                                          |
| assigned_squad     | TEXT         | CHECK IN ('medical_ai','ai_squads','revops','custom_dev') |
| stage_entered_at   | TIMESTAMPTZ  | DEFAULT now()                                            |
| first_signal_at    | TIMESTAMPTZ  |                                                          |
| first_contact_at   | TIMESTAMPTZ  |                                                          |
| qualified_at       | TIMESTAMPTZ  |                                                          |
| closed_at          | TIMESTAMPTZ  |                                                          |
| deal_value         | NUMERIC      |                                                          |
| loss_reason        | TEXT         |                                                          |
| notes              | TEXT         |                                                          |

**Pipeline Stages:** `signal_detected` -> `enriched` -> `scored` -> `routed` -> `contacted` -> `qualified` -> `proposal` -> `negotiation` -> `won` / `lost`

**Indexes:**
- `idx_gtm_pipeline_stages_company` -- (company_profile_id)
- `idx_gtm_pipeline_stages_stage` -- (current_stage)
- `idx_gtm_pipeline_stages_squad` -- (assigned_squad)
- `idx_gtm_pipeline_stages_entered` -- (stage_entered_at DESC)
- `idx_gtm_pipeline_stages_deal_value` -- (deal_value DESC NULLS LAST)
- `idx_gtm_pipeline_stages_active` -- (current_stage) WHERE NOT IN ('won','lost') (partial)

**RLS Policies:** Standard GTM pattern.

**Example Row:**
```json
{
  "id": "c9d0e1f2-a3b4-5678-cdef-789012345678",
  "company_profile_id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
  "current_stage": "qualified",
  "assigned_to": "lance",
  "assigned_squad": "ai_squads",
  "stage_entered_at": "2026-03-30T09:00:00Z",
  "first_signal_at": "2026-03-15T10:00:00Z",
  "first_contact_at": "2026-03-25T14:00:00Z",
  "qualified_at": "2026-03-30T09:00:00Z",
  "closed_at": null,
  "deal_value": 75000,
  "loss_reason": null,
  "notes": "VP Ops interested in API middleware. Requesting proposal for Q2."
}
```

**Common Queries:**
```sql
-- 1. Active pipeline by stage
SELECT current_stage, COUNT(*), SUM(deal_value) AS total_value
FROM gtm_pipeline_stages
WHERE current_stage NOT IN ('won', 'lost')
GROUP BY current_stage
ORDER BY ARRAY_POSITION(
  ARRAY['signal_detected','enriched','scored','routed','contacted','qualified','proposal','negotiation'],
  current_stage
);

-- 2. Pipeline by squad
SELECT assigned_squad, COUNT(*), SUM(deal_value)
FROM gtm_pipeline_stages
WHERE current_stage NOT IN ('won', 'lost')
GROUP BY assigned_squad;

-- 3. Average time from signal to qualification
SELECT AVG(qualified_at - first_signal_at) AS avg_time_to_qualify
FROM gtm_pipeline_stages
WHERE qualified_at IS NOT NULL;

-- 4. Lost deal analysis
SELECT loss_reason, COUNT(*)
FROM gtm_pipeline_stages
WHERE current_stage = 'lost'
GROUP BY loss_reason
ORDER BY COUNT(*) DESC;

-- 5. Deals stalled (in same stage > 14 days)
SELECT ps.id, cp.company_name, ps.current_stage, ps.stage_entered_at
FROM gtm_pipeline_stages ps
JOIN gtm_company_profiles cp ON ps.company_profile_id = cp.id
WHERE ps.current_stage NOT IN ('won', 'lost')
  AND ps.stage_entered_at < now() - INTERVAL '14 days'
ORDER BY ps.stage_entered_at ASC;
```

---

### 2.10 gtm_outreach_messages

**Purpose:** All outreach messages (email, LinkedIn, phone) with delivery tracking and personalization data.

| Column               | Type         | Constraints / Default                                     |
|----------------------|--------------|-----------------------------------------------------------|
| id                   | UUID         | PK, DEFAULT gen_random_uuid()                             |
| company_profile_id   | UUID         | FK -> gtm_company_profiles(id) ON DELETE SET NULL          |
| intent_score_id      | UUID         | FK -> gtm_intent_scores(id) ON DELETE SET NULL             |
| channel              | TEXT         | NOT NULL, CHECK IN ('email','linkedin','phone')            |
| template_type        | TEXT         |                                                           |
| subject_line         | TEXT         |                                                           |
| message_body         | TEXT         |                                                           |
| personalization_data | JSONB        |                                                           |
| tone                 | TEXT         | CHECK IN ('technical','executive','casual')                |
| status               | TEXT         | NOT NULL DEFAULT 'draft', CHECK IN (7 statuses)            |
| sent_at              | TIMESTAMPTZ  |                                                           |
| opened_at            | TIMESTAMPTZ  |                                                           |
| clicked_at           | TIMESTAMPTZ  |                                                           |
| replied_at           | TIMESTAMPTZ  |                                                           |
| created_at           | TIMESTAMPTZ  | DEFAULT now()                                             |

**Statuses:** `draft` -> `scheduled` -> `sent` -> `opened` -> `clicked` -> `replied` / `bounced`

**Indexes:**
- `idx_gtm_outreach_company` -- (company_profile_id)
- `idx_gtm_outreach_intent` -- (intent_score_id)
- `idx_gtm_outreach_channel` -- (channel)
- `idx_gtm_outreach_status` -- (status)
- `idx_gtm_outreach_created` -- (created_at DESC)
- `idx_gtm_outreach_sent` -- (sent_at DESC) WHERE sent_at IS NOT NULL (partial)

**RLS Policies:** Standard GTM pattern.

**Example Row:**
```json
{
  "id": "d0e1f2a3-b4c5-6789-defa-890123456789",
  "company_profile_id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
  "intent_score_id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
  "channel": "email",
  "template_type": "api_pain_outreach",
  "subject_line": "Saw your team is hitting API rate limits -- we solved this for Acme",
  "message_body": "Hi Sarah, I noticed MedTech Dynamics is scaling integrations with HubSpot...",
  "personalization_data": {
    "pain_point": "api_limit_exhaustion",
    "reviewer_title": "VP of Operations",
    "competitor_used": "HubSpot",
    "win_story": "Acme Corp"
  },
  "tone": "technical",
  "status": "sent",
  "sent_at": "2026-03-31T09:00:00Z",
  "opened_at": "2026-03-31T10:15:00Z",
  "clicked_at": null,
  "replied_at": null,
  "created_at": "2026-03-30T16:00:00Z"
}
```

**Common Queries:**
```sql
-- 1. Outreach funnel metrics
SELECT status, COUNT(*)
FROM gtm_outreach_messages
GROUP BY status
ORDER BY ARRAY_POSITION(
  ARRAY['draft','scheduled','sent','opened','clicked','replied','bounced'],
  status
);

-- 2. Open rate by channel
SELECT channel,
  COUNT(*) FILTER (WHERE sent_at IS NOT NULL) AS sent,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS opened,
  ROUND(100.0 * COUNT(*) FILTER (WHERE opened_at IS NOT NULL)
    / NULLIF(COUNT(*) FILTER (WHERE sent_at IS NOT NULL), 0), 1) AS open_rate_pct
FROM gtm_outreach_messages
GROUP BY channel;

-- 3. Messages awaiting send
SELECT om.id, cp.company_name, om.channel, om.subject_line
FROM gtm_outreach_messages om
JOIN gtm_company_profiles cp ON om.company_profile_id = cp.id
WHERE om.status = 'scheduled'
ORDER BY om.created_at;

-- 4. Reply rate by template
SELECT template_type, COUNT(*) AS sent,
  COUNT(*) FILTER (WHERE replied_at IS NOT NULL) AS replies
FROM gtm_outreach_messages
WHERE sent_at IS NOT NULL
GROUP BY template_type
ORDER BY replies DESC;
```

---

### 2.11 gtm_agent_actions

**Purpose:** Autonomous actions taken by GTM agents -- cadence adjustments, battlecard generation, follow-ups.

| Column            | Type         | Constraints / Default                                     |
|-------------------|--------------|-----------------------------------------------------------|
| id                | UUID         | PK, DEFAULT gen_random_uuid()                             |
| action_type       | TEXT         | NOT NULL, CHECK IN (7 types -- see below)                 |
| target_company    | TEXT         |                                                           |
| target_contact    | TEXT         |                                                           |
| action_details    | JSONB        |                                                           |
| trigger_signal    | TEXT         |                                                           |
| outcome           | TEXT         |                                                           |
| requires_approval | BOOLEAN      | DEFAULT false                                             |
| approved_by       | TEXT         |                                                           |
| executed_at       | TIMESTAMPTZ  | DEFAULT now()                                             |

**Action Types:** `cadence_adjust`, `battlecard_generate`, `pitch_deck_populate`, `message_pivot`, `meeting_book`, `follow_up`, `alert`

**Indexes:**
- `idx_gtm_agent_actions_type` -- (action_type)
- `idx_gtm_agent_actions_company` -- (target_company)
- `idx_gtm_agent_actions_executed` -- (executed_at DESC)
- `idx_gtm_agent_actions_pending` -- (requires_approval) WHERE requires_approval = true AND approved_by IS NULL (partial)

**RLS Policies:** Standard GTM pattern.

**Example Row:**
```json
{
  "id": "e1f2a3b4-c5d6-7890-efab-901234567890",
  "action_type": "battlecard_generate",
  "target_company": "MedTech Dynamics",
  "target_contact": "Sarah K., VP of Operations",
  "action_details": {
    "competitor": "HubSpot",
    "pain_points": ["api_limit_exhaustion", "support_delay"],
    "battlecard_version": "v2",
    "output_format": "pdf"
  },
  "trigger_signal": "composite_score crossed 80 threshold",
  "outcome": "Battlecard generated and attached to pipeline record",
  "requires_approval": false,
  "approved_by": null,
  "executed_at": "2026-03-29T07:00:00Z"
}
```

**Common Queries:**
```sql
-- 1. Pending actions awaiting approval
SELECT id, action_type, target_company, action_details, executed_at
FROM gtm_agent_actions
WHERE requires_approval = true AND approved_by IS NULL
ORDER BY executed_at DESC;

-- 2. Agent activity log for last 24 hours
SELECT action_type, target_company, outcome, executed_at
FROM gtm_agent_actions
WHERE executed_at > now() - INTERVAL '24 hours'
ORDER BY executed_at DESC;

-- 3. Action frequency by type
SELECT action_type, COUNT(*),
  COUNT(*) FILTER (WHERE executed_at > now() - INTERVAL '7 days') AS last_7d
FROM gtm_agent_actions
GROUP BY action_type
ORDER BY COUNT(*) DESC;

-- 4. Actions for a specific company
SELECT action_type, trigger_signal, outcome, executed_at
FROM gtm_agent_actions
WHERE target_company = 'MedTech Dynamics'
ORDER BY executed_at DESC;
```

---

## RLS Policy Pattern (All 11 Tables)

Every GTM table follows the same Row Level Security pattern:

| Operation      | Rule                                          |
|----------------|-----------------------------------------------|
| SELECT         | `auth.email() LIKE '%@labnolabs.com'` OR `'%@movement-solutions.com'` |
| INSERT         | `auth.email() LIKE '%@labnolabs.com'` only    |
| UPDATE         | `auth.email() LIKE '%@labnolabs.com'` only    |
| DELETE         | `auth.email() LIKE '%@labnolabs.com'` only    |
| ALL (service)  | `auth.role() = 'service_role'`                |

Movement Solutions staff can read GTM data; only Labno Labs staff (and service role) can write.

---

## 3. Data Flow Diagram

```
                            RAW DATA SOURCES
                    (App Stores, G2/Capterra, LinkedIn/Indeed)
                                    |
                                    v
 ============================================================================
  LAYER 1: INGEST
 ============================================================================

  +-------------------+    +-------------------+    +-------------------+
  | gtm_mobile_reviews|    | gtm_b2b_reviews   |    | gtm_job_postings  |
  | (Apple/Google     |    | (G2, Capterra,    |    | (LinkedIn, Indeed) |
  |  Play reviews)    |    |  TrustRadius)     |    |                   |
  +--------+----------+    +--------+----------+    +--------+----------+
           |                        |                        |
           +----------+-------------+                        |
                      |                                      |
                      v                                      v
 ============================================================================
  LAYER 2: PARSE (LLM-powered extraction)
 ============================================================================

  +-------------------------------+    +-------------------------------+
  | gtm_parsed_signals            |    | gtm_hiring_signals            |
  |                               |    |                               |
  | - Extracts pain points from   |    | - Detects hiring spikes,      |
  |   review text                 |    |   stack shifts, exec turnover |
  | - Categorizes (12 categories) |    |   from job posting patterns   |
  | - Maps to Labno service       |    | - Infers debt type            |
  +--------+----------------------+    +--------+----------------------+
           |                                    |
           +----------------+-------------------+
                            |
                            v
 ============================================================================
  LAYER 3: SCORE & ENRICH
 ============================================================================

  +------------------------+  +------------------------+  +------------------------+
  | gtm_intent_scores      |  | gtm_company_profiles   |  | gtm_competitive_intel  |
  |                        |  |                        |  |                        |
  | - RFDS composite score |  | - Apollo/Clearbit/Clay |  | - Weakness aggregation |
  | - Tier: immediate /    |  |   enrichment           |  | - Battlecards          |
  |   nurture / watch /    |  | - ICP match scoring    |  | - Displacement opps    |
  |   archive              |  | - Tech stack, size,    |  |                        |
  |                        |  |   industry, exec hires |  |                        |
  +--------+---------------+  +--------+---------------+  +------------------------+
           |                           |
           +----------+----------------+
                      |
                      v
 ============================================================================
  LAYER 4: ROUTE & OUTREACH
 ============================================================================

  +-------------------------------+    +-------------------------------+
  | gtm_pipeline_stages           |    | gtm_outreach_messages         |
  |                               |    |                               |
  | - 10-stage pipeline           |    | - Email / LinkedIn / Phone    |
  | - Squad assignment            |    | - Personalization via JSONB   |
  | - Deal value tracking         |    | - Delivery tracking           |
  | - Win/loss recording          |    |   (sent/opened/clicked/       |
  |                               |    |    replied/bounced)           |
  +--------+----------------------+    +-------------------------------+
           |
           v
 ============================================================================
  LAYER 5: EXECUTE (Autonomous Agents)
 ============================================================================

  +-------------------------------+
  | gtm_agent_actions             |
  |                               |
  | - Cadence adjustments         |
  | - Battlecard generation       |
  | - Message pivots              |
  | - Meeting booking             |
  | - Approval gating             |
  +-------------------------------+
```

---

## 4. Views

### 4.1 gtm_high_intent_accounts

**Purpose:** Pre-joined view of company profiles with intent scores >= 70 (composite). Use this as the primary "hot accounts" dashboard query.

**Join:** `gtm_company_profiles` INNER JOIN `gtm_intent_scores` ON `company_name`

**Filter:** `composite_score >= 70`

**Columns exposed:**
- From `gtm_company_profiles`: company_profile_id, company_name, domain, industry, employee_count, revenue_estimate, location, tech_stack_known, icp_match_score, dynamic_icp_tags
- From `gtm_intent_scores`: intent_score_id, composite_score, score_tier, signal_count, top_signals, last_signal_at, recency_score, frequency_score, depth_score, seniority_score

**Example Query:**
```sql
-- Hot accounts sorted by composite score
SELECT company_name, composite_score, score_tier, industry, employee_count, signal_count
FROM gtm_high_intent_accounts
ORDER BY composite_score DESC;

-- Hot healthcare accounts
SELECT company_name, composite_score, tech_stack_known
FROM gtm_high_intent_accounts
WHERE industry ILIKE '%health%'
ORDER BY composite_score DESC;
```

### 4.2 gtm_active_pipeline

**Purpose:** Pre-joined view of pipeline stages with company profiles, excluding closed deals (won/lost). Use for pipeline dashboard and reporting.

**Join:** `gtm_pipeline_stages` INNER JOIN `gtm_company_profiles` ON `company_profile_id`

**Filter:** `current_stage NOT IN ('won', 'lost')`

**Columns exposed:**
- From `gtm_pipeline_stages`: pipeline_id, current_stage, assigned_to, assigned_squad, stage_entered_at, first_signal_at, first_contact_at, qualified_at, deal_value, notes
- From `gtm_company_profiles`: company_profile_id, company_name, domain, industry, employee_count

**Example Query:**
```sql
-- Active pipeline summary
SELECT current_stage, COUNT(*), SUM(deal_value) AS pipeline_value
FROM gtm_active_pipeline
GROUP BY current_stage;

-- Stalled deals by squad
SELECT company_name, assigned_squad, current_stage, stage_entered_at
FROM gtm_active_pipeline
WHERE stage_entered_at < now() - INTERVAL '14 days'
ORDER BY stage_entered_at ASC;
```

---

## 5. Integration Points

### 5.1 gtm_pipeline_stages -> labno_consulting_leads

When a GTM-sourced account reaches the `qualified` stage (or later), create a corresponding row in `labno_consulting_leads` to track it in the existing CRM.

```sql
-- Convert a qualified GTM pipeline entry to a consulting lead
INSERT INTO labno_consulting_leads (company_name, email, app_interest, lifetime_value)
SELECT
  cp.company_name,
  NULL,                          -- email populated later from outreach data
  ps.assigned_squad,             -- maps to app_interest
  ps.deal_value                  -- maps to lifetime_value
FROM gtm_pipeline_stages ps
JOIN gtm_company_profiles cp ON ps.company_profile_id = cp.id
WHERE ps.id = '<pipeline_stage_id>'
ON CONFLICT DO NOTHING;
```

**Sync direction:** GTM -> CRM (one-way). The GTM system is the source of truth for prospecting; `labno_consulting_leads` is the source of truth once the relationship is active.

### 5.2 gtm_agent_actions -> agent_runs

The existing `agent_runs` table (used by `api/agent/run.js`) logs agent task executions. GTM agent actions are a parallel track:

| Concern               | Existing System     | GTM System          |
|------------------------|--------------------|--------------------|
| Table                  | agent_runs          | gtm_agent_actions   |
| Scope                  | Internal task queue  | External sales ops  |
| Trigger                | global_tasks         | Signal thresholds   |
| Approval               | Not gated           | Optional approval gate |

To correlate them, query both tables by timestamp range:

```sql
-- All agent activity in the last 24h (both internal + GTM)
SELECT 'internal' AS system, task_title AS action, executed_at
FROM agent_runs
WHERE executed_at > now() - INTERVAL '24 hours'
UNION ALL
SELECT 'gtm', action_type || ': ' || COALESCE(target_company, ''), executed_at
FROM gtm_agent_actions
WHERE executed_at > now() - INTERVAL '24 hours'
ORDER BY executed_at DESC;
```

### 5.3 gtm_company_profiles -> internal_projects

When a GTM deal is `won`, create a project in `internal_projects` for delivery tracking:

```sql
-- Create delivery project from won deal
INSERT INTO internal_projects (name, status, complexity)
SELECT
  cp.company_name || ' - ' || ps.assigned_squad || ' engagement',
  'Planning',
  CASE
    WHEN ps.deal_value > 100000 THEN 5
    WHEN ps.deal_value > 50000 THEN 3
    ELSE 1
  END
FROM gtm_pipeline_stages ps
JOIN gtm_company_profiles cp ON ps.company_profile_id = cp.id
WHERE ps.id = '<pipeline_stage_id>' AND ps.current_stage = 'won';
```

---

## 6. Data Retention Policy

| Table                   | Retention          | Rationale                                      |
|-------------------------|--------------------|------------------------------------------------|
| gtm_mobile_reviews      | 2 years            | Raw source data; needed for re-parsing         |
| gtm_b2b_reviews         | 2 years            | Raw source data; needed for re-parsing         |
| gtm_job_postings        | 2 years            | Historical hiring trend analysis               |
| gtm_parsed_signals      | 1 year             | Derived data; can be regenerated from raw      |
| gtm_hiring_signals      | 1 year             | Derived data; can be regenerated from raw      |
| gtm_intent_scores       | Keep latest per company; archive history quarterly | Only current score matters for routing |
| gtm_company_profiles    | Indefinite         | Core entity; grows over time                   |
| gtm_competitive_intel   | Indefinite         | Updated in place; historical snapshots optional |
| gtm_pipeline_stages     | Indefinite         | Business records; win/loss history is valuable |
| gtm_outreach_messages   | 3 years            | Compliance (CAN-SPAM, GDPR audit trail)        |
| gtm_agent_actions       | 1 year             | Operational log; archive to cold storage       |

### Archival Queries

```sql
-- Archive old parsed signals
INSERT INTO gtm_parsed_signals_archive SELECT * FROM gtm_parsed_signals
WHERE parsed_at < now() - INTERVAL '1 year';
DELETE FROM gtm_parsed_signals WHERE parsed_at < now() - INTERVAL '1 year';

-- Archive old intent score history (keep only latest per company)
DELETE FROM gtm_intent_scores
WHERE id NOT IN (
  SELECT DISTINCT ON (company_name) id
  FROM gtm_intent_scores
  ORDER BY company_name, scored_at DESC
);

-- Purge mobile reviews older than 2 years
DELETE FROM gtm_mobile_reviews WHERE scraped_at < now() - INTERVAL '2 years';

-- Purge agent actions older than 1 year
DELETE FROM gtm_agent_actions WHERE executed_at < now() - INTERVAL '1 year';
```

---

## 7. Backup & Recovery

### Full GTM Backup (all 11 tables)

```bash
# Export all GTM tables to a single SQL dump
pg_dump "$DATABASE_URL" \
  --data-only \
  --table='gtm_*' \
  --file=gtm_backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump "$DATABASE_URL" \
  --data-only \
  --table='gtm_*' \
  | gzip > gtm_backup_$(date +%Y%m%d).sql.gz
```

### Per-Table Backup

```bash
# Backup a single table (e.g., pipeline stages)
pg_dump "$DATABASE_URL" \
  --data-only \
  --table='gtm_pipeline_stages' \
  --file=gtm_pipeline_stages_$(date +%Y%m%d).sql
```

### Backup via Supabase CLI

```bash
# Using supabase db dump (includes schema + data)
supabase db dump --data-only --file=gtm_backup_$(date +%Y%m%d).sql

# Filter to GTM tables only (post-process)
grep -E '^(INSERT INTO gtm_|COPY gtm_)' gtm_backup.sql > gtm_data_only.sql
```

### CSV Export (for spreadsheet analysis)

```bash
# Export high-intent accounts to CSV
psql "$DATABASE_URL" -c \
  "\COPY (SELECT * FROM gtm_high_intent_accounts ORDER BY composite_score DESC) TO 'high_intent_accounts.csv' CSV HEADER"

# Export active pipeline to CSV
psql "$DATABASE_URL" -c \
  "\COPY (SELECT * FROM gtm_active_pipeline) TO 'active_pipeline.csv' CSV HEADER"
```

### Restore

```bash
# Restore from SQL dump (data only, assumes tables exist)
psql "$DATABASE_URL" < gtm_backup_20260402.sql

# Restore from compressed backup
gunzip -c gtm_backup_20260402.sql.gz | psql "$DATABASE_URL"

# Restore a single table
psql "$DATABASE_URL" < gtm_pipeline_stages_20260402.sql
```

### Restore via Supabase API (JSON import)

```sql
-- If exporting/importing via Supabase JS client:
-- Export:
--   const { data } = await supabase.from('gtm_company_profiles').select('*')
--   fs.writeFileSync('profiles.json', JSON.stringify(data))
--
-- Import:
--   const data = JSON.parse(fs.readFileSync('profiles.json'))
--   await supabase.from('gtm_company_profiles').upsert(data, { onConflict: 'company_name' })
```

### Recommended Backup Schedule

| Frequency | What                              | Method               |
|-----------|-----------------------------------|----------------------|
| Daily     | gtm_pipeline_stages, gtm_outreach_messages | pg_dump --data-only |
| Weekly    | All 11 GTM tables                 | Full pg_dump + gzip  |
| Monthly   | Full schema + data                | supabase db dump     |
| On-demand | Before any migration              | Full pg_dump         |

---

## Appendix: Quick Reference

### Table Count Summary

| Layer | Tables | Purpose |
|-------|--------|---------|
| 1 - Ingest  | 3 (mobile_reviews, b2b_reviews, job_postings) | Raw scraped data |
| 2 - Parse   | 2 (parsed_signals, hiring_signals) | LLM-extracted signals |
| 3 - Score   | 3 (intent_scores, company_profiles, competitive_intel) | Enrichment + scoring |
| 4 - Route   | 2 (pipeline_stages, outreach_messages) | Sales pipeline + outreach |
| 5 - Execute | 1 (agent_actions) | Autonomous agent log |
| Views        | 2 (high_intent_accounts, active_pipeline) | Dashboard helpers |
| **Total**    | **11 tables + 2 views** | |

### Enum Quick Reference

**pain_point_category:** api_limit_exhaustion, post_sale_chaos, bulk_data_failure, support_delay, manual_data_entry, integration_failure, reporting_gap, frontend_tech_debt, ux_debt, infrastructure_debt, workflow_automation_need, ai_readiness

**severity:** critical, high, medium, low

**score_tier:** immediate, nurture, watch, archive

**pipeline stages:** signal_detected, enriched, scored, routed, contacted, qualified, proposal, negotiation, won, lost

**outreach status:** draft, scheduled, sent, opened, clicked, replied, bounced

**agent action types:** cadence_adjust, battlecard_generate, pitch_deck_populate, message_pivot, meeting_book, follow_up, alert

**assigned_squad:** medical_ai, ai_squads, revops, custom_dev

**hiring signal types:** hiring_spike, new_department, executive_turnover, tech_stack_shift, legacy_migration

**inferred_debt_type:** infrastructure, workflow, ai_readiness, cloud_migration
