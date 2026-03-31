import React, { useState } from 'react';
import { Code, Rocket, Edit3, Bug, Play, Server, Send, CheckCircle, Plus, ChevronDown, ChevronUp, X, ArrowRight, Check } from 'lucide-react';

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
  const apps = [
    { title: 'College Career OS', status: 'Live', mrr: '$1,200', active: '842', color: '#4caf50', description: 'End-to-end career management platform for university students. Features interview prep, resume builder, and job tracking.', progress: 95 },
    { title: 'Stretching App (Romy)', status: 'In Development', mrr: '$0', active: '0', color: '#ff9800', description: 'Clinical stretching and mobility app designed for rehab patients. Currently building exercise library and video integration.', progress: 40 },
    { title: 'Art Portfolio (Avery)', status: 'Planning', mrr: '$0', active: '0', color: '#2196f3', description: 'Minimalist portfolio builder for visual artists. Planning phase — wireframes and feature spec in progress.', progress: 10 },
  ];

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

  // Move item from pipeline to portfolio (mark done + flash)
  const moveToPortfolio = (stageIdx, itemIdx) => {
    // Mark as done
    setChecklists(prev => {
      const updated = { ...prev };
      updated[stageIdx] = [...updated[stageIdx]];
      updated[stageIdx][itemIdx] = { ...updated[stageIdx][itemIdx], done: true };
      return updated;
    });
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
        <Code color="#d15a45" /> Labno Labs App Studio
      </h1>

      <p style={{ marginBottom: '2rem', color: '#555', maxWidth: '800px' }}>
        This is your internal factory. Launch new applications, manage the exact lifecycle of an app from idea to client hand-off, and track global statistics.
      </p>

      {/* The 8 Stages of App Development (Clickable Logic) */}
      <h3 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.1rem', fontWeight: 600 }}>Action Pipeline</h3>
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

            {/* Checklist Panel — Elegant Glass Design */}
            {openStage === idx && (
              <div
                style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.45)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderTop: '1px solid rgba(0,0,0,0.04)',
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderBottomLeftRadius: '20px',
                  borderBottomRightRadius: '20px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
                  animation: 'fadeIn 0.25s ease',
                }}
              >
                {(checklists[idx] || []).length === 0 && (
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

      {/* Active Portfolio with Accordion */}
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
              transition: 'all 0.2s',
              border: expandedApp === idx ? '1px solid rgba(209, 90, 69, 0.3)' : undefined,
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

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};

export default AppStudio;
