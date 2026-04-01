import { useState } from "react";

/* ─── DATA ─────────────────────────────────────────────────────────────────── */

const qAnalysis = [
  {
    id:"01", theme:"Resource Allocation",
    question:"Where is our highest-leverage effort being spent on commodities instead of differentiation?",
    pros:["Forces immediate strategic clarity on where skilled hours are going","Exposes the gap between where effort lives vs where value is created","Enables a concrete reallocation conversation with yourself and your team","Directly informs the Labno Labs 'buy vs build' gate before any sprint begins","Prevents the sunk-cost trap of continuing custom builds for commoditized functions"],
    cons:["Creates false binaries — some commodity work is relationship-maintenance, not waste","'Commodity' is context-dependent: auth is commodity at scale but may be custom at your current stage","Can devalue the maintenance work that keeps differentiated systems running","May generate strategic whiplash if applied too aggressively to in-progress builds","Doesn't account for learning value in building something you could have bought"],
    edges:[
      {title:"Supabase is commodity infrastructure underpinning Oracle IP", body:"Supabase is a commodity tool — but it's the substrate for your differentiator. Redirecting effort away from it is wrong. The question must ask about effort ON the commodity, not effort THROUGH it."},
      {title:"The developer IS the commodity function", body:"If a team member or contractor is doing commoditized work, the question has political implications. The answer may be correct and still damage a relationship if handled bluntly."},
      {title:"Market timing lag on what counts as 'commodity'", body:"What reads as commodity today (vector search, RAG pipelines) was genesis 18 months ago. Your Wardley read may lag the market — you could be under-investing in something that's still differentiating."},
      {title:"Core Three delivery shell vs Core Three IP", body:"Core Three exercises are clinical IP but the app shell delivering them is commoditized. You build the IP layer and buy the shell — but the boundary between them needs precision or you'll build too much."},
      {title:"A referring physician expects a custom integration", body:"Commodity to you. Relationship-critical to a referring physician who expects a tailored referral report. The cost of 'buying' here is the relationship — which isn't on the Wardley map."},
    ]
  },
  {
    id:"02", theme:"Constraint Theory",
    question:"What is the single constraint that, if removed, would compound velocity across every other system?",
    pros:["Concentrates effort at the highest-leverage point instead of distributing it across 10 improvements","Creates quarter-level clarity and prevents diffusion across two businesses","Aligns agent and automation investment with the actual bottleneck","Reduces the cognitive overhead of managing too many parallel tracks","Theory of Constraints is empirically validated across manufacturing, software, and services"],
    cons:["Single-constraint thinking can blind you to co-occurring bottlenecks that interact","In a two-business system, the constraint in one may be the output of the other","'Remove' implies the constraint is discrete — most are structural and resist clean removal","May create false urgency to name a constraint when the real answer is 'we need more data'","Solving the constraint often reveals the next one immediately — the win can feel temporary"],
    edges:[
      {title:"The constraint is you", body:"The founder is the bottleneck in most two-business operator systems. But removing yourself requires trust systems, documentation, and agents that don't exist yet — which means the constraint can't be removed without first building the infrastructure that currently doesn't exist."},
      {title:"The constraint is external and uncontrollable", body:"Insurance reimbursement caps, a vendor's API limitation, or HIPAA compliance requirements may be the constraint. Identifying it is correct but actionability is low — the response has to be designing around it, not removing it."},
      {title:"Two businesses share the same constraint but the cost is borne by one", body:"If your time is the shared constraint, resolving it (hiring, delegating) may benefit Labno Labs more than Movement Solutions — but Movement Solutions bears the training cost. The economics are asymmetric."},
      {title:"The constraint shifts mid-quarter after you've committed resources", body:"You commit a sprint to solving Oracle's auth bottleneck. Mid-quarter, Clinical Brain's agent handoff architecture becomes the actual velocity constraint. You're now solving yesterday's problem."},
      {title:"Removing the constraint reveals a worse one immediately", body:"Classic Whac-a-Mole dynamics. You unblock the agent pipeline only to find the exercise library schema is the next ceiling. The psychological momentum of 'solving it' can mask that the new constraint is larger."},
    ]
  },
  {
    id:"03", theme:"Vision Clarity",
    question:"What does our fully realized 3-year state look like — and what decision are we delaying that is the longest upstream blocker?",
    pros:["Creates directional coherence that makes day-level decisions faster","Exposes decision debt — the decisions that compound when delayed","Forces distinction between 'I don't know' and 'I'm avoiding'","Aligns Movement Solutions and Labno Labs on a shared trajectory","Identifies the minimum viable future state vs the maximalist version — useful for sequencing"],
    cons:["3-year horizons in AI-augmented health tech may be too long to be actionable","Risk of false precision — a crisp 3-year vision can become a constraint rather than a guide","The upstream blocker is often an emotional or relational decision, not a logistical one","Partners and stakeholders may not share the same vision — surfacing this creates necessary tension","Planning at 3-year resolution while executing at 2-week resolution creates cognitive dissonance"],
    edges:[
      {title:"Your business partner has a different 3-year vision", body:"Movement Solutions has a partner. If the fully realized state diverges between partners, the question surfaces a misalignment that is far more urgent to address than any architectural decision."},
      {title:"The upstream blocker is regulatory", body:"PT licensure scope, HIPAA compliance for Clinical Brain's data handling, or FDA classification for a somatic app could be the longest upstream blocker — and it has nothing to do with your build queue."},
      {title:"The vision requires capabilities that don't exist yet", body:"Wearable HRV integration, real-time NS state tracking, and IFS-informed AI coaching require hardware and model capabilities that may not be reliable within 3 years. Visioning around them creates fragile plans."},
      {title:"Movement Solutions and Labno Labs have diverging 3-year arcs", body:"The fully realized Movement Solutions is a premium, oversubscribed boutique PT practice. The fully realized Labno Labs is a scalable AI consulting firm. These may require fundamentally different time, identity, and resource allocations."},
      {title:"The blocking decision is one you're emotionally avoiding", body:"The most common upstream blocker is a decision that's been ready for months but feels irreversible — a pricing repositioning, a client exit, a technology commitment. Logistical framing masks the emotional stall."},
    ]
  },
  {
    id:"04", theme:"Client Experience",
    question:"What would our highest-value client say is the one gap between what we deliver and what they actually needed?",
    pros:["Grounds strategy in client reality rather than internal assumptions","Reveals product and experience gaps that no internal audit can surface","Directly feeds the Clinical Brain outcome loop — clinical gaps become agent improvement targets","Differentiates between what clients say they want and what they actually need","High-value client feedback has the highest signal-to-noise ratio of any input source"],
    cons:["High-value clients may not articulate the real gap — they may not have language for it","Selection bias: the clients you ask are the satisfied ones; the churned ones already answered this question by leaving","Different segments (Resilience, Flow, Reactivation) have completely different gaps — one answer doesn't generalize","The gap may be in something you intentionally chose not to offer","Asking the question creates an implicit commitment to act on the answer"],
    edges:[
      {title:"The gap is something you intentionally don't offer", body:"Your highest-value Resilience client wants ongoing remote coaching between sessions. You've intentionally kept Movement Solutions in-person. Surfacing this gap opens a scope question that may not belong in the current roadmap."},
      {title:"The gap is in how you communicate, not what you deliver", body:"Clinical outcomes are strong. The client's experience of not understanding their own progress is the gap. This isn't a clinical problem — it's a reporting and translation problem that Oracle could solve."},
      {title:"The Reactivation segment's gap is completely different from Resilience", body:"Reactivation clients need better post-discharge continuity. Resilience clients need better real-time performance tracking. One somatic app can't solve both — and trying to might solve neither."},
      {title:"The gap is in post-discharge continuity", body:"Your highest clinical value is delivered in-session. The gap is what happens after the client leaves. This points directly to the somatic app — but building it before Core Three methodology is fully documented risks building an empty shell."},
      {title:"Client says everything is fine but has quietly stopped referring", body:"Silent churn in a referral-driven business is the most expensive gap. The client experience is 'fine' — but the relationship isn't compounding. The real gap is in what would make them advocates, not just satisfied."},
    ]
  },
  {
    id:"05", theme:"Automation Readiness",
    question:"Which manual process could be fully automated within 90 days — and what is the real cost of not doing it?",
    pros:["Creates urgency and a concrete 90-day ROI frame","Shifts the conversation from 'should we automate' to 'what's the cost of delay'","Identifies the highest-leverage automation target across both businesses","Forces data quality audit — you can't automate what you can't measure","Surfaces Kylie, referral cadences, and billing as the most immediate candidates"],
    cons:["90 days may be too ambitious given Oracle and Clinical Brain's current build queue","Automation can break relationships if it replaces high-touch moments clients value","The process most amenable to automation may not be the highest-leverage one","'Fully automated' is rarely achievable — partial automation may create more complexity than it removes","Calculating the 'real cost' of not automating requires baseline data that often doesn't exist"],
    edges:[
      {title:"The most automatable process is the one clients value most for human touch", body:"Intake rapport with Kylie is automatable. But your Resilience clients chose Movement Solutions partly because of the human onboarding experience. Automating it saves 20 minutes and costs a premium positioning signal."},
      {title:"Physician referral acknowledgment is automatable but the physician expects a personal call", body:"Your top 10 referral physicians have a relationship expectation that automation will read as deprioritization. The automation is correct for the bottom 80 and wrong for the top 10."},
      {title:"The automation requires data that isn't clean enough to run", body:"GreenRope contact data quality may be too inconsistent to power an automated referral cadence. You'd spend 60 days cleaning data before the 90-day automation clock even starts."},
      {title:"Kylie automation creates a HIPAA compliance surface that manual process doesn't", body:"A human intake call has implicit consent mechanics. An automated AI intake flow requires explicit disclosure, documented consent workflows, and BAA coverage that your current stack may not have in place."},
      {title:"You automate a process that was masking a deeper problem", body:"Automating session reminders solves no-shows on the surface. But if no-shows are driven by a clinical rapport issue, automation removes the symptom and the cause compounds invisibly."},
    ]
  },
  {
    id:"06", theme:"Knowledge Architecture",
    question:"Where is critical institutional knowledge trapped in a single person's head rather than a documented, retrievable system?",
    pros:["Creates institutional resilience — the business survives personnel changes","Enables delegation without quality degradation","Directly feeds Oracle's knowledge base — extraction sessions are RAG content creation","Forces a realistic audit of how much of the business is systemized vs founder-dependent","Converts tacit expertise into compounding asset"],
    cons:["Some tacit knowledge genuinely resists documentation — clinical judgment is a prime example","Extraction process is time-intensive and competes with active build work","May surface how much of the competitive moat IS the founder's knowledge — a destabilizing realization","Documented knowledge decays — without a refresh protocol, Oracle becomes a liability","Knowledge capture sessions require clinical privacy review before being used as RAG content"],
    edges:[
      {title:"The knowledge holder IS the competitive moat", body:"Your clinical relationship management style, referral physician rapport, and polyvagal lens interpretation are not just knowledge — they ARE the product. Externalizing them dilutes differentiation if not handled with extreme care."},
      {title:"Clinical judgment can't safely be reduced to a prompt", body:"The Mechanic can prescribe neurodynamic exercises — but the contraindication logic for complex cases (post-surgical, acute neurological) requires clinical judgment that prompt engineering cannot safely replicate. The boundary must be explicit."},
      {title:"Capturing past cases has HIPAA implications", body:"The richest source of Clinical Brain training data is your case history. Using it as RAG content requires de-identification that's more rigorous than removing names — treatment patterns can be re-identifying in a small geography."},
      {title:"Oracle isn't built yet — where does extracted knowledge live in the interim?", body:"You commit to a monthly knowledge extraction session. Oracle isn't production-ready. You're generating structured knowledge with no reliable retrieval layer. Notion is the interim — but it's not the same as a RAG system."},
      {title:"A key referral relationship lives entirely in personal rapport", body:"Your top referral physician relationship was built over years of personal interaction. No CRM field, contact note, or Oracle document captures the actual social capital. This is irreplaceable — which is the honest answer to where knowledge is trapped."},
    ]
  },
  {
    id:"07", theme:"Strategic Positioning",
    question:"What are we building custom that a world-class competitor would simply buy?",
    pros:["Prevents reinvention of solved problems","Clarifies true ROI of custom builds vs off-the-shelf","Directly informed by Wardley mapping — the question operationalizes the framework","Frees engineering bandwidth for genuine IP","Reduces time-to-market for non-differentiating functions"],
    cons:["'Buying' assumes the right product exists at the right maturity level","Creates vendor dependency that compounds over time","Off-the-shelf products have roadmaps that may diverge from your needs","Buying may create a worse client or clinician experience than building","Some custom builds become assets that can be licensed — buying permanently forecloses that option"],
    edges:[
      {title:"The off-the-shelf product is 80% right but the 20% gap is your differentiation", body:"A commercial exercise prescription platform covers 80% of Clinical Brain's function. The 20% it doesn't cover — polyvagal NS state classification, IFS part-language overlays, Core Three fascial integration — is your actual IP. You can't buy the 20%."},
      {title:"Buying requires ongoing SaaS costs that erode margins at scale", body:"At Movement Solutions' boutique scale, SaaS costs are manageable. But if Labno Labs licenses Clinical Brain to other practices, the per-seat SaaS dependency under the hood creates a margin problem that grows with adoption."},
      {title:"The vendor's roadmap diverges 12 months in", body:"You build Kylie on top of a third-party voice AI platform. 12 months in, the vendor pivots, raises prices, or gets acquired. The custom work you did on top of their platform is now locked to a deteriorating substrate."},
      {title:"A built component becomes an asset you can sell", body:"Clinical Brain's agent architecture, if documented and productized, could be licensed to other PT practices. Buying an off-the-shelf equivalent forecloses this revenue path permanently."},
      {title:"Your clinical IP requires custom data modeling no off-the-shelf product supports", body:"Myers fascial lines × Comerford motor control × Shacklock neurodynamics × polyvagal NS state is a schema that doesn't exist in any commercial product. You can buy the container but the schema must be built."},
    ]
  },
  {
    id:"08", theme:"Metrics Hygiene",
    question:"Which metrics are we tracking that never actually drive a decision — and what would we measure instead?",
    pros:["Reduces cognitive overhead of monitoring unused data","Improves signal quality by eliminating noise","Forces clarity on what actually matters per decision type","Reveals the gap between available metrics and needed metrics","Creates opportunity to design the right data capture layer before building more systems"],
    cons:["Eliminating metrics can create blind spots that become visible only in a crisis","Team and referral physicians may have expectations around specific outcome reports","The metric you stop tracking today may become critical in a new regulatory environment","Two EMR/CRM systems generating different metric definitions complicates any rationalization effort","The right replacement metric may require infrastructure that doesn't exist yet"],
    edges:[
      {title:"A metric that doesn't drive decisions today becomes critical in a crisis", body:"Session volume per clinician looks irrelevant until a clinician goes on leave. Suddenly it's the most important operational number. Eliminating low-use metrics requires a crisis scenario audit."},
      {title:"The metric Clinicient generates can't be changed without a workflow overhaul", body:"Your EMR produces the metrics it produces. Redesigning what you track at the clinical level requires changing documentation workflows that clinicians have built habits around."},
      {title:"A vanity metric is also a referral physician's expectation", body:"Physician outcomes reports show metrics the physician values — not necessarily what drives your clinical decisions. The metric serves a relationship function that its informational value doesn't justify."},
      {title:"GreenRope and Clinicient define the same concept differently", body:"'Active client' in GreenRope and 'active patient' in Clinicient may have different operational definitions. Before eliminating any metric, you need to know which system owns the authoritative definition."},
      {title:"The metric you should be tracking doesn't have a data pipeline yet", body:"NS state correlation to functional outcome scores is the most clinically meaningful metric for Movement Solutions. It doesn't exist yet — because the data capture layer (somatic assessment at intake) isn't structured enough to generate it."},
    ]
  },
  {
    id:"09", theme:"Failure Mode Awareness",
    question:"Where does our system fail silently when no one is watching — and what is the earliest detectable signal?",
    pros:["Proactive risk management before failures compound","Reveals hidden single points of failure in the architecture","Forces monitoring and alerting design into the build process","Surfaces the dependency graph of your full MCP and agent stack","Prevents the most expensive class of failure: the one you didn't know was happening"],
    cons:["Failure mode audits can generate anxiety without clear action paths","Comprehensive coverage is asymptotically expensive — you can always find more failure modes","Monitoring infrastructure adds complexity and maintenance load","False positive alerts create alert fatigue faster than silent failures create damage","Some failure modes are only detectable in retrospect, not in advance"],
    edges:[
      {title:"The failure is in a system you didn't build and can't control", body:"Supabase outage, Vercel downtime, or an Anthropic API disruption takes down Oracle, Clinical Brain, and Kylie simultaneously. Your monitoring detects it — but you have no remediation path because the dependency is external."},
      {title:"Kylie produces a poor client experience before you detect it", body:"A prompt drift in Kylie's intake logic produces slightly off-tone responses. No client complains. But three Resilience prospects quietly decide not to book. The failure is real; the signal is invisible without a systematic feedback loop."},
      {title:"Clinical Brain prescribes a plausible but clinically unsafe exercise", body:"The Mechanic generates a neurodynamic exercise that's appropriate for 95% of clients presenting with a given profile. The 5% edge case — post-surgical, active nerve compression — receives a contraindicated prescription. Plausible output, dangerous outcome."},
      {title:"MCP stack fails silently mid-session and you lose build context", body:"Sequential Thinking or Context7 disconnects mid-architecture session. The session continues but without the context accumulation layer. You don't notice until you review the output and find the logic is inconsistent from the midpoint forward."},
      {title:"A referral physician relationship degrades silently because no one is monitoring cadence", body:"Your second-highest referring physician sent 12 referrals last year. This year they've sent 2 through Q3. No alert fires. No one notices. The relationship decay is 9 months old by the time it surfaces in an annual review."},
    ]
  },
  {
    id:"10", theme:"Agent and AI Leverage",
    question:"Which of our named agents generates the most compounding value over time — and are we investing in it proportionally?",
    pros:["Forces a portfolio view of agent investment rather than treating all agents equally","Identifies where AI leverage compounds vs where it stays linear","Aligns your three-platform AI strategy with actual value generation","Reveals under-investment in high-compound agents","Prevents feature sprawl by requiring comparative ROI thinking"],
    cons:["Compounding value is extremely hard to measure before it has had time to compound","May deprioritize foundational agents (The Overseer) that prevent failures rather than generate output","Agent performance is context-dependent — compound value changes as the client base changes","Optimizing for one agent's compound value may create blind spots in the overall system","Cross-agent interactions mean 'compound value per agent' may be the wrong unit of analysis"],
    edges:[
      {title:"The Mechanic generates output but The Overseer prevents catastrophic errors", body:"The Mechanic produces exercise prescriptions at high volume — visible, measurable output. The Overseer catches the 2% of prescriptions that are clinically inappropriate. Which compounds more? The answer depends entirely on what the 2% error rate costs in outcomes, liability, and reputation."},
      {title:"Kylie is highest-volume but lowest strategic leverage", body:"Kylie handles more interactions than any other agent. But her function (intake routing) is closer to commodity than differentiation. Over-investing in Kylie's sophistication while under-investing in Clinical Brain's architecture is a common leverage inversion."},
      {title:"An agent that seems low-leverage becomes critical at a specific scale threshold", body:"The Billing Agent seems least strategic today — billing is billing. But at 3x volume, billing errors become the single largest revenue leak. The Billing Agent's compound value is scale-dependent in a non-linear way."},
      {title:"A model update partially obsoletes an agent you just optimized", body:"You spend a sprint optimizing The Sniper's targeting logic for Claude Sonnet 3.5. Anthropic releases a new model with native reasoning that makes half the optimization redundant. Agent investment has a shorter shelf life than architectural investment."},
      {title:"The most compounding agent is the one you haven't built yet", body:"Oracle as a knowledge retrieval system — if built correctly — underpins every other agent's accuracy. It's not named in the current Clinical Brain agent set, but it may be the highest-compound investment in the entire system."},
    ]
  },
  {
    id:"11", theme:"Market Assumption Testing",
    question:"Which of our market beliefs have we never tested empirically — and what is the cheapest experiment to prove or disprove them?",
    pros:["Reduces strategic risk by replacing assumption with evidence","Creates an experiment culture that scales into both businesses","Cheapest experiments (landing pages, one-question surveys) are within immediate reach","Surfaces the beliefs you've built the most infrastructure around — the highest-risk assumptions","Forces distinction between 'we believe this' and 'we know this'"],
    cons:["Testing everything is paralyzing — some assumptions must be foundational by convention","Results from cheap experiments are often ambiguous and require careful interpretation","The experiment may attract the wrong audience and produce false signal","Some assumptions can only be tested by building the thing — which removes the 'cheap' framing","Testing an assumption and finding it wrong when the business is built around it is disruptive by design"],
    edges:[
      {title:"The test requires revealing a capability to clients before it's ready", body:"Testing whether Resilience clients would use a somatic integration app requires showing them something. An MVP demo before the app is stable creates expectations you must either meet or manage. The test cost includes expectation management."},
      {title:"Testing an untested assumption about physician behavior could damage the relationship", body:"You assume physicians want a digital referral portal. Testing this assumption requires asking them — which signals you're considering changing a communication format they may prefer to keep as-is. The test itself has relationship consequences."},
      {title:"The experiment result is ambiguous — you can't act on it either way", body:"A landing page for the somatic app gets 200 email signups. Is that signal enough to prioritize it over Clinical Brain? Maybe. But 200 signups from a non-representative audience may tell you nothing about willingness to pay, retention, or clinical adoption."},
      {title:"You test an assumption and it's wrong but the business is already built around it", body:"Movement Solutions is built around the belief that the Chicago North Shore market values a polyvagal-informed clinical approach. If the empirical test shows clients primarily chose you for convenience and insurance coverage, the brand repositioning cost is enormous."},
      {title:"The cheapest experiment attracts the wrong audience", body:"A Meta ad campaign to test somatic app demand attracts wellness enthusiasts, not your Resilience segment. The conversion data is real but the audience is wrong. Cheap experiments have audience validity problems that expensive ones don't."},
    ]
  },
  {
    id:"12", theme:"Capacity Design",
    question:"How would our business operate if every admin function ran autonomously — and what would we do with the recovered hours?",
    pros:["Forces a candid audit of founder-dependency across both businesses","Reveals the true cost of manual admin in terms of strategic opportunity cost","Creates a concrete vision for what 'systemized' actually means in practice","Identifies the minimum viable automation investment for maximum hour recovery","The 'recovered hours' question surfaces your actual strategic priorities"],
    cons:["Some founder involvement IS the product — removing it changes the value proposition","Autonomous admin assumes a level of data quality and system integration that doesn't exist yet","The hours recovered may fill with equivalent-leverage tasks without a deliberate plan","Legal and compliance functions (PT licensure, HIPAA) can't be delegated to systems","Autonomous operation is possible for Labno Labs in ways it isn't for Movement Solutions clinical care"],
    edges:[
      {title:"Autonomous operation is possible for Labno Labs but not for hands-on clinical care", body:"Labno Labs consulting can be heavily automated — document generation, client onboarding, progress reporting. Movement Solutions clinical delivery cannot. The question has asymmetric answers across your two businesses and requires separate responses."},
      {title:"The 30-day autonomous run requires a team that doesn't yet exist", body:"Autonomous operation isn't just automation — it's also human coverage for what automation can't do. Without a team member who can handle clinical escalations, compliance decisions, and relationship management, 'autonomous' means 'degraded service.'"},
      {title:"Automation runs correctly but client relationships degrade without your presence", body:"Kylie handles intake. The Overseer manages clinical logic. Reports go out automatically. But clients chose Movement Solutions partly because of direct access to you. The automated version may be operationally clean and experientially hollow."},
      {title:"HIPAA compliance and PT licensure require a licensed human in the loop", body:"Certain clinical decisions, billing certifications, and consent processes legally require a licensed PT to be the responsible party. Autonomous operation has a legal floor that no automation stack can breach."},
      {title:"The autonomous version attracts different clients than your current version", body:"A fully autonomous Movement Solutions would optimize for operational efficiency. Your current positioning attracts clients who value the artisanal, high-attention experience. These may be mutually exclusive client profiles."},
    ]
  },
  {
    id:"13", theme:"Competitive Intelligence",
    question:"What would a well-resourced competitor do differently with our exact assets — and why aren't we doing it?",
    pros:["Breaks internal assumptions by forcing an external frame of reference","Reveals latent opportunity that familiarity has made invisible","Identifies under-utilized assets — the 189-exercise library, the 114-physician network, Core Three IP","Surfaces strategic inertia that feels like prudence but is actually risk avoidance","The 'why aren't we doing it?' half of the question is the most diagnostic part"],
    cons:["Can trigger reactive strategy — doing what the imagined competitor would do, rather than what's right for your context","Competitive analysis in boutique PT is geography-constrained — the real competitor is inertia, not a firm","May over-index on scale-oriented moves that don't fit a premium boutique positioning","The competitor frame can undervalue relational and clinical assets that don't translate to competitive playbooks","Labno Labs has few direct competitors in its specific niche — the frame may generate irrelevant answers"],
    edges:[
      {title:"A well-resourced competitor would simply buy your patient list", body:"This is technically the most impactful move with your assets. It's not actionable. The question requires a 'what would they do that you could also do?' framing to be useful — pure competitive analysis produces answers you can't use."},
      {title:"They would commoditize Core Three with AI — which is already happening", body:"A funded health tech company could ingest Myers, Comerford, and Shacklock literature and approximate your framework with an LLM within 18 months. This isn't hypothetical. The question isn't whether they'll do it — it's whether your IFS overlay and clinical relationship moat are defensible enough."},
      {title:"The answer reveals a move you're capable of but emotionally resistant to", body:"A well-resourced competitor would productize Core Three immediately, charge for it, and license it to other practices. You haven't done this. The gap between capability and action is the real answer to 'why aren't we doing it?'"},
      {title:"They would make your referral network contractual rather than relational", body:"Formalized referral partnerships with outcome-based incentive structures. You've kept it relational. This is both a feature and a vulnerability — relational networks are high-trust and non-transferable, which is good. But they also don't survive key-person changes."},
      {title:"The answer points to a move that conflicts with your clinical values", body:"A competitor might use aggressive direct-to-consumer marketing for the somatic app, targeting anxiety and chronic pain sufferers with urgency-based copy. That's not your voice. Some competitive moves are correct strategically and wrong for your brand."},
    ]
  },
  {
    id:"14", theme:"Energy Alignment",
    question:"Where are we spending high-regulation cognitive energy on low-leverage tasks — and what structural change would fix it?",
    pros:["Applies your own clinical framework (co-regulation before skill-building) to your operating rhythm","Optimizes human capital at the level that matters most — not hours, but attentional quality","Reveals the tasks that are draining the capacity needed for deep build work","Surfaces the structural change required — not just willpower-based habit change","Directly informs protected rhythm scheduling for Oracle and Clinical Brain"],
    cons:["Not all low-leverage tasks can be automated or delegated — some are relationship-maintenance","Optimizing for energy efficiency can produce a schedule that's correct on paper and socially isolating in practice","Defining 'low-leverage' requires honest self-assessment that's prone to motivated reasoning","Removing a task can create a vacuum that fills with a different low-leverage task at the same energy cost","Team members' low-leverage tasks may be their high-leverage contribution — reframing creates confusion"],
    edges:[
      {title:"The high-regulation task IS the high-value relationship", body:"A difficult clinical conversation with a complex patient requires your highest-regulation capacity. It's not low-leverage — it IS the product. The question must carefully distinguish 'high-energy AND low-leverage' from 'high-energy because it matters.'"},
      {title:"Removing a low-leverage task creates a different low-leverage vacuum", body:"You automate session scheduling. The 20 minutes you recover fills with inbox management. The energy optimization didn't produce strategic time — it just rotated the low-leverage task. The structural change needed is not automation but time architecture."},
      {title:"A somatic check-in ritual is highest-leverage for NS regulation but lowest-leverage for output", body:"Your framework would suggest starting the day with a nervous system regulation practice. This is highest-leverage for sustaining attentional quality across the day but produces zero visible output. In a two-business build phase, this creates a real tension between what's wise and what's urgent."},
      {title:"The schedule that's optimal for energy is suboptimal for collaboration", body:"Your protected rhythm blocks on Tuesday and Thursday are ideal for deep build work. But your clinical team needs access on those days. Energy-optimized scheduling and team-accessible scheduling are in tension."},
      {title:"High-regulation effort on low-leverage tasks may be a nervous system signal, not a design problem", body:"If you're spending high-regulation energy on tasks that should feel easy, the issue may be an underlying NS state, relationship friction, or value misalignment — not a workflow problem. No structural change fixes a co-regulation issue."},
    ]
  },
  {
    id:"15", theme:"Legacy Design",
    question:"If this business ran without us for 30 days, what would break first — and is that what we should be building into next quarter?",
    pros:["Most brutally honest systems audit available — forces confrontation with actual dependency","Reveals the gap between documented process and institutional knowledge","Directly generates next quarter's build priorities from a genuine operational stress test","Identifies the single highest-risk dependency in each business","Creates a concrete legacy planning conversation that abstracts beyond any individual quarter"],
    cons:["Creates anxiety without a clear remediation path if the answer is 'almost everything'","Some dependencies are by design — not every founder dependency is a flaw to be fixed","The 30-day frame may underestimate how long certain failures take to surface","Legal/compliance requirements make true founder-absence impossible in some regulated contexts","The question can feel existentially uncomfortable if the honest answer is 'the whole business'"],
    edges:[
      {title:"The first thing that breaks is a personal referral relationship", body:"Your top 3 referral physicians call you directly. There is no system, no agent, no team member who holds that relationship. It's the first thing that breaks and it's also the hardest to systemize without losing what makes it valuable."},
      {title:"Clinicient requires licensed PT credentials and can't be delegated to a system", body:"Your EMR access, clinical documentation sign-off, and billing certification all require a licensed PT. The 30-day test hits a legal wall before the operational one. 'What breaks first' is a compliance question before it's a systems question."},
      {title:"Clinical Brain breaks because the core prompt logic was never documented", body:"The Mechanic's most important logic — the edge-case handling, the contraindication reasoning, the IFS framing — lives in your understanding of what the prompt should do, not in the prompt itself. Day 7: an edge case appears. No one knows how to handle it."},
      {title:"The financial system breaks because credentials are single-access", body:"QuickBooks Online, Lemon Squeezy, and business banking credentials may all be single-access. The 30-day test breaks on the first bill payment or payroll run that requires a login no one else has."},
      {title:"Nothing breaks in week 1 but momentum quietly degrades in week 3", body:"The most insidious failure mode. Week 1 operates on existing momentum. Week 2 shows small cracks. Week 3, the pipeline is thinner, referrals are slower, and the Clinical Brain sprint has stalled. The failure isn't acute — it's gradual, and gradual failures are the ones that do the most damage."},
    ]
  },
];

const moreHabits = [
  { id:"26", category:"Clinical Systems", title:"Build a Polyvagal Onboarding Assessment That Feeds Clinical Brain", body:"Formalize NS state assessment at intake as a structured data field, not a clinical impression. Green/Amber/Red at intake directly populates Clinical Brain's first-pass prescription logic — and creates the longitudinal NS state dataset that no competitor has." },
  { id:"27", category:"Decision Architecture", title:"Create a Decision Log for Every Architectural Choice in Oracle and Clinical Brain", body:"Every 'why did we build it this way?' question is expensive to answer 6 months later. A lightweight decision log in Notion — date, decision, rationale, alternatives considered — is the cheapest form of institutional memory available." },
  { id:"28", category:"Referral Systems", title:"Build a Physician Outcome Report Generator as a Referral Retention Tool", body:"Your 114-physician referral network sends patients in. They receive almost nothing back. A quarterly auto-generated outcomes summary per referring physician — built on Clinicient data, delivered via Oracle — is the highest-ROI referral retention investment you're not making." },
  { id:"29", category:"Build Cadence", title:"Establish a Biweekly Ship Cadence — Deploy Something to Production Every Two Weeks", body:"The most dangerous phase of a build project is extended pre-deployment. A strict two-week deploy cycle — even for small features — forces scope discipline, surfaces integration problems early, and sustains build momentum against the gravity of perfect." },
  { id:"30", category:"Financial Systems", title:"Build a Cross-Business Revenue Dashboard That Shows Both Businesses Side by Side", body:"Movement Solutions and Labno Labs revenue are currently invisible to each other. A single Looker Studio or Notion dashboard showing both — monthly revenue, pipeline, segment performance — creates the financial clarity needed for resource allocation decisions." },
  { id:"31", category:"Client Retention", title:"Build a Reactivation Segment Re-engagement Sequence Using Kylie and Exercise Cards", body:"Discharged Reactivation clients are your highest churn-risk and highest re-engagement opportunity. A Kylie-triggered sequence at 30, 60, and 90 days post-discharge — with a personalized exercise card from their library — creates a retention flywheel with minimal ongoing effort." },
  { id:"32", category:"Compliance", title:"Create a HIPAA Compliance Audit Calendar Tied to Automation Deployments", body:"Every new automation layer — Kylie, Clinical Brain, Oracle — creates a new HIPAA surface. A standing quarterly audit calendar, scoped to your BAA coverage and data handling practices, prevents the compliance debt that accumulates invisibly in fast-moving builds." },
  { id:"33", category:"Knowledge Systems", title:"Implement a Prompt Retirement Protocol with Versioning and Archive Dates", body:"Prompt templates are living assets that go stale. When a prompt is superseded, archive it with the date, the reason for retirement, and what replaced it. This creates an audit trail for Clinical Brain's clinical safety and a learning record for prompt engineering quality over time." },
  { id:"34", category:"Business Development", title:"Build a Labno Labs Case Study Generator from Client Project Notes", body:"Every client engagement generates case study material. A lightweight generator — structured intake notes → anonymized case study draft via The Mechanic — creates sales collateral as a byproduct of the work itself, not as a separate marketing effort." },
  { id:"35", category:"Clinical Systems", title:"Add HRV as an Optional Schema Field in Clinical Brain Before Wearable Integration", body:"You don't need wearable integration to start. Add HRV as a manually-entered optional field in the Clinical Brain schema today. This creates the data structure before the sensor layer exists — and means the schema doesn't need to be migrated when wearable integration eventually arrives." },
  { id:"36", category:"Brand Systems", title:"Write a 'Non-Automatable Signature Experience' Document for Movement Solutions", body:"Define explicitly what parts of the Movement Solutions experience must never be automated — the clinical presence, the specific communication moments, the relational touchpoints that are the product. This protects brand integrity as automation expands into adjacent areas." },
  { id:"37", category:"Knowledge Systems", title:"Build a Weekly Oracle Digest for Yourself — Top Knowledge Retrieved That Week", body:"A lightweight weekly digest of what Oracle surfaces most — which clinical questions, which Labno Labs concepts, which referral patterns — is a free strategic intelligence report generated by your own knowledge system." },
  { id:"38", category:"Business Development", title:"Create a 30-60-90 Day Onboarding Sequence for Labno Labs Consulting Clients", body:"Current Labno Labs onboarding is likely informal. A standardized 30-60-90 sequence — context intake, architecture review, first deliverable checkpoint — reduces client anxiety, sets expectations, and creates the documented workflow that Kylie or an agent can eventually manage." },
  { id:"39", category:"Agent Systems", title:"Build an Agent Performance Scorecard for The Mechanic — Precision, Recall, Clinical Safety", body:"The Mechanic generates exercise prescriptions. Define what 'good' looks like: precision (appropriate for the NS state), recall (comprehensive for the presentation), and clinical safety (no contraindications). Without a scorecard, agent improvement is directionally correct but unmeasurable." },
  { id:"40", category:"Clinical Systems", title:"Add a Myers Fascial Line Visualization Layer to the Exercise Card Delivery UI", body:"The exercise library is tagged by fascial line. The delivery UI isn't visual. A simple anatomical diagram layer that highlights the targeted fascial line per exercise — even a static SVG — transforms a text-based card into a clinical teaching tool." },
  { id:"41", category:"Build Culture", title:"Implement a Friday Ship Note — 3-Sentence Weekly Build Log", body:"Three sentences, every Friday: what shipped, what's blocked, what's next. Not a report — a signal. This creates a compounding record of build velocity, surfaces recurring blockers before they become patterns, and is the seed of a Labno Labs transparency culture." },
  { id:"42", category:"Clinical Systems", title:"Add a Real-Time NS State Filter to the Exercise Delivery UI for Clinicians", body:"Clinicians prescribing from the 189-exercise library should be able to filter by NS state (Green/Amber/Red) in real time during a session. This makes the polyvagal classification layer clinically actionable rather than just theoretically tagged." },
  { id:"43", category:"Systems Architecture", title:"Build a Cross-Platform Context Sync Ritual — 15 Minutes Weekly Across Claude, ChatGPT, Gemini", body:"Your three-platform AI strategy generates context drift. A weekly 15-minute alignment session — updating each platform's active project context from a shared source document — prevents the compounding cost of stale contexts producing misaligned outputs." },
  { id:"44", category:"Referral Systems", title:"Build a Minimum Viable Referral Packet Auto-Generator for Your 114-Physician Network", body:"One page. Patient outcomes. Movement Solutions clinical approach summary. Auto-generated via Oracle on a quarterly cadence per physician. This is the highest-leverage referral marketing investment in your current asset base." },
  { id:"45", category:"Knowledge Systems", title:"Build a Somatic Signal Dictionary — Shared Vocabulary Mapping Clinical Observations to IFS Language", body:"The Mechanic, The Sniper, and The Overseer need a shared vocabulary for somatic states. A curated dictionary mapping clinical observations (e.g., guarded movement, breath-holding, hypervigilance posture) to IFS part-language creates consistent agent prompting across the entire Clinical Brain system." },
  { id:"46", category:"Build Culture", title:"Implement Build-Measure-Learn Sprint Structure for All Labno Labs Client Projects", body:"Two-week cycles. One hypothesis per sprint. Defined success metric before the sprint begins. This transforms Labno Labs from a 'we built the thing' consulting firm into a 'we proved value in the thing' firm — a premium positioning difference that commands higher fees." },
  { id:"47", category:"Financial Systems", title:"Create a Quarterly Pricing Architecture Review Tied to Segment Performance", body:"Resilience, Flow, and Reactivation segments have different willingness-to-pay curves. A quarterly review — 30 minutes, revenue per segment vs market benchmarks — surfaces pricing drift before it becomes pricing erosion. Premium positioning is a maintenance practice, not a one-time decision." },
  { id:"48", category:"Clinical Systems", title:"Build an Internal Changelog for All AI System Updates Across Oracle and Clinical Brain", body:"Every model version change, prompt update, schema migration, and agent modification should be logged with a date and rationale. Clinical Brain is a clinical tool — its changelog is a patient safety record, not just a technical artifact." },
  { id:"49", category:"Referral Systems", title:"Conduct a Dark Patterns Audit on Kylie's Intake Flow Against Polyvagal Principles", body:"Kylie's efficiency optimization and your clinical values can diverge subtly. An audit specifically asking 'does this intake moment create dorsal shutdown or sympathetic activation in a dysregulated client?' ensures your AI receptionist aligns with the NS-informed approach that defines your brand."},
  { id:"50", category:"Build Culture", title:"Establish GitHub Branch Protection and a Deployment Protocol for Oracle and Clinical Brain", body:"As Clinical Brain approaches clinical deployment, main branch drift becomes a safety issue, not just an engineering one. Branch protection rules, required PR reviews, and a deployment checklist are the minimum viable clinical software governance layer." },
];

const newQuestions = [
  {
    id:"16", theme:"Unit Economics",
    question:"What are the unit economics of our three client segments right now — and which would we double if we had to?",
    edges:[
      {title:"Resilience LTV vs volume ceiling", body:"Resilience clients have your highest lifetime value but your lowest volume. Doubling them requires a positioning shift that may signal to Flow clients that they're a lower priority — risking the base revenue that funds the premium work."},
      {title:"Reactivation is insurance-constrained", body:"Reimbursement caps on Reactivation clients mean unit economics are structurally bounded regardless of volume. Doubling Reactivation doubles administrative complexity without doubling margin."},
      {title:"Flow clients churn fastest", body:"Flow clients are easiest to acquire and most likely to leave when life gets busy. Doubling Flow inflates top-line revenue without improving business health metrics — a common growth trap."},
      {title:"Clinicient doesn't cleanly segment revenue", body:"Your EMR generates revenue data by payer and procedure code — not by your internal segment taxonomy. Getting true unit economics per segment requires manual attribution that doesn't currently exist."},
      {title:"Labno Labs consulting cannibalizes Resilience segment time", body:"Your most valuable Movement Solutions clients expect access to you. Labno Labs growth may be drawing exactly the attention your Resilience segment is paying a premium for. The unit economics conflict is invisible until it becomes a client relationship problem."},
    ]
  },
  {
    id:"17", theme:"Clinical Integrity",
    question:"Where in our clinical or consulting workflow are we trading long-term client outcomes for short-term operational convenience?",
    edges:[
      {title:"Compressed exercise progressions to fit session time", body:"Clinical judgment says the client needs 3 more sessions at this load before progressing. Scheduling reality says they have one visit left on their authorization. The convenience is real; the outcome compromise is subtle and cumulative."},
      {title:"Kylie's intake efficiency filters may screen out ambivalent clients who need the most help", body:"An intake flow optimized for conversion screens for motivated, compliant clients. The ambivalent, complex, or dysregulated client — who would benefit most from your NS-informed approach — may not make it through the filter."},
      {title:"Clinical note templates prioritize speed over nuance", body:"A fast documentation template captures the minimum required for billing. Clinical Brain downstream quality depends on note richness — sparse notes generate sparse prescriptions. Speed in documentation is a Clinical Brain data quality problem."},
      {title:"Consulting deliverables scoped to outputs, not outcomes", body:"A Labno Labs engagement delivers 'four configured agents.' The client outcome — a measurably more efficient clinical operation — is not in the scope. This is an industry-standard convenience that trades relationship depth for project clarity."},
      {title:"Billing agent prioritizes clean claims over accurate coding", body:"A claim coded slightly less accurately but more likely to be paid on first submission is a short-term convenience with long-term data integrity costs. Clinical Brain's outcome tracking is only as good as the coding accuracy it's built on."},
    ]
  },
  {
    id:"18", theme:"AI Safety",
    question:"Which of our AI agents could cause harm — clinical, reputational, or legal — if it produced a wrong output undetected?",
    edges:[
      {title:"The Mechanic and post-surgical contraindications", body:"A neurodynamic exercise appropriate for a lumbar disc presentation is contraindicated for a client 8 weeks post-laminectomy. The Mechanic's schema doesn't yet have a surgical history field. The output is plausible, the risk is real, and there's no current detection mechanism."},
      {title:"Kylie misclassifies a client's segment and they receive the wrong protocol", body:"A Reactivation client presents with characteristics that trigger a Resilience-level intensity protocol. The mismatch isn't visible in the output — it only becomes apparent in clinical outcomes weeks later."},
      {title:"The Overseer approves a billing code that creates compliance exposure", body:"A billing code that's clinically approximate but not clinically accurate is an audit risk. The Overseer's approval creates a documentation trail that makes the inaccuracy harder to correct retroactively."},
      {title:"Oracle retrieves outdated clinical guidelines", body:"A clinical guideline in Oracle's knowledge base was accurate at ingestion but has since been superseded. The retrieval is confident; the guidance is outdated. Without a content freshness protocol, Oracle becomes a liability as it ages."},
      {title:"The Sniper applies an Amber-state protocol to a Red-state client", body:"The distinction between Amber and Red NS state presentations can be subtle in text-based clinical notes. A misclassification by The Sniper produces a protocol that activates a dysregulated system further. The error is invisible in the output and only detectable in the client's physiological response."},
    ]
  },
  {
    id:"19", theme:"Client Portfolio",
    question:"If we could only serve 20% of our current clients, which would we choose — and what does that reveal?",
    edges:[
      {title:"The 20% you'd choose aren't your most profitable", body:"The clients you'd retain for clinical and intellectual fulfillment may not be your highest revenue generators. If your top 20% by value and top 20% by revenue don't overlap, you have a pricing alignment problem."},
      {title:"Choosing 20% reveals over-investment in the bottom 40%", body:"The Pareto analysis almost always shows that a disproportionate share of admin complexity, scheduling friction, and clinical challenge comes from clients you wouldn't choose to retain. Naming this is uncomfortable and actionable."},
      {title:"Your top 20% are concentrated in one segment", body:"If your chosen 20% are overwhelmingly Resilience clients, your entire referral network — built around Reactivation — is generating the wrong volume. The referral strategy and the client strategy are misaligned."},
      {title:"Movement Solutions' top 20% and Labno Labs' top 20% are different people", body:"The criteria for an ideal Movement Solutions client (motivated, NS-aware, high-touch) may be incompatible with an ideal Labno Labs client (systems-oriented, ROI-focused, operationally mature). Optimizing for one may complicate serving the other."},
      {title:"Scoring criteria for the top 20% don't exist yet", body:"You have a gut sense of who your best clients are. You may not have a formalized scoring rubric — clinical engagement, referral behavior, payment reliability, outcomes responsiveness. Without explicit criteria, the 20% selection is intuition dressed as strategy."},
    ]
  },
  {
    id:"20", theme:"Root Cause",
    question:"Where are we solving the symptom instead of the constraint — and what is the actual root cause?",
    edges:[
      {title:"More Kylie scripts when the constraint is appointment slot scarcity", body:"Kylie's conversion rate is fine. What's limiting client acquisition is that you don't have more available slots. Adding intake sophistication to a capacity-constrained system optimizes the funnel into a full pipe."},
      {title:"More Clinical Brain agents when the base exercise library has schema gaps", body:"Building The Sniper and The Overseer before The Mechanic's foundational exercise schema is complete is symptom-solving at the architecture level. The agents are downstream of the library quality."},
      {title:"Referral marketing investment when the constraint is post-discharge retention", body:"If 40% of referrals churn within 6 months, acquiring more referrals is expensive. The constraint is retention, not acquisition — and no marketing investment fixes a retention problem."},
      {title:"Frontend polish on Oracle when the RAG indexing is incomplete", body:"A beautiful Oracle UI that returns incomplete or irrelevant results is a symptom fix. The retrieval quality is the constraint. Frontend investment before retrieval quality is solved is the most common product development mistake."},
      {title:"Prompt template optimization when agent handoff contracts are undefined", body:"Refining individual agent prompts when the inter-agent data format is ambiguous creates locally optimized, globally incoherent outputs. Handoff architecture is upstream of prompt quality."},
    ]
  },
  {
    id:"21", theme:"Partnership Leverage",
    question:"Which partnership or integration in our ecosystem is most underutilized relative to its potential?",
    edges:[
      {title:"Google Workspace as a data layer, not just productivity", body:"You use Google Workspace for email and calendar. Looker Studio, AppSheet, and BigQuery are in the same subscription. These tools could serve as Clinical Brain's reporting layer and Oracle's analytics layer with zero additional cost."},
      {title:"The 114-physician network is one-directional", body:"Physicians refer patients in. They receive no systematic outcomes data, no clinical updates, and no professional value in return. The relationship is transactional rather than reciprocal. Reciprocal relationships compound; transactional ones decay."},
      {title:"RingCentral analytics has never been connected to practice performance", body:"Call recordings, wait times, and missed call data from RingCentral are a rich source of intake quality intelligence. None of it currently feeds Kylie's improvement loop or Clinical Brain's client acquisition data."},
      {title:"Clinicient has API access that's never been explored", body:"Your EMR likely has an API. That API is the cleanest path to Clinical Brain's clinical data layer — diagnosis codes, treatment outcomes, visit patterns. Unexplored API access is the highest-leverage unexplored integration in your stack."},
      {title:"Lemon Squeezy was chosen but not yet integrated", body:"The checkout decision was made. No product is live. Every month without a transactional product is a month of zero Lemon Squeezy leverage. The partnership is chosen and inert simultaneously."},
    ]
  },
  {
    id:"22", theme:"Strategic Conviction",
    question:"What would we have to believe to justify building the somatic integration app before anything else?",
    edges:[
      {title:"Defensibility of Core Three as IP", body:"You'd have to believe that no well-funded competitor can replicate the Myers-Comerford-Shacklock-polyvagal-IFS integration in 18 months — which requires believing your clinical synthesis is genuinely novel, not just a framework mashup."},
      {title:"Movement Solutions clients will cross-adopt a digital product", body:"You'd have to believe that clients who chose you for hands-on clinical care will also engage with a self-directed digital tool. These are different use behaviors, and the overlap in your client base may be smaller than assumed."},
      {title:"App revenue offsets the opportunity cost of delaying other builds", body:"You'd have to believe the somatic app's monetization timeline is short enough to justify the Clinical Brain and Oracle delays. Consumer health apps have notoriously long adoption curves."},
      {title:"IFS overlay is clinically defensible at consumer scale", body:"IFS part-language in a clinical context is appropriate when supervised. A consumer app using IFS framing without a clinician in the loop enters a different clinical and liability territory. You'd have to believe the app's design handles this safely."},
      {title:"You can build consumer-grade UX on a clinician-grade dataset", body:"The 189-exercise library is built for clinical use. Consumer-facing UX requires a completely different information architecture — simplified language, motivational framing, safety guardrails. The translation layer is a significant design challenge that doesn't come for free."},
    ]
  },
  {
    id:"23", theme:"Brand Integrity",
    question:"Where does our brand promise diverge from our operational reality?",
    edges:[
      {title:"'Premium calm' promise vs transactional intake", body:"Movement Solutions' brand voice is invitational and relationship-centered. Kylie's intake flow, optimized for conversion efficiency, may read as transactional to a first-contact client who expected the premium experience from the first interaction."},
      {title:"'Purpose-built systems' promise vs architecture-phase reality", body:"Labno Labs promises purpose-built multi-agent AI systems. Currently, every system is in build or architecture phase. The brand promise is ahead of the delivered reality — which is normal and fragile simultaneously."},
      {title:"'Nervous system lens' promise vs biomechanically-framed Clinical Brain", body:"Your brand differentiator is the NS lens. Clinical Brain's current agent logic is biomechanically primary — Myers fascial lines, Comerford motor control — with polyvagal classification as a tag, not as a prescription driver. The framework and the tool aren't yet fully aligned."},
      {title:"'Oversubscribed' positioning vs current acceptance of most referrals", body:"Oversubscribed is a positioning claim that requires operational evidence: a waitlist, selective intake, visible demand signals. If you're accepting most referrals, the positioning is aspirational. Clients in the premium market are sophisticated enough to detect the gap."},
      {title:"'Relationship-centered' voice vs billing and admin layer", body:"Your clinical and content voice is warm, invitational, and non-clinical-alarming. Your billing communications, appointment reminders, and insurance correspondence may be indistinguishable from any other PT practice. The last mile of experience lives in these admin touchpoints."},
    ]
  },
  {
    id:"24", theme:"Pattern Recognition",
    question:"Which of our competitors' failures are we quietly reproducing in our own system?",
    edges:[
      {title:"Over-reliance on a single referral channel", body:"Traditional PT practices built referral networks around PCPs and orthopedic surgeons and were devastated when direct-access laws and digital health shifted that channel. Your 114-physician network is deep in one channel type — exactly the vulnerability that broke comparable practices."},
      {title:"Treating AI agents as features rather than infrastructure", body:"Every health tech startup that has failed at AI integration treated AI as a product feature (a chatbot, a recommendation engine) rather than an operational layer. Clinical Brain's multi-agent architecture is infrastructure-level — but the risk of feature-layer thinking is always present."},
      {title:"Scaling before the core clinical experience is fully systematized", body:"The most common boutique PT failure mode is acquiring clients faster than the clinical system can absorb them. The Core Three methodology exists. The Clinical Brain delivery layer doesn't. Growth before Clinical Brain is ready recreates this pattern."},
      {title:"Building clinical protocols that prioritize compliance documentation over therapeutic quality", body:"EMR-driven documentation requirements create note-writing habits that satisfy billing and provide poor clinical intelligence. Clinical Brain is only as good as the notes it's trained on. Compliance-first documentation is a system-wide quality ceiling."},
      {title:"Consumer health apps that assume intrinsic motivation sustains engagement", body:"The most common consumer health app failure is the engagement cliff at Day 30. Every competitor's breathwork app, movement app, and somatic app hits it. Without coach accountability or social mechanics, retention collapses. Assuming Core Three is compelling enough to override this pattern is a high-risk assumption."},
    ]
  },
  {
    id:"25", theme:"Daily Practice",
    question:"What is the highest-leverage 15-minute daily habit we could build into our operating rhythm right now?",
    edges:[
      {title:"The 15-minute frame creates the illusion of consistency", body:"A 15-minute daily anchor is real and meaningful. But in a two-business system with clinical and build work, 15 minutes of system review can create the feeling of strategic engagement without providing the sustained attention that architecture decisions actually require."},
      {title:"The highest-leverage habit is the hardest to sustain precisely because it matters", body:"Daily NS state check-in, build log review, and constraint identification are all high-leverage. They're also the first habits to go when the schedule compresses. The habit with the most resistance is often the one with the most signal."},
      {title:"Different business phases require different daily anchors", body:"In a build phase, 15 minutes of daily code review or prompt testing is highest-leverage. In a growth phase, 15 minutes of client relationship review is highest-leverage. A single universal daily habit may be optimized for one phase and irrelevant in another."},
      {title:"Somatic check-in vs output production tension", body:"Your framework says NS regulation before skill-building. A 15-minute morning NS check-in is highest-leverage for sustained cognitive quality across the day. Zero visible output is produced. In a build phase with external accountability (clients, investors), this creates a real tension."},
      {title:"One habit for Movement Solutions days and a different one for Labno Labs days", body:"The highest-leverage 15 minutes on a clinical day (reviewing the clinical schedule, checking Kylie's overnight interactions) is completely different from the highest-leverage 15 minutes on a build day (reviewing the previous session's context handoff note). A single daily habit may be the wrong architecture."},
    ]
  },
  {
    id:"26", theme:"IP Defensibility",
    question:"Where is our clinical IP most vulnerable to commoditization by a well-funded competitor in the next 18 months?",
    edges:[
      {title:"Myers, Comerford, and Shacklock are published frameworks", body:"All three foundational frameworks in Core Three are in the published literature. A competitor with sufficient clinical expertise and an LLM can approximate your integration. The defensible element is your specific synthesis, your exercise library, and your clinical relationship network — not the frameworks themselves."},
      {title:"A well-funded health tech company could train on PT literature and get close", body:"The gap between a generic exercise prescription AI and Clinical Brain is significant today and shrinking rapidly. 18 months is enough time for a funded competitor to get to 80% of your methodology. The question is whether the remaining 20% — the IFS overlay, the polyvagal NS classification, the relationship layer — is actually moat or just differentiation."},
      {title:"Polyvagal Theory's clinical applications are being contested in the literature", body:"Stephen Porges' work is influential and also under increasing academic scrutiny in clinical applications. If the evidentiary base for polyvagal-informed PT is challenged in the literature, competitors can use that controversy to commoditize your approach or, worse, to discredit it."},
      {title:"IFS part-language is the most distinctive element and the least empirically validated", body:"The IFS overlay is the element that most differentiates your approach from any competitor. It's also the element with the thinnest empirical evidence base in PT specifically. Distinctiveness without validation is a vulnerability in a regulated clinical environment."},
      {title:"The real moat isn't the framework — it's the exercise library and clinical network", body:"189 deduplicated exercises tagged with fascial lines, motor control categories, neurodynamic classifications, and NS states is a data asset. Your 114-physician referral network is a relationship asset. Neither of these is in the published literature. Both are harder to replicate than any framework."},
    ]
  },
  {
    id:"27", theme:"Client Sponsorship",
    question:"Which of our current clients would sponsor a new product development — and how would we surface that conversation?",
    edges:[
      {title:"A sponsoring client may expect disproportionate product roadmap influence", body:"The client who writes the first check for the somatic app will feel they own a piece of the direction. Managing that expectation without alienating a financial sponsor is a governance conversation that needs to happen before the check clears."},
      {title:"Early adopters are not representative clients", body:"The clients most willing to sponsor a new product are your most engaged and enthusiastic — which means they're the least representative of your average user. Building to their specification risks creating a product that serves them perfectly and fails for everyone else."},
      {title:"A physician client sponsor creates a different obligation than a wellness client", body:"A Resilience client sponsoring the somatic app has one expectation set. A referring physician sponsoring Clinical Brain development has a clinical liability implication — they're associating their professional reputation with an unvalidated system."},
      {title:"A Labno Labs client sponsoring Clinical Brain may expect exclusivity", body:"An existing consulting client who funds the next Clinical Brain development phase has an implicit expectation of first access or exclusivity. If you plan to license Clinical Brain to other practices, this tension needs to be surfaced before the conversation starts."},
      {title:"The sponsorship conversation feels sales-y in a clinical relationship", body:"Your most valuable clients chose you for clinical expertise and relational integrity. Approaching them about product sponsorship requires a framing that feels collaborative and visionary — not commercial. The conversation design matters as much as the ask."},
    ]
  },
  {
    id:"28", theme:"Automation Priority",
    question:"If we couldn't hire anyone new, what would we automate first — and what does that priority reveal?",
    edges:[
      {title:"Referral acknowledgment automation requires clean CRM data", body:"The highest-leverage first automation is the referral cadence. But GreenRope's data quality may be too inconsistent to run it reliably. You'd be automating a process that's 60% ready — which creates automated errors at the speed of automation."},
      {title:"Exercise card delivery requires the delivery mechanism you haven't built yet", body:"The 189-exercise library is ready. The patient-facing delivery layer isn't. 'Automate exercise card delivery' is correct as a priority and premature as a project. The automation target and the infrastructure readiness are out of sync."},
      {title:"Billing automation requires Clinicient integration capability you haven't explored", body:"Automating billing is among the highest admin burden reductions available. But billing automation in a PT context requires EMR integration, payer-specific rule logic, and audit trail requirements that may exceed a 90-day implementation window."},
      {title:"Progress tracking automation requires a data capture layer that doesn't exist", body:"You can't automate client progress tracking if progress data isn't being captured in a structured, retrievable format. The automation target reveals a data infrastructure gap that is upstream of the automation itself."},
      {title:"The first automation priority reveals where human effort is substituting for systems debt", body:"Whatever you'd automate first is the thing you've been doing manually the longest. It's also the place where systems debt is highest — the process that works well enough to keep but poorly enough that it drains consistent energy. Your answer is your clearest systems debt signal."},
    ]
  },
  {
    id:"29", theme:"Outcome vs Activity",
    question:"Where are we measuring activity instead of outcomes — and what would change if we measured what actually matters?",
    edges:[
      {title:"Sessions delivered vs functional outcome scores", body:"Session count is visible in Clinicient and easy to report. Functional outcome scores (PSFS, OPTIMAL, HRV trend) require structured capture at intake, mid-point, and discharge. The easier metric displaces the more meaningful one by default."},
      {title:"Exercise cards generated vs clinical adoption rate", body:"The Mechanic's output volume is measurable. Whether clinicians are actually using the prescriptions — and whether clients are completing them — is not currently tracked. Activity metrics for AI systems create the illusion of impact without measuring it."},
      {title:"Email open rates vs referral conversion", body:"Physician outreach email open rates are available in your CRM. Whether an opened email translated into a referral within 90 days is not tracked. The easy metric is a proxy for the outcome metric — and proxies drift from what they represent."},
      {title:"GitHub commits vs deployed features", body:"Commit velocity is a common build phase metric that measures activity accurately and outcomes poorly. A week of 40 commits on architecture refactoring produces zero deployed value. The metric rewards effort, not impact."},
      {title:"Kylie interactions vs qualified client conversion", body:"Kylie's interaction volume is measurable. Whether those interactions converted to booked and completed first appointments with the right segment is the outcome metric. High interaction volume with low conversion quality is a worse outcome than low volume with high conversion quality."},
    ]
  },
  {
    id:"30", theme:"User Behavior Assumptions",
    question:"What is the most expensive assumption we're making about user behavior in the apps we're building?",
    edges:[
      {title:"Assuming consumers accurately self-report NS state without calibration", body:"The somatic app's core mechanic requires users to accurately assess and report their NS state. Most consumers don't have a polyvagal vocabulary. Without an embedded calibration sequence — essentially a brief somatic literacy onboarding — the primary data input is unreliable."},
      {title:"Assuming PTs will trust Clinical Brain's prescriptions without override UI", body:"Clinicians have strong professional identity investment in their clinical judgment. An AI prescription system without a visible, easy override mechanism creates professional resistance that adoption metrics won't reveal until the system is in use. The UX must express clinical agency, not replace it."},
      {title:"Assuming Resilience clients want an app rather than a human", body:"Your Resilience segment chose a boutique, high-attention clinical experience. Offering them a self-directed app may be experienced as a service reduction rather than a value addition. This assumption should be tested before the app is built around them as the primary persona."},
      {title:"Assuming intrinsic motivation sustains daily somatic app engagement", body:"Every consumer health app faces the Day-30 engagement cliff. The assumption that Core Three methodology is compelling enough to sustain daily use without coach accountability or social mechanics is the single most expensive assumption in your consumer product strategy."},
      {title:"Assuming physicians will engage with a digital referral portal over fax", body:"Fax is still the dominant referral channel in US healthcare — not despite being archaic but because it works, is legally defensible, and requires no physician behavior change. A digital physician portal assumes a behavior change that the market has repeatedly declined to make at the pace health tech expects."},
    ]
  },
  {
    id:"31", theme:"Tool ROI",
    question:"Which tools are we paying for at full cost but using at a fraction of their capacity?",
    edges:[
      {title:"GreenRope automation capabilities used at <20%", body:"GreenRope has workflow automation, lead scoring, and behavioral triggers built in. If you're using it as a contact database and email sender, you're paying for a system you're treating as a spreadsheet. The automation gap is costing you the subscription cost AND the workflow time."},
      {title:"RingCentral analytics layer never connected to practice metrics", body:"RingCentral has call analytics, missed call tracking, and voicemail intelligence that could feed Kylie's improvement loop. If it's used as a business phone system and nothing more, the analytics investment is entirely sunk."},
      {title:"GitHub Actions available but not running automated tests", body:"Your GitHub infrastructure is live. GitHub Actions could be running automated quality checks on Clinical Brain prompt outputs — consistency tests, safety flag checks — on every commit. This capability is available at no additional cost and currently unused."},
      {title:"Notion databases set up as note-taking rather than operational systems", body:"Notion has relational database, formula, and automation capabilities that enable it to function as a lightweight operational system. If it's being used as a note-taking tool with structured documents, you're getting 15% of its operational value."},
      {title:"The full Google Workspace suite is available but only email and calendar are active", body:"Looker Studio (free), AppSheet (free tier), and Google Forms — all available in your Google Workspace subscription — could serve as Clinical Brain's reporting layer, a lightweight client intake form backend, and a practice analytics dashboard. None of these require additional cost."},
    ]
  },
  {
    id:"32", theme:"Referral Depth",
    question:"Where does our referral network have the most unrealized depth — and what would it take to activate it?",
    edges:[
      {title:"Once-and-done referring physicians with no re-engagement cadence", body:"Physicians who referred once and never again represent the highest-leverage segment of your network. They've already validated the relationship and signaled trust. No follow-up cadence currently exists for this group — which means the second referral from your best source is being left on the table."},
      {title:"Untapped specialty segments — neurology, rheumatology, functional medicine", body:"Your network likely skews toward orthopedic and primary care physicians. Neurologists treating chronic pain, rheumatologists treating fibromyalgia and autoimmune presentations, and functional medicine practitioners all have patient populations that map directly to your NS-informed clinical approach."},
      {title:"PT-to-PT referral channel is unformalized", body:"Other PT practices refer patients they can't treat — post-surgical complexity, chronic pain, NS-informed specialty. A formalized peer referral relationship with 3-5 practices in adjacent geographies is a zero-cost referral channel expansion."},
      {title:"Fitness professionals adjacent to your clinical work are not tracked", body:"Personal trainers, yoga instructors, pilates teachers, and CrossFit coaches in Wilmette and the North Shore regularly encounter clients at the boundary of fitness and clinical need. This referral channel is high-volume and currently untracked."},
      {title:"Former clients now in healthcare roles are the most credible referral source you're ignoring", body:"Patients who completed care with exceptional outcomes and went on to become nurses, physicians, PAs, or health coaches are your most credible possible referral sources. They have lived experience of your clinical approach. If they're not in a specific follow-up sequence, that relationship is dormant."},
    ]
  },
  {
    id:"33", theme:"Competitive Timeline",
    question:"What would we do differently if we knew a well-funded competitor was entering our market in 18 months?",
    edges:[
      {title:"You'd productize Core Three now rather than keeping it as a service differentiator", body:"A documented, published, and digitally distributed Core Three methodology creates a defensible IP record before a competitor can claim the conceptual space. The window for establishing clinical thought leadership is shorter than 18 months."},
      {title:"You'd build the somatic app now and accept the trade-off with other builds", body:"Consumer market timing is compressed. The first credible somatic integration app with a polyvagal-IFS-fascial framework that achieves meaningful retention locks the category. Being second in a consumer health category is being invisible."},
      {title:"You'd formalize your physician referral network into structured partnerships", body:"Relational referral networks are vulnerable to a competitor with better reporting, better clinical tools, and a formal partnership program. Converting your top 20 physician relationships into formal outcomes-sharing partnerships creates structural stickiness before a competitor offers something more attractive."},
      {title:"You'd move faster on Labno Labs case studies as proof of concept", body:"A well-funded competitor entering AI consulting for health practices will have sales resources, marketing, and case studies. Your credibility is in what you've built and proven. Documented case studies — before the competitor arrives — establish your category authority."},
      {title:"You'd make hiring or fractional decisions you've been deferring", body:"18 months of competitive timeline changes the risk calculus on hiring. The cost of under-resourcing during a market-defining window is higher than the cost of an early or imperfect hire. The competitor's arrival changes what 'too early to hire' means."},
    ]
  },
  {
    id:"34", theme:"Cognitive Load",
    question:"Which of our current systems creates the most cognitive load — and what is the structural fix?",
    edges:[
      {title:"Three AI platforms with no unified context state", body:"Managing active project context across Claude, ChatGPT, and Gemini — with different memory states, different conversation histories, and different platform strengths — is the highest daily cognitive tax in your system. The fix isn't using fewer platforms; it's a shared context document that all three reference."},
      {title:"GreenRope's UI creates avoidance behavior", body:"Tasks don't get done when the tool that executes them is unpleasant to use. If GreenRope's interface generates friction every time you open it, the cognitive load is expressed as tasks that quietly don't happen. The Notion CRM migration is a cognitive load fix as much as a strategic one."},
      {title:"Two dev machines with potentially diverged MCP configurations", body:"Every session that begins with 'which environment am I in, and is it configured correctly?' is a cognitive load tax. The mental overhead of maintaining consistency across M2 Air and MSI Intel is small per instance and significant over hundreds of sessions."},
      {title:"Clinical Brain's multi-agent architecture exists primarily in working memory", body:"The full Clinical Brain system — four agents, their payloads, handoff contracts, IFS integration layer — is documented in the architecture doc but likely held primarily in your working memory during sessions. This is the most cognitively expensive single asset in your system."},
      {title:"No single source of truth requires triangulating status across 5+ tools", body:"Oracle status is in Vercel and Supabase. Clinical Brain status is in the architecture doc and GitHub. Workflow registry is in Quadco. Referral data is in GreenRope. Every status check requires a multi-tool retrieval sequence. This is not a data problem — it's an architecture problem with a dashboard solution."},
    ]
  },
  {
    id:"35", theme:"Avoided Conversations",
    question:"What is the one conversation we have been avoiding that, if had, would unlock the most downstream value?",
    edges:[
      {title:"Strategic divergence with a business partner on time allocation", body:"Movement Solutions is a partnership. If your partner's vision for the practice's growth trajectory diverges from yours — or if the time Labno Labs requires creates visible friction in the partnership — the avoided conversation is the most expensive one in your system. It compounds daily."},
      {title:"Which business is primary and which is secondary", body:"The question of whether you are a PT who does AI consulting or an AI consultant who happens to run a PT practice has enormous downstream implications for time, identity, investment, and positioning. Avoiding it doesn't remove it — it makes every resource allocation decision harder."},
      {title:"A key clinical team member's role in the automated future", body:"Someone on your clinical team may sense that Clinical Brain changes what their role looks like. That conversation — held well, in advance, with genuine care — creates a collaborator. Avoided, it creates attrition at the worst possible time."},
      {title:"Honest repricing of Movement Solutions relative to its actual market position", body:"If Movement Solutions is delivering premium clinical outcomes with a differentiated methodology but charging average-market rates, the repricing conversation — with yourself, with your partner, eventually with clients — is being avoided. Every day of delay is deferred revenue."},
      {title:"The real reason Oracle isn't shipped yet", body:"There is always a technical reason and a real reason. The technical reason for Oracle's delayed ship is an architecture decision. The real reason is often risk aversion, perfectionism, or unclear definition of 'done.' That internal conversation is the most productive pre-ship action available."},
    ]
  },
];

/* ─── COMPONENTS ────────────────────────────────────────────────────────────── */

const catColors = {
  "Clinical Systems":"#7C9885","Decision Architecture":"#8B7355","Referral Systems":"#5C7A8C",
  "Build Cadence":"#7A5C8C","Financial Systems":"#8C6B5C","Client Retention":"#5C8C7A",
  "Compliance":"#9B7E6A","Knowledge Systems":"#6B8C7A","Business Development":"#7A6B8C",
  "Agent Systems":"#8C7A5C","Brand Systems":"#5C7C8C","Build Culture":"#8C5C7A",
};

const themeColors = {
  "Resource Allocation":"#7C9885","Constraint Theory":"#8B7355","Vision Clarity":"#5C7A8C",
  "Client Experience":"#7A5C8C","Automation Readiness":"#8C6B5C","Knowledge Architecture":"#5C8C7A",
  "Strategic Positioning":"#7C9885","Metrics Hygiene":"#8B7355","Failure Mode Awareness":"#5C7A8C",
  "Agent and AI Leverage":"#7A5C8C","Market Assumption Testing":"#8C6B5C","Capacity Design":"#5C8C7A",
  "Competitive Intelligence":"#7C9885","Energy Alignment":"#8B7355","Legacy Design":"#5C7A8C",
  "Unit Economics":"#9B7E6A","Clinical Integrity":"#6B8C7A","AI Safety":"#7A6B8C",
  "Client Portfolio":"#8C7A5C","Root Cause":"#5C7C8C","Partnership Leverage":"#8C5C7A",
  "Strategic Conviction":"#7C9885","Brand Integrity":"#8B7355","Pattern Recognition":"#5C7A8C",
  "Daily Practice":"#7A5C8C","IP Defensibility":"#8C6B5C","Client Sponsorship":"#5C8C7A",
  "Automation Priority":"#7C9885","Outcome vs Activity":"#8B7355","User Behavior Assumptions":"#5C7A8C",
  "Tool ROI":"#7A5C8C","Referral Depth":"#8C6B5C","Competitive Timeline":"#5C8C7A",
  "Cognitive Load":"#9B7E6A","Avoided Conversations":"#6B8C7A",
};

const getColor = (key, map) => map[key] || "#6B6560";

function Badge({ label, colorMap }) {
  const c = getColor(label, colorMap);
  return (
    <span style={{
      fontFamily:"'DM Sans',sans-serif", fontWeight:400, fontSize:"0.58rem",
      letterSpacing:"0.13em", textTransform:"uppercase", padding:"2px 8px",
      borderRadius:2, background:c+"22", color:c, whiteSpace:"nowrap", flexShrink:0,
    }}>{label}</span>
  );
}

function ExpandableRow({ num, badge, badgeMap, title, children, defaultPreview }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(o => !o)} style={{
      borderBottom:"1px solid #1A1E1B", cursor:"pointer",
      background: open ? "rgba(124,152,133,0.03)" : "transparent",
      transition:"background 0.15s",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"15px 0" }}>
        <span style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:300, fontSize:"1.05rem", color:"#3A3E3B", minWidth:32 }}>{num}</span>
        <Badge label={badge} colorMap={badgeMap} />
        <span style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:400, fontSize:"1.0rem", color:"#D4CFC8", flex:1, lineHeight:1.3 }}>{title}</span>
        <span style={{ color: open ? "#7C9885" : "#3A3E3B", fontSize:"0.65rem", transition:"transform 0.2s", transform: open ? "rotate(90deg)" : "none" }}>▶</span>
      </div>
      {open && <div style={{ paddingBottom:20, paddingLeft:46 }}>{children}</div>}
    </div>
  );
}

function ProConList({ items, type }) {
  const c = type === "pro" ? "#7C9885" : "#8C6B5C";
  const label = type === "pro" ? "PRO" : "CON";
  return (
    <div style={{ marginBottom:16 }}>
      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.6rem", letterSpacing:"0.14em", textTransform:"uppercase", color:c, fontWeight:500 }}>{label}S</span>
      {items.map((item, i) => (
        <div key={i} style={{ display:"flex", gap:10, marginTop:8 }}>
          <span style={{ color:c, fontSize:"0.7rem", marginTop:2, flexShrink:0 }}>—</span>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:300, fontSize:"0.8rem", color:"#9A9590", lineHeight:1.7, margin:0 }}>{item}</p>
        </div>
      ))}
    </div>
  );
}

function EdgeCaseList({ edges }) {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <div style={{ marginTop:16 }}>
      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.6rem", letterSpacing:"0.14em", textTransform:"uppercase", color:"#5C7A8C", fontWeight:500 }}>5 EDGE CASES</span>
      {edges.map((e, i) => (
        <div key={i} onClick={ev => { ev.stopPropagation(); setOpenIdx(openIdx === i ? null : i); }}
          style={{ marginTop:8, cursor:"pointer", borderLeft:"1px solid #1E2820", paddingLeft:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.6rem", color:"#3A4E3B", minWidth:16 }}>{String(i+1).padStart(2,"0")}</span>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"0.9rem", color: openIdx === i ? "#B8D4C0" : "#7A7570", fontStyle:"italic", lineHeight:1.4 }}>{e.title}</span>
            <span style={{ color:"#2A3E2B", fontSize:"0.55rem", marginLeft:"auto", flexShrink:0, transition:"transform 0.15s", transform: openIdx === i ? "rotate(90deg)" : "none" }}>▶</span>
          </div>
          {openIdx === i && (
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:300, fontSize:"0.78rem", color:"#7A7570", lineHeight:1.75, margin:"10px 0 6px 26px" }}>{e.body}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Strategic() {
  const [tab, setTab] = useState("analysis");

  const tabs = [
    { id:"analysis", label:"15 Q&A Analysis" },
    { id:"more25",   label:"25 More Improvements" },
    { id:"new20",    label:"20 New Questions" },
  ];

  return (
    <div className="main-content" style={{ minHeight:"100vh", background:"#0D0F0E", overflow:"auto", fontFamily:"'Georgia',serif", color:"#E8E3DC" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:#0D0F0E;} ::-webkit-scrollbar-thumb{background:#252825;}
      `}</style>

      {/* Header */}
      <div style={{ padding:"44px 40px 28px", borderBottom:"1px solid #1A1E1B" }}>
        <div style={{ maxWidth:820, margin:"0 auto" }}>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:300, fontSize:"0.7rem", letterSpacing:"0.18em", textTransform:"uppercase", color:"#7C9885", marginBottom:12 }}>
            Movement Solutions · Labno Labs · Deep Systems Analysis
          </p>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:300, fontSize:"clamp(1.8rem,4.5vw,2.9rem)", letterSpacing:"-0.02em", lineHeight:1.1, color:"#E8E3DC" }}>
            Strategic Intelligence<br /><span style={{ fontStyle:"italic", color:"#7C9885" }}>Extended Field Manual</span>
          </h1>
          <div style={{ height:1, background:"linear-gradient(90deg,#7C9885 0%,#252825 60%,transparent 100%)", margin:"22px 0 0" }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding:"20px 40px 0", maxWidth:820, margin:"0 auto" }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              fontFamily:"'DM Sans',sans-serif", fontWeight:400, fontSize:"0.65rem", letterSpacing:"0.14em",
              textTransform:"uppercase", border:"none", cursor:"pointer", padding:"9px 20px", transition:"all 0.2s",
              background: tab === t.id ? "#7C9885" : "transparent",
              color: tab === t.id ? "#0D0F0E" : "#4A4E4B",
              outline: tab === t.id ? "none" : "1px solid #1E221F",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:820, margin:"0 auto", padding:"28px 40px 80px" }}>

        {/* TAB 1: Q&A Analysis */}
        {tab === "analysis" && (
          <div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:14, marginBottom:24 }}>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:300, fontSize:"3.2rem", color:"#1E221F", lineHeight:1 }}>15</span>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.7rem", color:"#3A3E3B", letterSpacing:"0.1em", textTransform:"uppercase", paddingBottom:6 }}>Original questions — pros, cons, and 5 edge cases each</p>
            </div>
            {qAnalysis.map(q => (
              <ExpandableRow key={q.id} num={q.id} badge={q.theme} badgeMap={themeColors} title={q.question}>
                <ProConList items={q.pros} type="pro" />
                <ProConList items={q.cons} type="con" />
                <EdgeCaseList edges={q.edges} />
              </ExpandableRow>
            ))}
          </div>
        )}

        {/* TAB 2: 25 More Improvements */}
        {tab === "more25" && (
          <div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:14, marginBottom:24 }}>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:300, fontSize:"3.2rem", color:"#1E221F", lineHeight:1 }}>25</span>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.7rem", color:"#3A3E3B", letterSpacing:"0.1em", textTransform:"uppercase", paddingBottom:6 }}>Additional system improvements — items 26 through 50</p>
            </div>
            {moreHabits.map(h => (
              <ExpandableRow key={h.id} num={h.id} badge={h.category} badgeMap={catColors} title={h.title}>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:300, fontSize:"0.82rem", lineHeight:1.8, color:"#9A9590", maxWidth:660 }}>{h.body}</p>
              </ExpandableRow>
            ))}
          </div>
        )}

        {/* TAB 3: 20 New Questions */}
        {tab === "new20" && (
          <div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:14, marginBottom:24 }}>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:300, fontSize:"3.2rem", color:"#1E221F", lineHeight:1 }}>20</span>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.7rem", color:"#3A3E3B", letterSpacing:"0.1em", textTransform:"uppercase", paddingBottom:6 }}>New alignment questions — each with 5 edge cases</p>
            </div>
            {newQuestions.map(q => (
              <ExpandableRow key={q.id} num={q.id} badge={q.theme} badgeMap={themeColors} title={q.question}>
                <EdgeCaseList edges={q.edges} />
              </ExpandableRow>
            ))}
            <div style={{ height:1, background:"linear-gradient(90deg,#7C9885 0%,#252825 60%,transparent 100%)", margin:"44px 0 20px" }} />
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontStyle:"italic", fontSize:"0.92rem", color:"#3A3E3B", lineHeight:1.75, maxWidth:560 }}>
              Edge cases are not objections — they are the terrain. The questions that survive their own edge cases are the ones worth building strategy around.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
