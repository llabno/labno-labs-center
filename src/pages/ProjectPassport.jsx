import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckSquare, Clock, AlertCircle, Users, Briefcase, Rocket, ExternalLink, GitBranch, Zap, Shield, XCircle, Flame, CalendarPlus, Bot, Hand, Play, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Breadcrumbs from '../components/Breadcrumbs';

const STAGE_LABELS = ['Kickoff','Scope','Design','Build / Execute','Test','Deploy','Handoff','Close'];
const STAGE_COLORS = ['#1976d2','#9c27b0','#f06292','#f44336','#ff9800','#4caf50','#00bcd4','#388e3c'];
const STATUS_COLORS = {
  pending: { bg: 'rgba(158,154,151,0.12)', color: '#6b6764' },
  active: { bg: 'rgba(90,138,191,0.15)', color: '#4a7aaf' },
  done: { bg: 'rgba(106,171,110,0.15)', color: '#4a8a4e' },
  skipped: { bg: 'rgba(0,0,0,0.05)', color: '#999' },
};
const TRIGGER_META = {
  auto: { icon: Zap, color: '#2d8a4e', label: 'Auto' },
  gated: { icon: Shield, color: '#b08030', label: 'Gated' },
  manual: { icon: XCircle, color: '#999', label: 'Manual' },
};

const ProjectPassport = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      const [projRes, taskRes, pipeRes, tmplRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        supabase.from('global_tasks').select('*').eq('project_id', id).order('created_at'),
        supabase.from('project_pipelines').select('*').eq('project_id', id).order('stage_number'),
        supabase.from('pipeline_task_templates').select('*').order('stage').order('sort_order'),
      ]);

      if (!projRes.error && projRes.data) {
        setProject(projRes.data);
        if (projRes.data.client_id) {
          const { data: cl } = await supabase.from('clients').select('*').eq('id', projRes.data.client_id).single();
          if (cl) setClient(cl);
        }
      }
      if (!taskRes.error) setTasks(taskRes.data || []);
      if (!pipeRes.error) setPipeline(pipeRes.data || []);
      if (!tmplRes.error && tmplRes.data) {
        const grouped = {};
        tmplRes.data.forEach(t => {
          const s = t.stage - 1;
          if (!grouped[s]) grouped[s] = [];
          grouped[s].push(t);
        });
        setTemplates(grouped);
      }
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  if (loading) return <div className="main-content" style={{ padding: '2rem', color: '#8a8682' }}>Loading project...</div>;
  if (!project) return <div className="main-content" style={{ padding: '2rem', color: '#d32f2f' }}>Project not found.</div>;

  const track = project.pipeline_track || 'app';
  const completedTasks = tasks.filter(t => t.column_id === 'completed').length;
  const blockedTasks = tasks.filter(t => t.is_blocked).length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const currentStage = pipeline.find(s => s.status === 'active');

  const getStageTemplates = (stageIdx) => {
    return (templates[stageIdx] || []).filter(t => t.tracks.includes(track));
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Breadcrumbs + Header */}
      <div>
        <Breadcrumbs projectName={project.name} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>{project.name}</h1>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: '10px', background: project.project_type === 'client' ? 'rgba(90,138,191,0.12)' : 'rgba(176,96,80,0.12)', color: project.project_type === 'client' ? '#4a7aaf' : '#b06050', textTransform: 'uppercase' }}>
                {project.project_type === 'client' ? 'Client Project' : 'Internal'}
              </span>
              {project.venture && (
                <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '10px', background: 'rgba(0,0,0,0.04)', color: '#6b6764' }}>{project.venture}</span>
              )}
              <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '10px', background: project.status === 'Active' ? 'rgba(106,171,110,0.12)' : 'rgba(0,0,0,0.04)', color: project.status === 'Active' ? '#4a8a4e' : '#6b6764' }}>{project.status}</span>
              <span style={{ fontSize: '0.75rem', color: '#8a8682', display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> Due: {formatDate(project.due_date)}</span>
            </div>
          </div>
          {client && (
            <div className="glass-panel" style={{ padding: '1rem', minWidth: '220px' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>Client</div>
              <div style={{ fontWeight: 600, color: '#2e2c2a' }}>{client.name}</div>
              {client.company && <div style={{ fontSize: '0.82rem', color: '#6b6764' }}>{client.company}</div>}
              {client.email && <div style={{ fontSize: '0.78rem', color: '#8a8682' }}>{client.email}</div>}
              <div style={{ fontSize: '0.7rem', marginTop: '6px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.04)', color: '#6b6764', display: 'inline-block' }}>Tier: {client.tier}</div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions — stage-aware pills */}
      {currentStage && (() => {
        const STAGE_ACTIONS = {
          1: [
            { label: 'Send Intake Form', icon: '📋', color: '#1565c0' },
            { label: 'Schedule Discovery Call', icon: '📞', color: '#2e7d32' },
            { label: 'Create Comms Channel', icon: '💬', color: '#9c27b0' },
            { label: 'Assign Team Members', icon: '👥', color: '#e65100' },
          ],
          2: [
            { label: 'Send Proposal', icon: '📄', color: '#1565c0' },
            { label: 'Request Sign-off', icon: '✅', color: '#2e7d32' },
            { label: 'Set Up Billing', icon: '💳', color: '#e65100' },
            { label: 'Set Milestones', icon: '🎯', color: '#9c27b0' },
          ],
          3: [
            { label: 'Share Wireframes', icon: '🎨', color: '#9c27b0' },
            { label: 'Request Brand Assets', icon: '📦', color: '#e65100' },
            { label: 'Schedule Design Review', icon: '📞', color: '#2e7d32' },
          ],
          4: [
            { label: 'Share Progress Update', icon: '📊', color: '#1565c0' },
            { label: 'Request Feedback', icon: '💬', color: '#2e7d32' },
            { label: 'Flag Blocker', icon: '🚩', color: '#d32f2f' },
          ],
          5: [
            { label: 'Send UAT Link', icon: '🔗', color: '#1565c0' },
            { label: 'Collect Feedback', icon: '📝', color: '#2e7d32' },
            { label: 'Schedule Demo', icon: '📞', color: '#9c27b0' },
          ],
          6: [
            { label: 'Send Launch Notification', icon: '🚀', color: '#2e7d32' },
            { label: 'Share Live URL', icon: '🔗', color: '#1565c0' },
            { label: 'Set Up Monitoring', icon: '📡', color: '#e65100' },
          ],
          7: [
            { label: 'Send Training Invite', icon: '🎓', color: '#9c27b0' },
            { label: 'Share Documentation', icon: '📄', color: '#1565c0' },
            { label: 'Set Up Retainer', icon: '🤝', color: '#2e7d32' },
          ],
          8: [
            { label: 'Send Invoice', icon: '💰', color: '#e65100' },
            { label: 'Request Testimonial', icon: '⭐', color: '#f9a825' },
            { label: 'Share Case Study', icon: '📊', color: '#1565c0' },
          ],
        };
        const actions = STAGE_ACTIONS[currentStage.stage_number] || [];
        return (
          <div className="glass-panel" style={{ padding: '1rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b6764', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quick Actions</span>
              <span style={{ fontSize: '0.65rem', color: '#8a8682' }}>Stage {currentStage.stage_number}: {STAGE_LABELS[currentStage.stage_number - 1]}</span>
              <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.08)' }} />
              {actions.map(a => (
                <button key={a.label} style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 14px', borderRadius: '20px',
                  border: `1px solid ${a.color}30`, background: `${a.color}08`,
                  color: a.color, fontSize: '0.78rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseOver={e => { e.currentTarget.style.background = `${a.color}15`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = `${a.color}08`; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <span>{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Next Actions — top unblocked tasks */}
      {(() => {
        const unblocked = tasks.filter(t => !t.is_blocked && t.column_id !== 'completed').slice(0, 5);
        if (unblocked.length === 0) return null;
        return (
          <div className="glass-panel" style={{ padding: '1rem 1.5rem', borderLeft: '3px solid #b06050' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b06050', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Next Actions ({unblocked.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {unblocked.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#b06050', flexShrink: 0 }} />
                  <span style={{ color: '#2e2c2a', fontWeight: 500 }}>{t.title}</span>
                  {t.assigned_to && <span style={{ fontSize: '0.7rem', color: '#8a8682', marginLeft: 'auto' }}>{t.assigned_to}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Project Hot List — highest-priority unblocked tasks ranked for immediate action */}
      {(() => {
        const TRIGGER_LEVELS = {
          autonomous: { label: 'Autonomous', icon: Bot, color: '#2d8a4e' },
          'one-click': { label: 'One-Click', icon: Zap, color: '#1565c0' },
          guided: { label: 'Guided', icon: Play, color: '#c49a40' },
          manual: { label: 'Manual', icon: Hand, color: '#8a8682' },
        };
        const estimateMin = (t) => {
          if (t.estimated_minutes) return t.estimated_minutes;
          const title = (t.title || '').toLowerCase();
          if (title.includes('build') || title.includes('create') || title.includes('implement')) return 60;
          if (title.includes('audit') || title.includes('review') || title.includes('analyze')) return 30;
          if (title.includes('deploy') || title.includes('migrate')) return 45;
          if (title.includes('test')) return 20;
          return 15;
        };
        const getTrigger = (t) => {
          if (t.trigger_level) return t.trigger_level;
          if ((t.assigned_to || '').toLowerCase() === 'agent') return 'autonomous';
          return 'manual';
        };
        const completedTitles = new Set(tasks.filter(t => t.column_id === 'completed').map(t => t.title));
        const hotTasks = tasks
          .filter(t => t.column_id !== 'completed' && t.column_id !== 'blocked')
          .map(t => {
            const isBlocked = t.is_blocked || (t.depends_on || []).some(d => !completedTitles.has(d));
            const trigger = getTrigger(t);
            const est = estimateMin(t);
            const score = (isBlocked ? 0 : 100) + (t.column_id === 'in_progress' ? 50 : 0) + (t.column_id === 'triage' ? 30 : 0) + (trigger === 'autonomous' ? 20 : 0);
            return { ...t, _blocked: isBlocked, _trigger: trigger, _est: est, _score: score };
          })
          .filter(t => !t._blocked)
          .sort((a, b) => b._score - a._score)
          .slice(0, 8);

        if (hotTasks.length === 0) return null;

        const autoTasks = hotTasks.filter(t => t._trigger === 'autonomous');
        const manualTasks = hotTasks.filter(t => t._trigger !== 'autonomous');

        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Hot List */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid #d14040' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Flame size={16} color="#d14040" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d14040', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hot List</span>
                <span style={{ fontSize: '0.68rem', color: '#8a8682' }}>Highest priority unblocked tasks</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {hotTasks.slice(0, 5).map(t => {
                  const tri = TRIGGER_LEVELS[t._trigger] || TRIGGER_LEVELS.manual;
                  const TIcon = tri.icon;
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.04)' }}>
                      <TIcon size={12} color={tri.color} />
                      <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, color: '#2e2c2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                      <span style={{ fontSize: '0.65rem', color: '#8a8682' }}>~{t._est}m</span>
                      <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: tri.color + '15', color: tri.color }}>{tri.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Pick for this project */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid #5a8abf' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Clock size={16} color="#5a8abf" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5a8abf', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quick Pick</span>
                <span style={{ fontSize: '0.68rem', color: '#8a8682' }}>What to do now</span>
              </div>
              {autoTasks.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#2d8a4e', marginBottom: '4px' }}>Can run autonomously now:</div>
                  {autoTasks.slice(0, 3).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', borderRadius: '6px', background: 'rgba(45,138,78,0.06)', marginBottom: '3px', fontSize: '0.78rem' }}>
                      <Bot size={11} color="#2d8a4e" /> <span style={{ flex: 1, color: '#2e2c2a' }}>{t.title}</span>
                      <button style={{ fontSize: '0.65rem', fontWeight: 600, color: '#2d8a4e', background: 'rgba(45,138,78,0.12)', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>Run</button>
                    </div>
                  ))}
                </div>
              )}
              {manualTasks.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#c49a40', marginBottom: '4px' }}>Needs human input:</div>
                  {manualTasks.slice(0, 3).map(t => {
                    const tri = TRIGGER_LEVELS[t._trigger] || TRIGGER_LEVELS.manual;
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', borderRadius: '6px', background: 'rgba(196,154,64,0.06)', marginBottom: '3px', fontSize: '0.78rem' }}>
                        <tri.icon size={11} color={tri.color} /> <span style={{ flex: 1, color: '#2e2c2a' }}>{t.title}</span>
                        <span style={{ fontSize: '0.6rem', color: '#8a8682' }}>~{t._est}m</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link to="/quickpick" style={{ display: 'block', textAlign: 'center', marginTop: '10px', fontSize: '0.72rem', color: '#5a8abf', textDecoration: 'none', fontWeight: 500 }}>View full time picker →</Link>
            </div>
          </div>
        );
      })()}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total Tasks', value: tasks.length, color: '#2e2c2a' },
          { label: 'Completed', value: completedTasks, color: '#4a8a4e' },
          { label: 'Blocked', value: blockedTasks, color: '#d32f2f' },
          { label: 'Progress', value: `${progress}%`, color: '#b06050' },
          { label: 'Pipeline Stage', value: currentStage ? STAGE_LABELS[currentStage.stage_number - 1] : 'Not started', color: '#1976d2' },
          { label: 'Track', value: track === 'app' ? 'App Build' : 'Service Build', color: '#9c27b0' },
        ].map(s => (
          <div key={s.label} className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b6764', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Progress */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem' }}>Pipeline Progress</h3>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem' }}>
          {STAGE_LABELS.map((label, i) => {
            const stage = pipeline.find(p => p.stage_number === i + 1);
            const status = stage?.status || 'pending';
            const sc = STATUS_COLORS[status];
            return (
              <div
                key={i}
                onClick={() => setActiveStage(activeStage === i ? null : i)}
                style={{
                  flex: 1, cursor: 'pointer', textAlign: 'center', padding: '10px 4px',
                  borderRadius: '8px', transition: 'all 0.2s',
                  background: activeStage === i ? `${STAGE_COLORS[i]}15` : sc.bg,
                  border: activeStage === i ? `2px solid ${STAGE_COLORS[i]}` : '2px solid transparent',
                }}
              >
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: STAGE_COLORS[i], textTransform: 'uppercase', marginBottom: '4px' }}>{i + 1}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#2e2c2a' }}>{label}</div>
                <div style={{ fontSize: '0.62rem', color: sc.color, fontWeight: 600, marginTop: '3px', textTransform: 'uppercase' }}>{status}</div>
              </div>
            );
          })}
        </div>

        {/* Expanded stage detail */}
        {activeStage !== null && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: STAGE_COLORS[activeStage], marginBottom: '10px' }}>
              Stage {activeStage + 1}: {STAGE_LABELS[activeStage]}
            </h4>
            {getStageTemplates(activeStage).length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#8a8682' }}>No tasks defined for this stage.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {getStageTemplates(activeStage).map(t => {
                  const tri = TRIGGER_META[t.trigger_level] || TRIGGER_META.gated;
                  const TIcon = tri.icon;
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                      borderRadius: '8px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.04)',
                    }}>
                      <TIcon size={13} color={tri.color} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#2e2c2a' }}>{t.title}</div>
                        {t.description && <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>{t.description}</div>}
                      </div>
                      <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: `${tri.color}18`, color: tri.color }}>{tri.label}</span>
                      <span style={{ fontSize: '0.65rem', color: '#8a8682' }}>{t.agent}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem' }}>
          Tasks ({tasks.length})
        </h3>
        {tasks.length === 0 ? (
          <p style={{ color: '#8a8682', fontSize: '0.85rem' }}>No tasks yet.</p>
        ) : (
          ['backlog', 'triage', 'in_progress', 'review', 'blocked', 'completed'].map(col => {
            const colTasks = tasks.filter(t => (t.column_id || 'backlog') === col);
            if (colTasks.length === 0) return null;
            const colColors = { backlog: '#9e9a97', triage: '#5a8abf', in_progress: '#b06050', review: '#c49a40', blocked: '#d14040', completed: '#6aab6e' };
            const colLabels = { backlog: 'Backlog', triage: 'Needs Triage', in_progress: 'In Progress', review: 'Review', blocked: 'Blocked', completed: 'Completed' };
            return (
              <div key={col} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colColors[col] }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#5a5856', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{colLabels[col]} ({colTasks.length})</span>
                </div>
                {colTasks.map(t => (
                  <div key={t.id} style={{
                    padding: '8px 12px', marginBottom: '4px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(0,0,0,0.04)',
                    borderLeft: `3px solid ${colColors[col]}`, display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#2e2c2a' }}>{t.title}</div>
                      {t.description && <div style={{ fontSize: '0.72rem', color: '#8a8682' }}>{t.description}</div>}
                    </div>
                    {t.assigned_to && <span style={{ fontSize: '0.7rem', color: '#8a8682', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '8px' }}>{t.assigned_to}</span>}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* History / Timeline */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2e2c2a', marginBottom: '1rem' }}>Timeline</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4a8a4e' }} />
            <span style={{ color: '#6b6764' }}>Created</span>
            <span style={{ color: '#8a8682' }}>{formatDate(project.created_at)}</span>
          </div>
          {pipeline.filter(s => s.started_at).map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STAGE_COLORS[s.stage_number - 1] }} />
              <span style={{ color: '#6b6764' }}>Stage {s.stage_number}: {STAGE_LABELS[s.stage_number - 1]} started</span>
              <span style={{ color: '#8a8682' }}>{formatDate(s.started_at)}</span>
            </div>
          ))}
          {pipeline.filter(s => s.completed_at).map(s => (
            <div key={`${s.id}-done`} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4a8a4e' }} />
              <span style={{ color: '#6b6764' }}>Stage {s.stage_number}: {STAGE_LABELS[s.stage_number - 1]} completed</span>
              <span style={{ color: '#8a8682' }}>{formatDate(s.completed_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectPassport;
