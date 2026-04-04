# GTM Research: Third-Party B2B Intent Data Providers

**Date:** 2026-04-02
**Purpose:** Evaluate intent data and enrichment providers for Labno Labs' GTM pipeline
**Context:** 2-person AI consulting firm, budget-conscious, building custom scraping pipeline alongside any third-party data

---

## 1. Bombora (Company Surge)

### What You Get
Bombora's core product is **Company Surge**, which detects when a company's research activity on a specific topic spikes above its historical baseline. It monitors a 3-week activity window against a 12-week baseline and assigns scores of 0-100. Scores at 60+ indicate "surging" intent. You get company-level signals only -- no individual contacts, emails, or phone numbers.

Data comes from a proprietary co-op of 5,000+ B2B media sites where Bombora has a tracking tag. They capture 16.6 billion interactions/month across 4.9 million unique domains. Topic taxonomy covers 17,210+ topics.

### What You Do NOT Get
Individual-level data. Bombora tells you "Acme Corp is researching AI consulting" but not who at Acme Corp is doing the research.

### Pricing
- **Starts at $30,000/year** ($2,500/month effective), annual contracts only
- Most mid-market companies pay $50,000-$100,000/year
- Each topic costs $500-$2,000/year (basic) or $5,000-$25,000/year (premium)
- Most teams need 20-50 topics to cover their ICP
- Enterprise tier required for API access

### API Availability
API access is gated to Enterprise tier. Standard plans get weekly CSV/report exports. 100+ pre-built integrations with CRM and ad platforms.

### Data Freshness
Weekly updates (standard). Enterprise can negotiate custom refresh cadence.

### Realistic for Labno Labs?
**No.** $30K/year minimum is prohibitive for a 2-person firm. The data is company-level only, so you still need a separate contact database. Bombora is designed for mid-market and enterprise marketing teams running ABM programs.

---

## 2. 6sense (Revenue AI)

### What You Get
6sense is a full ABM platform with intent data, predictive scoring, account identification, and orchestration. Their intent data combines first-party web visitor identification with third-party intent signals (they license Bombora data and have their own sources). The platform uses AI to predict which accounts are "in-market" and at what buying stage.

As of May 2025, 6sense consolidated into: Sales Intelligence + Data Credits, and Sales Intelligence + Predictive AI.

### Pricing
- **Starts at $40,000-$60,000/year** for the most basic deployment
- Typical mid-market deals: $100,000-$200,000/year
- Enterprise: $200,000-$300,000+/year
- Mandatory multi-year contracts with auto-renewal and tight cancellation windows

### API Availability
Available on higher tiers. The platform is primarily designed as a UI-first experience with CRM integrations.

### Data Freshness
Real-time for first-party visitor identification; third-party intent data varies by source.

### Realistic for Labno Labs?
**Absolutely not.** This is enterprise software priced for companies with dedicated RevOps teams. The minimum spend, complexity, and contract terms make it a non-starter for a small consulting firm.

---

## 3. ZoomInfo Intent

### What You Get
ZoomInfo combines its massive B2B contact database with intent data as an add-on. Their intent taxonomy covers 4,000-5,000 topics (about 1/3 of Bombora's coverage). The key advantage over Bombora is that ZoomInfo bundles contacts + intent in one platform, so you get both "who is surging" and "who to contact at that company."

### Pricing
- **Intent add-on alone: $12,000-$20,000/year** (requires base ZoomInfo subscription)
- Base ZoomInfo (Advanced tier) + intent: $46,000-$54,000/year for a 5-person team
- Enterprise deals: $60,000-$100,000+/year
- Annual contracts required

### API Availability
Available on higher-tier plans. Well-documented REST API for contact and company lookups.

### Data Freshness
Intent signals updated weekly. Contact data updated continuously.

### Realistic for Labno Labs?
**No.** Even the base platform without intent is $15,000+/year. ZoomInfo is priced for sales teams, not 2-person consulting firms. However, ZoomInfo's contact data is best-in-class -- if budget ever grows, it's the all-in-one option.

---

## 4. TrustRadius Intent Data

### What You Get
TrustRadius provides **second-party (downstream) intent data** -- signals from buyers actively researching software categories on TrustRadius itself (reading reviews, comparing products, checking pricing). This is high-quality "bottom of funnel" intent because someone reading reviews is usually close to a purchase decision.

They offer two products:
- **Downstream Intent Data**: Raw intent signals showing which companies are researching your product category
- **Intent-Driven Leads**: A managed program where TrustRadius runs nurture campaigns on your behalf using their intent data

Note: TrustRadius was acquired by HG Insights in June 2025, combining review-based intent with technographic and market intelligence.

### Pricing
- **Starts at $30,000/year** per product for the Customer Voice package
- Free tier available for basic product profile claims
- Intent data add-ons priced separately on top of vendor plans

### API Availability
Salesforce connector available. API access for intent data integrations exists but details are limited.

### Data Freshness
Weekly or monthly delivery depending on plan.

### Realistic for Labno Labs?
**No, and also wrong fit.** TrustRadius intent data is designed for software vendors who want to know when buyers are researching their product category. Labno Labs is a services firm, not a software vendor -- the use case doesn't align. The $30K minimum also exceeds budget.

---

## 5. Clearbit (Now Breeze Intelligence by HubSpot)

### What You Get (Post-Acquisition)
HubSpot acquired Clearbit in December 2023 and rebranded it as **Breeze Intelligence**. The standalone Clearbit API that developers loved is effectively dead for new customers.

What remains:
- Company and contact enrichment (firmographics, technographics, employee count, revenue)
- Website visitor identification (de-anonymization)
- Form shortening (auto-fill fields from enrichment)
- All delivered as a credit-based HubSpot add-on

### What's Gone
- Standalone API for new customers (existing keys work with limited support, eventual sunset)
- All free Clearbit tools discontinued as of April 30, 2025
- Logo API sunset December 1, 2025
- Non-HubSpot CRM users locked out entirely

### Pricing
- Requires a HubSpot subscription (Marketing Hub Professional+, starts ~$800/month)
- Breeze Intelligence credits purchased on top: pricing not publicly listed, enterprise negotiation required
- Accessing enrichment via API requires enterprise HubSpot contract (six figures/year)

### API Availability
Legacy API keys still work for existing customers but no new API access is being sold. All new access goes through HubSpot's platform.

### Realistic for Labno Labs?
**No.** Clearbit as a standalone enrichment API is dead. You'd need to buy into the full HubSpot ecosystem. If you were already on HubSpot Marketing Hub Professional, the enrichment credits could be valuable, but it's not a standalone option anymore.

---

## 6. Apollo.io

### What You Get
Apollo.io is an all-in-one sales intelligence and engagement platform with a database of 275M+ contacts and 73M+ companies. It includes:
- Contact and company search with detailed filters
- Email and phone number lookups
- **Intent data** (topic-based, similar to Bombora but lighter): tracks which companies are researching specific topics
- Email sequencing and outreach tools
- Basic CRM functionality

Intent data is available on all plans but limited by topic count: Free (1 topic), Basic (6 topics), Professional (8 topics), Organization (12 topics).

### Pricing
- **Free:** $0/month -- 1 intent topic, limited credits, no API access, no enrichment
- **Basic:** $49/user/month -- 6 intent topics, no API access
- **Professional:** $79/user/month -- 8 intent topics, API access, enrichment endpoints
- **Organization:** $119/user/month -- 12 intent topics, advanced filters

Credit costs: emails = 1 credit, phone numbers = 8 credits, enrichment = 1-9 credits per record. Credits deplete faster than expected.

### API Availability
**Professional plan and above only** ($79/user/month). The API includes people search, company search, people enrichment, and organization enrichment endpoints. Free and Basic plans have no API access.

### Data Freshness
Contact data continuously updated. Intent signals refresh frequency not publicly specified but appears weekly.

### Realistic for Labno Labs?
**Yes -- this is the sweet spot.** At $79/month for 1 user on Professional, you get API access, enrichment, intent data (8 topics), and a massive contact database. This is the most accessible option for a small firm. Even the Basic plan at $49/month is useful for manual prospecting, though it lacks API access.

**Key limitation:** Apollo's intent data is less granular than Bombora's. It works for broad topic monitoring but won't give you the same depth. The contact database and enrichment capabilities are where Apollo really shines for a small firm.

---

## 7. Clay.com

### What You Get
Clay is a **workflow automation platform for data enrichment**, not a data provider itself. It connects to 150+ data providers through a single interface and runs "waterfall enrichment" -- querying multiple providers sequentially until it finds the data point you need. This routinely triples coverage compared to using a single provider.

What Clay enables:
- Waterfall enrichment across 150+ providers (including Apollo, Clearbit/HubSpot, Hunter.io, People Data Labs, Prospeo, etc.)
- AI-powered research agents that can visit websites and extract custom data points
- Automated outreach workflows
- CRM enrichment pipelines
- Web intent (visitor identification) on Growth plan

### How Waterfall Enrichment Works
You define what data you need (email, phone, company info). Clay queries Provider A first. If no result, it tries Provider B, then C, and so on. You only pay for successful lookups. Each enriched record typically costs 6-20 data credits depending on what you're pulling.

### Pricing (Post-March 2026 Restructure)
Clay restructured pricing on March 11, 2026:
- **Launch:** $185/month ($167/month annual) -- 2,500 data credits + 15,000 actions
- **Growth:** $495/month ($446/month annual) -- includes CRM integrations and web intent

Credit costs: email enrichment = 2-5 credits, phone = varies, company enrichment = varies. Failed lookups are free.

### API Availability
Clay is primarily a UI-based workflow builder, not an API-first tool. You build enrichment workflows in their table interface. It can trigger from webhooks and push to CRMs, but it's not a traditional API you'd call from your own code.

### Data Freshness
Real-time -- enrichment runs on demand when you trigger a workflow.

### Realistic for Labno Labs?
**Yes, but evaluate carefully against building your own.** At $185/month (Launch), Clay gives you access to 150+ data providers through a single interface. The question is whether this replaces or complements the custom scraping pipeline you're building.

**Key tradeoff:** Clay could replace a lot of custom enrichment code, but at $185/month it's a significant ongoing cost. If your pipeline only needs 2-3 data sources (e.g., Apollo API + your own scrapers), building custom may be cheaper. If you need to waterfall across 5+ sources for high coverage, Clay saves enormous development time.

---

## Comparison Matrix

| Provider | Min. Annual Cost | Intent Data | Contact Data | API Access | Small Firm Viable |
|---|---|---|---|---|---|
| **Bombora** | $30,000 | Deep (17K topics) | No | Enterprise only | No |
| **6sense** | $40,000 | Deep + predictive | Yes | Higher tiers | No |
| **ZoomInfo** | $15,000+ | Good (5K topics) | Best-in-class | Yes | No |
| **TrustRadius** | $30,000 | Narrow (review-based) | No | Limited | No (wrong fit) |
| **Clearbit/HubSpot** | $10,000+ (HubSpot required) | No (enrichment only) | Yes | Dead for new customers | No |
| **Apollo.io** | $948 (Basic) / $948+ (Pro) | Light (6-8 topics) | 275M+ contacts | Pro plan+ | **Yes** |
| **Clay.com** | $2,220 (Launch) | Via providers | Via providers (150+) | Workflow-based | **Maybe** |

---

## Recommendation for Labno Labs

### Start With: Apollo.io Professional ($79/month)

**Why Apollo first:**
1. **Best value for a 2-person firm.** At $79/month you get API access, enrichment, intent data, and a 275M+ contact database. No other provider comes close at this price point.
2. **API-first workflow.** The Professional plan unlocks enrichment endpoints you can call programmatically, which integrates directly with the custom scraping pipeline you're building.
3. **Intent data included.** While not as deep as Bombora, 8 intent topics is enough to monitor your core ICP categories (AI consulting, automation, digital transformation, etc.).
4. **Contact + company data in one place.** Unlike Bombora (company-level only), Apollo gives you the actual people to reach out to.

**How it fits your pipeline:** Use Apollo's API as your primary enrichment layer. When your scrapers identify a target company (from G2, app reviews, job postings), call Apollo to enrich with contacts, emails, and company details. Layer Apollo's intent signals to prioritize which enriched companies to pursue first.

### Consider Adding Later: Clay.com Launch ($185/month)

**Why Clay as a second step (not first):**
1. **Wait until you hit coverage gaps.** If Apollo's enrichment finds emails for 60% of your targets, Clay's waterfall across 150+ providers could push that to 85-90%.
2. **Replaces custom enrichment code.** If you find yourself building integrations with Hunter.io, Prospeo, People Data Labs, etc., Clay already does this and handles the waterfall logic.
3. **Not urgent.** Your custom scrapers + Apollo API cover the 80/20 case. Clay becomes valuable when you're scaling volume and need higher coverage rates.

### Skip Entirely
- **Bombora, 6sense, ZoomInfo, TrustRadius** -- All priced for enterprise. Revisit only if Labno Labs scales to 10+ employees with dedicated marketing budget.
- **Clearbit** -- Dead as standalone. Only relevant if you go all-in on HubSpot (you shouldn't at this stage).

### Integration Architecture

```
Your Custom Scrapers (Apify, G2, job boards)
    |
    v
Target Company List (Supabase)
    |
    v
Apollo.io API (enrich with contacts, emails, intent signals)
    |
    v
Scored & Prioritized Lead List
    |
    v
Outreach (email sequences)

--- Future addition ---
Clay.com (waterfall enrichment for coverage gaps)
```

---

## Sources

- [Bombora Pricing Breakdown 2026 - MarketBetter](https://marketbetter.ai/blog/bombora-pricing-breakdown-2026/)
- [Bombora Intent Data Review - SmarteE](https://www.smarte.pro/blog/bombora-intent-data)
- [Bombora - Our Data](https://bombora.com/our-data/)
- [6sense Pricing 2026 - Warmly](https://www.warmly.ai/p/blog/6sense-pricing)
- [6sense Pricing 2026 - MarketBetter](https://marketbetter.ai/blog/6sense-pricing-2026/)
- [Bombora vs ZoomInfo Comparison - Prospeo](https://prospeo.io/s/bombora-vs-zoominfo)
- [Best Bombora Alternatives 2026 - MarketBetter](https://marketbetter.ai/blog/best-bombora-alternatives-2026/)
- [TrustRadius Intent Data](https://solutions.trustradius.com/intent-data/)
- [TrustRadius Intent-Driven Leads](https://solutions.trustradius.com/products/intent-driven-leads/)
- [Clearbit Is Now HubSpot-Only - BounceWatch](https://api.bouncewatch.com/blog/api-data/clearbit-alternative-enrichment-api)
- [Clearbit Alternatives After HubSpot Acquisition - Salesmotion](https://salesmotion.io/blog/clearbit-alternatives-hubspot-acquisition)
- [Apollo.io Pricing 2026 - Warmly](https://www.warmly.ai/p/blog/apollo-pricing)
- [Apollo.io API Pricing](https://docs.apollo.io/docs/api-pricing)
- [Apollo.io People Enrichment API](https://docs.apollo.io/reference/people-enrichment)
- [Clay Waterfall Enrichment](https://www.clay.com/waterfall-enrichment)
- [Clay Pricing 2026 - Warmly](https://www.warmly.ai/p/blog/clay-pricing)
- [Clay Pricing Plans 2026 - Cleanlist](https://www.cleanlist.ai/blog/2026-03-12-clay-pricing-changes-2026)
- [15 Best Intent Data Providers 2026 - Autobound](https://www.autobound.ai/blog/top-15-intent-data-providers-compared-2026)
