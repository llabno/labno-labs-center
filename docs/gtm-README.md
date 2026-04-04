# GTM Signal Extraction System -- Documentation Hub

## Quick Start

The GTM Signal Extraction system is a 5-layer pipeline that scrapes app store reviews, B2B reviews, and job postings, then uses LLMs to extract pain-point signals and score companies for AI consulting outreach. Built for Labno Labs as a self-hosted, budget-conscious alternative to enterprise intent data providers.

**Current status:** Database schema deployed (11 tables, 2 views across all 5 layers). Architecture and data contracts documented. Bulk task creation script ready. Next: implement ingestion endpoints and Apify actor integration.

---

## Architecture

| Doc | Description |
|-----|-------------|
| [gtm-layer1-architecture.md](gtm-layer1-architecture.md) | Layer 1 operational reference -- ingestion streams, infrastructure, scheduling, cost tracking, runbook |

### The 5 Layers

| Layer | Name | What It Does |
|-------|------|-------------|
| 1 | **Raw Data Ingestion** | Scrapes app stores (Apple/Google Play), B2B review sites (G2/Capterra), and job boards (LinkedIn/Indeed) via Apify and Bright Data |
| 2 | **Semantic Parsing** | LLM-powered extraction of pain points, workflow bottlenecks, and hiring signals from raw text |
| 3 | **Intent Scoring** | Scores companies on pain severity, seniority, recency, and ICP fit; builds competitive intelligence |
| 4 | **Pipeline Routing** | Routes scored signals into pipeline stages and generates personalized outreach messages |
| 5 | **Agent Execution** | Autonomous agents send outreach, track responses, and update CRM |

---

## Data Contracts

| Doc | Description |
|-----|-------------|
| [gtm-schemas-and-taxonomies.md](gtm-schemas-and-taxonomies.md) | All data schemas, NFR taxonomy, bottleneck patterns, job description debt taxonomy, intent score dimensions |
| [gtm-semantic-output-schema.json](gtm-semantic-output-schema.json) | JSON Schema for LLM output -- every parsed signal must conform to this |

---

## Research & Decisions

| Doc | Description |
|-----|-------------|
| [gtm-research-apify-and-g2.md](gtm-research-apify-and-g2.md) | Apify actor comparison, G2 DataDome challenges, LinkedIn enrichment options |
| [gtm-research-intent-data-providers.md](gtm-research-intent-data-providers.md) | Evaluation of Bombora, 6sense, and other enterprise intent providers (all rejected as too expensive) |

**Key decisions:**
- **Build over buy** -- Enterprise intent providers start at $30K/year. Our pipeline costs ~$65/month.
- **EasyAPI for Apple, NeatRat for Google Play** -- Commodity pricing ($0.10/1K reviews), EasyAPI has richest field coverage.
- **Focused Vanguard for G2/Capterra** -- Single actor covers multiple platforms; budget 2-3x runs for G2 due to DataDome (~37% success rate).
- **Bright Data for LinkedIn Jobs** -- Only reliable option for job board scraping at scale.
- **Claude Haiku for classification** -- ~$0.30 per 1K reviews, fast enough for batch processing.

---

## Code Modules

No `src/lib/gtm-*.js` modules exist yet. Planned modules:

| Module | Purpose |
|--------|---------|
| `gtm-text-preprocessor.js` | Strip HTML, normalize unicode, truncate to token limits |
| `gtm-company-normalizer.js` | Canonical company name matching and deduplication |
| `gtm-intent-scorer.js` | Multi-dimension intent scoring (pain severity, seniority, recency, ICP fit) |
| `gtm-review-dedup.js` | Cross-platform review deduplication |
| `gtm-hiring-signals.js` | Extract tech stack and urgency signals from job postings |

---

## Outreach

| Doc | Description |
|-----|-------------|
| [gtm-outreach-templates.md](gtm-outreach-templates.md) | Structural blueprints for LLM-generated outreach messages; personalization scoring (min score 4 to send) |
| [gtm-llm-prompt-templates.md](gtm-llm-prompt-templates.md) | Copy-paste-ready prompts for app review classification, job posting analysis, outreach generation |

---

## Database

**Migration file:** `supabase/migrations/20260402_gtm_signal_extraction_tables.sql`

**Run the migration:**
```bash
supabase db push
# or apply directly:
psql $DATABASE_URL -f supabase/migrations/20260402_gtm_signal_extraction_tables.sql
```

**Tables (11) and Views (2):**

| Layer | Table | Purpose |
|-------|-------|---------|
| 1 | `gtm_mobile_reviews` | Apple App Store and Google Play reviews |
| 1 | `gtm_b2b_reviews` | G2, Capterra, TrustRadius reviews with firmographic data |
| 1 | `gtm_job_postings` | LinkedIn and Indeed job listings |
| 2 | `gtm_parsed_signals` | LLM-extracted pain points and bottleneck signals |
| 2 | `gtm_hiring_signals` | Tech stack and urgency signals from job descriptions |
| 3 | `gtm_intent_scores` | Multi-dimension intent scores per company |
| 3 | `gtm_company_profiles` | Enriched company profiles with ICP match |
| 3 | `gtm_competitive_intel` | Competitive switching and weakness signals |
| 4 | `gtm_pipeline_stages` | Deal pipeline tracking |
| 4 | `gtm_outreach_messages` | Generated and sent outreach messages |
| 5 | `gtm_agent_actions` | Autonomous agent action log |
| -- | `gtm_high_intent_accounts` | View: companies above intent threshold |
| -- | `gtm_active_pipeline` | View: deals currently in pipeline |

All tables have RLS enabled, restricted to `@labnolabs.com` and `@movement-solutions.com` email domains.

---

## Scripts

| Script | Purpose | Run |
|--------|---------|-----|
| `scripts/gtm-bulk-insert.mjs` | Bulk-creates ~500 GTM tasks as projects in Supabase | `node scripts/gtm-bulk-insert.mjs` |

---

## Cost Estimates

| Component | Minimum | Expected |
|-----------|---------|----------|
| App Store scraping (10K reviews) | $1 | $1 |
| B2B review scraping (G2/Capterra) | $6 | $20 |
| Job board scraping (Bright Data) | $10 | $24 |
| LLM classification (Claude Haiku) | -- | Included in expected |
| Vercel Pro | $20 | $20 |
| Supabase (Free/Pro) | $0 | $0-25 |
| **Total** | **$37/month** | **$65/month** |
