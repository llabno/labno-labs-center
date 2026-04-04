# GTM Research: Apify Actors, G2 Data, and LinkedIn Enrichment

**Date:** 2026-04-02
**Purpose:** Evaluate scraping tools and data sources for Labno Labs' GTM pipeline
**Target volume:** ~10K app reviews/month, ~1K job postings/month

---

## 1. Apify App Store Reviews Scraper Actors

### Comparison Table

| Feature | The Wolves (thewolves/appstore-reviews-scraper) | EasyAPI (easyapi/app-store-reviews-scraper) | NeatRat Google Play (neatrat/google-play-store-reviews-scraper) |
|---|---|---|---|
| **URL** | [apify.com/thewolves/appstore-reviews-scraper](https://apify.com/thewolves/appstore-reviews-scraper) | [apify.com/easyapi/app-store-reviews-scraper](https://apify.com/easyapi/app-store-reviews-scraper) | [apify.com/neatrat/google-play-store-reviews-scraper](https://apify.com/neatrat/google-play-store-reviews-scraper) |
| **Platform** | Apple App Store | Apple App Store | Google Play Store |
| **Pricing** | $0.10 per 1,000 reviews | $0.10 per 1,000 reviews | $0.10 per 1,000 reviews |
| **Cost for 10K reviews** | $1.00 | $1.00 | $1.00 |
| **Speed** | "Lightning speed" (marketed) | "Lightning speed" (marketed) | Built-in delays for rate-limit safety |
| **Fields extracted** | Rating, review title, full text, author, app version, vote count, date, app metadata | Rating (1-5), review title, full text, author name, app version, vote count, date, 30+ fields including app name, developer, price, screenshots | Rating, review text, timestamp, user info (image, URL), app metadata |
| **Search flexibility** | Can search by app name, country, no URL/ID required | Can search by app name, country, no URL/ID required | Customizable country and language parameters |
| **Anti-bot handling** | Pay-per-result (Apify handles proxy rotation) | Pay-per-result (Apify handles proxy rotation) | Built-in delays between requests, proxy handling |
| **Rating** | 1.4/5 (2 reviews) | Limited data available | Limited data available |
| **Users** | 272 monthly users | Limited data available | Limited data available |
| **Output format** | JSON, CSV, Excel | JSON, CSV, Excel | JSON, CSV, Excel |

### The Wolves Also Offers

The Wolves also has a Google Play Reviews Scraper at [apify.com/thewolves/google-play-reviews-scraper](https://apify.com/thewolves/google-play-reviews-scraper) at the same $0.10/1K price point, providing a unified vendor option for both iOS and Android review scraping.

### Key Takeaway

App store review scraping is a commodity. All major actors charge $0.10 per 1,000 reviews, making the cost negligible at Labno Labs' volume (~$1/month for 10K reviews). The differentiator is reliability and field coverage. EasyAPI extracts 30+ fields, making it the most comprehensive option for enrichment. The Wolves offers both iOS and Android under one vendor, simplifying management.

---

## 2. G2 Scraper Actors on Apify

### The DataDome Problem

G2 switched from Cloudflare to DataDome, an AI-based WAF that analyzes:
- TLS/SSL fingerprints
- Behavioral patterns (navigation, scroll, timing)
- IP reputation and residential proxy detection
- Per-customer ML models that adapt to scraping patterns
- Intent-based detection (flags automated navigation patterns even with perfect browser fingerprints)

**Benchmark result:** G2 averaged only **36.63% success rate** across all scraping providers in Proxyway's 2025 benchmark. In March 2026, DataDome publicly disclosed blocking an 80M-request scraping attack on "a leading review platform" (widely believed to be G2).

### Comparison Table

| Feature | Zen Studio (zen-studio/g2-reviews-scraper) | ScrapePilot (scrapepilot/g2-software-reviews-scraper) | Focused Vanguard (focused_vanguard/g2-reviews-scraper) |
|---|---|---|---|
| **URL** | [apify.com/zen-studio/g2-reviews-scraper](https://apify.com/zen-studio/g2-reviews-scraper) | [apify.com/scrapepilot/g2-software-reviews-scraper-ratings-pros-cons](https://apify.com/scrapepilot/g2-software-reviews-scraper-ratings-pros-cons) | [apify.com/focused_vanguard/g2-reviews-scraper](https://apify.com/focused_vanguard/g2-reviews-scraper) |
| **Pricing** | Pay-per-result (Apify compute) | Pay-per-result (Apify compute) | **$3.49 per 1,000 reviews** |
| **Data type** | Real-time scraping | Real-time scraping | Real-time scraping |
| **Fields extracted** | Star ratings, review text, structured JSON + LLM-ready markdown | Star ratings, pros & cons, reviewer details, product descriptions, comparisons, alternatives | Publish dates, ratings, pros/cons, reviewer metadata |
| **Output format** | JSON + Markdown (RAG-ready) | JSON, CSV | JSON, CSV, Excel |
| **Anti-bot handling** | Residential proxies (recommended) | Residential proxy rotation, randomized delays, realistic browser headers, exponential backoff on 429/503 | Not specified |
| **Special features** | Filter by star rating, sort by recency/helpfulness, search within reviews, no login required | Automatic pagination, retry logic | Multi-platform option at $6.49/1K covers G2 + Capterra + Trustpilot + Gartner |
| **Reliability concern** | DataDome blocking (~37% success industry-wide) | DataDome blocking (~37% success industry-wide) | DataDome blocking (~37% success industry-wide) |

### Additional G2 Actors Worth Noting

| Actor | URL | Pricing | Notes |
|---|---|---|---|
| G2 Search Scraper (fatihtahta/g2-scraper) | [apify.com/fatihtahta/g2-scraper](https://apify.com/fatihtahta/g2-scraper) | $7.00/1K results | Search results, not individual reviews |
| Multi-Platform Reviews (focused_vanguard) | [apify.com/focused_vanguard/multi-platform-reviews-scraper](https://apify.com/focused_vanguard/multi-platform-reviews-scraper) | $6.49/1K results | G2 + Capterra + Trustpilot + Gartner + Reddit in one run (enter domain, get all) |
| G2 Product Scraper (omkar-cloud) | [apify.com/omkar-cloud/g2-product-scraper](https://apify.com/omkar-cloud/g2-product-scraper) | Compute-based | Product data, not reviews |

### Key Takeaway

G2 scraping is unreliable due to DataDome. Even the best actors face ~37% success rates. For a startup budget, the **Focused Vanguard multi-platform scraper** ($6.49/1K) is the most pragmatic choice: one run covers G2, Capterra, Trustpilot, and more, so when G2 blocks you, you still get reviews from other platforms for the same software products. Budget for 2-3x the runs you expect to need. ScrapePilot has the most robust anti-bot handling (exponential backoff, proxy rotation). Zen Studio is best if you need LLM-ready output for RAG pipelines.

---

## 3. G2 Buyer Intent Data (Official)

### What G2 Offers

G2's Buyer Intent data tracks anonymous visitors to G2.com and identifies which companies are researching your product category. The data includes:

- **Company identification** of visitors to your G2 profile
- **Signal types:** profile views, competitor comparisons, category browsing, alternative searches
- **Buying stage scoring** (awareness, consideration, decision)
- **Activity level scoring** (aggregated page time, pages visited)
- **Firmographic data:** company website, size, industry, social media links
- **Geolocation** of individual buyers
- **Timeline** of signal history

### Pricing

| Tier | Annual Cost | Notes |
|---|---|---|
| Professional | $13,500 - $17,700/year | Base subscription; with Buyer Intent add-on reaches $15,000 - $20,000/year |
| Enterprise | $21,300 - $28,300/year | Full feature set; can exceed $50,000 - $95,000 with multiple products |
| Best negotiated | $17,500 - $21,300/year | Multi-year commitments, volume discounts, competitive leverage |

### Access Requirements

- Buyer Intent is an **add-on** to G2's Brand Packages (Professional or Enterprise tier)
- No standalone purchase option
- **No public API** -- G2 Buyer Intent does not have an API
- Integrations are via pre-built connectors: Salesforce, HubSpot, 6sense, Demandbase, Outreach, Gong, Dreamdata
- Small companies find the cost "prohibitive" per user reviews

### Scraping vs. Official: For Labno Labs

| Factor | G2 Official Intent | Scraping G2 Reviews |
|---|---|---|
| **Cost** | $15,000 - $20,000/year minimum | ~$35 - $65/month at 10K reviews |
| **Data type** | Who is *looking at* your product category (intent signals) | What people *said* about products (review text) |
| **Use case** | Identify active buyers for your product | Competitive intelligence, sentiment analysis, market research |
| **Reliability** | 100% (first-party data) | ~37% success rate due to DataDome |
| **Accessibility** | Enterprise sales process, weeks to onboard | Self-serve, instant |
| **For Labno Labs** | Too expensive, wrong data type for GTM research | Right data type for building competitive intel for clients |

### Verdict

G2 Buyer Intent is designed for SaaS companies who are *listed on G2* and want to know who is researching them. It is **not useful** for Labno Labs' use case of gathering competitive intelligence and market signals. The $15K+ annual cost is prohibitive for a startup. **Scraping reviews** (or using the multi-platform scraper) is the correct approach for building client-facing competitive analysis.

---

## 4. LinkedIn Sales Navigator API for Enrichment

### LinkedIn Official APIs

| API | Access Level | Use Case | Restrictions |
|---|---|---|---|
| **Consumer (Free)** | Open (with approval) | Sign-in with LinkedIn, basic profile data | Read-only, no scraping |
| **Marketing API** | Partner application required | Ad campaign management, company pages | Requires LinkedIn Marketing Partner status |
| **Sales Navigator API** | Enterprise only ($99+/seat/month minimum) | Sales intelligence, lead lists | No outbound automation, no bulk export, limited to 2,500 leads per search |
| **Talent API** | Certified partners only | Job postings, candidate matching, recruiting | Custom pricing, requires LinkedIn partnership agreement |

**Key restrictions across all tiers:**
- LinkedIn explicitly prohibits profile scraping and automated messaging
- Approval process takes weeks to months
- No public pricing for Talent or Sales APIs (custom enterprise agreements)
- Rate limits enforced with 429 errors; daily caps on API calls
- Strict data privacy compliance requirements

### Third-Party Alternatives

| Tool | Pricing | What It Does | Risk Level |
|---|---|---|---|
| **Bright Data LinkedIn Jobs Scraper** | $0.001/record ($1/1K jobs); subscription plans from ~$500/month | Scrapes public job postings, company data, profiles. Won court cases vs Meta/X defending legality of public data scraping | Low (public data only, no fake accounts) |
| **PhantomBuster** | $69/mo (Starter), $159/mo (Pro), $439/mo (Team) | LinkedIn job scraper, profile scraper, company scraper. Uses YOUR LinkedIn account | Medium (uses your account; max 80 jobs/day, 150 with Premium) |
| **Scrapingdog** | ~$0.063/1K requests at scale; $0.009/profile | LinkedIn Jobs API, Profile API. Public data, no login required | Low (public data only) |
| **Crispy** | $49/seat/month ($32/mo annual) | 105 LinkedIn tools: search, messaging, invitations, analytics. Rate-limited (15 invites, 150 messages/day) | Medium (wraps your account) |
| **Proxycurl** | **SHUT DOWN July 2025** | Was the leading LinkedIn scraping API ($10M ARR). LinkedIn sued in Jan 2025 for fake accounts | N/A -- defunct |

### Legal Landscape (Important)

- **Proxycurl's shutdown** is a cautionary tale: LinkedIn sued and won because Proxycurl used fake accounts to scrape behind login walls
- **Bright Data won** court cases because it only scrapes publicly visible data without authentication
- The legal bright line: **public data = generally legal; circumventing login = high legal risk**
- For job posting data specifically, LinkedIn's public job listings are the safest to scrape

### Key Takeaway

For 1K job postings/month, **Bright Data** is the clear winner: $1/month at $0.001/record, legally defensible (public data only, court-tested), and comprehensive field coverage. PhantomBuster is viable for small-scale enrichment but costs more and risks your LinkedIn account. Avoid any tool that uses fake accounts or requires LinkedIn login.

---

## 5. Recommended Stack

### Tool Selection

| Need | Recommended Tool | Monthly Cost Estimate | Why |
|---|---|---|---|
| **iOS App Reviews** (5K/mo) | EasyAPI (easyapi/app-store-reviews-scraper) | **$0.50** | 30+ fields, $0.10/1K, best field coverage |
| **Android App Reviews** (5K/mo) | NeatRat (neatrat/google-play-store-reviews-scraper) | **$0.50** | $0.10/1K, built-in rate limiting |
| **G2 + Capterra Reviews** | Focused Vanguard Multi-Platform (focused_vanguard/multi-platform-reviews-scraper) | **$13 - $20** | $6.49/1K, covers G2 + Capterra + Trustpilot in one run; budget 2-3x runs for DataDome failures |
| **LinkedIn Job Postings** (1K/mo) | Bright Data LinkedIn Jobs Scraper | **$1 - $5** | $0.001/record, legally defensible, public data only |
| **G2 Buyer Intent** | Skip | $0 | Too expensive ($15K+/yr), wrong data type for our use case |
| **LinkedIn Profile Enrichment** (ad hoc) | Scrapingdog | **$5 - $10** | $0.009/profile, public data, no login required |

### Estimated Monthly Costs

| Item | Low Estimate | High Estimate |
|---|---|---|
| App Store reviews (10K total) | $1.00 | $1.00 |
| G2/Capterra/Trustpilot reviews (2K target, 3x retry budget) | $13.00 | $39.00 |
| LinkedIn job postings (1K) | $1.00 | $5.00 |
| LinkedIn profile enrichment (200 ad hoc) | $1.80 | $5.00 |
| Apify platform subscription (if needed beyond free tier) | $0.00 | $49.00 |
| **Total** | **$16.80** | **$99.00** |

### Architecture Notes

1. **Apify as primary orchestrator** -- Run App Store and G2 scrapers as Apify actors; results land in JSON/CSV for ETL into Supabase
2. **Bright Data for LinkedIn** -- Separate API; more reliable and legally clean than Apify LinkedIn actors
3. **Retry strategy for G2** -- Build retry logic expecting ~37% success; supplement with Capterra/Trustpilot data from the multi-platform scraper when G2 blocks
4. **No G2 official data** -- The $15K+/year cost and enterprise sales cycle make it a non-starter; revisit if/when Labno Labs has SaaS products listed on G2
5. **Legal compliance** -- Only use tools that scrape public data without authentication; avoid anything that creates fake accounts or circumvents login walls

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| G2 DataDome blocks increase | High | Medium | Multi-platform scraper provides fallback to Capterra/Trustpilot |
| LinkedIn legal action against scraper providers | Medium | High | Use Bright Data (court-tested) + stick to public job postings only |
| Apify actor deprecation | Low | Low | Multiple actors available for each platform; easy to swap |
| App Store API changes | Low | Low | Multiple competing actors; Apple's review API is stable |

---

## Sources

- [The Wolves App Store Reviews Scraper](https://apify.com/thewolves/appstore-reviews-scraper)
- [EasyAPI App Store Reviews Scraper](https://apify.com/easyapi/app-store-reviews-scraper)
- [NeatRat Google Play Store Reviews Scraper](https://apify.com/neatrat/google-play-store-reviews-scraper)
- [The Wolves Google Play Reviews Scraper](https://apify.com/thewolves/google-play-reviews-scraper)
- [Zen Studio G2 Reviews Scraper](https://apify.com/zen-studio/g2-reviews-scraper)
- [ScrapePilot G2 Software Reviews Scraper](https://apify.com/scrapepilot/g2-software-reviews-scraper-ratings-pros-cons)
- [Focused Vanguard G2 Reviews Scraper](https://apify.com/focused_vanguard/g2-reviews-scraper)
- [Focused Vanguard Multi-Platform Reviews Scraper](https://apify.com/focused_vanguard/multi-platform-reviews-scraper)
- [G2 Buyer Intent Data](https://sell.g2.com/data)
- [G2 Buyer Intent Documentation](https://documentation.g2.com/docs/buyer-intent)
- [G2 Seller Solutions Pricing](https://www.g2.com/products/g2-seller-solutions/pricing)
- [G2 Intent Data Review (SMARTe)](https://www.smarte.pro/blog/g2-intent-data)
- [G2 Pricing via Vendr](https://www.vendr.com/marketplace/g2)
- [Bright Data LinkedIn Jobs Scraper](https://brightdata.com/products/web-scraper/linkedin/jobs)
- [Bright Data Web Scraper Pricing](https://brightdata.com/pricing/web-scraper)
- [PhantomBuster LinkedIn Job Scraper](https://phantombuster.com/automations/linkedin/6772788738377011/linkedin-job-scraper)
- [PhantomBuster Pricing (CheckThat)](https://checkthat.ai/brands/phantombuster/pricing)
- [Scrapingdog LinkedIn Jobs API](https://www.scrapingdog.com/linkedin-jobs-api/)
- [LinkedIn API Pricing Comparison (Crispy)](https://crispy.sh/blog/linkedin-api-pricing-comparison)
- [LinkedIn API Guide (OutX)](https://www.outx.ai/blog/linkedin-api-guide)
- [Proxycurl Shutdown (StartupHub)](https://www.startuphub.ai/ai-news/startup-news/2025/the-1-linkedin-scraping-startup-proxycurl-shuts-down)
- [How to Bypass DataDome (Scrapfly)](https://scrapfly.io/blog/posts/how-to-bypass-datadome-anti-scraping)
- [DataDome 80M Attack Case Study](https://securityboulevard.com/2026/03/how-datadome-blocked-an-80m-request-scraping-attack-on-a-leading-review-platform/)
- [Proxyway Web Scraping API Report 2025](https://proxyway.com/research/web-scraping-api-report-2025)
