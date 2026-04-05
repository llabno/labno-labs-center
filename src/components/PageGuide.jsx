import { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ── Detailed page documentation ─────────────────────────────────────────────────

const PAGE_GUIDES = {
  autonomous: {
    title: 'Autonomous Agent System',
    sections: [
      { heading: 'What This Page Shows', content: 'Real-time monitoring of AI agent executions. Each row is a task that was dispatched to Claude Haiku for autonomous processing.' },
      { heading: 'How Agents Work', content: '1. You create or dispatch a task from Work Planner or Wishlist\n2. The task is queued in the agent_runs table with status "queued"\n3. Every 15 minutes (or when you click "Process Queue Now"), the processor picks up queued runs\n4. Each run is sent to Claude Haiku via the Anthropic API\n5. Results are saved back to agent_runs and activity_log\n6. If the agent needs your input, it shows up in Agent Queue' },
      { heading: 'Route Modes', content: 'API (green) = Using Anthropic API with your API key (~$0.01/run)\nLocal (blue) = Using local Claude CLI with Pro subscription (free)\nError (red) = AGENT_ROUTE not configured in Vercel' },
      { heading: 'Cost', content: 'Each Haiku run costs ~$0.005-0.02 depending on prompt length. Token counts and costs are shown per run. Monthly budget is tracked in the health check.' },
      { heading: 'Troubleshooting', content: 'Runs stuck as "queued"? Click "Process Queue Now" to trigger manually.\nAll runs failing? Check AGENT_ROUTE and ANTHROPIC_API_KEY in Vercel env vars.\nNeed to retry? Use "Retry Failed Runs" to re-queue routing errors.' },
    ],
  },
  today: {
    title: 'Today Dashboard',
    sections: [
      { heading: 'What This Page Shows', content: 'Your daily command center. Sessions scheduled today, priority tasks, pending actions across all systems, and recent activity.' },
      { heading: 'Data Sources', content: 'Sessions: session_briefs + soap_notes for today\'s date\nPriority Tasks: global_tasks ordered by priority\nPending Actions: unbilled SOAPs, agent failures, blocked tasks, triage items, new ideas, draft proposals\nAgent Status: agent_runs needing input or failed\nRecent Activity: activity_log (or fallback to communication_log + global_tasks)' },
      { heading: 'Pending Actions', content: 'Red items need immediate attention. Agent failures and "needs input" items are blocking automated work. Unbilled SOAPs affect revenue.' },
    ],
  },
  planner: {
    title: 'Work Planner',
    sections: [
      { heading: 'What This Page Shows', content: 'Two modes: Simple (quick task picking) and Advanced (Smart Scheduler with launch controls).' },
      { heading: 'Simple Mode', content: 'Shows tasks ranked by priority score. Pick a time window, see what fits. Click "Run" to dispatch to an agent, or "Send to Agent" for guided tasks.' },
      { heading: 'Advanced Mode', content: 'Three sub-modes: Quickest (maximize throughput), My Availability (schedule around your calendar), Client Scheduling (optimize for client needs).\nLaunch Controls let you filter by time budget, count, and priority tier before batch-dispatching.' },
      { heading: 'Dispatch Flow', content: 'Run button \u2192 POST /api/agent/run \u2192 queued in agent_runs \u2192 processed by Haiku \u2192 results in Autonomous tab' },
    ],
  },
  availability: {
    title: 'Client Availability',
    sections: [
      { heading: 'What This Page Shows', content: 'Client scheduling preferences, availability heat map, tier breakdown, and vacation tracking.' },
      { heading: 'Tiers', content: 'Tier 1 (Resilience): Long-term stable clients. Protect these relationships.\nTier 2 (Flow): Active engagement, growing. Schedule priority.\nTier 3 (Edge): New or at-risk. Extra attention needed.' },
      { heading: 'Heat Map', content: 'Shows client density by day and hour. Red = 4+ clients competing for the same slot. Use this to identify scheduling conflicts.' },
      { heading: 'Scheduling Strategies', content: 'Revenue Maximize: Fill premium slots with highest-billing clients.\nDeep Work Protect: Keep your focus hours clear.\nMulti-Hour Priority: 2-3 hour sessions get scheduling priority because they are harder to fit.' },
    ],
  },
  soap: {
    title: 'SOAP Notes',
    sections: [
      { heading: 'What This Page Shows', content: 'Clinical documentation with two tabs: Session Brief (quick pre-session notes) and SOAP Note (full documentation with auto-CPT coding).' },
      { heading: 'Workflow', content: '1. Start a Session Brief before the visit \u2014 select client, tier, track\n2. After the visit, complete the SOAP Note \u2014 Subjective, Objective, Assessment, Plan\n3. Add exercises from the library\n4. Click "Suggest CPT" for auto-coding with 8-minute rule\n5. Save \u2014 triggers write to activity_log and shows in Today dashboard' },
    ],
  },
  resources: {
    title: 'Resource Monitor',
    sections: [
      { heading: 'What This Page Shows', content: 'Token consumption audit for Claude Code sessions, cost-per-page breakdown, and optimization checklist.' },
      { heading: 'Cost by Page', content: 'Shows estimated cost per visit for each page based on Supabase queries, Claude API calls, and Google API usage. Green < $0.001, Yellow < $0.01, Red > $0.01.' },
      { heading: 'Optimization Checklist', content: 'Run buttons execute real actions: log to activity_log, create triage tasks for security fixes. The summary shows passed/review counts.' },
    ],
  },
};

// ── PageGuide Component ─────────────────────────────────────────────────────────

const PageGuide = ({ pageKey, children }) => {
  const guide = PAGE_GUIDES[pageKey];
  if (!guide && !children) return null;

  const storageKey = `pageGuide_${pageKey}_expanded`;
  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(expanded));
    } catch { /* ignore */ }
  }, [expanded, storageKey]);

  const toggle = () => setExpanded(prev => !prev);

  // Detect dark-theme pages (autonomous uses dark bg)
  const isDark = pageKey === 'autonomous';

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Toggle button */}
      <button
        onClick={toggle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '8px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
          color: isDark ? '#8be9fd' : '#8a8682',
          fontSize: '0.78rem',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
        onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'}
      >
        <HelpCircle size={13} />
        How this works
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            marginTop: '8px',
            padding: '16px 20px',
            borderRadius: '14px',
            background: isDark
              ? 'rgba(255,255,255,0.03)'
              : 'rgba(255,255,255,0.55)',
            border: `1px solid ${isDark ? 'rgba(139,233,253,0.1)' : 'rgba(0,0,0,0.06)'}`,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: isDark
              ? '0 2px 12px rgba(0,0,0,0.3)'
              : '0 2px 12px rgba(0,0,0,0.04)',
          }}
        >
          {guide && (
            <>
              <div style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: isDark ? '#e8e6f0' : '#2e2c2a',
                marginBottom: '12px',
              }}>
                {guide.title}
              </div>
              {guide.sections.map((section, i) => (
                <div key={i} style={{ marginBottom: i < guide.sections.length - 1 ? '12px' : 0 }}>
                  <div style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: isDark ? '#bd93f9' : '#5a8abf',
                    marginBottom: '4px',
                  }}>
                    {section.heading}
                  </div>
                  <div style={{
                    fontSize: '0.78rem',
                    lineHeight: 1.6,
                    color: isDark ? '#a0a0b8' : '#6b6764',
                    whiteSpace: 'pre-line',
                  }}>
                    {section.content}
                  </div>
                </div>
              ))}
            </>
          )}
          {children && (
            <div style={{
              fontSize: '0.78rem',
              lineHeight: 1.6,
              color: isDark ? '#a0a0b8' : '#6b6764',
              marginTop: guide ? '12px' : 0,
            }}>
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { PAGE_GUIDES };
export default PageGuide;
