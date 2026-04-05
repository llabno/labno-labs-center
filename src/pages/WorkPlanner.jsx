import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, Zap, Hand, Bot, Play, CheckCircle, AlertTriangle, ArrowRight, Rocket,
  Calendar, ChevronDown, ChevronRight, Download, Users, Target, Flame, LayoutList,
  BarChart3, GitBranch, Shield, X, Check, SlidersHorizontal, Info, HelpCircle,
  DollarSign, Brain, Layers
} from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { supabase } from '../lib/supabase';
import { logSchedulerRun, logAgentDispatched, logTaskScheduled, logActivity } from '../lib/activity-logger';
import Breadcrumbs from '../components/Breadcrumbs';

// ─── Constants ──────────────────────────────────────────────────────────────────

const TIME_OPTIONS = [
  { min: 5, label: '5 min' },
  { min: 10, label: '10 min' },
  { min: 15, label: '15 min' },
  { min: 20, label: '20 min' },
  { min: 30, label: '30 min' },
  { min: 45, label: '45 min' },
  { min: 60, label: '1 hour' },
  { min: 90, label: '1.5 hours' },
  { min: 120, label: '2 hours' },
  { min: 240, label: '4 hours' },
  { min: 480, label: '8 hours' },
  { min: 1440, label: '24 hours' },
];

const TRIGGER_LEVELS = {
  autonomous: { label: 'Autonomous', icon: Bot, color: '#2d8a4e', bg: 'rgba(45,138,78,0.08)', desc: 'Agent runs end-to-end, no human needed', human: false },
  'one-click': { label: 'One-Click', icon: Zap, color: '#1565c0', bg: 'rgba(21,101,192,0.08)', desc: 'Click to start, agent handles the rest', human: false },
  guided: { label: 'Guided', icon: Play, color: '#c49a40', bg: 'rgba(196,154,64,0.08)', desc: 'Agent generates, you review before deploy', human: true },
  manual: { label: 'Manual', icon: Hand, color: '#8a8682', bg: 'rgba(0,0,0,0.04)', desc: 'Requires human judgment or external action', human: true },
};

const VIEW_MODES = [
  { key: 'list', label: 'List', icon: LayoutList },
  { key: 'kanban', label: 'Kanban', icon: GitBranch },
  { key: 'heatmap', label: 'Heat Map', icon: BarChart3 },
];

// ─── Utility Functions ──────────────────────────────────────────────────────────

const estimateMinutes = (task) => {
  if (task.estimated_minutes) return task.estimated_minutes;
  const title = (task.title || '').toLowerCase();
  if (title.includes('build') || title.includes('create') || title.includes('implement')) return 60;
  if (title.includes('audit') || title.includes('review') || title.includes('analyze')) return 30;
  if (title.includes('deploy') || title.includes('migrate')) return 45;
  if (title.includes('test')) return 20;
  if (title.includes('document') || title.includes('write')) return 30;
  if (title.includes('fix') || title.includes('update') || title.includes('add')) return 15;
  return 15;
};

const formatHumanTime = (minutes) => {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.round(minutes / 60 * 10) / 10;
  return hrs === 1 ? '1 hr' : `${hrs} hrs`;
};

const getTriggerLevel = (task) => {
  if (task.trigger_level) return task.trigger_level;
  const assignee = (task.assigned_to || '').toLowerCase();
  if (assignee === 'agent' || assignee === 'claude') return 'autonomous';
  return 'manual';
};

function formatRunDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function computeNextRun(freq, lastRunAt) {
  if (!freq || freq === 'once') return 'On demand';
  const now = new Date();
  let next;
  switch (freq) {
    case 'daily': next = new Date(now); next.setDate(next.getDate() + 1); break;
    case 'weekly': next = new Date(now); next.setDate(next.getDate() + 7); break;
    case 'monthly': next = new Date(now); next.setMonth(next.getMonth() + 1); break;
    default: return 'On demand';
  }
  return formatRunDate(next);
}

const RUN_STATUS_COLORS = {
  success: '#2d8a4e',
  failure: '#d14040',
  pending: '#c49a40',
};

// ─── Sub-Components ─────────────────────────────────────────────────────────────

const ConfirmDialog = ({ message, detail, onConfirm, onCancel }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={onCancel}>
    <div className="glass-panel" style={{ padding: '2rem', width: '420px', maxWidth: '90vw', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(32px)' }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <Shield size={20} color="#c49a40" />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2e2c2a' }}>Confirm Action</h3>
      </div>
      <p style={{ fontSize: '0.92rem', color: '#3e3c3a', marginBottom: '8px' }}>{message}</p>
      {detail && <p style={{ fontSize: '0.8rem', color: '#8a8682', marginBottom: '1.25rem' }}>{detail}</p>}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'none', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500 }}>Cancel</button>
        <button onClick={onConfirm} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Check size={14} /> Yes, Proceed
        </button>
      </div>
    </div>
  </div>
);

const HowThisWorks = ({ isOpen, onToggle }) => (
  <div className="glass-panel" style={{ padding: isOpen ? '1.25rem' : '0.75rem 1.25rem', transition: 'padding 0.2s ease' }}>
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontSize: '0.88rem', fontWeight: 600, color: '#5a8abf',
      }}
    >
      <HelpCircle size={16} />
      How This Works
      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
    </button>
    {isOpen && (
      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Workflow */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Complete Workflow</div>
          <div style={{ fontSize: '0.82rem', color: '#3e3c3a', lineHeight: 1.7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(90,138,191,0.1)', fontWeight: 500, fontSize: '0.78rem' }}>global_tasks</span>
              <ArrowRight size={12} color="#8a8682" />
              <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(176,96,80,0.1)', fontWeight: 500, fontSize: '0.78rem' }}>Pick tasks here</span>
              <ArrowRight size={12} color="#8a8682" />
              <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(45,138,78,0.1)', fontWeight: 500, fontSize: '0.78rem' }}>"Send to Agent" → /api/agent/run</span>
              <ArrowRight size={12} color="#8a8682" />
              <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(196,154,64,0.1)', fontWeight: 500, fontSize: '0.78rem' }}>/api/agent/process</span>
              <ArrowRight size={12} color="#8a8682" />
              <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(156,39,176,0.1)', fontWeight: 500, fontSize: '0.78rem' }}>Results in Autonomous tab + Work History</span>
            </div>
          </div>
        </div>

        {/* Filtering Methods */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Three Filtering Methods</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 180px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(176,96,80,0.05)', border: '1px solid rgba(176,96,80,0.1)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#b06050', marginBottom: '4px' }}>By Time (Simple)</div>
              <div style={{ fontSize: '0.75rem', color: '#6b6764' }}>"What can I do in 30 minutes?" — filters tasks by estimated duration.</div>
            </div>
            <div style={{ flex: '1 1 180px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(45,138,78,0.05)', border: '1px solid rgba(45,138,78,0.1)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2d8a4e', marginBottom: '4px' }}>By Automation Level (Both)</div>
              <div style={{ fontSize: '0.75rem', color: '#6b6764' }}>Filter by trigger level — Autonomous, One-Click, Guided, or Manual.</div>
            </div>
            <div style={{ flex: '1 1 180px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(90,138,191,0.05)', border: '1px solid rgba(90,138,191,0.1)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#5a8abf', marginBottom: '4px' }}>By Availability Slots (Advanced)</div>
              <div style={{ fontSize: '0.75rem', color: '#6b6764' }}>Add your available time blocks — tasks auto-fill by priority and fit.</div>
            </div>
          </div>
        </div>

        {/* Priority + Trigger Levels */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Priority Levels</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.78rem', color: '#d14040' }}><strong>P0 — Ship Blockers:</strong> Must complete before anything else ships (auth, security, CI/CD)</div>
              <div style={{ fontSize: '0.78rem', color: '#c49a40' }}><strong>P1 — Core System:</strong> Key features and integrations (clinical, CRM, agents, content)</div>
              <div style={{ fontSize: '0.78rem', color: '#6b6764' }}><strong>P2 — Growth Layer:</strong> Analytics, localization, dashboards, advanced features</div>
            </div>
          </div>
          <div style={{ flex: '1 1 240px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2e2c2a', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Trigger Levels</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Object.entries(TRIGGER_LEVELS).map(([key, level]) => {
                const Icon = level.icon;
                return (
                  <div key={key} style={{ fontSize: '0.78rem', color: level.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon size={12} /> <strong>{level.label}:</strong> <span style={{ color: '#6b6764' }}>{level.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);

// ─── Run Metadata Row (shared across both modes) ────────────────────────────────

const RunMetadata = ({ task }) => {
  const lastRun = task.last_run_at ? formatRunDate(task.last_run_at) : null;
  const runStatus = task.last_run_status || null;
  const freq = task.frequency;
  const nextRun = task.next_run_at ? formatRunDate(task.next_run_at) : computeNextRun(freq, task.last_run_at);
  const isOnDemandNeverRun = !lastRun && (!freq || freq === 'once');
  const statusColor = runStatus ? (RUN_STATUS_COLORS[runStatus] || '#999') : '#999';

  if (isOnDemandNeverRun) {
    return (
      <div style={{ marginTop: 4 }}>
        <span style={{ fontSize: '0.68rem', color: '#bbb', fontStyle: 'italic' }}>
          Runs when needed — not scheduled
        </span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.68rem', color: lastRun ? statusColor : '#aaa' }}>
        {lastRun ? `Last: ${lastRun}` : 'Not yet run'}
        {runStatus && ` — ${runStatus.charAt(0).toUpperCase() + runStatus.slice(1)}`}
      </span>
      {nextRun !== 'On demand' && (
        <span style={{ fontSize: '0.68rem', color: '#aaa' }}>Next: {nextRun}</span>
      )}
      {freq && freq !== 'once' && (
        <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.04)', color: '#8a8682' }}>
          {freq}
        </span>
      )}
    </div>
  );
};

// ─── Agent Dispatch Button (shared) ─────────────────────────────────────────────

const DispatchButton = ({ task, dispatching, dispatched, onDispatch }) => {
  if (dispatched[task.id]) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 600, color: '#2d8a4e', padding: '6px 10px' }}>
        <CheckCircle size={12} /> Dispatched!
      </span>
    );
  }
  const isAuto = task._trigger === 'autonomous';
  return (
    <button
      onClick={() => onDispatch(task)}
      disabled={dispatching[task.id]}
      title={isAuto ? 'Send to agent' : 'Override: send to agent anyway'}
      style={{
        background: isAuto ? 'rgba(45,138,78,0.1)' : 'rgba(0,0,0,0.04)',
        border: isAuto ? 'none' : '1px dashed rgba(0,0,0,0.12)',
        borderRadius: '6px', padding: '6px 10px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '4px',
        fontSize: '0.72rem', fontWeight: 600,
        color: isAuto ? '#2d8a4e' : '#6b6764',
        opacity: dispatching[task.id] ? 0.6 : 1,
      }}
    >
      <Rocket size={12} /> {dispatching[task.id] ? 'Running...' : isAuto ? 'Run' : 'Send to Agent'}
    </button>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────

const WorkPlanner = () => {
  // Shared state
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientAvailability, setClientAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState({});
  const [dispatched, setDispatched] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);
  const [howOpen, setHowOpen] = useState(false);

  // Mode toggle: 'simple' or 'advanced'
  const [plannerMode, setPlannerMode] = useState('simple');

  // Simple mode state
  const [selectedTime, setSelectedTime] = useState(30);
  const [triggerFilter, setTriggerFilter] = useState('all');

  // Advanced mode state
  const [advancedMode, setAdvancedMode] = useState('quickest'); // 'quickest', 'availability', 'client'
  const [viewMode, setViewMode] = useState('list');
  const [focusProject, setFocusProject] = useState('all');
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [newSlot, setNewSlot] = useState({ date: '', start: '09:00', end: '12:00', person: 'Lance' });
  const [deepWorkHours, setDeepWorkHours] = useState({ start: '09:00', end: '12:00' });
  const [launchTimeBudget, setLaunchTimeBudget] = useState('none');
  const [launchCountLimit, setLaunchCountLimit] = useState('all');
  const [launchPriorities, setLaunchPriorities] = useState({ P0: true, P1: true, P2: true });
  const [launchBlockedFirst, setLaunchBlockedFirst] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchTasks = async () => {
    const [taskRes, projRes, clientRes, availRes] = await Promise.all([
      supabase.from('global_tasks').select('*').neq('column_id', 'completed'),
      supabase.from('projects').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('client_availability').select('*'),
    ]);
    setTasks(taskRes.data || []);
    setProjects(projRes.data || []);
    setClients(clientRes.data || []);
    setClientAvailability(availRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  // ─── Derived Data ───────────────────────────────────────────────────────────

  const projectMap = useMemo(() => {
    const m = {};
    projects.forEach(p => { m[p.id] = p; });
    return m;
  }, [projects]);

  const completedTitles = useMemo(() => {
    const s = new Set();
    tasks.filter(t => t.column_id === 'completed').forEach(t => s.add(t.title));
    return s;
  }, [tasks]);

  // ─── Agent Dispatch ─────────────────────────────────────────────────────────

  const dispatchToAgent = async (task) => {
    setDispatching(prev => ({ ...prev, [task.id]: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const proj = projectMap[task.project_id];
      const prompt = [
        `## Task: ${task.title}`,
        task.description ? `**Description:** ${task.description}` : '',
        proj ? `**Project:** ${proj.name}` : '',
        task.assigned_to ? `**Assigned to:** ${task.assigned_to}` : '',
        `\nExecute this task autonomously. Work through it step by step. Commit and push results when done.`,
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({
          taskId: task.id,
          taskTitle: `WorkPlanner: ${(task.title || '').slice(0, 80)}`,
          projectName: proj?.name || '',
          context: prompt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await supabase.from('global_tasks').update({
          last_run_at: new Date().toISOString(),
          last_run_status: 'pending',
        }).eq('id', task.id);
        await logAgentDispatched(task);
        setDispatching(prev => { const n = { ...prev }; delete n[task.id]; return n; });
        setDispatched(prev => ({ ...prev, [task.id]: true }));
        setTimeout(() => setDispatched(prev => { const n = { ...prev }; delete n[task.id]; return n; }), 2000);
        await fetchTasks();
        return;
      }
    } catch (err) {
      console.error('Dispatch failed:', err);
    }
    setDispatching(prev => { const n = { ...prev }; delete n[task.id]; return n; });
  };

  // ─── Simple Mode: Ranked Tasks ──────────────────────────────────────────────

  const rankedTasks = useMemo(() => {
    return tasks
      .filter(t => t.column_id !== 'completed' && t.column_id !== 'blocked')
      .map(t => {
        const est = estimateMinutes(t);
        const trigger = getTriggerLevel(t);
        const proj = projectMap[t.project_id];
        const isBlocked = t.is_blocked || (t.depends_on || []).some(dep => !completedTitles.has(dep));
        const fitsTime = est <= selectedTime;
        const onCriticalPath = proj?.complexity >= 3;
        // M7: Check if task's client has multi-hour preferred_slots (duration >= 120 min)
        const taskClientName = (t.client_name || t.assigned_to || '').toLowerCase();
        const hasMultiHourBlock = clientAvailability.some(ca => {
          if ((ca.client_name || '').toLowerCase() !== taskClientName || !taskClientName) return false;
          return (ca.preferred_slots || []).some(slot => {
            if (!slot.start || !slot.end) return false;
            const [sh, sm] = slot.start.split(':').map(Number);
            const [eh, em] = slot.end.split(':').map(Number);
            return ((eh * 60 + em) - (sh * 60 + sm)) >= 120;
          });
        });
        const priorityScore =
          (isBlocked ? 0 : 100) +
          (onCriticalPath ? 50 : 0) +
          (fitsTime ? 30 : 0) +
          (t.column_id === 'in_progress' ? 20 : 0) +
          (t.column_id === 'triage' ? 10 : 0) +
          (hasMultiHourBlock ? 25 : 0);
        return { ...t, _est: est, _trigger: trigger, _project: proj, _blocked: isBlocked, _fitsTime: fitsTime, _score: priorityScore, _needsHuman: (TRIGGER_LEVELS[trigger] || TRIGGER_LEVELS.manual).human, _isHot: onCriticalPath || proj?.status === 'Active', _multiHour: hasMultiHourBlock };
      })
      .filter(t => {
        if (triggerFilter !== 'all' && t._trigger !== triggerFilter) return false;
        return true;
      })
      .sort((a, b) => b._score - a._score);
  }, [tasks, selectedTime, projectMap, completedTitles, triggerFilter, clientAvailability]);

  const fittingTasks = rankedTasks.filter(t => t._fitsTime && !t._blocked);
  const stretchTasks = rankedTasks.filter(t => !t._fitsTime && !t._blocked).slice(0, 5);

  // ─── Advanced Mode: Enriched Tasks ─────────────────────────────────────────

  const enrichedTasks = useMemo(() => {
    return tasks
      .filter(t => t.column_id !== 'completed')
      .map(t => {
        const trigger = getTriggerLevel(t);
        const est = estimateMinutes(t);
        const isBlocked = t.is_blocked || (t.depends_on || []).some(d => !completedTitles.has(d));
        const proj = projectMap[t.project_id];
        const isHot = proj?.complexity >= 3 || proj?.status === 'Active';
        const meta = TRIGGER_LEVELS[trigger] || TRIGGER_LEVELS.manual;
        return { ...t, _trigger: trigger, _est: est, _blocked: isBlocked, _project: proj, _isHot: isHot, _needsHuman: meta.human };
      })
      .filter(t => {
        if (focusProject !== 'all' && t.project_id !== focusProject) return false;
        return true;
      });
  }, [tasks, completedTitles, projectMap, focusProject]);

  // ─── M6: Scheduling Optimization Strategies ────────────────────────────────

  const schedulingStrategies = useMemo(() => {
    if (!clientAvailability.length) return [];

    const TIER_RATES = { tier1: 150, tier2: 120, tier3: 100, standard: 90 };

    // Helper: check if a client has multi-hour slots
    const getMultiHourSlots = (ca) => (ca.preferred_slots || []).filter(slot => {
      if (!slot.start || !slot.end) return false;
      const [sh, sm] = slot.start.split(':').map(Number);
      const [eh, em] = slot.end.split(':').map(Number);
      return ((eh * 60 + em) - (sh * 60 + sm)) >= 120;
    });

    // Strategy 1: Revenue Maximize
    const byRevenue = [...clientAvailability]
      .map(ca => ({
        name: ca.client_name || ca.client_id,
        tier: ca.client_value_tier || 'standard',
        rate: TIER_RATES[ca.client_value_tier] || TIER_RATES.standard,
        preference: ca.general_preference || 'flexible',
        slots: (ca.preferred_slots || []).length,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    // Strategy 2: Deep Work Protect
    const deepStart = parseInt(deepWorkHours.start.split(':')[0]);
    const deepEnd = parseInt(deepWorkHours.end.split(':')[0]);
    const overlapping = clientAvailability
      .filter(ca => (ca.preferred_slots || []).some(slot => {
        const slotStart = parseInt((slot.start || '09:00').split(':')[0]);
        const slotEnd = parseInt((slot.end || '10:00').split(':')[0]);
        return slotStart < deepEnd && slotEnd > deepStart;
      }))
      .map(ca => ({
        name: ca.client_name || ca.client_id,
        tier: ca.client_value_tier || 'standard',
        preference: ca.general_preference || 'flexible',
        overlappingSlots: (ca.preferred_slots || []).filter(slot => {
          const slotStart = parseInt((slot.start || '09:00').split(':')[0]);
          const slotEnd = parseInt((slot.end || '10:00').split(':')[0]);
          return slotStart < deepEnd && slotEnd > deepStart;
        }),
      }))
      .slice(0, 5);

    // Strategy 3: Multi-Hour Block Priority
    const multiHour = clientAvailability
      .filter(ca => getMultiHourSlots(ca).length > 0)
      .map(ca => {
        const mhSlots = getMultiHourSlots(ca);
        const maxDuration = Math.max(...mhSlots.map(slot => {
          const [sh, sm] = slot.start.split(':').map(Number);
          const [eh, em] = slot.end.split(':').map(Number);
          return (eh * 60 + em) - (sh * 60 + sm);
        }));
        return {
          name: ca.client_name || ca.client_id,
          tier: ca.client_value_tier || 'standard',
          maxDuration,
          slotCount: mhSlots.length,
        };
      })
      .sort((a, b) => b.maxDuration - a.maxDuration)
      .slice(0, 5);

    return [
      {
        key: 'revenue',
        name: 'Revenue Maximize',
        icon: DollarSign,
        color: '#2d8a4e',
        description: 'Prioritize clients by billing rate. Shift lower-tier clients to fill gaps, keep premium slots for high-value clients.',
        clients: byRevenue,
        renderClient: (c) => `${c.name} — ${c.tier.replace('tier', 'Tier ')} ($${c.rate}/hr) · ${c.preference} · ${c.slots} slot${c.slots !== 1 ? 's' : ''}`,
      },
      {
        key: 'deepwork',
        name: 'Deep Work Protect',
        icon: Brain,
        color: '#9c27b0',
        description: `Protect ${deepWorkHours.start}–${deepWorkHours.end} for deep work. These clients overlap that window and could be moved.`,
        clients: overlapping,
        renderClient: (c) => `${c.name} — ${c.overlappingSlots.length} slot${c.overlappingSlots.length !== 1 ? 's' : ''} overlap deep work · ${c.preference}`,
      },
      {
        key: 'multiblock',
        name: 'Multi-Hour Block Priority',
        icon: Layers,
        color: '#e65100',
        description: 'Clients wanting 2–3 hour sessions are harder to fit. Give them first pick of long open blocks.',
        clients: multiHour,
        renderClient: (c) => `${c.name} — ${Math.round(c.maxDuration / 60 * 10) / 10}hr max block · ${c.slotCount} multi-hour slot${c.slotCount !== 1 ? 's' : ''}`,
      },
    ];
  }, [clientAvailability, deepWorkHours]);

  const applyStrategy = async (strategyKey) => {
    await logActivity('scheduling_strategy_applied', {
      entityType: 'scheduler',
      entityName: strategyKey,
      actor: 'Lance',
      details: { strategy: strategyKey, clientCount: clientAvailability.length },
    });
  };

  // Quickest plan
  const quickestPlan = useMemo(() => {
    const unblocked = enrichedTasks.filter(t => !t._blocked);
    const blocked = enrichedTasks.filter(t => t._blocked);
    const autoNow = unblocked.filter(t => !t._needsHuman).sort((a, b) => (b._isHot ? 1 : 0) - (a._isHot ? 1 : 0));
    const humanQueue = unblocked.filter(t => t._needsHuman).sort((a, b) => {
      if (a._isHot !== b._isHot) return b._isHot ? 1 : -1;
      return a._est - b._est;
    });
    const totalAutoMin = autoNow.reduce((s, t) => s + t._est, 0);
    const totalHumanMin = humanQueue.reduce((s, t) => s + t._est, 0);
    const wouldUnblock = blocked.filter(t => {
      const deps = t.depends_on || [];
      return deps.filter(d => !completedTitles.has(d)).every(d => humanQueue.some(h => h.title === d) || autoNow.some(a => a.title === d));
    });
    return { autoNow, humanQueue, totalAutoMin, totalHumanMin, blockedCount: blocked.length, wouldUnblock };
  }, [enrichedTasks, completedTitles]);

  // Filtered auto queue for launch controls
  const filteredAutoNow = useMemo(() => {
    let pool = [...quickestPlan.autoNow];
    const blockedAuto = launchBlockedFirst
      ? enrichedTasks.filter(t => t._blocked && !t._needsHuman)
      : [];
    if (launchBlockedFirst) {
      pool = [...blockedAuto, ...pool];
    }
    pool = pool.filter(t => {
      const pStr = (t.priority || '').toUpperCase();
      if (pStr.startsWith('P0')) return launchPriorities.P0;
      if (pStr.startsWith('P1')) return launchPriorities.P1;
      if (pStr.startsWith('P2')) return launchPriorities.P2;
      return launchPriorities.P0 || launchPriorities.P1 || launchPriorities.P2;
    });
    const countMax = launchCountLimit === 'all' ? pool.length : parseInt(launchCountLimit);
    const timeBudgetMin = launchTimeBudget === 'none' ? Infinity : parseInt(launchTimeBudget);
    const result = [];
    let cumMin = 0;
    for (const t of pool) {
      if (result.length >= countMax) break;
      if (cumMin + t._est > timeBudgetMin && result.length > 0) break;
      result.push(t);
      cumMin += t._est;
    }
    return result;
  }, [quickestPlan.autoNow, enrichedTasks, launchTimeBudget, launchCountLimit, launchPriorities, launchBlockedFirst]);

  // Availability plan
  const availabilityPlan = useMemo(() => {
    if (availabilitySlots.length === 0) return null;
    const slots = [...availabilitySlots].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    const humanQueue = enrichedTasks.filter(t => !t._blocked && t._needsHuman).sort((a, b) => {
      if (a._isHot !== b._isHot) return b._isHot ? 1 : -1;
      return a._est - b._est;
    });
    const autoQueue = enrichedTasks.filter(t => !t._blocked && !t._needsHuman);
    const assignedIds = new Set();
    const schedule = slots.map(slot => {
      const slotMin = (parseInt(slot.end.split(':')[0]) * 60 + parseInt(slot.end.split(':')[1])) - (parseInt(slot.start.split(':')[0]) * 60 + parseInt(slot.start.split(':')[1]));
      let remaining = slotMin;
      const assigned = [];
      const isDeepWork = slot.start < deepWorkHours.end && slot.end > deepWorkHours.start && slot.person === 'Lance';
      for (const task of humanQueue) {
        if (assignedIds.has(task.id)) continue;
        if (isDeepWork && !task._isHot) continue;
        if (task._est <= remaining) {
          assigned.push(task);
          assignedIds.add(task.id);
          remaining -= task._est;
        }
      }
      return { ...slot, _assigned: assigned, _remaining: remaining, _total: slotMin, _isDeepWork: isDeepWork };
    });
    const unscheduledHuman = humanQueue.filter(t => !assignedIds.has(t.id));
    return { schedule, autoQueue, unscheduledHuman };
  }, [availabilitySlots, enrichedTasks, deepWorkHours]);

  // Heat map data
  const heatMapData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const projGroups = {};
    enrichedTasks.filter(t => !t._blocked).forEach(t => {
      const pName = t._project?.name || 'Unassigned';
      if (!projGroups[pName]) projGroups[pName] = { total: 0, tasks: [] };
      projGroups[pName].total += t._est;
      projGroups[pName].tasks.push(t);
    });
    const sorted = Object.entries(projGroups).sort(([, a], [, b]) => b.total - a.total).slice(0, 10);
    return { days, projects: sorted };
  }, [enrichedTasks]);

  // ─── Availability Slot Management ───────────────────────────────────────────

  const addSlot = () => {
    if (!newSlot.date) return;
    setAvailabilitySlots(prev => [...prev, { ...newSlot, id: Date.now() }]);
    setNewSlot(s => ({ ...s, date: '' }));
  };
  const removeSlot = (id) => setAvailabilitySlots(prev => prev.filter(s => s.id !== id));

  // ─── iCal / GCal ───────────────────────────────────────────────────────────

  const exportICal = (taskList, title = 'Labno_Schedule') => {
    const events = taskList.map(t => {
      const start = new Date();
      const end = new Date(start.getTime() + t._est * 60000);
      const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      return `BEGIN:VEVENT\nDTSTART:${fmt(start)}\nDTEND:${fmt(end)}\nSUMMARY:${t.title}\nDESCRIPTION:${t._project?.name || 'Task'} — ${(TRIGGER_LEVELS[t._trigger] || {}).label || 'Manual'}\nEND:VEVENT`;
    });
    const cal = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Labno Labs//Work Planner//EN\n${events.join('\n')}\nEND:VCALENDAR`;
    const blob = new Blob([cal], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title}.ics`;
    a.click();
  };

  const gcalUrl = (task) => {
    const start = new Date();
    const end = new Date(start.getTime() + task._est * 60000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent((task._project?.name || '') + ' — ' + ((TRIGGER_LEVELS[task._trigger] || {}).label || ''))}`;
  };

  // ─── Confirmed Action Handlers ──────────────────────────────────────────────

  const handleLaunchAuto = () => {
    const toLaunch = filteredAutoNow;
    const totalMin = toLaunch.reduce((s, t) => s + t._est, 0);
    setConfirmAction({
      message: `Launch ${toLaunch.length} autonomous task${toLaunch.length !== 1 ? 's' : ''}?`,
      detail: `These will run in the background. Total estimated time: ~${totalMin} minutes.`,
      onConfirm: async () => {
        for (const t of toLaunch) {
          await dispatchToAgent(t);
        }
        await logSchedulerRun('quickest_auto', toLaunch.length);
        setConfirmAction(null);
      }
    });
  };

  const handleScheduleHuman = () => {
    setConfirmAction({
      message: `Export ${quickestPlan.humanQueue.length} human tasks to calendar?`,
      detail: `This will download an iCal file with all guided/manual tasks.`,
      onConfirm: () => {
        exportICal(quickestPlan.humanQueue, 'Human_Tasks');
        logSchedulerRun('quickest_human_export', quickestPlan.humanQueue.length);
        setConfirmAction(null);
      }
    });
  };

  const handleRunAvailability = () => {
    if (!availabilityPlan) return;
    const totalAssigned = availabilityPlan.schedule.reduce((s, slot) => s + (slot._assigned || []).length, 0);
    setConfirmAction({
      message: `Schedule ${totalAssigned} tasks across ${availabilityPlan.schedule.length} time slots?`,
      detail: `${availabilityPlan.autoQueue.length} autonomous tasks will also run. ${availabilityPlan.unscheduledHuman.length} tasks don't fit available slots.`,
      onConfirm: async () => {
        for (const slot of availabilityPlan.schedule) {
          for (const t of slot._assigned || []) {
            await logTaskScheduled(t, slot.date);
          }
        }
        await logSchedulerRun('availability', totalAssigned);
        setConfirmAction(null);
      }
    });
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <div className="main-content" style={{ padding: '1.5rem', color: '#8a8682' }}>Loading work planner...</div>;

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs />
      {confirmAction && <ConfirmDialog message={confirmAction.message} detail={confirmAction.detail} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />}

      {/* Page Header */}
      <div>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Target size={24} /> Work Planner <InfoTooltip text={PAGE_INFO.scheduler} />
        </h1>
        <p style={{ color: '#6b6764', fontSize: '0.88rem', marginTop: '4px' }}>
          Pick what to work on next. Simple mode for quick picks, Advanced mode for full scheduling power.
        </p>
      </div>

      {/* How This Works (collapsible) */}
      <HowThisWorks isOpen={howOpen} onToggle={() => setHowOpen(!howOpen)} />

      {/* Mode Tabs: Simple | Advanced */}
      <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', width: 'fit-content' }}>
        <button
          onClick={() => setPlannerMode('simple')}
          style={{
            padding: '10px 24px', fontSize: '0.88rem', fontWeight: 600, border: 'none', cursor: 'pointer',
            background: plannerMode === 'simple' ? '#b06050' : 'rgba(255,255,255,0.5)',
            color: plannerMode === 'simple' ? '#fff' : '#6b6764',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <Clock size={14} /> Simple
        </button>
        <button
          onClick={() => setPlannerMode('advanced')}
          style={{
            padding: '10px 24px', fontSize: '0.88rem', fontWeight: 600, border: 'none', cursor: 'pointer',
            background: plannerMode === 'advanced' ? '#b06050' : 'rgba(255,255,255,0.5)',
            color: plannerMode === 'advanced' ? '#fff' : '#6b6764',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <SlidersHorizontal size={14} /> Advanced
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
           SIMPLE MODE
         ════════════════════════════════════════════════════════════════════════ */}
      {plannerMode === 'simple' && (
        <>
          {/* Time Selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt.min}
                onClick={() => setSelectedTime(opt.min)}
                className={`filter-pill${selectedTime === opt.min ? ' active' : ''}`}
                style={{ fontSize: '0.85rem', padding: '8px 16px', fontWeight: selectedTime === opt.min ? 600 : 400 }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Trigger Level Filter */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#8a8682', fontWeight: 500 }}>Show:</span>
            <button className={`filter-pill${triggerFilter === 'all' ? ' active' : ''}`} onClick={() => setTriggerFilter('all')}>All</button>
            {Object.entries(TRIGGER_LEVELS).map(([key, level]) => {
              const Icon = level.icon;
              return (
                <button key={key} className={`filter-pill${triggerFilter === key ? ' active' : ''}`} onClick={() => setTriggerFilter(key)} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Icon size={12} /> {level.label}
                </button>
              );
            })}
          </div>

          {/* Results Summary */}
          <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#b06050' }}>{fittingTasks.length}</span>
              <span style={{ fontSize: '0.85rem', color: '#6b6764', marginLeft: '8px' }}>tasks fit in {TIME_OPTIONS.find(t => t.min === selectedTime)?.label}</span>
            </div>
            <div style={{ width: '1px', height: '32px', background: 'rgba(0,0,0,0.08)' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              {Object.entries(TRIGGER_LEVELS).map(([key, level]) => {
                const count = fittingTasks.filter(t => t._trigger === key).length;
                if (count === 0) return null;
                const Icon = level.icon;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}>
                    <Icon size={13} color={level.color} />
                    <span style={{ color: level.color, fontWeight: 600 }}>{count}</span>
                    <span style={{ color: '#8a8682' }}>{level.label.toLowerCase()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task List */}
          <div className="glass-panel" data-highlight="triage-section" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem' }}>
              Ready to Work ({fittingTasks.length})
            </h3>
            {fittingTasks.length === 0 ? (
              <p style={{ color: '#8a8682', fontSize: '0.88rem' }}>No unblocked tasks fit this time window. Try a longer duration or check blocked tasks.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fittingTasks.map(task => {
                  const trigger = TRIGGER_LEVELS[task._trigger] || TRIGGER_LEVELS.manual;
                  const TIcon = trigger.icon;
                  return (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)', borderLeft: `3px solid ${trigger.color}`, transition: 'all 0.15s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: trigger.bg, flexShrink: 0 }}>
                        <TIcon size={14} color={trigger.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2e2c2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                        <div style={{ fontSize: '0.72rem', color: '#8a8682', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          {task._project && <span>{task._project.name}</span>}
                          {task.assigned_to && <span>· {task.assigned_to}</span>}
                        </div>
                        <RunMetadata task={task} />
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: trigger.color, padding: '3px 8px', borderRadius: '6px', background: trigger.bg, whiteSpace: 'nowrap' }}>
                        {trigger.label}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#6b6764', padding: '3px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.04)', whiteSpace: 'nowrap' }}>
                        ~{task._est}m
                      </span>
                      <DispatchButton task={task} dispatching={dispatching} dispatched={dispatched} onDispatch={dispatchToAgent} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stretch Tasks */}
          {stretchTasks.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.25rem', opacity: 0.8 }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#6b6764', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} /> Stretch Goals (need more time)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {stretchTasks.map(task => {
                  const trigger = TRIGGER_LEVELS[task._trigger] || TRIGGER_LEVELS.manual;
                  const TIcon = trigger.icon;
                  return (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(0,0,0,0.03)' }}>
                      <TIcon size={12} color={trigger.color} />
                      <span style={{ flex: 1, fontSize: '0.82rem', color: '#3e3c3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                      <span style={{ fontSize: '0.68rem', color: '#8a8682' }}>~{formatHumanTime(task._est)}</span>
                      <DispatchButton task={task} dispatching={dispatching} dispatched={dispatched} onDispatch={dispatchToAgent} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
           ADVANCED MODE
         ════════════════════════════════════════════════════════════════════════ */}
      {plannerMode === 'advanced' && (
        <>
          {/* Priority Legend */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.72rem' }}>
            <span style={{ color: '#d14040' }}><strong>P0 Ship Blockers</strong> — must ship before anything else (auth, security, CI/CD)</span>
            <span style={{ color: '#c49a40' }}><strong>P1 Core System</strong> — key features: clinical, CRM, agents, content</span>
            <span style={{ color: '#6b6764' }}><strong>P2 Growth</strong> — analytics, localization, dashboards, advanced features</span>
          </div>

          {/* Advanced Sub-Mode Toggle + View Toggle + Project Focus */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
              {[
                { key: 'quickest', label: 'Quickest', icon: Zap },
                { key: 'availability', label: 'My Availability', icon: Calendar },
                { key: 'client', label: 'Client Scheduling', icon: Users },
              ].map(m => {
                const Icon = m.icon;
                return (
                  <button key={m.key} onClick={() => setAdvancedMode(m.key)} style={{ padding: '10px 16px', fontSize: '0.82rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: advancedMode === m.key ? '#b06050' : 'rgba(255,255,255,0.5)', color: advancedMode === m.key ? '#fff' : '#6b6764', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Icon size={13} /> {m.label}
                  </button>
                );
              })}
            </div>

            <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.08)' }} />

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {VIEW_MODES.map(v => {
                const VIcon = v.icon;
                return (
                  <button key={v.key} onClick={() => setViewMode(v.key)} className={`filter-pill${viewMode === v.key ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}>
                    <VIcon size={12} /> {v.label}
                  </button>
                );
              })}
            </div>

            <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.08)' }} />

            <select value={focusProject} onChange={e => setFocusProject(e.target.value)} className="kanban-select" style={{ marginTop: 0, padding: '8px 28px 8px 10px', fontSize: '0.82rem', minWidth: '180px' }}>
              <option value="all">All Projects</option>
              {projects.filter(p => p.status === 'Active').map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Deep Work Hours Config */}
          {(advancedMode === 'availability' || advancedMode === 'client') && (
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Shield size={16} color="#9c27b0" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#9c27b0' }}>Deep Work Protection</span>
              <span style={{ fontSize: '0.78rem', color: '#6b6764' }}>Don't schedule non-critical tasks during:</span>
              <input type="time" value={deepWorkHours.start} onChange={e => setDeepWorkHours(h => ({ ...h, start: e.target.value }))} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.82rem' }} />
              <span style={{ color: '#8a8682' }}>to</span>
              <input type="time" value={deepWorkHours.end} onChange={e => setDeepWorkHours(h => ({ ...h, end: e.target.value }))} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.82rem' }} />
              <span style={{ fontSize: '0.68rem', color: '#8a8682' }}>(Only hot project tasks during this window)</span>
            </div>
          )}

          {/* ===== QUICKEST MODE ===== */}
          {advancedMode === 'quickest' && (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                  <Bot size={20} color="#2d8a4e" style={{ marginBottom: '4px' }} />
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2d8a4e' }}>{quickestPlan.autoNow.length}</div>
                  <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>Autonomous</div>
                  <div style={{ fontSize: '0.65rem', color: '#2d8a4e' }}>~{formatHumanTime(quickestPlan.totalAutoMin)}</div>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                  <Hand size={20} color="#c49a40" style={{ marginBottom: '4px' }} />
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#c49a40' }}>{quickestPlan.humanQueue.length}</div>
                  <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>Human tasks</div>
                  <div style={{ fontSize: '0.65rem', color: '#c49a40' }}>~{formatHumanTime(quickestPlan.totalHumanMin)}</div>
                </div>
                <div className="glass-panel" data-highlight="blocked-section" style={{ padding: '1rem', textAlign: 'center' }}>
                  <AlertTriangle size={20} color="#d14040" style={{ marginBottom: '4px' }} />
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#d14040' }}>{quickestPlan.blockedCount}</div>
                  <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>Blocked</div>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                  <CheckCircle size={20} color="#5a8abf" style={{ marginBottom: '4px' }} />
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#5a8abf' }}>{quickestPlan.wouldUnblock.length}</div>
                  <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>Would unblock</div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(45,138,78,0.04) 0%, rgba(176,96,80,0.04) 100%)', borderLeft: '3px solid #2d8a4e' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2d8a4e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Recommended Approach</div>
                <div style={{ fontSize: '0.88rem', color: '#2e2c2a', lineHeight: 1.6 }}>
                  <strong>Step 1:</strong> Launch all {quickestPlan.autoNow.length} autonomous tasks (~{formatHumanTime(quickestPlan.totalAutoMin)} agent time).
                  <br /><strong>Step 2:</strong> {quickestPlan.humanQueue.length > 0 ? <>Start with the {Math.min(3, quickestPlan.humanQueue.length)} shortest tasks ({quickestPlan.humanQueue.slice(0, 3).map(t => `~${t._est}m`).join(', ')}).</> : 'No human tasks pending.'}
                  {quickestPlan.wouldUnblock.length > 0 && <><br /><strong>Result:</strong> Unblocks {quickestPlan.wouldUnblock.length} additional tasks.</>}
                </div>
              </div>

              {/* VIEW: LIST */}
              {viewMode === 'list' && (
                <>
                  {quickestPlan.autoNow.length > 0 && (
                    <div className="glass-panel" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2d8a4e', display: 'flex', alignItems: 'center', gap: '8px' }}><Bot size={16} /> Autonomous Queue</h3>
                        <button onClick={() => exportICal(quickestPlan.autoNow, 'Auto_Tasks')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.72rem' }}><Download size={11} /> iCal</button>
                      </div>
                      {/* Launch Control Panel */}
                      <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(45,138,78,0.04)', border: '1px solid rgba(45,138,78,0.12)', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, color: '#2d8a4e' }}>
                          <SlidersHorizontal size={13} /> Launch Controls
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {/* Time Budget */}
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: '#3e3c3a' }}>
                            <Clock size={12} color="#8a8682" /> Time:
                            <select value={launchTimeBudget} onChange={e => setLaunchTimeBudget(e.target.value)} style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', cursor: 'pointer' }}>
                              <option value="15">15 min</option>
                              <option value="30">30 min</option>
                              <option value="60">1 hour</option>
                              <option value="120">2 hours</option>
                              <option value="240">4 hours</option>
                              <option value="480">8 hours (full day)</option>
                              <option value="600">10 hours</option>
                              <option value="720">12 hours</option>
                              <option value="960">16 hours</option>
                              <option value="none">No limit</option>
                            </select>
                          </label>
                          {/* Count Limit */}
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: '#3e3c3a' }}>
                            <Target size={12} color="#8a8682" /> Count:
                            <select value={launchCountLimit} onChange={e => setLaunchCountLimit(e.target.value)} style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', cursor: 'pointer' }}>
                              <option value="1">1 task</option>
                              <option value="3">3 tasks</option>
                              <option value="5">5 tasks</option>
                              <option value="10">10 tasks</option>
                              <option value="all">All</option>
                            </select>
                          </label>
                          {/* Priority Filter Pills */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: '#3e3c3a' }}>
                            Priority:
                            {[
                              { key: 'P0', label: 'P0 — Ship Blockers', tip: 'Must complete before anything else ships. Infrastructure, auth, security.' },
                              { key: 'P1', label: 'P1 — Core System', tip: 'Core features and integrations. Clinical tools, CRM, content pipeline.' },
                              { key: 'P2', label: 'P2 — Growth Layer', tip: 'Nice-to-have improvements. Analytics, localization, advanced features.' },
                            ].map(p => (
                              <button key={p.key} onClick={() => setLaunchPriorities(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                                title={p.tip}
                                style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
                                  border: launchPriorities[p.key] ? '1px solid #2d8a4e' : '1px solid rgba(0,0,0,0.1)',
                                  background: launchPriorities[p.key] ? 'rgba(45,138,78,0.12)' : 'rgba(0,0,0,0.03)',
                                  color: launchPriorities[p.key] ? '#2d8a4e' : '#8a8682' }}>
                                {p.key}
                              </button>
                            ))}
                          </div>
                          {/* Blocked-First Toggle */}
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#3e3c3a', cursor: 'pointer' }}>
                            <div onClick={() => setLaunchBlockedFirst(!launchBlockedFirst)}
                              style={{ width: '32px', height: '18px', borderRadius: '9px', position: 'relative', cursor: 'pointer',
                                background: launchBlockedFirst ? '#2d8a4e' : 'rgba(0,0,0,0.12)', transition: 'background 0.2s' }}>
                              <div style={{ position: 'absolute', top: '2px', left: launchBlockedFirst ? '16px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                            </div>
                            Blocked-first
                          </label>
                        </div>
                        {/* Launch Button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button onClick={handleLaunchAuto} disabled={filteredAutoNow.length === 0} className="btn-primary"
                            style={{ padding: '6px 20px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: filteredAutoNow.length === 0 ? 0.5 : 1 }}>
                            <Zap size={13} /> Launch ({filteredAutoNow.length} task{filteredAutoNow.length !== 1 ? 's' : ''})
                          </button>
                          <span style={{ fontSize: '0.7rem', color: '#8a8682' }}>
                            ~{formatHumanTime(filteredAutoNow.reduce((s, t) => s + t._est, 0))} estimated
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {quickestPlan.autoNow.map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(45,138,78,0.04)', border: '1px solid rgba(45,138,78,0.1)' }}>
                            <Bot size={13} color="#2d8a4e" />
                            <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: '#2e2c2a' }}>{t.title}</span>
                            {t.source_name && <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.04)', color: '#8a8682' }}>via {t.source_name}</span>}
                            <span style={{ fontSize: '0.7rem', color: '#8a8682' }}>{t._project?.name}</span>
                            <span style={{ fontSize: '0.68rem', color: '#2d8a4e', fontWeight: 600 }}>~{formatHumanTime(t._est)}</span>
                            <a href={gcalUrl(t)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: '#5a8abf', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}><Calendar size={10} /> GCal</a>
                            <DispatchButton task={t} dispatching={dispatching} dispatched={dispatched} onDispatch={dispatchToAgent} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {quickestPlan.humanQueue.length > 0 && (
                    <div className="glass-panel" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#c49a40', display: 'flex', alignItems: 'center', gap: '8px' }}><Hand size={16} /> Human Queue</h3>
                        <button onClick={handleScheduleHuman} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.72rem' }}><Download size={11} /> Export iCal</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {quickestPlan.humanQueue.map((t, i) => {
                          const tri = TRIGGER_LEVELS[t._trigger] || TRIGGER_LEVELS.manual;
                          const TIcon = tri.icon;
                          return (
                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', background: t._isHot ? 'rgba(209,64,64,0.04)' : 'rgba(255,255,255,0.5)', border: `1px solid ${t._isHot ? 'rgba(209,64,64,0.1)' : 'rgba(0,0,0,0.04)'}`, borderLeft: t._isHot ? '3px solid #d14040' : '3px solid transparent' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8a8682', width: '20px' }}>#{i + 1}</span>
                              <TIcon size={13} color={tri.color} />
                              <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: '#2e2c2a' }}>{t.title}</span>
                              {t._isHot && <Flame size={12} color="#d14040" />}
                              <span style={{ fontSize: '0.7rem', color: '#8a8682' }}>{t._project?.name}</span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: tri.color + '15', color: tri.color }}>{tri.label}</span>
                              <span style={{ fontSize: '0.68rem', color: '#6b6764' }}>~{formatHumanTime(t._est)}</span>
                              <a href={gcalUrl(t)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: '#5a8abf', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}><Calendar size={10} /> GCal</a>
                              <DispatchButton task={t} dispatching={dispatching} dispatched={dispatched} onDispatch={dispatchToAgent} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* VIEW: KANBAN */}
              {viewMode === 'kanban' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  {Object.entries(TRIGGER_LEVELS).map(([key, level]) => {
                    const Icon = level.icon;
                    const items = enrichedTasks.filter(t => !t._blocked && t._trigger === key);
                    return (
                      <div key={key} className="glass-panel" style={{ padding: '1rem', borderTop: `3px solid ${level.color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                          <Icon size={14} color={level.color} />
                          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: level.color }}>{level.label}</span>
                          <span style={{ fontSize: '0.72rem', color: '#8a8682', marginLeft: 'auto' }}>{items.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {items.map(t => (
                            <div key={t.id} style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.04)', fontSize: '0.82rem' }}>
                              <div style={{ fontWeight: 500, color: '#2e2c2a', marginBottom: '2px' }}>{t.title}</div>
                              <div style={{ fontSize: '0.68rem', color: '#8a8682', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{t._project?.name}</span>
                                <span>~{formatHumanTime(t._est)}</span>
                              </div>
                              <div style={{ marginTop: '4px' }}>
                                <DispatchButton task={t} dispatching={dispatching} dispatched={dispatched} onDispatch={dispatchToAgent} />
                              </div>
                            </div>
                          ))}
                          {items.length === 0 && <div style={{ fontSize: '0.78rem', color: '#b0ada9', textAlign: 'center', fontStyle: 'italic', padding: '12px' }}>No tasks</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VIEW: HEAT MAP */}
              {viewMode === 'heatmap' && (
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '12px' }}>Task Load Heat Map — Estimated Minutes by Project</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `160px repeat(${heatMapData.days.length}, 1fr)`, gap: '4px', minWidth: '500px' }}>
                      {/* Header row */}
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8a8682', padding: '6px' }}>Project</div>
                      {heatMapData.days.map(d => (
                        <div key={d} style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8a8682', padding: '6px', textAlign: 'center' }}>{d}</div>
                      ))}
                      {/* Data rows */}
                      {heatMapData.projects.map(([name, data]) => {
                        const maxMin = Math.max(...heatMapData.projects.map(([, d]) => d.total));
                        const perDay = Math.ceil(data.total / 5);
                        return (
                          <React.Fragment key={name}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 500, color: '#2e2c2a', padding: '8px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                            {heatMapData.days.map((d, di) => {
                              const dayTotal = di < data.tasks.length ? Math.min(perDay, data.total - perDay * di) : 0;
                              const bg = dayTotal > 90 ? 'rgba(209,64,64,0.25)' : dayTotal > 45 ? 'rgba(196,154,64,0.2)' : dayTotal > 0 ? 'rgba(45,138,78,0.15)' : 'rgba(0,0,0,0.02)';
                              return (
                                <div key={d} style={{ padding: '8px', borderRadius: '6px', background: bg, textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: dayTotal > 90 ? '#d14040' : dayTotal > 45 ? '#c49a40' : dayTotal > 0 ? '#2d8a4e' : '#ccc' }}>
                                  {dayTotal > 0 ? `${dayTotal}m` : '\u2014'}
                                </div>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.7rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(45,138,78,0.15)' }} /> Light (&lt;45m)</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(196,154,64,0.2)' }} /> Medium (45-90m)</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(209,64,64,0.25)' }} /> Heavy (&gt;90m)</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== AVAILABILITY / CLIENT MODE ===== */}
          {(advancedMode === 'availability' || advancedMode === 'client') && (
            <>
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} /> {advancedMode === 'client' ? 'Client & Team Availability' : 'Your Available Time Slots'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#6b6764', marginBottom: '12px' }}>
                  {advancedMode === 'client'
                    ? 'Add slots for when you, employees, or clients are available. System will optimize across all participants.'
                    : 'Add times when you\'ll be at the computer. Tasks auto-fill by priority.'}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
                  <input type="date" value={newSlot.date} onChange={e => setNewSlot(s => ({ ...s, date: e.target.value }))} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.5)' }} />
                  <input type="time" value={newSlot.start} onChange={e => setNewSlot(s => ({ ...s, start: e.target.value }))} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.5)' }} />
                  <span style={{ color: '#8a8682' }}>to</span>
                  <input type="time" value={newSlot.end} onChange={e => setNewSlot(s => ({ ...s, end: e.target.value }))} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.5)' }} />
                  <select value={newSlot.person} onChange={e => setNewSlot(s => ({ ...s, person: e.target.value }))} className="kanban-select" style={{ marginTop: 0, padding: '8px 28px 8px 10px', fontSize: '0.85rem' }}>
                    <optgroup label="Team">
                      {['Lance', 'Avery', 'Romy', 'Sarah'].map(n => <option key={n} value={n}>{n}</option>)}
                    </optgroup>
                    {advancedMode === 'client' && clients.length > 0 && (
                      <optgroup label="Clients">
                        {clients.map(c => <option key={c.id} value={`Client: ${c.name}`}>Client: {c.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                  <button onClick={addSlot} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Add Slot</button>
                </div>

                {availabilitySlots.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {availabilitySlots.map(slot => {
                      const isClient = slot.person.startsWith('Client:');
                      return (
                        <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', background: isClient ? 'rgba(229,101,0,0.08)' : 'rgba(90,138,191,0.08)', border: `1px solid ${isClient ? 'rgba(229,101,0,0.15)' : 'rgba(90,138,191,0.15)'}`, fontSize: '0.82rem' }}>
                          {isClient ? <Users size={12} color="#e65100" /> : <Calendar size={12} color="#5a8abf" />}
                          <span style={{ fontWeight: 500 }}>{new Date(slot.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          <span style={{ color: '#6b6764' }}>{slot.start}\u2013{slot.end}</span>
                          <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>{slot.person}</span>
                          <button onClick={() => removeSlot(slot.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d14040', fontSize: '0.72rem', fontWeight: 600 }}>\u00d7</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Client mode: temp holds explanation */}
              {advancedMode === 'client' && (
                <div className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid #e65100', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Clock size={16} color="#e65100" />
                  <div style={{ fontSize: '0.82rem', color: '#3e3c3a' }}>
                    <strong>Temporary Holds:</strong> When scheduling with clients, slots are held for 4 hours by default. If the client doesn't confirm, the hold expires and the time reopens. Deep work hours ({deepWorkHours.start}\u2013{deepWorkHours.end}) are protected \u2014 only hot project tasks will be suggested during that window.
                  </div>
                </div>
              )}

              {/* M6: Scheduling Optimization Strategies */}
              {advancedMode === 'client' && schedulingStrategies.length > 0 && (
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={16} /> Scheduling Recommendations
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#6b6764', marginBottom: '16px' }}>
                    Three strategies to optimize your client schedule based on availability data.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {schedulingStrategies.map(strategy => (
                      <div key={strategy.key} style={{ padding: '12px 16px', borderRadius: '10px', background: `${strategy.color}06`, border: `1px solid ${strategy.color}18` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strategy.icon size={16} color={strategy.color} />
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2e2c2a' }}>{strategy.name}</span>
                          </div>
                          <button
                            onClick={() => applyStrategy(strategy.key)}
                            style={{
                              padding: '5px 14px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                              border: `1px solid ${strategy.color}30`, cursor: 'pointer',
                              background: `${strategy.color}0a`, color: strategy.color,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${strategy.color}18`; }}
                            onMouseLeave={e => { e.currentTarget.style.background = `${strategy.color}0a`; }}
                          >
                            Apply
                          </button>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#6b6764', marginBottom: '8px' }}>{strategy.description}</p>
                        {strategy.clients.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {strategy.clients.map((c, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '5px', background: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', color: '#3e3c3a' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: strategy.color, flexShrink: 0 }} />
                                {strategy.renderClient(c)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.75rem', color: '#8a8682', fontStyle: 'italic' }}>No matching clients for this strategy.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Run button with confirmation */}
              {availabilitySlots.length > 0 && (
                <button onClick={handleRunAvailability} className="btn-primary" style={{ padding: '12px 24px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: 'fit-content' }}>
                  <Target size={16} /> Optimize & Schedule
                </button>
              )}

              {/* Autonomous tasks */}
              {availabilityPlan && availabilityPlan.autoQueue.length > 0 && (
                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid #2d8a4e' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#2d8a4e', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bot size={14} /> Runs Autonomously \u2014 {availabilityPlan.autoQueue.length} tasks
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {availabilityPlan.autoQueue.slice(0, 10).map(t => (
                      <span key={t.id} style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(45,138,78,0.08)', color: '#2d8a4e', fontWeight: 500 }}>{t.title} (~{formatHumanTime(t._est)})</span>
                    ))}
                    {availabilityPlan.autoQueue.length > 10 && <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>+{availabilityPlan.autoQueue.length - 10} more</span>}
                  </div>
                </div>
              )}

              {/* Scheduled slots */}
              {availabilityPlan && availabilityPlan.schedule.map(slot => (
                <div key={slot.id} className="glass-panel" style={{ padding: '1.25rem', borderLeft: slot._isDeepWork ? '3px solid #9c27b0' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2e2c2a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {new Date(slot.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} \u00b7 {slot.start}\u2013{slot.end}
                        {slot._isDeepWork && <span style={{ fontSize: '0.62rem', color: '#9c27b0', background: 'rgba(156,39,176,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Deep Work</span>}
                        {slot.person.startsWith('Client:') && <span style={{ fontSize: '0.62rem', color: '#e65100', background: 'rgba(229,101,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{slot.person}</span>}
                      </h3>
                      <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>{slot.person} \u00b7 {slot._total - slot._remaining}m / {slot._total}m</span>
                    </div>
                    <div style={{ width: '100px', height: '6px', borderRadius: '4px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                      <div style={{ width: `${((slot._total - slot._remaining) / slot._total) * 100}%`, height: '100%', background: slot._remaining < 15 ? '#d14040' : '#5a8abf', borderRadius: '4px' }} />
                    </div>
                  </div>
                  {(slot._assigned || []).length === 0 ? (
                    <p style={{ color: '#8a8682', fontSize: '0.82rem' }}>No tasks fit this slot.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {slot._assigned.map(t => {
                        const tri = TRIGGER_LEVELS[t._trigger] || TRIGGER_LEVELS.manual;
                        return (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(0,0,0,0.04)' }}>
                            <tri.icon size={12} color={tri.color} />
                            <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, color: '#2e2c2a' }}>{t.title}</span>
                            <span style={{ fontSize: '0.68rem', color: '#6b6764' }}>~{formatHumanTime(t._est)}</span>
                            <DispatchButton task={t} dispatching={dispatching} dispatched={dispatched} onDispatch={dispatchToAgent} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Unscheduled warning */}
              {availabilityPlan && availabilityPlan.unscheduledHuman.length > 0 && (
                <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid #c49a40' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#c49a40', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} /> {availabilityPlan.unscheduledHuman.length} tasks need more slots
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {availabilityPlan.unscheduledHuman.map(t => (
                      <div key={t.id} style={{ fontSize: '0.82rem', color: '#3e3c3a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#c49a40' }} />{t.title} (~{formatHumanTime(t._est)})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default WorkPlanner;
