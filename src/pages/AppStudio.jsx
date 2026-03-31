import React, { useState } from 'react';
import { Code, Rocket, Edit3, Bug, Play, Server, Send, CheckCircle, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';

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
    0: [{ text: 'Initialize Next.js project', done: false }, { text: 'Install core dependencies', done: false }, { text: 'Set up API bridge', done: false }],
    1: [{ text: 'Draft feature list', done: false }, { text: 'Map user stories', done: false }, { text: 'Prioritize MVP scope', done: false }],
    2: [{ text: 'Create wireframes in Figma', done: false }, { text: 'Define color palette', done: false }, { text: 'Build component library', done: false }],
    3: [{ text: 'Write unit tests', done: false }, { text: 'Run integration tests', done: false }, { text: 'Check error logs', done: false }],
    4: [{ text: 'Deploy to Vercel preview', done: false }, { text: 'Test on mobile devices', done: false }, { text: 'Share preview link', done: false }],
    5: [{ text: 'Merge to main branch', done: false }, { text: 'Verify production build', done: false }, { text: 'Monitor error rates', done: false }],
    6: [{ text: 'Map custom domain DNS', done: false }, { text: 'Set up client permissions', done: false }, { text: 'Send onboarding email', done: false }],
    7: [{ text: 'Archive project repo', done: false }, { text: 'Lock telemetry config', done: false }, { text: 'Final QA sign-off', done: false }],
  };

  const [openStage, setOpenStage] = useState(null);
  const [checklists, setChecklists] = useState(defaultChecklists);
  const [newItemText, setNewItemText] = useState('');

  // Task 9: Portfolio accordion
  const [expandedApp, setExpandedApp] = useState(null);

  const toggleStage = (idx) => {
    setOpenStage(openStage === idx ? null : idx);
    setNewItemText('');
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
      updated[stageIdx] = [...(updated[stageIdx] || []), { text: newItemText.trim(), done: false }];
      return updated;
    });
    setNewItemText('');
  };

  const removeCheckItem = (stageIdx, itemIdx) => {
    setChecklists(prev => {
      const updated = { ...prev };
      updated[stageIdx] = updated[stageIdx].filter((_, i) => i !== itemIdx);
      return updated;
    });
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

            {/* Checklist Panel */}
            {openStage === idx && (
              <div
                className="glass-panel"
                style={{
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.85)',
                  borderTop: '1px solid rgba(0,0,0,0.06)',
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                {(checklists[idx] || []).length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.5rem' }}>No items yet. Add one below.</p>
                )}
                {(checklists[idx] || []).map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 0',
                      borderBottom: '1px solid rgba(0,0,0,0.04)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleCheckItem(idx, itemIdx)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#d15a45' }}
                    />
                    <span style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: item.done ? '#aaa' : '#333',
                      textDecoration: item.done ? 'line-through' : 'none',
                      transition: 'all 0.2s',
                    }}>
                      {item.text}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCheckItem(idx, itemIdx); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '2px' }}
                      onMouseOver={(e) => e.currentTarget.style.color = '#f44336'}
                      onMouseOut={(e) => e.currentTarget.style.color = '#ccc'}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <input
                    type="text"
                    placeholder="Add a task..."
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addCheckItem(idx); }}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => addCheckItem(idx)}
                    style={{
                      background: '#d15a45',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                    }}
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
