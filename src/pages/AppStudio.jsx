import React, { useState, useEffect } from 'react';
import { Code, Rocket, Edit3, Bug, Play, Server, Send, CheckCircle, Plus, ChevronDown, ChevronUp, X, ArrowRight, Check, ExternalLink, Zap, Shield, XCircle, Database, FileText } from 'lucide-react';
import InfoTooltip, { PAGE_INFO } from '../components/InfoTooltip';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PROJECT_OPTIONS = [
  'Unassigned',
  'MOSO Data Sanitization',
  'GTM Digital Assets',
  'Clinical Blog',
  'Global Telemetry',
  'G-Cal Sync',
  'UI/UX Polish',
];

const PROJECT_COLORS = {
  'Unassigned': { bg: 'rgba(0,0,0,0.05)', color: '#888' },
  'MOSO Data Sanitization': { bg: 'rgba(209, 90, 69, 0.12)', color: '#d15a45' },
  'GTM Digital Assets': { bg: 'rgba(25, 118, 210, 0.12)', color: '#1976d2' },
  'Clinical Blog': { bg: 'rgba(76, 175, 80, 0.12)', color: '#4caf50' },
  'Global Telemetry': { bg: 'rgba(156, 39, 176, 0.12)', color: '#9c27b0' },
  'G-Cal Sync': { bg: 'rgba(255, 152, 0, 0.12)', color: '#ff9800' },
  'UI/UX Polish': { bg: 'rgba(0, 188, 212, 0.12)', color: '#00bcd4' },
};

const AppStudio = () => {
  const [apps, setApps] = useState([
    { title: 'College Career OS', status: 'Live', mrr: '$1,200', active: '842', color: '#4caf50', description: 'End-to-end career management platform for university students. Features interview prep, resume builder, and job tracking.', progress: 95, vercelUrl: 'https://college-career-os.vercel.app', githubUrl: 'https://github.com/labnolabs/college-career-os', pipelineStage: 8, projectId: null },
    { title: 'Stretching App (Romy)', status: 'In Development', mrr: '$0', active: '0', color: '#ff9800', description: 'Clinical stretching and mobility app designed for rehab patients. Currently building exercise library and video integration.', progress: 40, vercelUrl: null, githubUrl: null, pipelineStage: 3, projectId: null },
    { title: 'Art Portfolio (Avery)', status: 'Planning', mrr: '$0', active: '0', color: '#2196f3', description: 'Minimalist portfolio builder for visual artists. Planning phase — wireframes and feature spec in progress.', progress: 10, vercelUrl: null, githubUrl: null, pipelineStage: 2, projectId: null },
  ]);

  // Try to match portfolio apps to real projects by name
  useEffect(() => {
    const matchProjects = async () => {
      const { data } = await supabase.from('projects').select('id, name');
      if (!data) return;
      setApps(prev => prev.map(app => {
        const match = data.find(p => p.name.toLowerCase().includes(app.title.toLowerCase().split(' (')[0].split(' ').slice(0,2).join(' ').toLowerCase()));
        return match ? { ...app, projectId: match.id } : app;
      }));
    };
    matchProjects();
  }, []);

  const stages = [
    { name: '1. Spin Up Starter Kit', icon: <Rocket size={20} color="#1976d2" />, desc: 'Next.js + Core UI + API Bridge' },
    { name: '2. Idea Creation', icon: <Code size={20} color="#9c27b0" />, desc: 'Feature spec mapping' },
    { name: '3. UI Design', icon: <Edit3 size={20} color="#f06292" />, desc: 'Figma mockups & CSS' },
    { name: '4. Testing', icon: <Bug size={20} color="#f44336" />, desc: 'QA & Error log checking' },
    { name: '5. Sandbox Deployment', icon: <Server size={20} color="#ff9800" />, desc: 'Test branch to Vercel' },
    { name: '6. Real Deployment', icon: <Play size={20} color="#4caf50" />, desc: 'Push to Main branch' },
    { name: '7. Hand off to Client', icon: <Send size={20} color="#00bcd4" />, desc: 'DNS map & Permissions setup' },
    { name: '8. Finalize App', icon: <CheckCircle size={20} color="#388e3c" />, desc: 'Archive & Telemetry lock' },
  ];

  // Task 8: Action Pipeline checklists
  const defaultChecklists = {
    0: [{ text: 'Initialize Next.js project', done: false, project: 'Unassigned' }, { text: 'Install core dependencies', done: false, project: 'Unassigned' }, { text: 'Set up API bridge', done: false, project: 'Unassigned' }],
    1: [{ text: 'Draft feature list', done: false, project: 'Unassigned' }, { text: 'Map user stories', done: false, project: 'Unassigned' }, { text: 'Prioritize MVP scope', done: false, project: 'Unassigned' }],
    2: [{ text: 'Create wireframes in Figma', done: false, project: 'Unassigned' }, { text: 'Define color palette', done: false, project: 'Unassigned' }, { text: 'Build component library', done: false, project: 'Unassigned' }],
    3: [{ text: 'Write unit tests', done: false, project: 'Unassigned' }, { text: 'Run integration tests', done: false, project: 'Unassigned' }, { text: 'Check error logs', done: false, project: 'Unassigned' }],
    4: [{ text: 'Deploy to Vercel preview', done: false, project: 'Unassigned' }, { text: 'Test on mobile devices', done: false, project: 'Unassigned' }, { text: 'Share preview link', done: false, project: 'Unassigned' }],
    5: [{ text: 'Merge to main branch', done: false, project: 'Unassigned' }, { text: 'Verify production build', done: false, project: 'Unassigned' }, { text: 'Monitor error rates', done: false, project: 'Unassigned' }],
    6: [{ text: 'Map custom domain DNS', done: false, project: 'Unassigned' }, { text: 'Set up client permissions', done: false, project: 'Unassigned' }, { text: 'Send onboarding email', done: false, project: 'Unassigned' }],
    7: [{ text: 'Archive project repo', done: false, project: 'Unassigned' }, { text: 'Lock telemetry config', done: false, project: 'Unassigned' }, { text: 'Final QA sign-off', done: false, project: 'Unassigned' }],
  };

  const [openStage, setOpenStage] = useState(null);
  const [checklists, setChecklists] = useState(defaultChecklists);
  const [newItemText, setNewItemText] = useState('');
  const [newItemProject, setNewItemProject] = useState('Unassigned');
  // Track "Added!" flash per item: key = "stageIdx-itemIdx"
  const [addedFlash, setAddedFlash] = useState({});

  // Task 9: Portfolio accordion
  const [expandedApp, setExpandedApp] = useState(null);

  // Pipeline templates from Supabase
  const [pipelineTemplates, setPipelineTemplates] = useState({});
  const [pipelineTrack, setPipelineTrack] = useState('app');
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from('pipeline_task_templates')
        .select('*')
        .order('stage', { ascending: true })
        .order('sort_order', { ascending: true });
      if (!error && data) {
        const grouped = {};
        data.forEach(t => {
          const stageIdx = t.stage - 1;
          if (!grouped[stageIdx]) grouped[stageIdx] = [];
          grouped[stageIdx].push(t);
        });
        setPipelineTemplates(grouped);
      }
      setLoadingTemplates(false);
    };
    fetchTemplates();
  }, []);

  // Get templates for a stage filtered by track
  const getStageTemplates = (stageIdx) => {
    const templates = pipelineTemplates[stageIdx] || [];
    return templates.filter(t => t.tracks.includes(pipelineTrack));
  };

  const TRIGGER_ICONS = {
    auto: { icon: Zap, color: '#2d8a4e', label: 'Auto' },
    gated: { icon: Shield, color: '#b08030', label: 'Gated' },
    manual: { icon: XCircle, color: '#999', label: 'Manual' },
  };

  const toggleStage = (idx) => {
    setOpenStage(openStage === idx ? null : idx);
    setNewItemText('');
    setNewItemProject('Unassigned');
  };

  const toggleCheckItem = (stageIdx, itemIdx) => {
    setChecklists(prev => {
      const updated = { ...prev };
      updated[stageIdx] = [...updated[stageIdx]];
      updated[stageIdx][itemIdx] = { ...updated[stageIdx][itemIdx], done: !updated[stageIdx][itemIdx].done };
      return updated;
    });
  };

  const addCheckItem = (stageIdx) => {
    if (!newItemText.trim()) return;
    setChecklists(prev => {
      const updated = { ...prev };
      updated[stageIdx] = [...(updated[stageIdx] || []), { text: newItemText.trim(), done: false, project: newItemProject }];
      return updated;
    });
    setNewItemText('');
    setNewItemProject('Unassigned');
  };

  const removeCheckItem = (stageIdx, itemIdx) => {
    setChecklists(prev => {
      const updated = { ...prev };
      updated[stageIdx] = updated[stageIdx].filter((_, i) => i !== itemIdx);
      return updated;
    });
  };

  // Move item from pipeline to portfolio (mark done + append + flash)
  const moveToPortfolio = (stageIdx, itemIdx) => {
    const item = checklists[stageIdx][itemIdx];
    
    // Mark as done
    setChecklists(prev => {
      const updated = { ...prev };
      updated[stageIdx] = [...updated[stageIdx]];
      updated[stageIdx][itemIdx] = { ...updated[stageIdx][itemIdx], done: true };
      return updated;
    });
    
    // Add dynamically to Active Portfolio state
    setApps(prevApps => [
      {
        title: item.text,
        status: 'In Development',
        mrr: '$0',
        active: '0',
        color: PROJECT_COLORS[item.project]?.color || '#2196f3',
        description: `Auto-initialized from pipeline (Stage ${stageIdx + 1}). Project scope: ${item.project}.`,
        progress: 10
      },
      ...prevApps
    ]);

    // Show "Added!" flash
    const key = `${stageIdx}-${itemIdx}`;
    setAddedFlash(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setAddedFlash(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 1000);
  };

  return (
    <div className="main-content" style={{ padding: '1.5rem' }}>
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Code color="#d15a45" /> Labno Labs App Studio <InfoTooltip text={PAGE_INFO.studio} />
      </h1>

      <p style={{ marginBottom: '2rem', color: '#555', maxWidth: '800px' }}>
        This is your internal factory. Launch new applications, manage the exact lifecycle of an app from idea to client hand-off, and track global statistics.
      </p>

      {/* The 8 Stages of App Development (Clickable Logic) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ color: '#333', fontSize: '1.1rem', fontWeight: 600 }}>Action Pipeline</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 500 }}>Track:</span>
          <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
            <button onClick={() => setPipelineTrack('app')} style={{ padding: '5px 14px', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: pipelineTrack === 'app' ? '#b06050' : 'rgba(255,255,255,0.5)', color: pipelineTrack === 'app' ? '#fff' : '#6b6764', transition: 'all 0.2s' }}>App Build</button>
            <button onClick={() => setPipelineTrack('service')} style={{ padding: '5px 14px', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: pipelineTrack === 'service' ? '#b06050' : 'rgba(255,255,255,0.5)', color: pipelineTrack === 'service' ? '#fff' : '#6b6764', transition: 'all 0.2s' }}>Service Build</button>
          </div>
          {!loadingTemplates && <span style={{ fontSize: '0.68rem', color: '#6aab6e', display: 'flex', alignItems: 'center', gap: '4px' }}><Database size={11} /> {Object.values(pipelineTemplates).flat().length} tasks loaded</span>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        {stages.map((stage, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              className="glass-panel"
              style={{
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: openStage === idx ? 'rgba(255, 120, 100, 0.08)' : '#fff',
                borderBottom: openStage === idx ? 'none' : undefined,
                borderBottomLeftRadius: openStage === idx ? 0 : undefined,
                borderBottomRightRadius: openStage === idx ? 0 : undefined,
              }}
              onClick={() => toggleStage(idx)}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div>{stage.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#333', fontSize: '0.9rem' }}>{stage.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>{stage.desc}</div>
              </div>
              <div style={{ color: '#aaa', transition: 'transform 0.2s' }}>
                {openStage === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {/* Checklist Panel — Elegant 3D Glass Design */}
            {openStage === idx && (
              <div
                style={{
                  padding: '1rem',
                  background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.55) 0%, rgba(250, 248, 245, 0.4) 100%)',
                  backdropFilter: 'blur(24px) saturate(1.2)',
                  WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
                  border: '1px solid rgba(255, 255, 255, 0.55)',
                  borderTop: '1px solid rgba(0,0,0,0.04)',
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderBottomLeftRadius: '20px',
                  borderBottomRightRadius: '20px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(0,0,0,0.02)',
                  animation: 'fadeIn 0.25s ease',
                  transform: 'perspective(800px) rotateX(0.5deg)',
                }}
              >
                {/* Supabase Pipeline Templates */}
                {getStageTemplates(idx).length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#b06050' }}>
                        Pipeline Tasks ({getStageTemplates(idx).length})
                      </span>
                      <span style={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic' }}>from template library</span>
                    </div>
                    {getStageTemplates(idx).map(t => {
                      const triggerInfo = TRIGGER_ICONS[t.trigger_level] || TRIGGER_ICONS.gated;
                      const TriggerIcon = triggerInfo.icon;
                      return (
                        <div key={t.id} style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 12px', marginBottom: '6px', borderRadius: '8px',
                          background: 'rgba(255,255,255,0.5)',
                          border: '1px solid rgba(0,0,0,0.04)',
                          fontSize: '0.82rem',
                        }}>
                          <TriggerIcon size={13} color={triggerInfo.color} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, color: '#2e2c2a' }}>{t.title}</div>
                            {t.description && <div style={{ fontSize: '0.72rem', color: '#8a8682', marginTop: '2px' }}>{t.description}</div>}
                          </div>
                          <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: `${triggerInfo.color}18`, color: triggerInfo.color, whiteSpace: 'nowrap' }}>{triggerInfo.label}</span>
                          <span style={{ fontSize: '0.65rem', color: '#8a8682', whiteSpace: 'nowrap' }}>{t.agent}</span>
                          {t.case_id && <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '1px 5px', borderRadius: '3px', background: 'rgba(140,110,180,0.12)', color: '#7a5a9a', whiteSpace: 'nowrap' }}>CASE-{t.case_id}</span>}
                        </div>
                      );
                    })}
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', marginTop: '10px', paddingTop: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b6764' }}>Custom Items</span>
                    </div>
                  </div>
                )}

                {(checklists[idx] || []).length === 0 && getStageTemplates(idx).length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.5rem' }}>No items yet. Add one below.</p>
                )}
                {(checklists[idx] || []).map((item, itemIdx) => {
                  const flashKey = `${idx}-${itemIdx}`;
                  const isFlashing = addedFlash[flashKey];
                  const projColor = PROJECT_COLORS[item.project] || PROJECT_COLORS['Unassigned'];
                  return (
                    <div
                      key={itemIdx}
                      className={`checklist-item-glass${item.done ? ' completed' : ''}`}
                    >
                      {/* Custom circle checkbox */}
                      <button
                        className={`pipeline-checkbox${item.done ? ' checked' : ''}`}
                        onClick={() => toggleCheckItem(idx, itemIdx)}
                        aria-label={item.done ? 'Uncheck' : 'Check'}
                      >
                        {item.done && <Check size={12} strokeWidth={3} />}
                      </button>

                      <span className="checklist-text" style={{
                        flex: 1,
                        fontSize: '0.85rem',
                        color: item.done ? '#b0ada9' : '#333',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}>
                        {item.text}
                      </span>

                      {/* Project badge */}
                      {item.project && item.project !== 'Unassigned' && (
                        <span style={{
                          fontSize: '0.62rem',
                          padding: '2px 7px',
                          borderRadius: '8px',
                          background: projColor.bg,
                          color: projColor.color,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          letterSpacing: '0.2px',
                        }}>
                          {item.project}
                        </span>
                      )}

                      {/* "Added!" flash text */}
                      {isFlashing && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#4caf50',
                          animation: 'flash-added 1s ease forwards',
                        }}>
                          Added!
                        </span>
                      )}

                      {/* Move to portfolio arrow button */}
                      {!item.done && (
                        <button
                          onClick={(e) => { e.stopPropagation(); moveToPortfolio(idx, itemIdx); }}
                          title="Move to portfolio"
                          style={{
                            background: 'none',
                            border: '1px solid rgba(0,0,0,0.08)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#9e9a97',
                            padding: '3px 5px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.color = '#b06050'; e.currentTarget.style.borderColor = 'rgba(176,96,80,0.3)'; e.currentTarget.style.background = 'rgba(176,96,80,0.06)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.color = '#9e9a97'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.background = 'none'; }}
                        >
                          <ArrowRight size={13} />
                        </button>
                      )}

                      <button
                        onClick={(e) => { e.stopPropagation(); removeCheckItem(idx, itemIdx); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ccc',
                          padding: '2px',
                          transition: 'color 0.2s ease',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#f44336'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#ccc'}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}

                {/* Add-item input — glass themed with project selector */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Add a task..."
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addCheckItem(idx); }}
                    className="checklist-add-input"
                    style={{ flex: 1, minWidth: '120px' }}
                  />
                  <select
                    value={newItemProject}
                    onChange={(e) => setNewItemProject(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '10px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      fontSize: '0.75rem',
                      background: 'rgba(255,255,255,0.7)',
                      color: '#555',
                      cursor: 'pointer',
                      maxWidth: '160px',
                    }}
                  >
                    {PROJECT_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => addCheckItem(idx)}
                    style={{
                      background: 'linear-gradient(135deg, #b06050 0%, #c47a6a 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      transition: 'all 0.25s ease',
                      boxShadow: '0 2px 6px rgba(176,96,80,0.2)',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(176,96,80,0.3)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(176,96,80,0.2)'; }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Active Portfolio with Accordion — Click to open detail */}
      <h3 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.1rem', fontWeight: 600 }}>Active Portfolio</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {apps.map((app, idx) => (
          <div
            key={app.title}
            className="glass-panel"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: '#fff',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              border: expandedApp === idx ? '1px solid rgba(209, 90, 69, 0.3)' : undefined,
              boxShadow: expandedApp === idx ? '0 8px 24px rgba(176,96,80,0.12), 0 2px 8px rgba(0,0,0,0.06)' : undefined,
            }}
            onClick={() => setExpandedApp(expandedApp === idx ? null : idx)}
            onMouseOver={(e) => { if (expandedApp !== idx) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h4 style={{ fontSize: '1.1rem', color: '#222', fontWeight: 600 }}>{app.title}</h4>
              <div style={{ color: '#aaa' }}>
                {expandedApp === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: app.color }}></div>
              <span style={{ fontSize: '0.85rem', color: '#555', fontWeight: 500 }}>{app.status}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#888' }}>Arr/MRR</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#333' }}>{app.mrr}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#888' }}>Users</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#333' }}>{app.active}</div>
              </div>
            </div>

            {/* Expanded Detail Section */}
            {expandedApp === idx && (
              <div style={{
                borderTop: '1px solid rgba(0,0,0,0.06)',
                paddingTop: '1rem',
                animation: 'fadeIn 0.2s ease',
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>Description</div>
                  <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.5 }}>{app.description}</p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>Progress</div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${app.progress}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${app.color}, ${app.color}dd)`,
                      borderRadius: '4px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>{app.progress}% complete</div>
                </div>

                {/* Pipeline Stage */}
                {app.pipelineStage && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>Pipeline Stage</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1,2,3,4,5,6,7,8].map(s => (
                        <div key={s} style={{
                          flex: 1, height: '6px', borderRadius: '3px',
                          background: s <= app.pipelineStage ? app.color : 'rgba(0,0,0,0.06)',
                          transition: 'background 0.3s ease',
                        }} />
                      ))}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '4px' }}>
                      Stage {app.pipelineStage}: {stages[app.pipelineStage - 1]?.name || 'Unknown'}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    background: app.status === 'Live' ? 'rgba(76,175,80,0.12)' : app.status === 'In Development' ? 'rgba(255,152,0,0.12)' : 'rgba(33,150,243,0.12)',
                    color: app.color,
                    fontWeight: 600,
                  }}>
                    {app.status}
                  </span>
                  <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '10px', background: 'rgba(0,0,0,0.04)', color: '#666' }}>
                    {app.active} active users
                  </span>
                  <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '10px', background: 'rgba(0,0,0,0.04)', color: '#666' }}>
                    {app.mrr} MRR
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {app.vercelUrl && (
                    <a
                      href={app.vercelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '6px 14px', borderRadius: '8px',
                        border: '1px solid rgba(76,175,80,0.3)',
                        background: 'rgba(76,175,80,0.08)',
                        color: '#388e3c', fontSize: '0.75rem', fontWeight: 600,
                        textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                      }}
                    >
                      <ExternalLink size={12} /> Open Live App
                    </a>
                  )}
                  {app.githubUrl && (
                    <a
                      href={app.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '6px 14px', borderRadius: '8px',
                        border: '1px solid rgba(0,0,0,0.1)',
                        background: 'rgba(0,0,0,0.04)',
                        color: '#333', fontSize: '0.75rem', fontWeight: 600,
                        textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                      }}
                    >
                      <Code size={12} /> GitHub Repo
                    </a>
                  )}
                  <Link
                    to="/"
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 14px', borderRadius: '8px',
                      border: '1px solid rgba(176,96,80,0.25)',
                      background: 'rgba(176,96,80,0.08)',
                      color: '#b06050', fontSize: '0.75rem', fontWeight: 600,
                      textDecoration: 'none', transition: 'all 0.2s ease',
                    }}
                  >
                    <ArrowRight size={12} /> Command Center
                  </Link>
                  <Link
                    to={`/project/${app.projectId || ''}`}
                    onClick={e => { e.stopPropagation(); if (!app.projectId) e.preventDefault(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 14px', borderRadius: '8px',
                      border: '1px solid rgba(25,118,210,0.25)',
                      background: app.projectId ? 'rgba(25,118,210,0.08)' : 'rgba(0,0,0,0.03)',
                      color: app.projectId ? '#1565c0' : '#999',
                      fontSize: '0.75rem', fontWeight: 600,
                      textDecoration: 'none', transition: 'all 0.2s ease',
                      cursor: app.projectId ? 'pointer' : 'default',
                    }}
                  >
                    <FileText size={12} /> {app.projectId ? 'Project Passport' : 'No Project Linked'}
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};

export default AppStudio;
