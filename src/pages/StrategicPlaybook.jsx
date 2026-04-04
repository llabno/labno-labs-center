import { useState } from "react";

const habits = [
  {
    id: "01",
    category: "Strategic Clarity",
    title: "Wardley Map Both Businesses Quarterly",
    body: "Plot every tool, workflow, agent, and service offering on a genesis→commodity axis. For Movement Solutions and Labno Labs, this immediately exposes where skilled effort is being spent on commoditized functions — freeing bandwidth for genuine IP like Core Three and Clinical Brain.",
  },
  {
    id: "02",
    category: "Strategic Clarity",
    title: "Codify the 'Buy vs. Build' Decision Gate",
    body: "Before any new build sprint begins, run a 10-minute Wardley-informed gate: Is this a commodity? Is it off-the-shelf-ready? If yes, buy. Reserve the build queue strictly for Clinical Brain, Oracle, and the somatic app — your actual differentiators.",
  },
  {
    id: "03",
    category: "Strategic Clarity",
    title: "Define the Quarterly 'One Constraint' Focus",
    body: "Identify the single bottleneck that, if removed, would compound across all other systems. Document it, name it, assign an agent or sprint to it. Theory of Constraints applied to a two-business operator means one lever per quarter — not ten.",
  },
  {
    id: "04",
    category: "Atomic Habits",
    title: "Build a 'Protected Rhythm' Block for Deep Build Work",
    body: "Your own clinical framework applies here: nervous system regulation before skill-building. Schedule 2–3 hour deep build windows on fixed days, non-negotiable. Your best systems work — Oracle architecture, Clinical Brain prompts — requires sustained attentional flow, not fragmented slots.",
  },
  {
    id: "05",
    category: "Atomic Habits",
    title: "Use HRV / Somatic State as a Scheduling Variable",
    body: "Stop scheduling deep cognitive work by clock alone. Low HRV days get admin, review, and maintenance. High-regulation days get architecture, prompt engineering, and creative build. Your system knows what your calendar doesn't.",
  },
  {
    id: "06",
    category: "Atomic Habits",
    title: "Monday Morning 30-Minute System Diagnostic",
    body: "A weekly scan ritual across both businesses: What shipped? What stalled? What's the bottleneck? Map it in Quadco. This is not a meeting — it's a solo diagnostic run that prevents invisible drift and context decay before it compounds.",
  },
  {
    id: "07",
    category: "Atomic Habits",
    title: "Implement a 'Minimum Viable Admin' Standard",
    body: "For every new process added to either business, define its minimum viable version first. One email template. One Kylie script. One agent trigger. Complexity is the enemy of sustainability — deploy lean, then layer.",
  },
  {
    id: "08",
    category: "Atomic Habits",
    title: "End Every Build Session with a Context Handoff Note",
    body: "Before closing a session on Oracle, Clinical Brain, or any active build, write a 3-sentence status note. This prevents the 'where was I?' restart tax, preserves context across your M2/MSI dev environments, and feeds your Quadco workflow registry.",
  },
  {
    id: "09",
    category: "Workflow Automation",
    title: "Deploy Kylie Across All First-Touch Touchpoints",
    body: "Kylie currently handles intake — expand her to referral physician acknowledgment, consultation confirmations, and post-session follow-up. Your 114-doctor referral network is an underserved automation opportunity.",
  },
  {
    id: "10",
    category: "Workflow Automation",
    title: "Build a Prompt Template Library Indexed by Use Case",
    body: "Create a versioned library of proven prompt templates across your three AI platforms (Claude, ChatGPT, Gemini). Organized by DOE layer — Directive, Orchestration, Execution — this turns one-off prompts into reusable institutional assets.",
  },
  {
    id: "11",
    category: "Workflow Automation",
    title: "Automate the Referral Physician Nurture Sequence",
    body: "Map your 114-physician referral network into tiered communication cadences. Physicians who referred in the last 90 days get a different sequence than dormant contacts. This is a GreenRope-to-Notion migration candidate with immediate ROI.",
  },
  {
    id: "12",
    category: "Workflow Automation",
    title: "Build a Content Repurposing Pipeline from Clinical Insights",
    body: "Your clinical work generates daily IP — assessments, exercise progressions, somatic observations. A lightweight pipeline that converts clinical notes into anonymized content drafts (The Mechanic → marketing copy) creates a flywheel with zero additional input.",
  },
  {
    id: "13",
    category: "Workflow Automation",
    title: "Establish Scheduled Maintenance Windows for All Active Systems",
    body: "Oracle, Clinical Brain, Kylie, and the MCP stack all accumulate drift. Assign a monthly 60-minute maintenance window per system. Reactive firefighting is the most expensive form of system management.",
  },
  {
    id: "14",
    category: "Systems Architecture",
    title: "Migrate GreenRope to a Notion CRM Built Around Your Segments",
    body: "Your three client segments — Resilience, Flow, Reactivation — are architectural units, not just labels. A Notion CRM built around them integrates naturally with Clinical Brain agent payloads and bridges the EMR-to-coaching gap that Clinicient can't.",
  },
  {
    id: "15",
    category: "Systems Architecture",
    title: "Finalize Oracle Authentication and Ship v1",
    body: "The Supabase Auth + Google OAuth decision is made. Scope a minimal v1 that passes authentication, routes one RAG query, and returns a clean result. The first end-to-end success compounds faster than continued architecture refinement.",
  },
  {
    id: "16",
    category: "Systems Architecture",
    title: "Define Agent Handoff Protocols Between Clinical Brain Agents",
    body: "The Mechanic, The Sniper, The Overseer, and Billing Agent each need explicit handoff contracts — what data format passes between them, what triggers the next agent, and what constitutes a failure state. Without this, multi-agent systems accumulate invisible debt.",
  },
  {
    id: "17",
    category: "Systems Architecture",
    title: "Prioritize the Somatic Integration App as Consumer Lead Product",
    body: "Of your three planned mosolabs.com apps, the somatic integration app built around Core Three (Myers, Comerford, Shacklock) has no direct market analog. Ship it first. Couch-to-5K and breathwork have well-funded competitors. This one doesn't.",
  },
  {
    id: "18",
    category: "Systems Architecture",
    title: "Standardize the MCP Stack Across Both Dev Environments",
    body: "Your tiered MCP stack (GitHub, Vercel, Sequential Thinking, Context7, Notion, Drive, Gmail, Playwright, Qdrant, Firebase) needs identical configuration on the M2 Air and MSI Intel. Environment drift between machines is a silent velocity killer.",
  },
  {
    id: "19",
    category: "Systems Architecture",
    title: "Create an Exercise Card Delivery Pipeline from the 189-Exercise Library",
    body: "The M1 Core Three Workbook extraction is complete — 189 deduplicated exercises with nervous system state classifications and parts awareness overlays. Build the delivery pipeline: Clinical Brain triggers → card selection → client-facing output. The asset exists; the pipe doesn't yet.",
  },
  {
    id: "20",
    category: "Systems Architecture",
    title: "Map All Recurring Tasks to Agents or Automation Triggers in Quadco",
    body: "Every task that repeats more than twice a month should live in Quadco with a designated owner: human, agent, or automated trigger. If it's not in the registry, it doesn't exist as a system — it's just a habit waiting to break.",
  },
  {
    id: "21",
    category: "Knowledge Systems",
    title: "Implement Context Decay Prevention Across All AI Platforms",
    body: "Your Master Context Blueprint for Gemini already includes drift detection protocols. Apply the same architecture to Claude and ChatGPT sessions tied to active builds. Context decay is the most common reason AI-assisted work stalls mid-project.",
  },
  {
    id: "22",
    category: "Knowledge Systems",
    title: "Create a Single Source of Truth Dashboard for Both Businesses",
    body: "Oracle, once deployed, should serve as the knowledge retrieval layer for both businesses. Build a lightweight internal dashboard that surfaces: active projects, agent statuses, pending decisions, and stalled workflows — in one view, on demand.",
  },
  {
    id: "23",
    category: "Knowledge Systems",
    title: "Extract and Institutionalize Tribal Knowledge Before It Drifts",
    body: "Clinical insights, referral relationship context, and agent prompt logic currently live in your head or scattered across sessions. Schedule one 'knowledge extraction' session monthly: record it, run it through The Mechanic, store it in Oracle. Systems outlast memory.",
  },
  {
    id: "24",
    category: "Growth Systems",
    title: "Build Lemon Squeezy Checkout Into the Somatic App Before Launch",
    body: "The Lemon Squeezy decision is already made. Integrate checkout and digital delivery into the somatic app architecture from the start — not as a retrofit. Monetization architecture is harder to add than to build in.",
  },
  {
    id: "25",
    category: "Growth Systems",
    title: "Establish a Quarterly Wardley Review Ritual for Both Businesses",
    body: "Each quarter, re-map both Movement Solutions and Labno Labs. What moved from custom to commodity? What new capability entered genesis? This ritual prevents strategic inertia and keeps your 'build queue' aligned with actual market evolution rather than internal momentum.",
  },
];

const questions = [
  {
    id: "01",
    theme: "Resource Allocation",
    question: "Where is our highest-leverage effort being spent on commodities instead of differentiation — and what would it cost to redirect it this quarter?",
  },
  {
    id: "02",
    theme: "Constraint Theory",
    question: "What is the single constraint that, if removed tomorrow, would compound velocity across every other system we operate?",
  },
  {
    id: "03",
    theme: "Vision Clarity",
    question: "What does our fully realized three-year operating system look like — and what decision are we delaying that is the longest upstream blocker?",
  },
  {
    id: "04",
    theme: "Client Experience",
    question: "What would our highest-value client say is the one gap between what we deliver and what they actually needed?",
  },
  {
    id: "05",
    theme: "Automation Readiness",
    question: "Which manual process in our current workflow could be fully automated within 90 days — and what is the real cost of not doing it?",
  },
  {
    id: "06",
    theme: "Knowledge Architecture",
    question: "Where is critical institutional knowledge trapped in a single person's head rather than a documented, retrievable system?",
  },
  {
    id: "07",
    theme: "Strategic Positioning",
    question: "What are we building custom that a world-class competitor would simply buy — and are we doing it for differentiation or inertia?",
  },
  {
    id: "08",
    theme: "Metrics Hygiene",
    question: "Which metrics are we tracking that never actually drive a decision — and what would we measure instead if we started from scratch?",
  },
  {
    id: "09",
    theme: "Failure Mode Awareness",
    question: "Where does our system fail silently when no one is watching — and what is the earliest detectable signal before it becomes a problem?",
  },
  {
    id: "10",
    theme: "Agent and AI Leverage",
    question: "Which of our named agents or AI workflows generates the most compounding value over time — and are we investing in it proportionally?",
  },
  {
    id: "11",
    theme: "Market Assumption Testing",
    question: "Which beliefs about our market or clients have we never tested empirically — and what is the cheapest experiment that would prove or disprove them?",
  },
  {
    id: "12",
    theme: "Capacity Design",
    question: "How would our business operate if every admin function ran autonomously — and what would we do with the recovered hours?",
  },
  {
    id: "13",
    theme: "Competitive Intelligence",
    question: "What would a well-resourced competitor do differently with our exact assets, client base, and clinical IP — and why aren't we doing it?",
  },
  {
    id: "14",
    theme: "Energy Alignment",
    question: "Where in our operating rhythm are we spending high-regulation cognitive energy on low-leverage tasks — and what structural change would fix it?",
  },
  {
    id: "15",
    theme: "Legacy Design",
    question: "If this business ran without us for 30 days, what would break first — and is that the system we should be building into next quarter?",
  },
];

const categoryColors = {
  "Strategic Clarity": "#7C9885",
  "Atomic Habits": "#8B7355",
  "Workflow Automation": "#5C7A8C",
  "Systems Architecture": "#7A5C8C",
  "Knowledge Systems": "#8C6B5C",
  "Growth Systems": "#5C8C7A",
};

const themeColors = {
  "Resource Allocation": "#7C9885",
  "Constraint Theory": "#8B7355",
  "Vision Clarity": "#5C7A8C",
  "Client Experience": "#7A5C8C",
  "Automation Readiness": "#8C6B5C",
  "Knowledge Architecture": "#5C8C7A",
  "Strategic Positioning": "#7C9885",
  "Metrics Hygiene": "#8B7355",
  "Failure Mode Awareness": "#5C7A8C",
  "Agent and AI Leverage": "#7A5C8C",
  "Market Assumption Testing": "#8C6B5C",
  "Capacity Design": "#5C8C7A",
  "Competitive Intelligence": "#7C9885",
  "Energy Alignment": "#8B7355",
  "Legacy Design": "#5C7A8C",
};

export default function App() {
  const [activeTab, setActiveTab] = useState("habits");
  const [expanded, setExpanded] = useState(null);

  const toggle = (id) => setExpanded(expanded === id ? null : id);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0D0F0E",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#E8E3DC",
      padding: "0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .header-title {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
          font-size: clamp(2rem, 5vw, 3.2rem);
          letter-spacing: -0.02em;
          line-height: 1.1;
          color: #E8E3DC;
        }
        .header-subtitle {
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
          font-size: 0.75rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #7C9885;
        }
        .tab-btn {
          font-family: 'DM Sans', sans-serif;
          font-weight: 400;
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          border: none;
          cursor: pointer;
          padding: 10px 24px;
          transition: all 0.2s ease;
        }
        .tab-active {
          background: #7C9885;
          color: #0D0F0E;
        }
        .tab-inactive {
          background: transparent;
          color: #6B6560;
          border: 1px solid #252825;
        }
        .tab-inactive:hover {
          color: #E8E3DC;
          border-color: #444;
        }
        .entry-row {
          border-bottom: 1px solid #1A1E1B;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .entry-row:hover {
          background: rgba(124, 152, 133, 0.04);
        }
        .entry-num {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
          font-size: 1.1rem;
          color: #3A3E3B;
          min-width: 36px;
        }
        .entry-category {
          font-family: 'DM Sans', sans-serif;
          font-weight: 400;
          font-size: 0.6rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 2px;
        }
        .entry-title {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 400;
          font-size: 1.05rem;
          color: #D4CFC8;
          line-height: 1.3;
        }
        .entry-body {
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
          font-size: 0.82rem;
          line-height: 1.75;
          color: #9A9590;
          padding: 12px 0 16px 52px;
          max-width: 680px;
        }
        .chevron {
          transition: transform 0.2s ease;
          color: #3A3E3B;
          font-size: 0.7rem;
        }
        .chevron.open {
          transform: rotate(90deg);
          color: #7C9885;
        }
        .q-question {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-weight: 400;
          font-size: 1.08rem;
          color: #D4CFC8;
          line-height: 1.5;
        }
        .divider-line {
          height: 1px;
          background: linear-gradient(90deg, #7C9885 0%, #252825 60%, transparent 100%);
          margin: 32px 0;
        }
        .count-badge {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
          font-size: 3.5rem;
          color: #1E221F;
          line-height: 1;
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: "52px 40px 36px", borderBottom: "1px solid #1A1E1B", background: "#0D0F0E" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <p className="header-subtitle" style={{ marginBottom: 14 }}>Movement Solutions · Labno Labs · Strategic Field Manual</p>
          <h1 className="header-title">
            Systems Intelligence<br />
            <span style={{ fontStyle: "italic", color: "#7C9885" }}>& Strategic Alignment</span>
          </h1>
          <div className="divider-line" style={{ margin: "24px 0 0" }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "24px 40px 0", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={`tab-btn ${activeTab === "habits" ? "tab-active" : "tab-inactive"}`}
            onClick={() => setActiveTab("habits")}
          >
            25 System Improvements
          </button>
          <button
            className={`tab-btn ${activeTab === "questions" ? "tab-active" : "tab-inactive"}`}
            onClick={() => setActiveTab("questions")}
          >
            15 Alignment Questions
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 40px 80px" }}>

        {activeTab === "habits" && (
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 28 }}>
              <span className="count-badge">25</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "#4A4E4B", letterSpacing: "0.1em", textTransform: "uppercase", paddingBottom: 8 }}>
                Atomic improvements across habits, workflows, projects & systems
              </p>
            </div>

            {habits.map((h) => (
              <div key={h.id} className="entry-row" onClick={() => toggle(h.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0" }}>
                  <span className="entry-num">{h.id}</span>
                  <span
                    className="entry-category"
                    style={{
                      background: categoryColors[h.category] + "22",
                      color: categoryColors[h.category],
                    }}
                  >
                    {h.category}
                  </span>
                  <span className="entry-title" style={{ flex: 1 }}>{h.title}</span>
                  <span className={`chevron ${expanded === h.id ? "open" : ""}`}>▶</span>
                </div>
                {expanded === h.id && (
                  <p className="entry-body">{h.body}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "questions" && (
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 28 }}>
              <span className="count-badge">15</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "#4A4E4B", letterSpacing: "0.1em", textTransform: "uppercase", paddingBottom: 8 }}>
                Questions to align your company with world-class leaders
              </p>
            </div>

            {questions.map((q) => (
              <div key={q.id} className="entry-row" onClick={() => toggle("q" + q.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0" }}>
                  <span className="entry-num">{q.id}</span>
                  <span
                    className="entry-category"
                    style={{
                      background: themeColors[q.theme] + "22",
                      color: themeColors[q.theme],
                    }}
                  >
                    {q.theme}
                  </span>
                  <span className="entry-title" style={{ flex: 1 }}>{q.question.length > 80 ? q.question.slice(0, 80) + "…" : q.question}</span>
                  <span className={`chevron ${expanded === "q" + q.id ? "open" : ""}`}>▶</span>
                </div>
                {expanded === "q" + q.id && (
                  <p className="q-question" style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: "italic",
                    fontSize: "1.05rem",
                    color: "#B8B3AC",
                    padding: "8px 0 20px 52px",
                    lineHeight: 1.65,
                    maxWidth: 660,
                  }}>
                    "{q.question}"
                  </p>
                )}
              </div>
            ))}

            <div className="divider-line" style={{ marginTop: 48 }} />
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              fontSize: "0.95rem",
              color: "#4A4E4B",
              lineHeight: 1.7,
              maxWidth: 560,
            }}>
              These questions are diagnostic instruments, not rhetorical prompts. Each one is designed to expose a constraint, assumption, or misalignment that, once named, becomes actionable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
