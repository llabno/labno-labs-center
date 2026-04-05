import { useState, useRef, useEffect } from 'react';
import { Eye } from 'lucide-react';

/**
 * InfoTooltip — small eye icon that shows contextual help on hover/click
 * Automatically positions below if near top of viewport, above otherwise
 */
const InfoTooltip = ({ text, color = '#8a8682', size = 14 }) => {
  const [show, setShow] = useState(false);
  const [dropDown, setDropDown] = useState(false);
  const iconRef = useRef(null);

  useEffect(() => {
    if (show && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      // If the icon is within 120px of the top of the viewport, show tooltip below
      setDropDown(rect.top < 120);
    }
  }, [show]);

  return (
    <span
      ref={iconRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onClick={() => setShow(p => !p)}>
      <Eye size={size} color={color} style={{ opacity: 0.5 }} />
      {show && (
        <div style={{
          position: 'absolute',
          ...(dropDown
            ? { top: '100%', marginTop: '6px' }
            : { bottom: '100%', marginBottom: '6px' }
          ),
          left: '50%', transform: 'translateX(-50%)',
          padding: '8px 12px', borderRadius: '8px',
          background: '#2e2c2a', color: '#f5f3f1', fontSize: '0.72rem', lineHeight: 1.5,
          width: '260px', zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          pointerEvents: 'none', whiteSpace: 'normal',
        }}>
          {text}
          {/* Arrow — flip direction based on position */}
          <div style={{
            position: 'absolute',
            ...(dropDown
              ? { bottom: '100%', borderBottom: '6px solid #2e2c2a', borderTop: 'none' }
              : { top: '100%', borderTop: '6px solid #2e2c2a', borderBottom: 'none' }
            ),
            left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
          }} />
        </div>
      )}
    </span>
  );
};

// Page-level descriptions for each section
export const PAGE_INFO = {
  today: 'Your morning dashboard. Sessions, priority tasks, pending actions, and quick links — everything to start your day.',
  dashboard: 'Your daily command center. Shows active tasks, recent activity, and Monday briefing. Quick idea capture sends to Wishlist.',
  taskqueue: 'CASE-based task triage: Critical, Active, Someday, Eliminated. Drag tasks between columns or change priority inline.',
  calendar: 'Monthly view of project deadlines, task due dates, and pipeline events. Click a date to see details.',
  quickpick: 'Fast task selection based on time available and energy level. Pick what to work on next in under 10 seconds.',
  scheduler: 'Three scheduling modes: Quickest (AI-optimized), Availability (time-block), Client (multi-person). Heat map shows workload density.',
  studio: 'Build and manage projects. Create from templates, track phases, and monitor health scores.',
  wishlist: 'Central idea inbox. Everything lands here — from Cmd+K, voice, bookmarklet, or API. Ideas are auto-analyzed and routed.',
  templates: 'Reusable project templates, skill templates from Maker School, and workflow patterns.',
  library: 'Component library and design system reference. Browse glass-panel styles and UI patterns.',
  oracle: 'AI-powered analysis and research. Ask strategic questions and get data-backed answers.',
  strategic: 'Business intelligence dashboards. Revenue projections, competitive analysis, market positioning.',
  playbook: 'Step-by-step playbooks for repeatable processes. Sales, onboarding, content creation.',
  telemetry: 'System health, API usage, token consumption, and cost tracking. Monitor all four ventures.',
  resources: 'Server resources, optimization checklist, and performance metrics. Run checks to improve speed.',
  history: 'Activity log of all work done. Sessions, deployments, code changes, and agent tasks.',
  autonomous: 'AI agent monitoring hub. Shows which background agents are running, their recent activity, results, and routing mode (local CLI vs API vs simulation). If nothing shows in the feed, no agents have been dispatched yet — use QuickPick or SmartScheduler to send tasks to agents.',
  mechanic: 'Speak Freely — structured self-reflection using IFS, Panksepp, and polyvagal frameworks.',
  soap: 'Clinical session logging. Session Brief (90 sec) → SOAP Note (3 min) → auto-billing + agent tasks.',
  blog: 'Clinical blog generator. Sniper agent drafts posts from SOAP note insights.',
  reactivation: 'Dormant client re-engagement. Scored list with outreach templates and tracking.',
  availability: 'Client scheduling preferences and vacation tracking. Heat map shows booking density by day/time.',
  crm: 'Dual CRM — MOSO Clinical (patients) and Labno Consulting (clients). Status pipeline, activity log, risk scoring.',
  onboarding: 'Guided client intake. Questionnaires, document collection, auto-links to Proposal Generator.',
  proposals: 'Package-based proposal builder. 5 tiers from Starter ($500/mo) to Enterprise ($200K+).',
  documents: 'Client document lifecycle: Draft → Sent → Viewed → Signed. Proposals, contracts, invoices.',
  profitability: 'Client value analysis. CLV, effort ratings, joy ratings, billing multipliers, break-up templates.',
  billing: 'Bi-monthly billing cycles. Assign SOAP sessions → Review → Send → Mark Paid.',
  settings: 'Team permissions, billing rates, session timeouts, MFA, and appearance.',
  content: 'Content pipeline from idea to published. Track content through stages: Ideas → Drafting → Review → Published across Wishlist, Agent, and Oracle sources.',
  agentqueue: 'Agent confirmation queue. When agents need human input to continue a task, their questions appear here. Answer and the agent resumes.',
  demo: 'Explore the platform with fake data by service tier. No real client data is shown. Great for prospective clients.',
};

export default InfoTooltip;
