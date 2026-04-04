# Labno Labs -- Vibe Coding Outreach Templates

> **Purpose**: These are NOT fill-in-the-blank templates. They are **structural blueprints** for an LLM to generate unique, signal-driven outreach messages. Each template defines the reasoning chain, tone calibration, and evidence-linking pattern the LLM should follow. The output should read like a message a sharp human actually wrote after doing research -- because the LLM *did* do the research.

> **How to use**: Feed the template + `{{signal_data}}` (scraped reviews, job postings, app metrics) into an LLM. The LLM generates a fully unique message. No two outputs should read alike.

---

## Personalization Depth Scoring (All Templates)

Rate every generated message 1-5 before sending:

| Score | Criteria | Send? |
|-------|----------|-------|
| 1 | Generic -- could apply to any company. Contains filler like "I noticed your company..." | Never |
| 2 | Names the company and industry but no specific evidence | No |
| 3 | References one real signal (a review quote, a job posting detail, a metric) | Maybe -- only for low-priority leads |
| 4 | Links two signals together with a causal argument ("your 2.1 App Store rating correlates with the 3 iOS engineers you posted for last month") | Yes |
| 5 | Three+ signals woven into a narrative, includes a quantified cost estimate, references their specific tech stack or workflow | Always send |

**Minimum threshold for sending: Score 4.**

---

## Anti-Spam Rules (All Templates)

These apply to every message generated from any template below:

- **Never** open with "I hope this email finds you well" or any variant
- **Never** say "I noticed your company" -- this phrase is a spam fingerprint
- **Never** use the word "synergy," "leverage," "unlock," or "game-changer"
- **Never** include unsubscribe language in cold outreach (it flags the message as bulk)
- **Never** attach files or include more than one link
- **Never** use HTML formatting in cold email -- plain text only
- **Never** send the same structure to two people at the same company
- **Keep** first-touch emails under 150 words. Follow-ups under 120 words
- **Use** their first name exactly once, at the opening. Not repeatedly
- **Domain warming**: Send no more than 30 cold emails/day from a new domain for the first 2 weeks
- **Time zone**: Send during their business hours (9-11am local is the sweet spot)

---

## Follow-Up Cadence (Default for All Templates)

| Touch | Timing | Tone Shift |
|-------|--------|------------|
| 1 | Day 0 | Original message -- evidence-heavy, specific |
| 2 | Day 3 | Shorter. Add one new signal or insight not in the first message. No guilt language |
| 3 | Day 7 | Reframe the angle entirely. If Touch 1 was pain-focused, Touch 3 is opportunity-focused |
| 4 | Day 14 | Brief "closing the loop" -- share a relevant case study link or teardown, no ask |
| 5 | Day 30 | Final touch. New trigger event only (funding round, new bad review, leadership change). Otherwise drop |

After 5 touches with no response, move to nurture list (quarterly check-ins with value-add content only).

---

## Template 1: Frontend Technical Debt

### Trigger Signals
- App Store / Google Play rating below 3.0
- Reviews mentioning crashes, freezes, slow load times, checkout failures
- "Cart abandonment" or "payment failed" complaints
- Job postings for mobile engineers (signals they know there is a problem)

### Target Persona
CTO, VP Engineering, Head of Mobile, Engineering Director

### Tone Calibration
Technical peer. You have shipped production mobile apps. You understand main thread violations, render cycles, and Lighthouse scores. Do not explain basic concepts. Do not sound like a vendor. Sound like an engineer who spotted something interesting.

### Structure

```
OPENING (1-2 sentences):
- Reference a SPECIFIC review quote or metric. Not "your app has issues" but 
  "your iOS app dropped from 3.8 to 2.1 stars over the past 6 months, 
  with 40% of recent 1-stars mentioning checkout freezes."

DIAGNOSIS (2-3 sentences):
- Translate the user-facing symptom into a probable technical root cause.
  "Checkout freezes on iOS 17+ usually trace back to main thread blocking 
  during payment SDK callbacks -- especially common in apps still using 
  UIKit lifecycle patterns inside SwiftUI wrappers."
- Connect it to a business cost. "Industry data puts cart abandonment 
  from technical failures at 3-7% of attempted transactions."

CREDIBILITY (1 sentence):
- One specific thing Labno Labs has done that is relevant. Not a client list.
  A technical outcome. "We rebuilt a similar checkout flow for a UK 
  e-commerce app -- 94ms average render time, zero ANRs post-launch."

CTA (1 sentence):
- Zero-obligation modernization audit. Frame it as diagnostic, not a pitch.
  "Happy to run a free architecture teardown on your app bundle if useful -- 
  takes us about 2 hours and you keep the report either way."
```

### Subject Line Formulas
1. `{{app_name}} checkout flow -- a theory on the 1-star spike`
2. `Main thread issue in {{app_name}}? Quick thought`
3. `{{specific_review_quote_fragment}} -- fixable?`

### LinkedIn Connection Note Formula
```
{{first_name}} -- saw the {{app_name}} reviews re: {{specific_symptom}}. 
We fixed a near-identical issue ({{technical_detail}}) for another 
{{industry}} app. Happy to share the teardown approach if useful.
```

### Example Generated Messages

**Short (LinkedIn message, ~60 words):**

> Sarah -- the MediCart iOS reviews from the past 8 weeks are rough. 14 of the last 20 mention checkout freezing after adding insurance info. That pattern usually means the payment SDK is blocking the main thread during the eligibility callback. We fixed the same issue for a UK health retailer in 3 weeks. Want me to send you the architectural pattern we used?

**Medium (First-touch email, ~130 words):**

> Sarah,
>
> MediCart's App Store rating dropped from 3.4 to 1.9 since the November release. I read through about 60 recent reviews -- the pattern is consistent: users add items, enter insurance details, and the app locks up. Eight reviews specifically mention losing their cart.
>
> That behavior almost always traces to synchronous calls in the payment verification flow. If you're hitting the eligibility API on the main thread (common when the original architecture predates async/await in Swift), the UI blocks during the TLS handshake. Worse on cellular connections.
>
> We rebuilt a nearly identical checkout path for a UK pharmacy app last quarter. Went from 3.2s average checkout render to 94ms, and their rating recovered to 4.1 within two months.
>
> Happy to run a free architecture review on MediCart's bundle -- takes about 2 hours and the report is yours regardless.
>
> James, Labno Labs

**Detailed (Follow-up email, ~120 words):**

> Sarah,
>
> Following up with something concrete. I pulled MediCart's bundle from the App Store and ran a quick static analysis. Two things stood out:
>
> 1. The insurance eligibility check appears to use a synchronous URLSession call -- that is the checkout freeze source
> 2. The app binary includes both UIKit and SwiftUI frameworks but the navigation stack looks like a hybrid -- this creates retain cycle risks that would explain the memory warnings users are reporting
>
> I wrote up a one-page teardown with the fix approach for both. No pitch attached, just the technical breakdown.
>
> Want me to send it over? If the diagnosis is wrong I'd genuinely like to know -- these patterns are usually reliable but edge cases exist.
>
> James, Labno Labs

---

## Template 2: Operational Bottleneck

### Trigger Signals
- G2 or Capterra reviews mentioning manual data entry, copy-paste between systems, lost tasks
- Reviews saying "great product but the workflow is painful"
- Company recently hired operations/admin staff (scaling with bodies, not automation)
- Job postings for "data entry," "operations coordinator," or "RevOps analyst"

### Target Persona
VP Operations, COO, Head of RevOps, Director of Business Operations

### Tone Calibration
Empathetic business partner. You understand that manual processes exist because the company grew faster than its systems. No judgment. No "you're doing it wrong." Frame everything as "this is costing more than you think, and there is a faster path."

### Structure

```
OPENING (1-2 sentences):
- Reference a specific workflow complaint from a review or job posting.
  Not "your team does manual work" but "your G2 reviews mention reps 
  spending 20+ minutes per deal copying data between Salesforce and 
  your billing system."

HIDDEN COST (2-3 sentences):
- Calculate the cost they probably haven't. "If 15 reps each spend 
  20 minutes per deal on data transfer, and they close 8 deals/week, 
  that's 40 hours/week of engineering-priced labor doing copy-paste. 
  At fully loaded cost, that's roughly $120K/year in manual data movement."
- Connect to the hiring signal if available. "The operations coordinator 
  role you posted last week -- is that to handle this volume?"

ALTERNATIVE (1-2 sentences):
- Describe what automated looks like, specifically. Not "we can automate 
  your workflows" but "a Salesforce-to-billing API integration with 
  field mapping and exception handling typically takes 2-3 weeks to 
  build and eliminates the manual step entirely."

CTA (1 sentence):
- Workflow automation assessment. "We do a free workflow audit -- map 
  your current process, identify the 3 highest-ROI automation targets, 
  and estimate build time. Takes one 30-minute call."
```

### Subject Line Formulas
1. `The ${{estimated_cost}}/year copy-paste problem`
2. `{{company_name}} ops team -- automation ROI question`
3. `Re: the {{job_title}} role you posted -- a thought`

### LinkedIn Connection Note Formula
```
{{first_name}} -- read several {{platform}} reviews about 
{{specific_workflow_pain}}. Ran the numbers and it looks like 
~${{cost_estimate}}/year in manual labor. We automated a similar 
flow for {{comparable_company}} in {{timeframe}}. Worth a quick chat?
```

### Example Generated Messages

**Short (LinkedIn message, ~65 words):**

> David -- your G2 reviews keep coming back to the same thing: reps manually syncing deal data between HubSpot and NetSuite. Ran quick math: if 20 reps spend 15 min/deal across 6 deals/week, that is about 300 hours/month of copy-paste. At $45/hr fully loaded, roughly $160K/year. We built a HubSpot-NetSuite sync for a similar-sized SaaS company in 11 days. Worth exploring?

**Medium (First-touch email, ~140 words):**

> David,
>
> I went through your last 30 G2 reviews. Your users love the product -- 4.4 stars, strong NPS comments. But a pattern shows up in the operational reviews from your own team and power users: manual data movement between HubSpot and NetSuite is eating hours.
>
> Three separate reviewers mention "copying deal fields by hand" and one says they built a personal spreadsheet as a bridge. That is a reliable signal that the integration gap is costing real money.
>
> Back-of-envelope: 20 reps, 15 minutes per deal, 6 deals per week each. That is 300 hours/month -- roughly $162K/year at fully loaded cost. The operations analyst role you posted on LinkedIn two weeks ago might be a symptom of this.
>
> We build these integrations. HubSpot-to-NetSuite with field mapping, validation, and exception routing typically takes 2-3 weeks.
>
> Would a 30-minute workflow audit be useful? We map the current process, identify the top 3 automation targets, and estimate build time. Free, no strings.
>
> Rachel, Labno Labs

**Detailed (Follow-up email, ~110 words):**

> David,
>
> Following up with something specific. I mapped out what a HubSpot-to-NetSuite sync typically looks like for a team your size:
>
> - Deal close in HubSpot triggers automatic record creation in NetSuite
> - Field mapping handles the translation (HubSpot "Deal Amount" to NetSuite "Transaction Total," etc.)
> - Exception queue catches mismatches instead of silently failing
> - Bi-directional sync so invoice status flows back to HubSpot for rep visibility
>
> Typical build: 12-18 days. Typical ROI: the integration pays for itself in 6-8 weeks based on the labor savings.
>
> Happy to walk through the architecture in 20 minutes if it is on your radar this quarter.
>
> Rachel, Labno Labs

---

## Template 3: Infrastructure Debt

### Trigger Signals
- Job postings specifically for legacy tech skills (COBOL, Classic ASP, old Java versions, Delphi, VB6)
- Simultaneous App Store/Play Store performance complaints
- Job postings mentioning "modernization," "migration," or "re-architecture"
- Multiple senior engineer departures (LinkedIn signal)

### Target Persona
CTO, VP Engineering, Head of Platform, Chief Architect

### Tone Calibration
Strategic advisor. You have seen this movie before -- the legacy system that works but cannot scale, the team spending 60% of cycles on maintenance instead of features. Be direct about the risk without being alarmist. Reference architectural patterns by name (strangler fig, event sourcing, CQRS). Sound like someone they would want on their architecture review board.

### Structure

```
OPENING (1-2 sentences):
- Cross-reference two signals to build a stronger case. "You're hiring 
  for a Senior Java 8 engineer and a React Native developer at the same 
  time. Meanwhile, your Play Store reviews from the last quarter mention 
  30-second load times. Those three signals usually point to the same root 
  cause."

ARCHITECTURAL READING (2-3 sentences):
- Describe what you think is happening under the hood, based on the 
  signals. Be specific about patterns. "The Java 8 posting suggests a 
  monolithic backend that predates Spring Boot 3.x. The React Native 
  role alongside mobile performance complaints suggests the frontend 
  is a wrapper around API calls that are timing out because the 
  monolith can't handle concurrent request volume."
- Name the scaling ceiling. "Monoliths hit a practical scaling wall 
  around 500 concurrent users when the database becomes the bottleneck. 
  Your Trustpilot reviews suggest you might be near that threshold."

WHAT WE DO (1-2 sentences):
- Position as migration specialists, not just coders. "We deploy 
  engineering squads that run strangler fig migrations -- decomposing 
  monoliths into services without stopping feature development. 
  Typical engagement is 12-16 weeks for the critical path."

CTA (1 sentence):
- Architecture review and migration roadmap. "Worth 45 minutes to 
  walk through an architecture review? We map the dependency graph, 
  identify decomposition boundaries, and estimate migration timeline. 
  No commitment required."
```

### Subject Line Formulas
1. `{{company_name}} architecture -- connecting two signals`
2. `Java 8 + React Native + slow reviews = a theory`
3. `The scaling ceiling behind {{app_name}}'s performance issues`

### LinkedIn Connection Note Formula
```
{{first_name}} -- the {{legacy_tech}} posting + {{app_name}} performance 
reviews tell a story I've seen before. We run strangler fig migrations 
that decompose monoliths without halting feature work. Happy to share 
the pattern if relevant.
```

### Example Generated Messages

**Short (LinkedIn message, ~70 words):**

> Marcus -- you are hiring a COBOL developer and a cloud architect at the same time. Your app's Play Store reviews mention 45-second transaction times. These signals usually mean the same thing: the legacy core cannot keep up with the modern frontend's expectations. We run incremental migrations that decompose legacy systems without freezing feature development. Typical first phase is 8 weeks. Worth a conversation?

**Medium (First-touch email, ~145 words):**

> Marcus,
>
> Three signals caught my attention this week:
>
> 1. You posted for a Senior COBOL Developer on LinkedIn (still open after 47 days -- that is a hard hire)
> 2. You simultaneously posted for a Cloud Solutions Architect with AWS and Kubernetes experience
> 3. Your Play Store rating dropped to 2.3, with recent reviews citing "takes forever to process transactions"
>
> These three signals paint a clear picture: mainframe backend processing transactions synchronously, modern frontend waiting on batch responses, users experiencing it as lag.
>
> The COBOL hire keeps the lights on. The cloud architect is the future. But the gap between those two systems is where your customers are suffering right now.
>
> We specialize in exactly this transition. We deploy engineering squads that run strangler fig migrations -- wrapping legacy systems in modern APIs, extracting services one domain at a time, zero downtime. We have done this for financial services and insurance platforms with similar COBOL cores.
>
> Would a 45-minute architecture review be useful? We map the dependency graph and identify the first three services to extract. Free, and you keep the output.
>
> James, Labno Labs

**Detailed (Follow-up email, ~115 words):**

> Marcus,
>
> Wanted to share something concrete. I sketched a typical decomposition pattern for COBOL-backed transaction systems:
>
> Phase 1 (Weeks 1-8): API gateway wrapping the mainframe. Modern REST endpoints that translate to COBOL calls. Immediate performance gain because you can add caching and async processing at the gateway layer.
>
> Phase 2 (Weeks 9-16): Extract the highest-volume transaction type into a standalone service. Usually payments or account lookups. The mainframe still handles everything else.
>
> Phase 3 (Weeks 17-24): Second and third service extraction, running in parallel with the mainframe.
>
> The COBOL system keeps running throughout. No big-bang migration. No feature freeze.
>
> If this maps to what you are dealing with, happy to walk through the specifics.
>
> James, Labno Labs

---

## Template 4: AI Readiness

### Trigger Signals
- Job postings for AI/ML Engineers, Data Scientists, "AI Center of Excellence" leads
- Company blog posts or press releases about AI strategy
- Recent AI vendor evaluations (G2 comparisons of AI tools)
- Executive LinkedIn posts about AI transformation

### Target Persona
CTO, Chief AI Officer, VP Data Science, VP Engineering, Head of AI/ML

### Tone Calibration
Thought leader and peer. You live in this space daily. You know the difference between AI hype and production AI. You understand that hiring a 5-person AI team takes 6-9 months and costs $1.5M+/year in salary alone -- and they still need 6 months to ramp. Be consultative, not salesy. Reference specific models, frameworks, and deployment patterns. Sound like the person they wish they could hire but cannot find.

### Structure

```
OPENING (1-2 sentences):
- Reference their specific AI hiring or initiative. "You posted for 
  a Head of AI and two ML Engineers last month. That's a $900K+ 
  annual investment before they ship a single model."

MARKET TIMING (2-3 sentences):
- Frame the urgency without being pushy. "The window for AI competitive 
  advantage in {{their_industry}} is about 18 months. After that, 
  the tooling commoditizes and everyone has the same capabilities. 
  The companies that win are the ones shipping AI features now, 
  not the ones still hiring."
- Acknowledge the build-vs-buy tension. "Building an internal team 
  is the right long-term play. But the 9-month hiring timeline means 
  your competitors ship 3-4 AI features before your team writes 
  their first production inference call."

ACCELERATION MODEL (1-2 sentences):
- Position AI Squads as a bridge, not a replacement. "We deploy 
  AI engineering squads that ship production features in weeks while 
  your internal team ramps. They work inside your codebase, use your 
  data infrastructure, and transfer knowledge to your hires as 
  they onboard."

CTA (1 sentence):
- AI readiness assessment and squad deployment proposal. "Worth a 
  30-minute call to walk through your AI roadmap? We can identify 
  which features are squad-deployable now and which should wait 
  for your internal team."
```

### Subject Line Formulas
1. `Your AI team vs. the 9-month hiring clock`
2. `{{company_name}} AI roles -- a bridge strategy`
3. `Shipping AI features before your Head of AI starts`

### LinkedIn Connection Note Formula
```
{{first_name}} -- saw the {{ai_role}} posting. Smart long-term move, 
but the hiring timeline for AI talent is brutal right now. We deploy 
AI squads that ship production features in weeks as a bridge. 
Worth comparing approaches?
```

### Example Generated Messages

**Short (LinkedIn message, ~65 words):**

> Priya -- you posted for a Head of AI, two ML Engineers, and a Data Platform Lead. That is an $1.1M/year team that will take 6-9 months to assemble, then another 6 months to ship v1. Your competitors in insurtech are already deploying claims automation. We can have an AI squad shipping features inside your codebase within 3 weeks. Worth a quick conversation?

**Medium (First-touch email, ~140 words):**

> Priya,
>
> Your four AI/ML job postings went live 6 weeks ago. Based on current market data, here is the likely timeline:
>
> - Head of AI hire: 4-6 months (if you are lucky -- average is 7.2 months for this role)
> - ML Engineers: 3-4 months each
> - Team fully ramped and shipping: 6 months after last hire
> - First production AI feature: roughly Q3 2027
>
> Meanwhile, Lemonade just launched their AI claims adjudicator and Root is testing automated underwriting. The insurtech AI window is narrowing.
>
> This is not a build-vs-buy argument. You should build the internal team. But the 12-18 month gap between "we decided to do AI" and "we shipped AI" is where market share moves.
>
> We deploy AI engineering squads -- 3-4 senior engineers who embed in your codebase, use your data infrastructure, and ship production features in 2-4 week sprints. When your internal team comes online, our squad transfers context and exits.
>
> Worth 30 minutes to map your AI roadmap against a squad deployment timeline?
>
> James, Labno Labs

**Detailed (Follow-up email, ~120 words):**

> Priya,
>
> I put together a rough deployment timeline for the two most common AI features in insurtech, assuming a squad start:
>
> **Claims triage automation** (Week 1-4): NLP model classifying incoming claims by complexity, routing simple claims to auto-adjudication, flagging complex ones for human review. Typical accuracy: 89-93% after fine-tuning on your historical claims data.
>
> **Underwriting risk scoring** (Week 5-10): ML model augmenting (not replacing) underwriter decisions with risk signals from application data. Usually deployed as a recommendation layer, not an override.
>
> Both use your existing data. Both ship incrementally. Both produce artifacts your internal team inherits.
>
> If either of these is on your roadmap, happy to walk through the architecture and data requirements in detail.
>
> James, Labno Labs

---

## Template 5: Healthcare-Specific

### Trigger Signals
- Healthcare app reviews mentioning clinical workflow friction, charting time, patient communication gaps
- HIPAA-related complaints or compliance concerns in reviews
- EHR integration complaints (Epic, Cerner, Athena)
- Practice management software frustration
- Job postings for clinical informatics or health IT roles

### Target Persona
CIO, VP Clinical Operations, Practice Manager, Chief Medical Information Officer, Director of Health IT

### Tone Calibration
Domain expert who understands clinical environments. You know that "workflow" in healthcare means something different than in SaaS -- it means a nurse spending 3 hours on documentation instead of patient care. You understand HIPAA is not a checkbox but a continuous compliance requirement. You know the difference between HL7 FHIR and legacy HL7v2 interfaces. Reference clinical outcomes, not just efficiency metrics. Sound like someone who has shipped software that clinicians actually use.

### Products to Position
- **AI Medical Assistant**: Ambient documentation, clinical decision support, patient communication automation
- **DocQuest**: Medical case simulation for training and competency assessment
- **PainDrain**: GPT-5-powered pain tracking and translation for patient-provider communication

### Structure

```
OPENING (1-2 sentences):
- Reference a specific clinical workflow pain point from reviews or 
  public data. "Your Google reviews show a pattern: patients 
  mentioning long wait times and feeling rushed during appointments. 
  That usually maps to a documentation burden problem -- your 
  providers are spending more time charting than examining."

CLINICAL IMPACT (2-3 sentences):
- Connect the workflow problem to patient outcomes, not just 
  efficiency. "When providers spend 2+ hours/day on documentation, 
  appointment slots shrink, patient face-time drops below 12 minutes, 
  and clinical detail gets lost in templated notes. The downstream 
  effect is missed nuances and patient dissatisfaction."
- Reference a specific product. "Our AI Medical Assistant handles 
  ambient documentation -- it listens during the encounter and 
  generates structured clinical notes in real-time. Providers review 
  and sign, typically saving 90+ minutes/day."

COMPLIANCE (1 sentence):
- Address HIPAA proactively. "Everything runs on HIPAA-compliant 
  infrastructure with BAA coverage, SOC 2 Type II, and we never 
  train models on patient data."

CTA (1 sentence):
- Clinical workflow automation demo. "Worth 20 minutes to see how 
  the ambient documentation works in a simulated encounter? We can 
  use a case relevant to {{their_specialty}}."

PRODUCT-SPECIFIC POSITIONING:
- If the signal is about TRAINING or ONBOARDING: lead with DocQuest
  "DocQuest runs interactive case simulations -- new residents work 
  through diagnostic scenarios with AI-generated patient presentations, 
  getting real-time feedback on clinical reasoning."
- If the signal is about PAIN MANAGEMENT or PATIENT COMMUNICATION: 
  lead with PainDrain
  "PainDrain translates subjective pain descriptions into structured 
  data -- patients describe symptoms in natural language, and 
  providers see standardized pain profiles with trend tracking."
- If the signal is about DOCUMENTATION or ADMIN BURDEN: lead with 
  AI Medical Assistant
```

### Subject Line Formulas
1. `{{practice_name}} documentation burden -- 90 minutes back per provider`
2. `The charting problem your {{specialty}} team keeps hitting`
3. `{{specific_patient_complaint}} -- a clinical workflow fix`

### LinkedIn Connection Note Formula
```
{{first_name}} -- saw {{practice_name}}'s reviews mentioning 
{{specific_clinical_pain}}. We built {{relevant_product}} specifically 
for this. HIPAA-compliant, works with {{their_EHR}}. Worth 15 minutes 
to see a demo in a {{specialty}} context?
```

### Example Generated Messages

**Short (LinkedIn message, ~70 words):**

> Dr. Chen -- Midwest Orthopedic Associates' Google reviews have a pattern: 23 of the last 40 mention feeling rushed and providers "typing the whole time." That is a documentation burden signal. Our AI Medical Assistant does ambient clinical documentation -- listens during the encounter, generates structured notes in your Epic format, provider reviews and signs. Average time savings: 94 minutes/day per provider. HIPAA-compliant with BAA. Worth a 15-minute demo?

**Medium (First-touch email, ~145 words):**

> Dr. Chen,
>
> I read through Midwest Orthopedic Associates' recent Google reviews. Your clinical ratings are strong -- patients consistently praise the quality of care. But a pattern appears in the 3-star reviews: "doctor was great but spent half the visit typing," "felt like I was talking to the back of a laptop," "appointment felt rushed even though the diagnosis was thorough."
>
> That is a documentation burden problem, and it is costing you in two directions: patient satisfaction scores and provider burnout. If your orthopedic surgeons are spending 2+ hours/day on post-encounter charting, they are losing 4-5 patient slots per week.
>
> Our AI Medical Assistant handles ambient documentation -- it captures the clinical encounter in real-time and generates structured notes formatted for Epic. The provider reviews, edits, and signs. Average time savings across our orthopedic deployments: 94 minutes/day per provider.
>
> Fully HIPAA-compliant. BAA included. SOC 2 Type II certified. We never train on patient data.
>
> Worth 20 minutes to see it work on a simulated orthopedic case -- say, a rotator cuff evaluation? You would see the note it generates in real-time.
>
> Sarah, Labno Labs

**Detailed (Follow-up email, ~130 words):**

> Dr. Chen,
>
> Following up with specifics on how the AI Medical Assistant works in an orthopedic setting:
>
> **During the encounter**: The system captures the conversation (patient history, physical exam findings, ROM measurements, special test results) and structures it into your Epic note template -- HPI, physical exam, assessment, plan.
>
> **Pain tracking**: If relevant, PainDrain integrates as a patient-facing module. Before the appointment, the patient describes their pain in natural language ("it's a deep ache behind my kneecap that gets sharp when I go downstairs"). PainDrain translates this into structured data: location, quality, aggravating factors, trend over time. This shows up in the provider's pre-visit summary.
>
> **Compliance**: All processing happens on HIPAA-compliant infrastructure. Audio is processed in real-time and never stored. Notes go directly into Epic via FHIR API.
>
> Happy to run a live demo on a simulated MSK case if this is on your radar.
>
> Sarah, Labno Labs

---

## Template 6: Competitive Displacement

### Trigger Signals
- Company actively comparing alternatives on G2 (writing reviews of competitors, viewing comparison pages)
- Reviews of their current vendor with 1-2 stars mentioning specific failures
- Social media posts or forum threads complaining about their current solution
- Contract renewal timing (if discoverable from job postings or public filings)

### Target Persona
The decision maker evaluating alternatives -- could be CTO, VP Operations, Director of IT, Head of Product. Title depends on what they are switching.

### Tone Calibration
Helpful consultant who has seen many migrations. Not aggressive about the competitor. Never trash-talk. Instead, acknowledge what the competitor does well, then address the specific gaps the prospect complained about. Sound like someone who has helped other companies make this exact switch and knows where the landmines are.

### Structure

```
OPENING (1-2 sentences):
- Reference their specific complaint about the competitor, not 
  the competitor in general. "Your G2 review of {{competitor}} 
  mentioned that the API rate limits killed your integration 
  reliability -- that's a pain point we hear from about 40% of 
  {{competitor}} users at your scale."

COMPETITOR GAP ANALYSIS (2-3 sentences):
- Address their specific complaints with specific solutions. 
  Do not make vague "we're better" claims. "The rate limit issue 
  is architectural -- {{competitor}} uses a shared tenant model 
  that throttles at scale. Our infrastructure uses dedicated 
  compute per client, so there's no shared ceiling."
- Acknowledge what the competitor does well. "{{Competitor}}'s 
  onboarding flow is genuinely best-in-class -- we won't pretend 
  otherwise. But their API infrastructure wasn't built for the 
  integration volume you're running."

MIGRATION REALITY (1-2 sentences):
- Be honest about the migration effort. "Migration from 
  {{competitor}} typically takes 3-5 weeks for a deployment your 
  size. We handle the data migration and run both systems in 
  parallel for 2 weeks so nothing breaks."

CTA (1 sentence):
- Comparison briefing or migration assessment. "Worth a 25-minute 
  comparison walkthrough? I can show you exactly how we handle 
  {{their_specific_complaint}} and give you a realistic migration 
  timeline."
```

### Subject Line Formulas
1. `The {{competitor}} API limit problem -- how others solved it`
2. `Switching from {{competitor}}? Migration reality check`
3. `Re: your {{competitor}} review -- a different approach to {{specific_issue}}`

### LinkedIn Connection Note Formula
```
{{first_name}} -- read your {{competitor}} review on G2 about 
{{specific_complaint}}. We built our {{feature}} specifically to 
avoid that limitation. Happy to do a side-by-side comparison on 
the specific issue if useful.
```

### Example Generated Messages

**Short (LinkedIn message, ~65 words):**

> Alex -- your G2 review of Zendesk mentioned ticket routing taking 4+ manual steps and the AI suggestions being "useless for technical tickets." Both are solvable. Our agentic AI chatbot handles multi-step routing with context awareness -- it reads the full ticket history, not just keywords. Companies switching from Zendesk's AI typically see 60% fewer manual escalations. Want a 20-minute comparison demo?

**Medium (First-touch email, ~140 words):**

> Alex,
>
> Your G2 review of Zendesk was detailed and specific, which is why it caught my attention. The two issues you raised -- manual ticket routing eating 4+ steps per ticket and the AI suggestions being "completely wrong for anything technical" -- are structural problems, not configuration issues.
>
> Zendesk's AI routes based on keyword matching. For technical tickets, keywords overlap heavily across categories (e.g., "error," "crash," "not working" could be 15 different products). That is why the suggestions feel random.
>
> Our agentic AI chatbot takes a different approach: it reads the full conversation context, identifies the technical domain from the symptom description, and routes based on resolution patterns from similar past tickets. For technical support teams, this typically reduces manual escalation by 55-65%.
>
> To be fair -- Zendesk's reporting dashboard is hard to beat, and we will tell you that upfront. But the routing and AI triage is where the gap is real.
>
> Migration from Zendesk takes about 3 weeks. We import ticket history, retrain routing models on your data, and run parallel for 2 weeks. Nothing drops.
>
> Worth 25 minutes for a side-by-side on the routing issue specifically?
>
> Rachel, Labno Labs

**Detailed (Follow-up email, ~115 words):**

> Alex,
>
> Thought this might be useful. I pulled together a comparison on the two specific issues from your review:
>
> **Ticket routing**:
> - Zendesk: keyword-based, 4+ manual steps for technical tickets
> - Our approach: contextual analysis of full ticket thread, auto-routes based on resolution pattern matching. Handles multi-product technical tickets that keyword systems misclassify
>
> **AI suggestions**:
> - Zendesk: suggests articles based on keyword overlap -- breaks down for technical content
> - Our approach: agentic system that reads the symptom, identifies the technical domain, and either resolves directly or surfaces the specific resolution steps (not article links)
>
> Not claiming we are better at everything. Zendesk's ecosystem and reporting are mature. But for technical support triage, the architectural difference is significant.
>
> Happy to demo both scenarios with your actual ticket types if useful.
>
> Rachel, Labno Labs

---

## Quick Reference: Template Selection Guide

| Signal You Found | Template | Primary CTA |
|-----------------|----------|-------------|
| Bad app reviews + crash/performance complaints | 1 - Frontend Technical Debt | Modernization audit |
| G2 reviews about manual processes + ops hiring | 2 - Operational Bottleneck | Workflow automation assessment |
| Legacy tech job postings + performance complaints | 3 - Infrastructure Debt | Architecture review |
| AI/ML hiring surge + no shipped AI features yet | 4 - AI Readiness | AI readiness assessment |
| Healthcare app complaints + clinical workflow pain | 5 - Healthcare-Specific | Clinical workflow demo |
| Negative reviews of their current vendor + comparison shopping | 6 - Competitive Displacement | Comparison briefing |

---

## LLM Generation Instructions

When using these templates to generate messages, pass the following to the LLM:

```
SYSTEM: You are writing outreach for Labno Labs, a London-based AI 
consulting firm. Use the template structure below but generate a 
completely unique message. Never copy example phrasing verbatim. 
Every sentence must reference specific data from the signal_data 
provided. Score your output using the personalization depth criteria 
and only return messages scoring 4+.

TEMPLATE: [paste the relevant template structure]

SIGNAL DATA: [paste scraped reviews, job postings, metrics]

TARGET: [name, title, company]

FORMAT: [LinkedIn / short email / detailed email]

CONSTRAINTS:
- Under 150 words for first touch, under 120 for follow-up
- Plain text only
- No spam trigger phrases (see anti-spam rules)
- Must include at least one quantified cost estimate or metric
- CTA must be low-commitment and specific
```
