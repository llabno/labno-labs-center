# GTM Signal Extraction: Data Schemas & Taxonomies

> **System**: 5-Layer Go-To-Market Signal Extraction Engine
> **Owner**: Labno Labs
> **Version**: 1.0.0
> **Last Updated**: 2026-04-02

This document defines every data contract, taxonomy, scoring formula, and classification schema used in the Labno Labs GTM signal extraction pipeline. It is the single source of truth for all downstream consumers: scrapers, enrichment workers, scoring engines, and outreach generators.

---

## Table of Contents

1. [App Store Review Schema](#1-app-store-review-schema)
2. [G2/Capterra B2B Review Schema](#2-g2capterra-b2b-review-schema)
3. [Job Posting Schema](#3-job-posting-schema)
4. [Non-Functional Requirement (NFR) Taxonomy](#4-non-functional-requirement-nfr-taxonomy)
5. [B2B Workflow Bottleneck Pattern Taxonomy](#5-b2b-workflow-bottleneck-pattern-taxonomy)
6. [Job Description Debt Taxonomy](#6-job-description-debt-taxonomy)
7. [Intent Score Dimension Definitions](#7-intent-score-dimension-definitions)
8. [Outreach Template Type Definitions](#8-outreach-template-type-definitions)

---

## 1. App Store Review Schema

Captures structured review data from Apple App Store and Google Play Store. Every review ingested into the pipeline conforms to this schema.

### Field Reference

| # | Field | Type | Required | Source | Description | Example |
|---|-------|------|----------|--------|-------------|---------|
| 1 | `source_platform` | `enum` | Yes | Both | Platform the review was scraped from | `"apple_app_store"`, `"google_play"` |
| 2 | `app_name` | `string` | Yes | Both | Display name of the application | `"Salesforce"` |
| 3 | `app_id` | `string` | Yes | Both | Platform-specific unique identifier | Apple: `"id1141657108"`, Google: `"com.salesforce.chatter"` |
| 4 | `app_version` | `string` | No | Both | App version the review was written against | `"248.012"` |
| 5 | `review_id_external` | `string` | Yes | Both | Platform-native unique review identifier | `"gp_a1b2c3d4"`, `"apple_9876543210"` |
| 6 | `reviewer_name` | `string` | No | Both | Display name of the reviewer | `"John D."` |
| 7 | `rating` | `integer` | Yes | Both | Star rating (1-5) | `2` |
| 8 | `review_text` | `string` | Yes | Both | Full review body text | `"The app crashes every time I try to sync contacts..."` |
| 9 | `review_date` | `date` (ISO 8601) | Yes | Both | Date the review was published | `"2026-03-15"` |
| 10 | `device_type` | `string` | No | Google | Device model or OS version | `"Pixel 7 Pro"`, `"iOS 18.2"` |
| 11 | `geo_location` | `string` | No | Both | Country or region code | `"US"`, `"GB"`, `"DE"` |
| 12 | `helpful_count` | `integer` | No | Both | Number of "helpful" votes from other users | `47` |
| 13 | `developer_response` | `string` | No | Both | Official developer reply text | `"Thank you for the feedback. We've fixed this in v249..."` |
| 14 | `developer_response_date` | `date` (ISO 8601) | No | Both | Date the developer responded | `"2026-03-18"` |

### JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "AppStoreReview",
  "type": "object",
  "required": [
    "source_platform",
    "app_name",
    "app_id",
    "review_id_external",
    "rating",
    "review_text",
    "review_date"
  ],
  "properties": {
    "source_platform": {
      "type": "string",
      "enum": ["apple_app_store", "google_play"]
    },
    "app_name": {
      "type": "string",
      "maxLength": 255
    },
    "app_id": {
      "type": "string",
      "maxLength": 255,
      "description": "Apple bundle ID (e.g. id1141657108) or Google package name (e.g. com.salesforce.chatter)"
    },
    "app_version": {
      "type": ["string", "null"],
      "maxLength": 50
    },
    "review_id_external": {
      "type": "string",
      "maxLength": 255
    },
    "reviewer_name": {
      "type": ["string", "null"],
      "maxLength": 255
    },
    "rating": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5
    },
    "review_text": {
      "type": "string",
      "maxLength": 10000
    },
    "review_date": {
      "type": "string",
      "format": "date"
    },
    "device_type": {
      "type": ["string", "null"],
      "maxLength": 255
    },
    "geo_location": {
      "type": ["string", "null"],
      "maxLength": 10,
      "description": "ISO 3166-1 alpha-2 country code"
    },
    "helpful_count": {
      "type": ["integer", "null"],
      "minimum": 0,
      "default": 0
    },
    "developer_response": {
      "type": ["string", "null"],
      "maxLength": 10000
    },
    "developer_response_date": {
      "type": ["string", "null"],
      "format": "date"
    }
  }
}
```

### Deduplication Key

`source_platform` + `review_id_external`

### Notes

- Apple App Store does not reliably expose `device_type`; field will be null for Apple reviews.
- `helpful_count` semantics differ: Apple uses "helpful" votes, Google uses thumbs-up count.
- Reviews with no `review_text` (rating-only reviews) are excluded at ingestion time.

---

## 2. G2/Capterra B2B Review Schema

Captures structured review data from B2B software review platforms. These reviews are richer than app store reviews because they include structured pros/cons, job title, company size, and competitive comparisons.

### Field Reference

| # | Field | Type | Required | Source | Description | Example |
|---|-------|------|----------|--------|-------------|---------|
| 1 | `source_platform` | `enum` | Yes | Both | Review platform | `"g2"`, `"capterra"` |
| 2 | `software_name` | `string` | Yes | Both | Product being reviewed | `"HubSpot CRM"` |
| 3 | `software_category` | `string` | Yes | Both | Platform-assigned software category | `"CRM Software"`, `"Marketing Automation"` |
| 4 | `review_id_external` | `string` | Yes | Both | Platform-native unique review identifier | `"g2_rev_8834221"` |
| 5 | `reviewer_name` | `string` | No | Both | Display name of the reviewer | `"Sarah M."` |
| 6 | `reviewer_job_title` | `string` | No | Both | Self-reported job title | `"VP of Sales Operations"` |
| 7 | `reviewer_company_name` | `string` | No | Both | Company name (if disclosed) | `"Acme Corp"` |
| 8 | `reviewer_company_size` | `enum` | No | Both | Company size bracket | `"51-200"`, `"201-500"`, `"1001-5000"` |
| 9 | `reviewer_industry` | `string` | No | Both | Self-reported industry vertical | `"Healthcare"`, `"Financial Services"` |
| 10 | `overall_rating` | `float` | Yes | Both | Overall star rating (0.0-5.0, half-star increments) | `3.5` |
| 11 | `ease_of_use_rating` | `float` | No | Both | Ease of use sub-rating (0.0-5.0) | `2.0` |
| 12 | `support_quality_rating` | `float` | No | Both | Customer support sub-rating (0.0-5.0) | `1.5` |
| 13 | `implementation_rating` | `float` | No | G2 | Implementation/setup sub-rating (0.0-5.0) | `2.5` |
| 14 | `pros_text` | `string` | No | Both | Structured "What do you like?" response | `"Great reporting dashboards and easy pipeline views..."` |
| 15 | `cons_text` | `string` | No | Both | Structured "What do you dislike?" response | `"API rate limits kill our integrations. We hit the cap daily..."` |
| 16 | `review_text` | `string` | Yes | Both | Full review body / overall comments | `"We switched from Pipedrive 6 months ago..."` |
| 17 | `review_date` | `date` (ISO 8601) | Yes | Both | Date review was published | `"2026-02-20"` |
| 18 | `alternatives_considered` | `array[string]` | No | Both | Other products the reviewer evaluated | `["Pipedrive", "Zoho CRM", "Monday Sales CRM"]` |
| 19 | `competitive_comparisons` | `string` | No | Both | Free-text comparison to competitors | `"Compared to Salesforce, HubSpot is easier to set up but lacks advanced workflow automation..."` |

### JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "B2BReview",
  "type": "object",
  "required": [
    "source_platform",
    "software_name",
    "software_category",
    "review_id_external",
    "overall_rating",
    "review_text",
    "review_date"
  ],
  "properties": {
    "source_platform": {
      "type": "string",
      "enum": ["g2", "capterra", "trustradius"]
    },
    "software_name": {
      "type": "string",
      "maxLength": 255
    },
    "software_category": {
      "type": "string",
      "maxLength": 255
    },
    "review_id_external": {
      "type": "string",
      "maxLength": 255
    },
    "reviewer_name": {
      "type": ["string", "null"],
      "maxLength": 255
    },
    "reviewer_job_title": {
      "type": ["string", "null"],
      "maxLength": 255
    },
    "reviewer_company_name": {
      "type": ["string", "null"],
      "maxLength": 255
    },
    "reviewer_company_size": {
      "type": ["string", "null"],
      "enum": [
        null, "1-10", "11-50", "51-200", "201-500",
        "501-1000", "1001-5000", "5001-10000", "10001+"
      ]
    },
    "reviewer_industry": {
      "type": ["string", "null"],
      "maxLength": 255
    },
    "overall_rating": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 5.0
    },
    "ease_of_use_rating": {
      "type": ["number", "null"],
      "minimum": 0.0,
      "maximum": 5.0
    },
    "support_quality_rating": {
      "type": ["number", "null"],
      "minimum": 0.0,
      "maximum": 5.0
    },
    "implementation_rating": {
      "type": ["number", "null"],
      "minimum": 0.0,
      "maximum": 5.0
    },
    "pros_text": {
      "type": ["string", "null"],
      "maxLength": 10000
    },
    "cons_text": {
      "type": ["string", "null"],
      "maxLength": 10000
    },
    "review_text": {
      "type": "string",
      "maxLength": 10000
    },
    "review_date": {
      "type": "string",
      "format": "date"
    },
    "alternatives_considered": {
      "type": ["array", "null"],
      "items": { "type": "string" }
    },
    "competitive_comparisons": {
      "type": ["string", "null"],
      "maxLength": 10000
    }
  }
}
```

### Deduplication Key

`source_platform` + `review_id_external`

### Company Size Normalization

| Raw Value (G2) | Raw Value (Capterra) | Normalized |
|----------------|---------------------|------------|
| "Small Business" | "1-10 employees" | `"1-10"` |
| "Small Business" | "11-50 employees" | `"11-50"` |
| "Mid-Market" | "51-200 employees" | `"51-200"` |
| "Mid-Market" | "201-500 employees" | `"201-500"` |
| "Mid-Market" | "501-1000 employees" | `"501-1000"` |
| "Enterprise" | "1001-5000 employees" | `"1001-5000"` |
| "Enterprise" | "5001-10000 employees" | `"5001-10000"` |
| "Enterprise" | "10001+ employees" | `"10001+"` |

---

## 3. Job Posting Schema

Captures structured job posting data from LinkedIn, Indeed, Glassdoor, and company career pages. Job postings reveal technology stacks, organizational pain points, and hiring urgency.

### Field Reference

| # | Field | Type | Required | Source | Description | Example |
|---|-------|------|----------|--------|-------------|---------|
| 1 | `source_platform` | `enum` | Yes | All | Platform the job was scraped from | `"linkedin"`, `"indeed"`, `"glassdoor"`, `"company_careers"` |
| 2 | `company_name` | `string` | Yes | All | Hiring company name | `"Acme Healthcare"` |
| 3 | `job_title` | `string` | Yes | All | Posted job title | `"Senior Data Engineer"` |
| 4 | `job_description` | `string` | Yes | All | Full job description text | `"We are looking for a Senior Data Engineer to migrate our legacy..."` |
| 5 | `location` | `string` | No | All | Posted location | `"Austin, TX"`, `"Remote - US"` |
| 6 | `seniority_level` | `enum` | No | All | Inferred or stated seniority | `"entry"`, `"mid"`, `"senior"`, `"lead"`, `"manager"`, `"director"`, `"vp"`, `"c_level"` |
| 7 | `required_tech_stack` | `array[string]` | No | All | Technologies listed as required | `["Python", "PostgreSQL", "AWS", "Airflow"]` |
| 8 | `preferred_tech_stack` | `array[string]` | No | All | Technologies listed as preferred/nice-to-have | `["dbt", "Snowflake", "Terraform"]` |
| 9 | `posting_date` | `date` (ISO 8601) | Yes | All | Date the job was posted | `"2026-03-28"` |
| 10 | `posting_url` | `string` (URI) | Yes | All | Direct URL to the job posting | `"https://linkedin.com/jobs/view/3912345678"` |
| 11 | `salary_range` | `object` | No | All | Salary range if disclosed | `{"min": 150000, "max": 200000, "currency": "USD", "period": "annual"}` |
| 12 | `is_remote` | `enum` | No | All | Remote work policy | `"remote"`, `"hybrid"`, `"onsite"`, `"unknown"` |

### JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "JobPosting",
  "type": "object",
  "required": [
    "source_platform",
    "company_name",
    "job_title",
    "job_description",
    "posting_date",
    "posting_url"
  ],
  "properties": {
    "source_platform": {
      "type": "string",
      "enum": ["linkedin", "indeed", "glassdoor", "company_careers", "builtin", "dice"]
    },
    "company_name": {
      "type": "string",
      "maxLength": 255
    },
    "job_title": {
      "type": "string",
      "maxLength": 500
    },
    "job_description": {
      "type": "string",
      "maxLength": 50000
    },
    "location": {
      "type": ["string", "null"],
      "maxLength": 255
    },
    "seniority_level": {
      "type": ["string", "null"],
      "enum": [null, "entry", "mid", "senior", "lead", "manager", "director", "vp", "c_level"]
    },
    "required_tech_stack": {
      "type": ["array", "null"],
      "items": { "type": "string" }
    },
    "preferred_tech_stack": {
      "type": ["array", "null"],
      "items": { "type": "string" }
    },
    "posting_date": {
      "type": "string",
      "format": "date"
    },
    "posting_url": {
      "type": "string",
      "format": "uri"
    },
    "salary_range": {
      "type": ["object", "null"],
      "properties": {
        "min": { "type": "number" },
        "max": { "type": "number" },
        "currency": { "type": "string", "default": "USD" },
        "period": {
          "type": "string",
          "enum": ["annual", "monthly", "hourly"]
        }
      }
    },
    "is_remote": {
      "type": ["string", "null"],
      "enum": [null, "remote", "hybrid", "onsite", "unknown"]
    }
  }
}
```

### Deduplication Key

`source_platform` + `posting_url`

### Tech Stack Normalization

Canonical names are used to collapse variations:

| Raw Strings | Normalized |
|-------------|------------|
| `"JS"`, `"JavaScript"`, `"javascript"`, `"ES6"` | `"JavaScript"` |
| `"TS"`, `"TypeScript"`, `"typescript"` | `"TypeScript"` |
| `"Postgres"`, `"PostgreSQL"`, `"psql"` | `"PostgreSQL"` |
| `"AWS"`, `"Amazon Web Services"` | `"AWS"` |
| `"GCP"`, `"Google Cloud"`, `"Google Cloud Platform"` | `"GCP"` |
| `"k8s"`, `"Kubernetes"`, `"K8s"` | `"Kubernetes"` |
| `"React.js"`, `"ReactJS"`, `"React"` | `"React"` |
| `"Node"`, `"Node.js"`, `"NodeJS"` | `"Node.js"` |
| `"ML"`, `"Machine Learning"`, `"machine learning"` | `"Machine Learning"` |
| `"AI"`, `"Artificial Intelligence"` | `"AI"` |

---

## 4. Non-Functional Requirement (NFR) Taxonomy

Every user complaint, review excerpt, or job posting phrase is classified into one or more NFR categories. This taxonomy is the classification target for the NLP extraction layer.

### Taxonomy Tree

```
NFR Taxonomy
├── SEC  Security
│   ├── SEC-AUTH   Authentication
│   ├── SEC-AUTHZ  Authorization
│   ├── SEC-ENC    Encryption
│   └── SEC-COMP   Compliance
├── SCA  Scalability
│   ├── SCA-HORZ   Horizontal Scaling
│   ├── SCA-VERT   Vertical Scaling
│   ├── SCA-DATA   Data Volume
│   └── SCA-CONC   Concurrent Users
├── MNT  Maintainability
│   ├── MNT-CODE   Code Quality
│   ├── MNT-DOC    Documentation
│   ├── MNT-MOD    Modularity
│   └── MNT-TEST   Test Coverage
├── PRF  Performance
│   ├── PRF-RESP   Response Time
│   ├── PRF-THRU   Throughput
│   ├── PRF-RSRC   Resource Utilization
│   └── PRF-CACH   Caching
├── USA  Usability
│   ├── USA-ONBD   Onboarding
│   ├── USA-NAV    Navigation
│   ├── USA-A11Y   Accessibility
│   └── USA-MOBL   Mobile Responsiveness
├── REL  Reliability
│   ├── REL-UPTM   Uptime
│   ├── REL-FLTL   Fault Tolerance
│   ├── REL-DR     Disaster Recovery
│   └── REL-DINT   Data Integrity
└── INT  Integration
    ├── INT-API    API Availability
    ├── INT-HOOK   Webhook Support
    ├── INT-3PRT   Third-Party Connectors
    └── INT-FMT    Data Format Support
```

### Detailed Subcategory Definitions

#### SEC - Security

| ID | Subcategory | Definition | Example Complaint Phrases | Severity Indicators |
|----|-------------|------------|---------------------------|---------------------|
| `SEC-AUTH` | Authentication | Issues with login, SSO, MFA, session management, password policies, or identity verification | "can't log in", "SSO keeps breaking", "MFA doesn't work", "session times out too quickly", "keeps asking me to re-authenticate", "password reset is broken" | **Critical**: data breach, credential exposure. **High**: SSO outage affecting all users. **Medium**: MFA friction. **Low**: password policy annoyance. |
| `SEC-AUTHZ` | Authorization | Issues with role-based access, permission granularity, privilege escalation, or access scoping | "users can see data they shouldn't", "can't restrict access by team", "admin permissions are all-or-nothing", "no role-based access", "intern has admin access" | **Critical**: unauthorized data access confirmed. **High**: no RBAC at all. **Medium**: overly broad permission defaults. **Low**: minor permission UI confusion. |
| `SEC-ENC` | Encryption | Issues with data-at-rest encryption, data-in-transit encryption, key management, or certificate handling | "data isn't encrypted", "no TLS", "certificates keep expiring", "sent credentials in plaintext", "API key exposed in URL" | **Critical**: plaintext credentials or PII exposure. **High**: no encryption at rest. **Medium**: expired certs causing outages. **Low**: missing HTTPS redirect. |
| `SEC-COMP` | Compliance | Inability to meet regulatory frameworks (HIPAA, SOC2, GDPR, PCI-DSS, CCPA) or pass audits | "not HIPAA compliant", "failed our SOC2 audit", "no GDPR data deletion", "can't generate compliance reports", "no audit trail", "BAA not available" | **Critical**: active violation with regulatory exposure. **High**: missing compliance certification required by customer. **Medium**: partial compliance, workarounds needed. **Low**: documentation gap only. |

#### SCA - Scalability

| ID | Subcategory | Definition | Example Complaint Phrases | Severity Indicators |
|----|-------------|------------|---------------------------|---------------------|
| `SCA-HORZ` | Horizontal Scaling | Inability to distribute load across multiple instances, nodes, or regions | "can't add more servers", "single point of failure", "no load balancing", "everything runs on one box", "can't scale out" | **Critical**: single node, no failover, production traffic. **High**: manual scaling only, no auto-scaling. **Medium**: scaling works but is slow or manual. **Low**: scaling available but expensive. |
| `SCA-VERT` | Vertical Scaling | Resource limits on individual instances (CPU, memory, disk) causing bottlenecks | "server keeps running out of memory", "CPU maxed out", "need to upgrade to a bigger machine", "disk full again" | **Critical**: production outages from resource exhaustion. **High**: frequent resource ceiling hits. **Medium**: periodic spikes requiring manual intervention. **Low**: resource warnings but no impact yet. |
| `SCA-DATA` | Data Volume | System degradation as data volume grows (slow queries, storage limits, export failures) | "gets slower every month", "can't handle our data volume", "export times out with large datasets", "database is too big", "search takes forever now" | **Critical**: system unusable at current data volume. **High**: degraded performance affecting daily operations. **Medium**: workarounds needed for large operations. **Low**: noticeable slowdown but functional. |
| `SCA-CONC` | Concurrent Users | Inability to handle multiple simultaneous users without degradation | "slows to a crawl when everyone logs in Monday morning", "only 5 people can use it at once", "connection limits", "kicks users out during peak hours" | **Critical**: system crashes under normal concurrent load. **High**: significant degradation at expected concurrency. **Medium**: throttling during peak but manageable. **Low**: minor slowdown at extreme peak only. |

#### MNT - Maintainability

| ID | Subcategory | Definition | Example Complaint Phrases | Severity Indicators |
|----|-------------|------------|---------------------------|---------------------|
| `MNT-CODE` | Code Quality | Technical debt, legacy code, spaghetti architecture making changes risky or slow | "afraid to touch the code", "every change breaks something else", "no one understands the codebase", "legacy monolith", "it's held together with duct tape" | **Critical**: changes cause cascading production failures. **High**: development velocity near zero due to complexity. **Medium**: significant ramp-up time for new developers. **Low**: minor code smell, refactoring desired. |
| `MNT-DOC` | Documentation | Missing, outdated, or inaccurate documentation for APIs, processes, or systems | "no documentation", "docs are from 3 years ago", "API docs don't match reality", "tribal knowledge only", "had to read the source code to understand" | **Critical**: N/A (documentation alone rarely critical). **High**: onboarding blocked by missing docs. **Medium**: docs exist but are outdated/incomplete. **Low**: docs missing for edge cases. |
| `MNT-MOD` | Modularity | Tight coupling, lack of separation of concerns, monolithic architecture preventing independent changes | "can't update one thing without affecting everything", "monolithic", "tightly coupled", "can't deploy independently", "one team blocks another" | **Critical**: deployments require full system outage. **High**: changes require cross-team coordination always. **Medium**: some coupling, partial modularity. **Low**: modularity improvement would help velocity. |
| `MNT-TEST` | Test Coverage | Missing or insufficient automated tests causing fear of regressions | "no tests", "we test manually", "every release breaks something", "no CI/CD", "regression after regression", "QA is a bottleneck" | **Critical**: no tests, frequent production regressions. **High**: minimal tests, manual QA only. **Medium**: some tests but major gaps. **Low**: good coverage, minor gaps in edge cases. |

#### PRF - Performance

| ID | Subcategory | Definition | Example Complaint Phrases | Severity Indicators |
|----|-------------|------------|---------------------------|---------------------|
| `PRF-RESP` | Response Time | Slow page loads, API response latency, query execution time | "takes 30 seconds to load", "so slow", "the dashboard takes forever", "API timeout", "users complain about speed", "loading spinner of death" | **Critical**: >30s response times in core workflows. **High**: >10s response times regularly. **Medium**: >3s response times, user complaints. **Low**: >1s, noticeable but tolerable. |
| `PRF-THRU` | Throughput | System cannot process enough requests/records per unit time | "can only process 100 records at a time", "batch jobs take all night", "can't keep up with incoming data", "queue backs up" | **Critical**: throughput below business-critical minimum. **High**: batch jobs exceed available time window. **Medium**: throughput adequate but no headroom. **Low**: throughput sufficient, optimization desired. |
| `PRF-RSRC` | Resource Utilization | Inefficient use of CPU, memory, storage, or network bandwidth | "costs are out of control", "cloud bill doubled", "uses 10x the memory it should", "wasteful", "paying for resources we don't need" | **Critical**: cost growth unsustainable. **High**: significant waste, 2x+ expected cost. **Medium**: optimization could save meaningful cost. **Low**: minor inefficiency. |
| `PRF-CACH` | Caching | Missing or ineffective caching causing redundant computation or data fetching | "hits the database for every request", "no caching", "same query runs over and over", "cache invalidation issues", "stale data" | **Critical**: no caching, database overloaded. **High**: caching absent for high-traffic paths. **Medium**: caching exists but invalidation is broken. **Low**: caching works, minor stale-data windows. |

#### USA - Usability

| ID | Subcategory | Definition | Example Complaint Phrases | Severity Indicators |
|----|-------------|------------|---------------------------|---------------------|
| `USA-ONBD` | Onboarding | Difficulty getting started, setting up, or learning the product | "took weeks to set up", "no onboarding", "steep learning curve", "trial expired before we figured it out", "implementation was a nightmare" | **Critical**: N/A. **High**: >50% trial users fail to activate. **Medium**: onboarding requires dedicated support. **Low**: onboarding works but could be smoother. |
| `USA-NAV` | Navigation | Confusing UI layout, hard-to-find features, poor information architecture | "can never find what I need", "buried in menus", "UI is confusing", "too many clicks", "where is the settings page?", "feature exists but no one can find it" | **Critical**: N/A. **High**: core features undiscoverable. **Medium**: navigation requires training. **Low**: minor UX friction. |
| `USA-A11Y` | Accessibility | Non-compliance with WCAG, screen reader incompatibility, color contrast issues | "not accessible", "screen reader doesn't work", "can't use with keyboard only", "color contrast is terrible", "no alt text" | **Critical**: legal liability (ADA/Section 508). **High**: blocks users with disabilities entirely. **Medium**: partial accessibility, workarounds exist. **Low**: minor WCAG AA violations. |
| `USA-MOBL` | Mobile Responsiveness | Poor experience on mobile devices, no native app, unresponsive design | "unusable on mobile", "no mobile app", "have to pinch and zoom", "buttons too small on phone", "mobile version is broken" | **Critical**: N/A. **High**: mobile is required by user base and nonfunctional. **Medium**: mobile works but is frustrating. **Low**: desktop-primary product, mobile is nice-to-have. |

#### REL - Reliability

| ID | Subcategory | Definition | Example Complaint Phrases | Severity Indicators |
|----|-------------|------------|---------------------------|---------------------|
| `REL-UPTM` | Uptime | Frequent outages, downtime, service unavailability | "down again", "constant outages", "can't rely on it", "status page always yellow", "three outages this month", "502 errors" | **Critical**: <99% uptime (>7h downtime/month). **High**: <99.9% uptime (>43min downtime/month). **Medium**: <99.95%, occasional disruptions. **Low**: rare outages, good track record. |
| `REL-FLTL` | Fault Tolerance | System fails completely when any component fails, no graceful degradation | "one thing breaks and the whole system goes down", "no failover", "single point of failure", "no redundancy", "cascading failures" | **Critical**: single component failure causes total outage. **High**: multiple SPOFs identified. **Medium**: some redundancy but gaps. **Low**: mostly fault-tolerant, edge cases remain. |
| `REL-DR` | Disaster Recovery | Missing or untested backup/recovery procedures, long RTO/RPO | "no backups", "lost all our data", "recovery took 3 days", "backup was corrupted", "no disaster recovery plan", "RPO is 24 hours" | **Critical**: no backups or DR plan. **High**: backups exist but never tested; RPO >24h. **Medium**: DR plan exists, RTO >4h. **Low**: DR solid, minor improvement areas. |
| `REL-DINT` | Data Integrity | Data corruption, inconsistencies, lost records, race conditions | "duplicate records", "data doesn't match", "records disappeared", "numbers don't add up", "sync created duplicates", "data corruption" | **Critical**: silent data corruption in production. **High**: frequent data inconsistencies. **Medium**: occasional duplicates or mismatches. **Low**: rare edge-case integrity issues. |

#### INT - Integration

| ID | Subcategory | Definition | Example Complaint Phrases | Severity Indicators |
|----|-------------|------------|---------------------------|---------------------|
| `INT-API` | API Availability | Missing, limited, or poorly designed APIs preventing programmatic access | "no API", "API is read-only", "API doesn't support bulk operations", "undocumented API", "REST only, need GraphQL" | **Critical**: no API at all, business requires it. **High**: API exists but missing critical endpoints. **Medium**: API functional but poorly designed. **Low**: API available, minor enhancements desired. |
| `INT-HOOK` | Webhook Support | Missing webhooks or event notifications for real-time integration | "no webhooks", "have to poll for changes", "can't get real-time notifications", "no event-driven integration", "webhook is unreliable" | **Critical**: N/A. **High**: no webhooks, polling required for critical workflow. **Medium**: webhooks exist but unreliable or limited. **Low**: webhook coverage incomplete for edge cases. |
| `INT-3PRT` | Third-Party Connectors | Missing native integrations with commonly-used business tools | "doesn't integrate with Salesforce", "no Slack integration", "had to build a custom connector", "Zapier connection breaks constantly", "no native QuickBooks integration" | **Critical**: N/A. **High**: missing integration with primary business system. **Medium**: integration exists but is fragile. **Low**: nice-to-have integration missing. |
| `INT-FMT` | Data Format Support | Inability to import/export data in required formats | "can't export to CSV", "no JSON support", "only exports PDF", "can't import our data", "no bulk import", "data locked in the platform" | **Critical**: data export impossible (vendor lock-in). **High**: missing critical import/export format. **Medium**: format supported but lossy or incomplete. **Low**: minor format preference. |

---

## 5. B2B Workflow Bottleneck Pattern Taxonomy

Each pattern represents a recurring business workflow problem detectable from user reviews and complaints. These patterns map directly to Labno Labs consulting opportunities.

### Pattern 1: API Limit Exhaustion

| Attribute | Value |
|-----------|-------|
| **Pattern ID** | `BTL-001` |
| **Pattern Name** | API Limit Exhaustion |
| **Description** | The software imposes API rate limits or call quotas that prevent customers from building integrations, automations, or data pipelines at the scale they need. |
| **Example Complaints** | "We hit the API rate limit every day by 10am", "Had to upgrade to enterprise just for more API calls", "Our integration breaks because of the 100-calls-per-minute limit", "Can't sync all our data because of API throttling", "Rate limited again, our Zapier workflows are failing" |
| **Underlying Business Problem** | Customer's business processes depend on programmatic access that exceeds the vendor's imposed limits, forcing either expensive tier upgrades, architectural workarounds, or workflow degradation. |
| **Labno Labs Opportunity** | Build custom middleware/proxy that batches, caches, and queues API calls to maximize throughput within limits. Design async architectures that decouple business logic from API call timing. Implement smart retry with exponential backoff. |
| **Severity Scoring** | **High (3)**: API limits actively breaking production workflows. **Medium (2)**: Limits causing daily workarounds or manual intervention. **Low (1)**: Limits are a nuisance but not blocking. |

### Pattern 2: Post-Sale Management Chaos

| Attribute | Value |
|-----------|-------|
| **Pattern ID** | `BTL-002` |
| **Pattern Name** | Post-Sale Management Chaos |
| **Description** | After closing deals, teams struggle with handoffs, onboarding, ongoing account management, renewals, and upsell tracking due to disjointed tooling or missing workflows. |
| **Example Complaints** | "Sales closes the deal and then nothing happens for weeks", "Handoff from sales to CS is a mess", "We lose track of renewals", "Onboarding new clients takes 6 weeks of manual work", "No way to track account health", "Customer success has no visibility into what sales promised" |
| **Underlying Business Problem** | The gap between CRM (sale closed) and delivery/CS systems creates dropped balls, delayed onboarding, and churn risk. No single system owns the post-sale lifecycle. |
| **Labno Labs Opportunity** | Build automated handoff workflows (CRM-to-CS pipeline), account health dashboards, renewal alert systems, and onboarding automation sequences. Integrate disparate post-sale tools into a unified view. |
| **Severity Scoring** | **High (3)**: Customer churn directly attributed to post-sale gaps. **Medium (2)**: Manual workarounds consuming significant CS team time. **Low (1)**: Minor friction in handoff process. |

### Pattern 3: Bulk Data Operation Failures

| Attribute | Value |
|-----------|-------|
| **Pattern ID** | `BTL-003` |
| **Pattern Name** | Bulk Data Operation Failures |
| **Description** | The software fails, times out, or produces errors when users attempt bulk imports, exports, updates, or deletions. Operations that work for 10 records break at 10,000. |
| **Example Complaints** | "Bulk import failed at row 5,000 with no error message", "CSV export times out for anything over 10,000 rows", "Tried to update 500 contacts and the app froze", "Bulk delete doesn't work", "Import took 4 hours and then failed", "Had to break our upload into 50-row batches" |
| **Underlying Business Problem** | Business operations require manipulating data at scale (migrations, quarterly clean-ups, mass updates), but the software was designed for single-record CRUD operations. |
| **Labno Labs Opportunity** | Build custom ETL pipelines that handle bulk operations outside the application. Design chunked import/export workers with progress tracking, error recovery, and rollback. Create data migration tooling. |
| **Severity Scoring** | **High (3)**: Bulk operations completely non-functional, blocking business processes. **Medium (2)**: Bulk operations work with significant manual intervention. **Low (1)**: Slow but functional. |

### Pattern 4: Support Resolution Delays

| Attribute | Value |
|-----------|-------|
| **Pattern ID** | `BTL-004` |
| **Pattern Name** | Support Resolution Delays |
| **Description** | Customer support is slow, unhelpful, or unresponsive, leaving users stuck on blocking issues for days or weeks. Ticket routing, escalation, and resolution processes are broken. |
| **Example Complaints** | "Support ticket open for 3 weeks with no response", "Got a canned response that didn't help", "Had to escalate 4 times to get a real answer", "Support doesn't understand their own product", "Paid for premium support and still wait 5 days", "Chat bot is useless, can't reach a human" |
| **Underlying Business Problem** | The vendor's support infrastructure cannot scale with their customer base. Lack of self-service resources, knowledge base gaps, and undertrained support staff create a bottleneck. |
| **Labno Labs Opportunity** | Build AI-powered support triage and routing. Create comprehensive knowledge bases and self-service portals. Design escalation automation workflows. Implement support analytics dashboards to identify systemic issues. |
| **Severity Scoring** | **High (3)**: Production-blocking issues unresolved for >1 week. **Medium (2)**: Support consistently slow (>48h response). **Low (1)**: Support adequate but impersonal. |

### Pattern 5: Manual Data Entry Bottleneck

| Attribute | Value |
|-----------|-------|
| **Pattern ID** | `BTL-005` |
| **Pattern Name** | Manual Data Entry Bottleneck |
| **Description** | Users spend hours manually entering, copying, or re-keying data that could be automated, either because the software lacks integrations, bulk operations, or import capabilities. |
| **Example Complaints** | "I spend 2 hours a day copying data between systems", "No way to auto-populate fields", "Have to manually enter every invoice", "Triple data entry across three platforms", "Copy-pasting from spreadsheets into the app", "We hired a person just to do data entry" |
| **Underlying Business Problem** | Absence of automation forces expensive human labor on repetitive data tasks, introducing errors, reducing throughput, and demoralizing staff. |
| **Labno Labs Opportunity** | Build RPA/automation workflows, form auto-fill integrations, OCR/AI document extraction, spreadsheet-to-system bridges, and data synchronization pipelines. |
| **Severity Scoring** | **High (3)**: >2 hours/day of manual entry per person. **Medium (2)**: 30min-2h/day of manual entry. **Low (1)**: Occasional manual entry annoyance. |

### Pattern 6: Integration Failure / Siloed Systems

| Attribute | Value |
|-----------|-------|
| **Pattern ID** | `BTL-006` |
| **Pattern Name** | Integration Failure / Siloed Systems |
| **Description** | The software does not connect with other tools in the customer's stack, creating data silos, duplicate data, and broken workflows that span multiple systems. |
| **Example Complaints** | "Doesn't talk to any of our other tools", "Data is stuck in silos", "Had to build a custom integration that keeps breaking", "Zapier integration is unreliable", "No native Salesforce connector", "Our data lives in 5 different places with no sync" |
| **Underlying Business Problem** | Modern businesses run 50-200 SaaS tools. When tools don't integrate, humans become the integration layer -- copying data, reconciling discrepancies, and maintaining fragile custom connectors. |
| **Labno Labs Opportunity** | Design and build integration architectures: API middleware, iPaaS configuration, custom connectors, event-driven sync pipelines, and unified data layers. |
| **Severity Scoring** | **High (3)**: Critical business process requires manual data transfer between systems daily. **Medium (2)**: Integration exists but is fragile/unreliable. **Low (1)**: Integration would be nice but manual process is manageable. |

### Pattern 7: Reporting & Analytics Gap

| Attribute | Value |
|-----------|-------|
| **Pattern ID** | `BTL-007` |
| **Pattern Name** | Reporting & Analytics Gap |
| **Description** | The software lacks the reporting, dashboards, or analytics capabilities users need, forcing them to export data and build reports in external tools (spreadsheets, BI tools). |
| **Example Complaints** | "Reporting is useless", "Can't build custom reports", "Have to export to Excel for any real analysis", "Dashboard doesn't show what we need", "No way to track KPIs", "Spent $50K on a BI tool just to report on this platform's data" |
| **Underlying Business Problem** | Decision-makers cannot get the insights they need from the tool that holds the data, creating a dependency on external BI tooling and data engineering effort. |
| **Labno Labs Opportunity** | Build custom dashboards, automated reporting pipelines, data warehouse integrations, embedded analytics, and AI-powered insight generation. |
| **Severity Scoring** | **High (3)**: No reporting at all; critical business decisions delayed. **Medium (2)**: Basic reporting exists but requires manual export/transformation. **Low (1)**: Reporting exists but lacks customization. |

### Pattern 8: Onboarding & Implementation Friction

| Attribute | Value |
|-----------|-------|
| **Pattern ID** | `BTL-008` |
| **Pattern Name** | Onboarding & Implementation Friction |
| **Description** | Getting the software set up, configured, and adopted takes too long, costs too much, or requires too much vendor-side professional services. Time-to-value is unacceptably high. |
| **Example Complaints** | "Implementation took 6 months", "We need a consultant just to set it up", "Configuration is incredibly complex", "Onboarding documentation is terrible", "Took 3 months before anyone actually used it", "Professional services cost more than the license" |
| **Underlying Business Problem** | Complex software with poor onboarding creates a long time-to-value, increasing churn risk during the critical first 90 days and inflating total cost of ownership. |
| **Labno Labs Opportunity** | Offer accelerated implementation services, build configuration-as-code templates, create onboarding automation, design training programs, and build self-service setup wizards. |
| **Severity Scoring** | **High (3)**: Implementation >6 months or requires dedicated consultant. **Medium (2)**: Implementation 1-6 months with significant effort. **Low (1)**: Setup takes days but could be easier. |

### Pattern 9: Permission & Access Control Issues

| Attribute | Value |
|-----------|-------|
| **Pattern ID** | `BTL-009` |
| **Pattern Name** | Permission & Access Control Issues |
| **Description** | The software's permission model is too coarse, too complex, or too rigid. Users either have too much access (security risk) or too little (productivity blocker). |
| **Example Complaints** | "Can't restrict access by department", "Everyone is either admin or read-only, nothing in between", "Permission setup is a nightmare", "New hire can see all company financials", "Takes IT a week to set up permissions for a new team member", "Custom roles would solve everything but they don't exist" |
| **Underlying Business Problem** | Insufficient access control granularity creates security risks (over-permissioning) or productivity bottlenecks (under-permissioning), both of which worsen as the organization grows. |
| **Labno Labs Opportunity** | Design and implement RBAC/ABAC systems, build permission management dashboards, create automated provisioning workflows (SCIM/SSO integration), and audit access patterns. |
| **Severity Scoring** | **High (3)**: Security breach risk from overly broad access. **Medium (2)**: Significant admin time spent managing permissions. **Low (1)**: Permission model works but is inflexible. |

### Pattern 10: Mobile/Cross-Platform Gaps

| Attribute | Value |
|-----------|-------|
| **Pattern ID** | `BTL-010` |
| **Pattern Name** | Mobile/Cross-Platform Gaps |
| **Description** | The software is desktop-only, has a poor mobile experience, or lacks feature parity across platforms. Field teams, executives, and remote workers cannot access critical functionality from mobile devices. |
| **Example Complaints** | "No mobile app", "Mobile app is just a web wrapper", "Can't approve requests from my phone", "Field techs need a tablet version", "Mobile version is missing half the features", "Crashes constantly on Android", "iPad app hasn't been updated in 2 years" |
| **Underlying Business Problem** | Workforce mobility requires cross-platform access. Desktop-only software creates workflow gaps for field workers, traveling executives, and remote teams who need real-time access. |
| **Labno Labs Opportunity** | Build responsive web apps, progressive web apps (PWAs), mobile-optimized dashboards, offline-capable field apps, and cross-platform approval/notification workflows. |
| **Severity Scoring** | **High (3)**: Mobile access required for core job function and completely unavailable. **Medium (2)**: Mobile exists but is severely limited or unreliable. **Low (1)**: Mobile is a convenience, not a requirement. |

### Bottleneck Severity Summary Matrix

| Score | Label | Definition | Action |
|-------|-------|------------|--------|
| 3 | High | Pattern is actively blocking business operations or causing measurable revenue/productivity loss | Immediate outreach opportunity |
| 2 | Medium | Pattern causes significant friction, workarounds, or wasted time | Nurture with educational content, outreach when frequency increases |
| 1 | Low | Pattern is an annoyance or improvement opportunity, not blocking | Log for trend analysis, batch into quarterly reports |

---

## 6. Job Description Debt Taxonomy

Job postings reveal organizational technical debt and readiness signals. This taxonomy maps specific keyword phrases in job descriptions to debt categories with confidence levels.

### Infrastructure Debt Indicators

**Category ID**: `DEBT-INFRA`

Signals that the company is carrying significant infrastructure or platform technical debt.

| # | Keyword/Phrase | Confidence | Rationale |
|---|----------------|------------|-----------|
| 1 | "legacy monolith" | High | Explicitly naming the problem |
| 2 | "Python 2" | High | End-of-life language version |
| 3 | "on-premise" / "on-prem" | Medium | May be intentional, but often signals migration need |
| 4 | "COBOL" | High | Extremely dated technology |
| 5 | "migrate from" / "migration from" | High | Active migration signals existing debt |
| 6 | "technical debt" | High | Explicitly named |
| 7 | "modernize" / "modernization" | High | Implies current state is outdated |
| 8 | "rewrite" / "re-architect" | High | Existing system is unsalvageable |
| 9 | "mainframe" | High | Legacy infrastructure |
| 10 | "PHP 5" / "Java 6" / "Java 7" | High | End-of-life language versions |
| 11 | "Windows Server 2008" / "Windows Server 2012" | High | End-of-support OS |
| 12 | "jQuery" (as primary framework) | Medium | Signals lack of modern frontend architecture |
| 13 | "stored procedures" (as primary logic layer) | Medium | Business logic in DB layer |
| 14 | "FTP" / "SFTP" (as primary data transfer) | Medium | File-based integration suggests legacy architecture |
| 15 | "SVN" / "Subversion" / "TFS" | Medium | Legacy version control |
| 16 | "spaghetti code" | High | Explicitly named code quality issue |

**Detection Rule**: If a job posting matches >= 2 High-confidence phrases, classify the company as having significant infrastructure debt. A single High + 2 Medium also qualifies.

### Workflow Automation Readiness Indicators

**Category ID**: `DEBT-AUTO`

Signals that the company has manual processes ripe for automation.

| # | Keyword/Phrase | Confidence | Rationale |
|---|----------------|------------|-----------|
| 1 | "manual spreadsheets" | High | Explicit manual process |
| 2 | "data entry" (in job responsibilities) | High | Manual data work as a job function |
| 3 | "approval workflows" | Medium | May already be automated, but often manual |
| 4 | "manual reporting" | High | Reports built by hand |
| 5 | "Excel-based" / "spreadsheet-based" | High | Core processes in spreadsheets |
| 6 | "copy data between" / "transfer data between" | High | Manual system-to-system data movement |
| 7 | "reconciliation" (manual context) | Medium | Often implies manual matching |
| 8 | "automate existing processes" | High | Explicit automation need |
| 9 | "streamline operations" | Medium | Implies current operations are inefficient |
| 10 | "reduce manual effort" | High | Explicit manual effort problem |
| 11 | "process improvement" | Medium | General improvement, may include automation |
| 12 | "document management" (without ECM tool mentioned) | Medium | Manual document handling |
| 13 | "email-based workflow" / "email-driven" | High | Process managed via email threads |
| 14 | "paper-based" / "paper forms" | High | Not yet digitized |
| 15 | "track in spreadsheets" | High | Spreadsheet as database |

**Detection Rule**: >= 2 High-confidence phrases, or >= 1 High + 3 Medium.

### AI Readiness Indicators

**Category ID**: `DEBT-AI`

Signals that the company is investing in or preparing for AI/ML capabilities.

| # | Keyword/Phrase | Confidence | Rationale |
|---|----------------|------------|-----------|
| 1 | "AI Center of Excellence" | High | Formal AI initiative |
| 2 | "ML engineer" / "machine learning engineer" | High | Building ML team |
| 3 | "data science" (in title or team name) | High | Data science function exists or being built |
| 4 | "LLM" / "large language model" | High | Working with or evaluating LLMs |
| 5 | "generative AI" / "GenAI" | High | Explicit generative AI initiative |
| 6 | "AI strategy" | High | Strategic AI investment |
| 7 | "MLOps" | High | Operationalizing ML models |
| 8 | "model training" / "model deployment" | High | Active ML pipeline |
| 9 | "natural language processing" / "NLP" | High | Specific AI/ML technique |
| 10 | "computer vision" | High | Specific AI/ML technique |
| 11 | "AI-powered" / "AI-driven" | Medium | May be aspirational vs. actual |
| 12 | "intelligent automation" | Medium | May mean RPA, not true AI |
| 13 | "chatbot" / "conversational AI" | Medium | May be simple rule-based |
| 14 | "data pipeline" (with ML context) | Medium | Supporting infrastructure for ML |
| 15 | "feature engineering" / "feature store" | High | ML-specific data infrastructure |
| 16 | "RAG" / "retrieval augmented generation" | High | Advanced LLM architecture |

**Detection Rule**: Any High-confidence AI phrase signals AI readiness. >= 3 High phrases indicates active AI investment (strong outreach signal).

### Cloud Migration Need Indicators

**Category ID**: `DEBT-CLOUD`

Signals that the company is migrating to or expanding cloud infrastructure.

| # | Keyword/Phrase | Confidence | Rationale |
|---|----------------|------------|-----------|
| 1 | "AWS" / "Amazon Web Services" | Medium | Using cloud, but may already be mature |
| 2 | "Azure" / "Microsoft Azure" | Medium | Same as above |
| 3 | "GCP" / "Google Cloud Platform" | Medium | Same as above |
| 4 | "containerization" / "Docker" | Medium | Modernizing deployment |
| 5 | "Kubernetes" / "K8s" / "EKS" / "AKS" / "GKE" | Medium | Container orchestration |
| 6 | "cloud migration" | High | Explicit migration project |
| 7 | "cloud-native" | Medium | May be aspirational or actual |
| 8 | "lift and shift" | High | Active migration methodology |
| 9 | "hybrid cloud" | High | Managing on-prem + cloud transition |
| 10 | "multi-cloud" | Medium | Advanced cloud strategy |
| 11 | "serverless" / "Lambda" / "Cloud Functions" | Medium | Cloud-native architecture adoption |
| 12 | "Infrastructure as Code" / "Terraform" / "CloudFormation" | Medium | Automating cloud infrastructure |
| 13 | "migrate to cloud" / "move to cloud" | High | Explicit migration intent |
| 14 | "decommission data center" | High | Active on-prem sunset |
| 15 | "cloud architect" (as new hire) | High | Building cloud capability |

**Detection Rule**: >= 1 High-confidence phrase indicates active migration. "cloud migration" or "migrate to cloud" combined with on-prem indicators (`DEBT-INFRA`) is a strong outreach signal.

### Composite Debt Score

When a single job posting matches multiple debt categories, compute a composite score:

```
composite_debt_score = (
    infra_match_count * 1.0 +
    auto_match_count  * 1.2 +
    ai_match_count    * 0.8 +
    cloud_match_count * 0.9
) / total_possible_matches * 100
```

Weights reflect Labno Labs service alignment (workflow automation is the highest-value service).

| Composite Score | Classification | Action |
|-----------------|---------------|--------|
| >= 30 | High Debt | Priority outreach target |
| 15-29 | Medium Debt | Add to nurture pipeline |
| < 15 | Low Debt | Monitor only |

---

## 7. Intent Score Dimension Definitions

The intent score quantifies how likely a company is to buy consulting services based on observable signals. It is computed across four dimensions, each normalized to [0, 1], then combined with configurable weights.

### Final Intent Score Formula

```
intent_score = (
    w_recency    * recency_score +
    w_frequency  * frequency_score +
    w_depth      * depth_score +
    w_seniority  * seniority_score
)
```

**Default weights:**

| Weight | Value | Rationale |
|--------|-------|-----------|
| `w_recency` | 0.25 | Recent signals are more actionable |
| `w_frequency` | 0.20 | Repeated signals indicate persistent pain |
| `w_depth` | 0.30 | Deeper engagement signals higher intent |
| `w_seniority` | 0.25 | Senior decision-makers drive purchases |

### Dimension 1: Recency Score

**Purpose**: More recent signals are more valuable. A complaint from yesterday matters more than one from 6 months ago.

**Formula** (exponential decay):

```
recency_score = exp(-lambda * days_since_signal)

where:
    lambda    = ln(2) / half_life
    half_life = 30 days (configurable)
    days_since_signal = (today - signal_date).days
```

**Behavior**:

| Days Since Signal | Score |
|-------------------|-------|
| 0 (today) | 1.000 |
| 7 | 0.851 |
| 14 | 0.724 |
| 30 | 0.500 |
| 60 | 0.250 |
| 90 | 0.125 |
| 180 | 0.016 |
| 365 | 0.000 (below cutoff) |

**Cutoff**: Signals older than 180 days receive a score of 0.0 and are excluded from calculations (configurable via `recency_cutoff_days`).

**Aggregation**: When multiple signals exist, use the maximum recency score (most recent signal dominates).

```
recency_score_company = max(recency_score_i for all signals i)
```

### Dimension 2: Frequency Score

**Purpose**: Companies that appear repeatedly across multiple signals (reviews, job postings, complaints) are more likely to have persistent, unresolved problems.

**Formula** (log-normalized count):

```
frequency_score = min(1.0, log(1 + signal_count) / log(1 + saturation_threshold))

where:
    signal_count          = number of unique signals in the counting window
    counting_window       = 90 days (configurable)
    saturation_threshold  = 20 signals (configurable; score = 1.0 at this count)
```

**Behavior**:

| Signal Count (90 days) | Score |
|------------------------|-------|
| 0 | 0.000 |
| 1 | 0.231 |
| 3 | 0.462 |
| 5 | 0.597 |
| 10 | 0.798 |
| 15 | 0.927 |
| 20+ | 1.000 |

**Counting Rules**:
- Each unique `review_id_external` or `posting_url` counts as one signal.
- Duplicate signals (same review seen on multiple scrapes) count once.
- Signals from different source platforms for the same company all count.

### Dimension 3: Depth Score

**Purpose**: Not all signals carry equal weight. A detailed 500-word complaint about API failures signals more intent than a 1-star rating with no text.

**Action Hierarchy and Weights**:

| Action Type | Weight | Description |
|-------------|--------|-------------|
| `detailed_negative_review` | 1.00 | Review with >= 200 chars of complaint text + rating <= 2 |
| `negative_review_with_alternatives` | 0.95 | Negative review that mentions competitors or alternatives considered |
| `job_posting_debt_signal` | 0.90 | Job posting matching >= 2 debt indicators |
| `negative_review_basic` | 0.70 | Review with rating <= 2 but < 200 chars text |
| `moderate_review_with_complaints` | 0.60 | Review with rating 3 and complaint text in cons_text |
| `job_posting_generic` | 0.40 | Job posting with 1 or fewer debt indicators |
| `positive_review_with_caveats` | 0.20 | Review with rating >= 4 but significant cons_text |
| `positive_review` | 0.05 | Review with rating >= 4 and minimal complaints |

**Aggregation**: Use the weighted average of the top 5 signals (by weight), capped at 1.0:

```
depth_score = min(1.0, sum(top_5_weights) / 5)
```

### Dimension 4: Seniority Score

**Purpose**: Signals from senior decision-makers are more actionable than those from individual contributors. A VP of Engineering complaining about technical debt is a stronger buying signal than a junior developer.

**Title-to-Weight Mapping Table**:

| Seniority Level | Weight | Title Patterns (regex) |
|-----------------|--------|----------------------|
| C-Level | 1.00 | `^(CEO\|CTO\|CIO\|COO\|CFO\|CMO\|CPO\|Chief .*)` |
| VP | 0.90 | `^(VP\|Vice President\|SVP\|EVP)` |
| Director | 0.80 | `^(Director\|Sr\.? Director\|Head of)` |
| Senior Manager | 0.70 | `^(Senior Manager\|Sr\.? Manager\|Group Manager)` |
| Manager | 0.60 | `^(Manager\|Team Lead\|Program Manager\|Project Manager)` |
| Senior IC | 0.50 | `^(Senior\|Sr\.?\|Staff\|Principal\|Lead) (Engineer\|Developer\|Analyst\|Architect\|Consultant)` |
| Mid IC | 0.35 | `^(Engineer\|Developer\|Analyst\|Designer\|Consultant)` (without Senior/Lead prefix) |
| Junior IC | 0.20 | `^(Junior\|Jr\.?\|Associate\|Entry)` |
| Unknown | 0.30 | Title not parseable or not provided |

**Aggregation**: Use the maximum seniority score across all signals for a company:

```
seniority_score_company = max(seniority_weight_i for all signals i)
```

### Intent Score Interpretation

| Intent Score Range | Label | Action |
|--------------------|-------|--------|
| 0.75 - 1.00 | **Hot** | Immediate personalized outreach |
| 0.50 - 0.74 | **Warm** | Template-based outreach within 1 week |
| 0.30 - 0.49 | **Cool** | Add to nurture campaign |
| 0.00 - 0.29 | **Cold** | Monitor only, no outreach |

---

## 8. Outreach Template Type Definitions

Each template type is triggered by specific signal combinations and produces outreach tailored to the detected pain point.

### Template 1: Frontend Technical Debt

| Attribute | Definition |
|-----------|------------|
| **Template ID** | `TMPL-FE-DEBT` |
| **Trigger Conditions** | Bottleneck patterns `BTL-010` (Mobile/Cross-Platform Gaps) detected at severity >= 2, OR NFR categories `USA-NAV`, `USA-MOBL`, `USA-A11Y` detected in reviews with rating <= 2, OR job posting matches `DEBT-INFRA` with frontend-specific keywords (jQuery, Angular 1.x, Backbone, PHP templates). |
| **Tone** | Technical but empathetic. Peer-to-peer, not salesy. Acknowledge the pain of maintaining legacy frontends. |
| **Target Persona** | VP/Director of Engineering, Frontend Lead, CTO at companies with 50-500 employees. |
| **Key Talking Points** | 1. We've seen the same frontend challenges at similar companies. 2. Modern React/Next.js stack reduces maintenance burden by 60%. 3. Component libraries + design systems prevent UI drift. 4. We do incremental migrations, not risky big-bang rewrites. 5. Reference specific user complaints (anonymized) as validation. |
| **CTA Type** | **Technical assessment offer**: "We do a free 2-hour frontend architecture review. Would it be useful to see where the biggest maintenance wins are?" |

### Template 2: Operational Bottleneck

| Attribute | Definition |
|-----------|------------|
| **Template ID** | `TMPL-OPS-BTL` |
| **Trigger Conditions** | Bottleneck patterns `BTL-002` (Post-Sale Chaos), `BTL-005` (Manual Data Entry), `BTL-006` (Integration Failure), or `BTL-007` (Reporting Gap) detected at severity >= 2. OR job posting matches `DEBT-AUTO` with >= 2 High-confidence phrases. |
| **Tone** | Business-focused, outcome-oriented. Speak in terms of hours saved, errors eliminated, and revenue protected. |
| **Target Persona** | COO, VP of Operations, Director of Business Systems, Revenue Operations Manager. |
| **Key Talking Points** | 1. Quantify the cost of the bottleneck ("Companies like yours typically spend X hours/week on manual data transfer"). 2. Automation ROI typically 3-6 months. 3. We build on your existing stack, not rip-and-replace. 4. Start with one workflow, prove value, expand. 5. Name the specific bottleneck detected. |
| **CTA Type** | **ROI calculator / discovery call**: "We've built a quick model that estimates automation ROI for [specific bottleneck]. Want me to send over the numbers for your situation?" |

### Template 3: Infrastructure Debt

| Attribute | Definition |
|-----------|------------|
| **Template ID** | `TMPL-INFRA-DEBT` |
| **Trigger Conditions** | Job posting matches `DEBT-INFRA` with >= 2 High-confidence phrases (legacy monolith, Python 2, mainframe, etc.). OR job posting matches `DEBT-CLOUD` with High-confidence migration phrases. OR NFR categories `SCA-HORZ`, `SCA-DATA`, `REL-UPTM`, or `MNT-CODE` detected in reviews with severity High. |
| **Tone** | Deeply technical, architect-to-architect. Demonstrate understanding of migration complexity and risk. |
| **Target Persona** | CTO, VP of Engineering, Director of Platform/Infrastructure, Principal Architect. |
| **Key Talking Points** | 1. We've migrated [N] legacy systems to modern architectures. 2. Strangler fig pattern reduces migration risk. 3. We establish automated testing before touching a single line of legacy code. 4. Reference the specific technology debt detected (e.g., "We noticed you're hiring for Python 3 migration"). 5. Discuss phased approach: assess, pilot, migrate, optimize. |
| **CTA Type** | **Architecture review**: "We offer a complimentary architecture assessment that maps your current state and identifies the highest-ROI modernization targets. Interested?" |

### Template 4: AI Readiness

| Attribute | Definition |
|-----------|------------|
| **Template ID** | `TMPL-AI-READY` |
| **Trigger Conditions** | Job posting matches `DEBT-AI` with >= 2 High-confidence phrases. OR job title contains "AI", "ML", "Data Science" at Director+ level (new hire signals new initiative). OR company reviews mention "AI", "automation", "machine learning" in pros/cons text. |
| **Tone** | Visionary but grounded. Balance excitement about AI potential with practical implementation reality. Avoid hype. |
| **Target Persona** | CTO, VP of Data/AI, Head of Data Science, Chief Digital Officer, VP of Product. |
| **Key Talking Points** | 1. AI strategy without execution is expensive shelf-ware. 2. We start with data readiness assessment (most AI projects fail because of data, not models). 3. LLM/RAG implementations for internal knowledge bases deliver fastest ROI. 4. We build with your team, not instead of your team (capability transfer). 5. Reference specific AI-readiness signals detected. |
| **CTA Type** | **AI readiness assessment**: "We've developed a structured AI readiness assessment that identifies your highest-ROI AI use cases based on your data, team, and workflows. Takes 90 minutes. Would that be valuable?" |

### Template 5: Healthcare-Specific

| Attribute | Definition |
|-----------|------------|
| **Template ID** | `TMPL-HEALTH` |
| **Trigger Conditions** | `reviewer_industry` == "Healthcare" or company name/description matches healthcare vertical. AND any bottleneck pattern at severity >= 2 OR NFR `SEC-COMP` detected (HIPAA). OR job posting from healthcare company matching any debt category. |
| **Tone** | Compliance-aware, patient-safety-conscious, industry-insider. Demonstrate deep understanding of HIPAA, EHR integrations, and clinical workflow constraints. |
| **Target Persona** | CTO/CIO of health system, VP of Clinical Informatics, Director of Health IT, CMIO, Practice Administrator. |
| **Key Talking Points** | 1. We build HIPAA-compliant from day one (BAA available). 2. EHR integration experience (Epic FHIR, Cerner, Athenahealth). 3. Clinical workflow understanding -- we don't break care delivery to fix tech. 4. PHI handling, audit trails, and compliance reporting built in. 5. Reference Movement Solutions (Lance's PT practice) as domain credibility. |
| **CTA Type** | **Compliance + workflow review**: "We specialize in healthcare tech that's compliant by design. Happy to do a quick review of your compliance posture and identify where automation can save clinical staff time. Would next week work?" |

### Template 6: Competitive Displacement

| Attribute | Definition |
|-----------|------------|
| **Template ID** | `TMPL-COMP-DISP` |
| **Trigger Conditions** | B2B review contains `alternatives_considered` with >= 2 entries. OR `competitive_comparisons` text mentions switching or evaluating competitors. OR negative review (rating <= 2) with `cons_text` mentioning a competitor by name. OR `developer_response` is absent on a negative review (vendor not engaged). |
| **Tone** | Consultative, vendor-neutral advisor. Position Labno Labs as helping them make the right technology choice, not pushing a specific product. |
| **Target Persona** | VP of IT, Director of Business Systems, Head of Procurement, CFO (for cost-driven switches). |
| **Key Talking Points** | 1. Switching vendors is expensive and risky without a migration plan. 2. We do vendor evaluation frameworks (weighted scoring, POC design). 3. Data migration is the hardest part -- we specialize in it. 4. Total cost of ownership analysis (not just license cost). 5. Reference the specific frustration detected and the alternatives being considered. |
| **CTA Type** | **Vendor evaluation framework**: "We've built a structured vendor evaluation framework that our clients use to compare alternatives objectively. Want me to send it over, customized for [software category]?" |

### Template Selection Priority

When multiple templates match, use this priority order:

1. **Healthcare-Specific** (always takes priority when healthcare is detected -- compliance sensitivity)
2. **Competitive Displacement** (highest urgency -- company is actively evaluating alternatives)
3. **Infrastructure Debt** (large project potential)
4. **AI Readiness** (strategic engagement)
5. **Operational Bottleneck** (bread-and-butter consulting)
6. **Frontend Technical Debt** (narrowest scope)

If two non-healthcare templates have equal priority, prefer the one with the higher intent score for the matched signals.

---

## Appendix A: Enumeration Values Reference

### Source Platforms

```json
{
  "app_store_platforms": ["apple_app_store", "google_play"],
  "b2b_review_platforms": ["g2", "capterra", "trustradius"],
  "job_platforms": ["linkedin", "indeed", "glassdoor", "company_careers", "builtin", "dice"]
}
```

### Company Size Brackets

```json
["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10001+"]
```

### Seniority Levels

```json
["entry", "mid", "senior", "lead", "manager", "director", "vp", "c_level"]
```

### Remote Work Policy

```json
["remote", "hybrid", "onsite", "unknown"]
```

### Bottleneck Pattern IDs

```json
["BTL-001", "BTL-002", "BTL-003", "BTL-004", "BTL-005", "BTL-006", "BTL-007", "BTL-008", "BTL-009", "BTL-010"]
```

### NFR Category IDs

```json
[
  "SEC-AUTH", "SEC-AUTHZ", "SEC-ENC", "SEC-COMP",
  "SCA-HORZ", "SCA-VERT", "SCA-DATA", "SCA-CONC",
  "MNT-CODE", "MNT-DOC", "MNT-MOD", "MNT-TEST",
  "PRF-RESP", "PRF-THRU", "PRF-RSRC", "PRF-CACH",
  "USA-ONBD", "USA-NAV", "USA-A11Y", "USA-MOBL",
  "REL-UPTM", "REL-FLTL", "REL-DR", "REL-DINT",
  "INT-API", "INT-HOOK", "INT-3PRT", "INT-FMT"
]
```

### Debt Category IDs

```json
["DEBT-INFRA", "DEBT-AUTO", "DEBT-AI", "DEBT-CLOUD"]
```

### Outreach Template IDs

```json
["TMPL-FE-DEBT", "TMPL-OPS-BTL", "TMPL-INFRA-DEBT", "TMPL-AI-READY", "TMPL-HEALTH", "TMPL-COMP-DISP"]
```

---

## Appendix B: Cross-Reference Matrix

Maps which data sources feed which taxonomies and scoring dimensions.

| Data Source | NFR Taxonomy | Bottleneck Patterns | Debt Taxonomy | Intent Score Dimensions |
|-------------|-------------|---------------------|---------------|------------------------|
| App Store Reviews | Yes (all categories) | Yes (BTL-001 through BTL-010) | No | Recency, Frequency, Depth |
| G2/Capterra Reviews | Yes (all categories) | Yes (BTL-001 through BTL-010) | No | Recency, Frequency, Depth, Seniority |
| Job Postings | No | No | Yes (all categories) | Recency, Frequency, Depth |
| Enrichment (LinkedIn) | No | No | No | Seniority |

---

*End of document. All schemas, taxonomies, and scoring formulas defined above constitute the data contracts for the Labno Labs GTM Signal Extraction system. Any changes to these contracts require version increment and downstream consumer notification.*
