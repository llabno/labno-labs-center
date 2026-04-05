import { useState, useEffect, useMemo } from 'react';
import { Zap, Clock, Bot, Hand, Play, Calendar, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Download, Users, Target, Flame, LayoutList, BarChart3, GitBranch, Shield, X, Check, SlidersHorizontal } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { supabase } from '../lib/supabase';
import { logSchedulerRun, logAgentDispatched, logTaskScheduled } from '../lib/activity-logger';
import Breadcrumbs from '../components/Breadcrumbs';

const TRIGGER_LEVELS = {
  autonomous: { label: 'Autonomous', icon: Bot, color: '#2d8a4e', human: false },
  'one-click': { label: 'One-Click', icon: Zap, color: '#1565c0', human: false },
  guided: { label: 'Guided', icon: Play, color: '#c49a40', human: true },
  manual: { label: 'Manual', icon: Hand, color: '#8a8682', human: true },
};

const VIEW_MODES = [
  { key: 'list', label: 'List', icon: LayoutList },
  { key: 'kanban', label: 'Kanban', icon: GitBranch },
  { key: 'heatmap', label: 'Heat Map', icon: BarChart3 },
];

const estimateMinutes = (t) => {
  if (t.estimated_minutes) return t.estimated_minutes;
  const title = (t.title || '').toLowerCase();
  if (title.includes('build') || title.includes('create') || title.includes('implement')) return 60;
  if (title.includes('audit') || title.includes('review') || title.includes('analyze')) return 30;
  if (title.includes('deploy') || title.includes('migrate')) return 45;
  if (title.includes('test')) return 20;
  if (title.includes('document') || title.includes('write')) return 30;
  return 15;
};

const getTrigger = (t) => {
  if (t.trigger_level) return t.trigger_level;
  if ((t.assigned_to || '').toLowerCase() === 'agent') return 'autonomous';
  return 'manual';
};

// Confirmation dialog component
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

const SmartScheduler = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('quickest'); // 'quickest', 'availability', 'client'
  const [viewMode, setViewMode] = useState('list');
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [newSlot, setNewSlot] = useState({ date: '', start: '09:00', end: '12:00', person: 'Lance' });
  const [focusProject, setFocusProject] = useState('all');
  const [deepWorkHours, setDeepWorkHours] = useState({ start: '09:00', end: '12:00' }); // protected hours
  const [confirmAction, setConfirmAction] = useState(null); // { message, detail, onConfirm }
  const [clients, setClients] = useState([]);
  // Launch control panel state
  const [launchTimeBudget, setLaunchTimeBudget] = useState('none'); // '15','30','60','120','none'
  const [launchCountLimit, setLaunchCountLimit] = useState('all'); // '1','3','5','10','all'
  const [launchPriorities, setLaunchPriorities] = useState({ P0: true, P1: true, P2: true });
  const [launchBlockedFirst, setLaunchBlockedFirst] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [taskRes, projRes, clientRes] = await Promise.all([
        supabase.from('global_tasks').select('*').neq('column_id', 'completed'),
        supabase.from('projects').select('*'),
        supabase.from('clients').select('*'),
      ]);
      setTasks(taskRes.data || []);
      setProjects(projRes.data || []);
      setClients(clientRes.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

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

  const enrichedTasks = useMemo(() => {
    return tasks
      .filter(t => t.column_id !== 'completed')
      .map(t => {
        const trigger = getTrigger(t);
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

  // QUICKEST MODE
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

  // FILTERED AUTO QUEUE for launch control
  const filteredAutoNow = useMemo(() => {
    let pool = [...quickestPlan.autoNow];
    // If blocked-first is on, pull blocked tasks from enrichedTasks that are autonomous
    const blockedAuto = launchBlockedFirst
      ? enrichedTasks.filter(t => t._blocked && !t._needsHuman)
      : [];
    if (launchBlockedFirst) {
      pool = [...blockedAuto, ...pool];
    }
    // Priority filter — derive priority tier from task.priority string (e.g. "P0 — Critical")
    pool = pool.filter(t => {
      const pStr = (t.priority || '').toUpperCase();
      if (pStr.startsWith('P0')) return launchPriorities.P0;
      if (pStr.startsWith('P1')) return launchPriorities.P1;
      if (pStr.startsWith('P2')) return launchPriorities.P2;
      // Tasks with no priority or P3+ pass through if any priority is checked
      return launchPriorities.P0 || launchPriorities.P1 || launchPriorities.P2;
    });
    // Count limit
    const countMax = launchCountLimit === 'all' ? pool.length : parseInt(launchCountLimit);
    // Time budget
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

  // AVAILABILITY MODE
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
      // Check if slot overlaps deep work hours
      const isDeepWork = slot.start < deepWorkHours.end && slot.end > deepWorkHours.start && slot.person === 'Lance';
      for (const task of humanQueue) {
        if (assignedIds.has(task.id)) continue;
        // During deep work, only schedule guided/manual tasks that MUST happen (hot projects)
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

  // HEAT MAP DATA: hours by project by day-of-week
  const heatMapData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const projGroups = {};
    enrichedTasks.filter(t => !t._blocked).forEach(t => {
      const pName = t._project?.name || 'Unassigned';
      if (!projGroups[pName]) projGroups[pName] = { total: 0, tasks: [] };
      projGroups[pName].total += t._est;
      projGroups[pName].tasks.push(t);
    });
    // Sort by total time descending
    const sorted = Object.entries(projGroups).sort(([, a], [, b]) => b.total - a.total).slice(0, 10);
    return { days, projects: sorted };
  }, [enrichedTasks]);

  const addSlot = () => {
    if (!newSlot.date) return;
    setAvailabilitySlots(prev => [...prev, { ...newSlot, id: Date.now() }]);
    setNewSlot(s => ({ ...s, date: '' }));
  };
  const removeSlot = (id) => setAvailabilitySlots(prev => prev.filter(s => s.id !== id));

  // iCal export
  const exportICal = (taskList, title = 'Labno_Schedule') => {
    const events = taskList.map(t => {
      const start = new Date();
      const end = new Date(start.getTime() + t._est * 60000);
      const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      return `BEGIN:VEVENT\nDTSTART:${fmt(start)}\nDTEND:${fmt(end)}\nSUMMARY:${t.title}\nDESCRIPTION:${t._project?.name || 'Task'} — ${(TRIGGER_LEVELS[t._trigger] || {}).label || 'Manual'}\nEND:VEVENT`;
    });
    const cal = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Labno Labs//Smart Scheduler//EN\n${events.join('\n')}\nEND:VCALENDAR`;
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

  // Confirmed action handlers
  const handleLaunchAuto = () => {
    const toLaunch = filteredAutoNow;
    const totalMin = toLaunch.reduce((s, t) => s + t._est, 0);
    setConfirmAction({
      message: `Launch ${toLaunch.length} autonomous task${toLaunch.length !== 1 ? 's' : ''}?`,
      detail: `These will run in the background. Total estimated time: ~${totalMin} minutes.`,
      onConfirm: async () => {
        for (const t of toLaunch) {
          await logAgentDispatched(t);
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

  if (loading) return <div className="main-content" style={{ padding: '1.5rem', color: '#8a8682' }}>Loading scheduler...</div>;

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Breadcrumbs />
      {confirmAction && <ConfirmDialog message={confirmAction.message} detail={confirmAction.detail} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />}

      <div>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Target size={24} /> Smart Scheduler <InfoTooltip text={PAGE_INFO.scheduler} />
        </h1>
        <p style={{ color: '#6b6764', fontSize: '0.88rem', marginTop: '4px' }}>
          AI-powered task optimization. Reduce bottlenecks. Maximize throughput.
        </p>
        <div style={{ marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.72rem' }}>
          <span style={{ color: '#d14040' }}><strong>P0 Ship Blockers</strong> — must ship before anything else (auth, security, CI/CD)</span>
          <span style={{ color: '#c49a40' }}><strong>P1 Core System</strong> — key features: clinical, CRM, agents, content</span>
          <span style={{ color: '#6b6764' }}><strong>P2 Growth</strong> — analytics, localization, dashboards, advanced features</span>
        </div>
      </div>

      {/* Mode Toggle + View Toggle + Project Focus */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
          {[
            { key: 'quickest', label: 'Quickest', icon: Zap },
            { key: 'availability', label: 'My Availability', icon: Calendar },
            { key: 'client', label: 'Client Scheduling', icon: Users },
          ].map(m => {
            const Icon = m.icon;
            return (
              <button key={m.key} onClick={() => setMode(m.key)} style={{ padding: '10px 16px', fontSize: '0.82rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: mode === m.key ? '#b06050' : 'rgba(255,255,255,0.5)', color: mode === m.key ? '#fff' : '#6b6764', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
      {(mode === 'availability' || mode === 'client') && (
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
      {mode === 'quickest' && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
              <Bot size={20} color="#2d8a4e" style={{ marginBottom: '4px' }} />
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2d8a4e' }}>{quickestPlan.autoNow.length}</div>
              <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>Autonomous</div>
              <div style={{ fontSize: '0.65rem', color: '#2d8a4e' }}>~{quickestPlan.totalAutoMin}m</div>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
              <Hand size={20} color="#c49a40" style={{ marginBottom: '4px' }} />
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#c49a40' }}>{quickestPlan.humanQueue.length}</div>
              <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>Human tasks</div>
              <div style={{ fontSize: '0.65rem', color: '#c49a40' }}>~{quickestPlan.totalHumanMin}m</div>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
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
              <strong>Step 1:</strong> Launch all {quickestPlan.autoNow.length} autonomous tasks (~{quickestPlan.totalAutoMin}m agent time).
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
                        ~{filteredAutoNow.reduce((s, t) => s + t._est, 0)}m estimated
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
                        <span style={{ fontSize: '0.68rem', color: '#2d8a4e', fontWeight: 600 }}>~{t._est}m</span>
                        <a href={gcalUrl(t)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: '#5a8abf', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}><Calendar size={10} /> GCal</a>
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
                          <span style={{ fontSize: '0.68rem', color: '#6b6764' }}>~{t._est}m</span>
                          <a href={gcalUrl(t)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: '#5a8abf', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}><Calendar size={10} /> GCal</a>
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
                          <div style={{ fontSize: '0.68rem', color: '#8a8682', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{t._project?.name}</span>
                            <span>~{t._est}m</span>
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
                    const intensity = data.total / (maxMin || 1);
                    // Distribute tasks roughly across days
                    const perDay = Math.ceil(data.total / 5);
                    return (
                      <>
                        <div key={name} style={{ fontSize: '0.78rem', fontWeight: 500, color: '#2e2c2a', padding: '8px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                        {heatMapData.days.map((d, di) => {
                          const dayTotal = di < data.tasks.length ? Math.min(perDay, data.total - perDay * di) : 0;
                          const cellIntensity = Math.max(0, Math.min(1, dayTotal / 120)); // normalize to 2 hours
                          const bg = dayTotal > 90 ? 'rgba(209,64,64,0.25)' : dayTotal > 45 ? 'rgba(196,154,64,0.2)' : dayTotal > 0 ? 'rgba(45,138,78,0.15)' : 'rgba(0,0,0,0.02)';
                          return (
                            <div key={d} style={{ padding: '8px', borderRadius: '6px', background: bg, textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: dayTotal > 90 ? '#d14040' : dayTotal > 45 ? '#c49a40' : dayTotal > 0 ? '#2d8a4e' : '#ccc' }}>
                              {dayTotal > 0 ? `${dayTotal}m` : '—'}
                            </div>
                          );
                        })}
                      </>
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

      {/* ===== AVAILABILITY MODE ===== */}
      {(mode === 'availability' || mode === 'client') && (
        <>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} /> {mode === 'client' ? 'Client & Team Availability' : 'Your Available Time Slots'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#6b6764', marginBottom: '12px' }}>
              {mode === 'client'
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
                {mode === 'client' && clients.length > 0 && (
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
                      <span style={{ color: '#6b6764' }}>{slot.start}–{slot.end}</span>
                      <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>{slot.person}</span>
                      <button onClick={() => removeSlot(slot.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d14040', fontSize: '0.72rem', fontWeight: 600 }}>×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Client mode: temp holds explanation */}
          {mode === 'client' && (
            <div className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid #e65100', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Clock size={16} color="#e65100" />
              <div style={{ fontSize: '0.82rem', color: '#3e3c3a' }}>
                <strong>Temporary Holds:</strong> When scheduling with clients, slots are held for 4 hours by default. If the client doesn't confirm, the hold expires and the time reopens. Deep work hours ({deepWorkHours.start}–{deepWorkHours.end}) are protected — only hot project tasks will be suggested during that window.
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
                <Bot size={14} /> Runs Autonomously — {availabilityPlan.autoQueue.length} tasks
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {availabilityPlan.autoQueue.slice(0, 10).map(t => (
                  <span key={t.id} style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(45,138,78,0.08)', color: '#2d8a4e', fontWeight: 500 }}>{t.title} (~{t._est}m)</span>
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
                    {new Date(slot.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · {slot.start}–{slot.end}
                    {slot._isDeepWork && <span style={{ fontSize: '0.62rem', color: '#9c27b0', background: 'rgba(156,39,176,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Deep Work</span>}
                    {slot.person.startsWith('Client:') && <span style={{ fontSize: '0.62rem', color: '#e65100', background: 'rgba(229,101,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{slot.person}</span>}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#8a8682' }}>{slot.person} · {slot._total - slot._remaining}m / {slot._total}m</span>
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
                        <span style={{ fontSize: '0.68rem', color: '#6b6764' }}>~{t._est}m</span>
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
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#c49a40' }} />{t.title} (~{t._est}m)
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SmartScheduler;
