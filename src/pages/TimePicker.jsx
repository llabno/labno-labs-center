import { useState, useEffect, useMemo } from 'react';
import { Clock, Zap, Hand, Bot, Play, CheckCircle, AlertTriangle, ArrowRight, Rocket } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { supabase } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';

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
  autonomous: { label: 'Autonomous', icon: Bot, color: '#2d8a4e', bg: 'rgba(45,138,78,0.08)', desc: 'Agent runs end-to-end, no human needed' },
  'one-click': { label: 'One-Click', icon: Zap, color: '#1565c0', bg: 'rgba(21,101,192,0.08)', desc: 'Click to start, agent handles the rest' },
  guided: { label: 'Guided', icon: Play, color: '#c49a40', bg: 'rgba(196,154,64,0.08)', desc: 'Agent generates, you review before deploy' },
  manual: { label: 'Manual', icon: Hand, color: '#8a8682', bg: 'rgba(0,0,0,0.04)', desc: 'Requires human judgment or external action' },
};

// Estimate task duration from description or default
const estimateMinutes = (task) => {
  if (task.estimated_minutes) return task.estimated_minutes;
  const title = (task.title || '').toLowerCase();
  if (title.includes('audit') || title.includes('review') || title.includes('analyze')) return 30;
  if (title.includes('fix') || title.includes('update') || title.includes('add')) return 15;
  if (title.includes('build') || title.includes('create') || title.includes('implement')) return 60;
  if (title.includes('deploy') || title.includes('migrate')) return 45;
  if (title.includes('test')) return 20;
  if (title.includes('document') || title.includes('write')) return 30;
  return 15; // default
};

const getTriggerLevel = (task) => {
  if (task.trigger_level) return task.trigger_level;
  const assignee = (task.assigned_to || '').toLowerCase();
  if (assignee === 'agent') return 'autonomous';
  if (assignee === 'claude') return 'autonomous';
  return 'manual';
};

// ─── Run Tracking Helpers ────────────────────────────────────────────────────
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

const TimePicker = () => {
  const [selectedTime, setSelectedTime] = useState(30);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [dispatching, setDispatching] = useState({});
  const [dispatched, setDispatched] = useState({});

  const fetchTasks = async () => {
    const [taskRes, projRes] = await Promise.all([
      supabase.from('global_tasks').select('*').neq('column_id', 'completed'),
      supabase.from('projects').select('id, name, status, complexity'),
    ]);
    setTasks(taskRes.data || []);
    setProjects(projRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  const dispatchToAgent = async (task) => {
    setDispatching(prev => ({ ...prev, [task.id]: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const proj = projects.find(p => p.id === task.project_id);
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
          taskTitle: `QuickPick: ${(task.title || '').slice(0, 80)}`,
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

  const projectMap = useMemo(() => {
    const map = {};
    projects.forEach(p => { map[p.id] = p; });
    return map;
  }, [projects]);

  // All non-completed task IDs for blocking check
  const completedTitles = useMemo(() => {
    const set = new Set();
    tasks.filter(t => t.column_id === 'completed').forEach(t => set.add(t.title));
    return set;
  }, [tasks]);

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
        const priorityScore =
          (isBlocked ? 0 : 100) +
          (onCriticalPath ? 50 : 0) +
          (fitsTime ? 30 : 0) +
          (t.column_id === 'in_progress' ? 20 : 0) +
          (t.column_id === 'triage' ? 10 : 0);
        return { ...t, _est: est, _trigger: trigger, _project: proj, _blocked: isBlocked, _fitsTime: fitsTime, _score: priorityScore };
      })
      .filter(t => {
        if (triggerFilter !== 'all' && t._trigger !== triggerFilter) return false;
        return true;
      })
      .sort((a, b) => b._score - a._score);
  }, [tasks, selectedTime, projectMap, completedTitles, triggerFilter]);

  const fittingTasks = rankedTasks.filter(t => t._fitsTime && !t._blocked);
  const stretchTasks = rankedTasks.filter(t => !t._fitsTime && !t._blocked).slice(0, 5);

  if (loading) return <div className="main-content" style={{ padding: '1.5rem', color: '#8a8682' }}>Loading tasks...</div>;

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs />
      <div>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock size={24} /> What can I do in... <InfoTooltip text={PAGE_INFO.quickpick} />
        </h1>
        <p style={{ color: '#6b6764', fontSize: '0.88rem', marginTop: '4px' }}>Pick your available time. Tasks ranked by: unblocked → critical path → time fit → priority.</p>
      </div>

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
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
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
                    {/* Run metadata — only show if task has been run or has a schedule */}
                    {(() => {
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
                    })()}
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: trigger.color, padding: '3px 8px', borderRadius: '6px', background: trigger.bg, whiteSpace: 'nowrap' }}>
                    {trigger.label}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#6b6764', padding: '3px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.04)', whiteSpace: 'nowrap' }}>
                    ~{task._est}m
                  </span>
                  {dispatched[task.id] ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 600, color: '#2d8a4e', padding: '6px 10px' }}>
                      <CheckCircle size={12} /> Dispatched!
                    </span>
                  ) : (
                    <button
                      onClick={() => dispatchToAgent(task)}
                      disabled={dispatching[task.id]}
                      title={task._trigger !== 'autonomous' ? 'Override: send to agent anyway' : 'Send to agent'}
                      style={{
                        background: task._trigger === 'autonomous' ? 'rgba(45,138,78,0.1)' : 'rgba(0,0,0,0.04)',
                        border: task._trigger !== 'autonomous' ? '1px dashed rgba(0,0,0,0.12)' : 'none',
                        borderRadius: '6px', padding: '6px 10px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '0.72rem', fontWeight: 600,
                        color: task._trigger === 'autonomous' ? '#2d8a4e' : '#6b6764',
                        opacity: dispatching[task.id] ? 0.6 : 1,
                      }}
                    >
                      <Rocket size={12} /> {dispatching[task.id] ? 'Running...' : task._trigger === 'autonomous' ? 'Run' : 'Send to Agent'}
                    </button>
                  )}
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
                  <span style={{ fontSize: '0.68rem', color: '#8a8682' }}>~{task._est}m</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
