import { useState } from "react";

const habits = [
  {
    id: "01",
    category: "Strategic Clarity",
    title: "Wardley Map Both Businesses Quarterly",
    body: "Plot every tool, workflow, agent, and service offering on a genesis\u2192commodity axis. For Movement Solutions and Labno Labs, this immediately exposes where skilled effort is being spent on commoditized functions \u2014 freeing bandwidth for genuine IP like Core Three and Clinical Brain.",
  },
  {
    id: "02",
    category: "Strategic Clarity",
    title: "Codify the \u2018Buy vs. Build\u2019 Decision Gate",
    body: "Before any new build sprint begins, run a 10-minute Wardley-informed gate: Is this a commodity? Is it off-the-shelf-ready? If yes, buy. Reserve the build queue strictly for Clinical Brain, Oracle, and the somatic app \u2014 your actual differentiators.",
  },
  {
    id: "03",
    category: "Strategic Clarity",
    title: "Define the Quarterly \u2018One Constraint\u2019 Focus",
    body: "Identify the single bottleneck that, if removed, would compound across all other systems. Document it, name it, assign an agent or sprint to it. Theory of Constraints applied to a two-business operator means one lever per quarter \u2014 not ten.",
  },
  {
    id: "04",
    category: "Atomic Habits",
    title: "Build a \u2018Protected Rhythm\u2019 Block for Deep Build Work",
    body: "Your own clinical framework applies here: nervous system regulation before skill-building. Schedule 2\u20133 hour deep build windows on fixed days, non-negotiable. Your best systems work \u2014 Oracle architecture, Clinical Brain prompts \u2014 requires sustained attentional flow, not fragmented slots.",
  },
  {
    id: "05",
    category: "Atomic Habits",
    title: "Use HRV / Somatic State as a Scheduling Variable",
    body: "Stop scheduling deep cognitive work by clock alone. Low HRV days get admin, review, and maintenance. High-regulation days get architecture, prompt engineering, and creative build. Your system knows what your calendar doesn\u2019t.",
  },
  {
    id: "06",
    category: "Atomic Habits",
    title: "Monday Morning 30-Minute System Diagnostic",
    body: "A weekly scan ritual across both businesses: What shipped? What stalled? What\u2019s the bottleneck? Map it in Quadco. This is not a meeting \u2014 it\u2019s a solo diagnostic run that prevents invisible drift and context decay before it compounds.",
  },
  {
    id: "07",
    category: "Atomic Habits",
    title: "Implement a \u2018Minimum Viable Admin\u2019 Standard",
    body: "For every new process added to either business, define its minimum viable version first. One email template. One Kylie script. One agent trigger. Complexity is the enemy of sustainability \u2014 deploy lean, then layer.",
  },
  {
    id: "08",
    category: "Atomic Habits",
    title: "End Every Build Session with a Context Handoff Note",
    body: "Before closing a session on Oracle, Clinical Brain, or any active build, write a 3-sentence status note. This prevents the \u2018where was I?\u2019 restart tax, preserves context across your M2/MSI dev environments, and feeds your Quadco workflow registry.",
  },
  {
    id: "09",
    category: "Workflow Automation",
    title: "Deploy Kylie Across All First-Touch Touchpoints",
    body: "Kylie currently handles intake \u2014 expand her to referral physician acknowledgment, consultation confirmations, and post-session follow-up. Your 114-doctor referral network is an underserved automation opportunity.",
  },
  {
    id: "10",
    category: "Workflow Automation",
    title: "Build a Prompt Template Library Indexed by Use Case",
    body: "Create a versioned library of proven prompt templates across your three AI platforms (Claude, ChatGPT, Gemini). Organized by DOE layer \u2014 Directive, Orchestration, Execution \u2014 this turns one-off prompts into reusable institutional assets.",
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
    body: "Your clinical work generates daily IP \u2014 assessments, exercise progressions, somatic observations. A lightweight pipeline that converts clinical notes into anonymized content drafts (The Mechanic \u2192 marketing copy) creates a flywheel with zero additional input.",
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
    body: "Your three client segments \u2014 Resilience, Flow, Reactivation \u2014 are architectural units, not just labels. A Notion CRM built around them integrates naturally with Clinical Brain agent payloads and bridges the EMR-to-coaching gap that Clinicient can\u2019t.",
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
    body: "The Mechanic, The Sniper, The Overseer, and Billing Agent each need explicit handoff contracts \u2014 what data format passes between them, what triggers the next agent, and what constitutes a failure state. Without this, multi-agent systems accumulate invisible debt.",
  },
  {
    id: "17",
    category: "Systems Architecture",
    title: "Prioritize the Somatic Integration App as Consumer Lead Product",
    body: "Of your three planned mosolabs.com apps, the somatic integration app built around Core Three (Myers, Comerford, Shacklock) has no direct market analog. Ship it first. Couch-to-5K and breathwork have well-funded competitors. This one doesn\u2019t.",
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
    body: "The M1 Core Three Workbook extraction is complete \u2014 189 deduplicated exercises with polyvagal NS state classifications and IFS overlays. Build the delivery pipeline: Clinical Brain triggers \u2192 card selection \u2192 client-facing output. The asset exists; the pipe doesn\u2019t yet.",
  },
  {
    id: "20",
    category: "Systems Architecture",
    title: "Map All Recurring Tasks to Agents or Automation Triggers in Quadco",
    body: "Every task that repeats more than twice a month should live in Quadco with a designated owner: human, agent, or automated trigger. If it\u2019s not in the registry, it doesn\u2019t exist as a system \u2014 it\u2019s just a habit waiting to break.",
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
    body: "Oracle, once deployed, should serve as the knowledge retrieval layer for both businesses. Build a lightweight internal dashboard that surfaces: active projects, agent statuses, pending decisions, and stalled workflows \u2014 in one view, on demand.",
  },
  {
    id: "23",
    category: "Knowledge Systems",
    title: "Extract and Institutionalize Tribal Knowledge Before It Drifts",
    body: "Clinical insights, referral relationship context, and agent prompt logic currently live in your head or scattered across sessions. Schedule one \u2018knowledge extraction\u2019 session monthly: record it, run it through The Mechanic, store it in Oracle. Systems outlast memory.",
  },
  {
    id: "24",
    category: "Growth Systems",
    title: "Build Lemon Squeezy Checkout Into the Somatic App Before Launch",
    body: "The Lemon Squeezy decision is already made. Integrate checkout and digital delivery into the somatic app architecture from the start \u2014 not as a retrofit. Monetization architecture is harder to add than to build in.",
  },
  {
    id: "25",
    category: "Growth Systems",
    title: "Establish a Quarterly Wardley Review Ritual for Both Businesses",
    body: "Each quarter, re-map both Movement Solutions and Labno Labs. What moved from custom to commodity? What new capability entered genesis? This ritual prevents strategic inertia and keeps your \u2018build queue\u2019 aligned with actual market evolution rather than internal momentum.",
  },
];

const questions = [
  {
    id: "01",
    theme: "Resource Allocation",
    question: "Where is our highest-leverage effort being spent on commodities instead of differentiation \u2014 and what would it cost to redirect it this quarter?",
  },
  {
    id: "02",
    theme: "Constraint Theory",
    question: "What is the single constraint that, if removed tomorrow, would compound velocity across every other system we operate?",
  },
  {
    id: "03",
    theme: "Vision Clarity",
    question: "What does our fully realized three-year operating system look like \u2014 and what decision are we delaying that is the longest upstream blocker?",
  },
  {
    id: "04",
    theme: "Client Experience",
    question: "What would our highest-value client say is the one gap between what we deliver and what they actually needed?",
  },
  {
    id: "05",
    theme: "Automation Readiness",
    question: "Which manual process in our current workflow could be fully automated within 90 days \u2014 and what is the real cost of not doing it?",
  },
  {
    id: "06",
    theme: "Knowledge Architecture",
    question: "Where is critical institutional knowledge trapped in a single person\u2019s head rather than a documented, retrievable system?",
  },
  {
    id: "07",
    theme: "Strategic Positioning",
    question: "What are we building custom that a world-class competitor would simply buy \u2014 and are we doing it for differentiation or inertia?",
  },
  {
    id: "08",
    theme: "Metrics Hygiene",
    question: "Which metrics are we tracking that never actually drive a decision \u2014 and what would we measure instead if we started from scratch?",
  },
  {
    id: "09",
    theme: "Failure Mode Awareness",
    question: "Where does our system fail silently when no one is watching \u2014 and what is the earliest detectable signal before it becomes a problem?",
  },
  {
    id: "10",
    theme: "Agent and AI Leverage",
    question: "Which of our named agents or AI workflows generates the most compounding value over time \u2014 and are we investing in it proportionally?",
  },
  {
    id: "11",
    theme: "Market Assumption Testing",
    question: "Which beliefs about our market or clients have we never tested empirically \u2014 and what is the cheapest experiment that would prove or disprove them?",
  },
  {
    id: "12",
    theme: "Capacity Design",
    question: "How would our business operate if every admin function ran autonomously \u2014 and what would we do with the recovered hours?",
  },
  {
    id: "13",
    theme: "Competitive Intelligence",
    question: "What would a well-resourced competitor do differently with our exact assets, client base, and clinical IP \u2014 and why aren\u2019t we doing it?",
  },
  {
    id: "14",
    theme: "Energy Alignment",
    question: "Where in our operating rhythm are we spending high-regulation cognitive energy on low-leverage tasks \u2014 and what structural change would fix it?",
  },
  {
    id: "15",
    theme: "Legacy Design",
    question: "If this business ran without us for 30 days, what would break first \u2014 and is that the system we should be building into next quarter?",
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

export default function StrategicPlaybook() {
  const [activeTab, setActiveTab] = useState("habits");
  const [expanded, setExpanded] = useState(null);

  const toggle = (id) => setExpanded(expanded === id ? null : id);

  return (
    <div style={{
      minHeight: "100%",
      background: "#0D0F0E",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#E8E3DC",
      padding: "0",
      overflowY: "auto",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
      `}</style>

      {/* Header */}
      <div style={{ padding: "40px 36px 28px", borderBottom: "1px solid #1A1E1B" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#7C9885", marginBottom: 12 }}>
            Movement Solutions \u00b7 Labno Labs \u00b7 Strategic Field Manual
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", letterSpacing: "-0.02em", lineHeight: 1.1, color: "#E8E3DC" }}>
            Systems Intelligence<br />
            <span style={{ fontStyle: "italic", color: "#7C9885" }}>& Strategic Alignment</span>
          </h1>
          <div style={{ height: 1, background: "linear-gradient(90deg, #7C9885 0%, #252825 60%, transparent 100%)", margin: "20px 0 0" }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "20px 36px 0", maxWidth: 780, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setActiveTab("habits")}
            style={{
              fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: "0.65rem",
              letterSpacing: "0.14em", textTransform: "uppercase", border: "none", cursor: "pointer",
              padding: "9px 20px", transition: "all 0.2s",
              background: activeTab === "habits" ? "#7C9885" : "transparent",
              color: activeTab === "habits" ? "#0D0F0E" : "#4A4E4B",
              outline: activeTab === "habits" ? "none" : "1px solid #1E221F",
            }}
          >
            25 System Improvements
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            style={{
              fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: "0.65rem",
              letterSpacing: "0.14em", textTransform: "uppercase", border: "none", cursor: "pointer",
              padding: "9px 20px", transition: "all 0.2s",
              background: activeTab === "questions" ? "#7C9885" : "transparent",
              color: activeTab === "questions" ? "#0D0F0E" : "#4A4E4B",
              outline: activeTab === "questions" ? "none" : "1px solid #1E221F",
            }}
          >
            15 Alignment Questions
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 36px 60px" }}>

        {activeTab === "habits" && (
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 24 }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "3.2rem", color: "#1E221F", lineHeight: 1 }}>25</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "#3A3E3B", letterSpacing: "0.1em", textTransform: "uppercase", paddingBottom: 6 }}>
                Atomic improvements across habits, workflows, projects & systems
              </p>
            </div>

            {habits.map((h) => (
              <div key={h.id} onClick={() => toggle(h.id)} style={{ borderBottom: "1px solid #1A1E1B", cursor: "pointer", transition: "background 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "1.05rem", color: "#3A3E3B", minWidth: 32 }}>{h.id}</span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: "0.58rem",
                    letterSpacing: "0.13em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 2,
                    background: (categoryColors[h.category] || "#6B6560") + "22",
                    color: categoryColors[h.category] || "#6B6560",
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}>{h.category}</span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "1.0rem", color: "#D4CFC8", flex: 1, lineHeight: 1.3 }}>{h.title}</span>
                  <span style={{ color: expanded === h.id ? "#7C9885" : "#3A3E3B", fontSize: "0.65rem", transition: "transform 0.2s", transform: expanded === h.id ? "rotate(90deg)" : "none" }}>\u25b6</span>
                </div>
                {expanded === h.id && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: "0.8rem", lineHeight: 1.75, color: "#9A9590", padding: "8px 0 16px 46px", maxWidth: 660 }}>{h.body}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "questions" && (
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 24 }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "3.2rem", color: "#1E221F", lineHeight: 1 }}>15</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "#3A3E3B", letterSpacing: "0.1em", textTransform: "uppercase", paddingBottom: 6 }}>
                Questions to align your company with world-class leaders
              </p>
            </div>

            {questions.map((q) => (
              <div key={q.id} onClick={() => toggle("q" + q.id)} style={{ borderBottom: "1px solid #1A1E1B", cursor: "pointer", transition: "background 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "1.05rem", color: "#3A3E3B", minWidth: 32 }}>{q.id}</span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: "0.58rem",
                    letterSpacing: "0.13em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 2,
                    background: (themeColors[q.theme] || "#6B6560") + "22",
                    color: themeColors[q.theme] || "#6B6560",
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}>{q.theme}</span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "1.0rem", color: "#D4CFC8", flex: 1, lineHeight: 1.3 }}>{q.question.length > 80 ? q.question.slice(0, 80) + "\u2026" : q.question}</span>
                  <span style={{ color: expanded === "q" + q.id ? "#7C9885" : "#3A3E3B", fontSize: "0.65rem", transition: "transform 0.2s", transform: expanded === "q" + q.id ? "rotate(90deg)" : "none" }}>\u25b6</span>
                </div>
                {expanded === "q" + q.id && (
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "1.02rem",
                    color: "#B8B3AC", padding: "6px 0 18px 46px", lineHeight: 1.65, maxWidth: 640,
                  }}>
                    \u201c{q.question}\u201d
                  </p>
                )}
              </div>
            ))}

            <div style={{ height: 1, background: "linear-gradient(90deg, #7C9885 0%, #252825 60%, transparent 100%)", margin: "40px 0 16px" }} />
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "0.9rem",
              color: "#4A4E4B", lineHeight: 1.7, maxWidth: 540,
            }}>
              These questions are diagnostic instruments, not rhetorical prompts. Each one is designed to expose a constraint, assumption, or misalignment that, once named, becomes actionable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
