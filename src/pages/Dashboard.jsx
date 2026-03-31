import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Plus, LayoutList, Calendar, CheckSquare, Flame, X, SplitSquareHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';

const COLUMNS = ['backlog', 'triage', 'review', 'completed'];
const COLUMN_LABELS = { backlog: 'Backlog', triage: 'Needs Triage', review: 'Review', completed: 'Completed' };
const COLUMN_DOTS = { backlog: '#9e9a97', triage: '#5a8abf', review: '#c49a40', completed: '#6aab6e' };

const VENTURE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'clinical', label: 'Clinical (MOSO)' },
  { key: 'consulting', label: 'Consulting (Labno Labs)' },
  { key: 'apps', label: 'Apps' },
];

const ASSIGNEE_FILTERS = ['All', 'Lance', 'Avery', 'Romy', 'Sarah', 'Agent'];

const inferCategory = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('moso') || n.includes('clinical') || n.includes('sanitization')) return 'clinical';
  if (n.includes('gtm') || n.includes('lemon') || n.includes('lead') || n.includes('consulting')) return 'consulting';
  if (n.includes('blog') || n.includes('telemetry') || n.includes('g-cal') || n.includes('ui/ux') || n.includes('center')) return 'apps';
  return 'all';
};

const Dashboard = () => {
  const [activeBoards, setActiveBoards] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasksByProject, setTasksByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [newTaskInputs, setNewTaskInputs] = useState({});
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', status: 'Active', due_date: '', complexity: 1 });
  const [ventureFilter, setVentureFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('All');

  const stats = [
    { title: 'Unread Ventures & Ideas', value: '14', link: '#venturedesk' },
    { title: 'Daily Active Users (DAU)', value: '1,280', link: 'https://posthog.com/project/dau' },
    { title: 'Total Daily Revenue', value: '$450.00', link: 'https://app.lemonsqueezy.com/orders' },
  ];

  const fetchData = async () => {
    const { data: projData, error: projErr } = await supabase
      .from('internal_projects').select('*').order('due_date', { ascending: true });
    if (projErr) { console.error('Error fetching projects:', projErr); setLoading(false); return; }
    setProjects(projData || []);

    const { data: taskData, error: taskErr } = await supabase.from('global_tasks').select('*');
    if (!taskErr && taskData) {
      const grouped = {};
      taskData.forEach(t => {
        if (!grouped[t.project_id]) grouped[t.project_id] = {};
        const col = t.column_id || 'backlog';
        if (!grouped[t.project_id][col]) grouped[t.project_id][col] = [];
        grouped[t.project_id][col].push(t);
      });
      setTasksByProject(grouped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const moveTask = async (taskId, newColumnId) => {
    const { error } = await supabase.from('global_tasks').update({ column_id: newColumnId }).eq('id', taskId);
    if (error) { console.error('Error moving task:', error); return; }
    await fetchData();
  };

  const addTask = async (projectId) => {
    const title = (newTaskInputs[projectId] || '').trim();
    if (!title) return;
    const { error } = await supabase.from('global_tasks').insert({
      title, project_id: projectId, column_id: 'backlog', assigned_to: 'lance'
    });
    if (error) { console.error('Error adding task:', error); return; }
    setNewTaskInputs(prev => ({ ...prev, [projectId]: '' }));
    await fetchData();
  };

  const createProject = async () => {
    if (!newProject.name.trim()) return;
    const { error } = await supabase.from('internal_projects').insert({
      name: newProject.name.trim(),
      status: newProject.status,
      due_date: newProject.due_date || null,
      complexity: Number(newProject.complexity),
      total_tasks: 0,
      completed_tasks: 0,
    });
    if (error) { console.error('Error creating project:', error); return; }
    setShowNewProjectModal(false);
    setNewProject({ name: '', status: 'Active', due_date: '', complexity: 1 });
    await fetchData();
  };

  const costLabel = (c) => c >= 3 ? '$$$' : c >= 2 ? '$$' : '$';
  const formatDate = (dateStr) => {
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const hotList = projects.filter(p => p.complexity >= 3 || p.status === 'Active');

  const filteredProjects = projects.filter(p => {
    if (ventureFilter !== 'all' && inferCategory(p.name) !== ventureFilter) return false;
    return true;
  });

  const toggleProjectBoard = (proj) => {
    if (activeBoards.find(b => b.id === proj.id)) {
      setActiveBoards(activeBoards.filter(b => b.id !== proj.id));
    } else {
      if (activeBoards.length >= 4) {
        // Replace the last board if 4 are already open
        setActiveBoards([...activeBoards.slice(0, 3), proj]);
      } else {
        setActiveBoards([...activeBoards, proj]);
      }
    }
  };

  const getKanbanData = (projectId) => {
    const tasks = tasksByProject[projectId] || {};
    const filterByAssignee = (arr) => {
      if (assigneeFilter === 'All') return arr;
      return arr.filter(t => (t.assigned_to || '').toLowerCase() === assigneeFilter.toLowerCase());
    };
    return {
      backlog: filterByAssignee(tasks['backlog'] || []),
      triage: filterByAssignee(tasks['triage'] || []),
      review: filterByAssignee(tasks['review'] || []),
      completed: filterByAssignee(tasks['completed'] || []),
    };
  };

  if (loading) return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8682' }}>Loading dashboard...</div>
  );

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* 1. Executive Summary */}
      <div>
        <h1 className="page-title">Executive Mission Control</h1>
        <div className="stats-grid">
          {stats.map((s) => (
            <div key={s.title} className="stat-card glass-panel" style={{ cursor: 'pointer' }} onClick={() => window.open(s.link, '_blank')}>
              <span className="stat-title">{s.title}</span>
              <span className="stat-value">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Venture + Assignee Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div className="filter-bar">
          <span className="filter-label">Venture</span>
          {VENTURE_FILTERS.map(f => (
            <button key={f.key} className={`filter-pill${ventureFilter === f.key ? ' active' : ''}`} onClick={() => setVentureFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.08)' }} />
        <div className="filter-bar">
          <span className="filter-label">Assignee</span>
          {ASSIGNEE_FILTERS.map(name => (
            <button key={name} className={`filter-pill${assigneeFilter === name ? ' active' : ''}`} onClick={() => setAssigneeFilter(name)}>
              {name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* 2. Internal Operations & Workspace Projects */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ color: '#2e2c2a', fontSize: '1.2rem', fontWeight: 600 }}>Top Internal Operations & Projects</h3>
              <p style={{ color: '#6b6764', fontSize: '0.85rem' }}>Click up to 4 projects to open Side-by-Side Workflow Boards.</p>
            </div>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                    onClick={() => setShowNewProjectModal(true)}>
              <Plus size={16} /> New Project
            </button>
          </div>

          <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <th style={{ padding: '1rem', color: '#3e3c3a', fontWeight: 600 }}>Project Name</th>
                  <th style={{ padding: '1rem', color: '#3e3c3a', fontWeight: 600 }}>Timeline</th>
                  <th style={{ padding: '1rem', color: '#3e3c3a', fontWeight: 600 }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((proj) => {
                  const isActive = activeBoards.find(b => b.id === proj.id);
                  return (
                    <tr
                      key={proj.id}
                      style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', background: isActive ? 'rgba(176, 96, 80, 0.08)' : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'background 0.25s ease' }}
                      onClick={() => toggleProjectBoard(proj)}
                    >
                      <td style={{ padding: '1rem', color: '#1e1d1c', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <LayoutList size={16} color={isActive ? '#b06050' : '#8a8682'} /> {proj.name}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: '#6b6764', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14}/> {formatDate(proj.due_date)}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden', width: '60px' }}>
                            <div style={{ width: `${proj.total_tasks > 0 ? (proj.completed_tasks / proj.total_tasks) * 100 : 0}%`, height: '100%', background: '#b06050', transition: 'width 0.4s ease' }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. The Hot List */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(180deg, rgba(176,96,80,0.04) 0%, rgba(255,255,255,0.28) 100%)' }}>
          <h3 style={{ color: '#b04a3a', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
            <Flame size={20} /> The Hot List
          </h3>
          <p style={{ color: '#6b6764', fontSize: '0.85rem', marginBottom: '1rem' }}>Projects demanding immediate action. Click to open Workflow board.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {hotList.map(item => {
              const isActive = activeBoards.find(b => b.id === item.id);
              return (
                <div key={item.id} onClick={() => toggleProjectBoard(item)} style={{ padding: '1rem', background: isActive ? 'rgba(176,96,80,0.08)' : 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', cursor: 'pointer', borderLeft: '3px solid #b04a3a', transition: 'all 0.25s ease' }}>
                  <div style={{ fontWeight: 600, color: '#1e1d1c' }}>{item.name}</div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.75rem' }}>
                    <span style={{ background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: '4px', color: '#6b6764' }}>Cost: {costLabel(item.complexity)}</span>
                    <span style={{ background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: '4px', color: '#6b6764' }}>Due: {formatDate(item.due_date)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. Global Workflow (Side-by-Side Kanban - up to 4) */}
      {activeBoards.length > 0 ? (
        <div className="kanban-grid" data-boards={activeBoards.length}>
          {activeBoards.map(board => {
            const data = getKanbanData(board.id);
            return (
              <div key={board.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ color: '#2e2c2a', fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Workflow: {board.name}</h3>
                  </div>
                  <button onClick={() => toggleProjectBoard(board)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#6b6764', transition: 'color 0.2s ease' }}>
                    <X size={16} /> Close
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
                  {COLUMNS.map(col => {
                    const colStyles = {
                      triage: { borderLeft: '3px solid #5a8abf' },
                      review: { borderLeft: '3px solid #c49a40' },
                      completed: { borderLeft: '3px solid #6aab6e' },
                    };
                    return (
                      <div key={col} className="kanban-column" style={{ minWidth: '160px' }}>
                        <div className="kanban-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: COLUMN_DOTS[col] }}></span>
                          {COLUMN_LABELS[col]}
                        </div>
                        {data[col].map(t => (
                          <div key={t.id} className="task-card glass-panel" style={{ background: 'rgba(255,255,255,0.55)', ...(colStyles[col] || {}), padding: '1rem' }}>
                            <h4 style={{ fontSize: '0.9rem' }}>{t.title}</h4>
                            {t.assigned_to && (
                              <p style={{ fontSize: '0.7rem', color: '#9e9a97', marginBottom: '4px' }}>{t.assigned_to}</p>
                            )}
                            <select
                              className="kanban-select"
                              value={col}
                              onChange={e => moveTask(t.id, e.target.value)}
                              onClick={e => e.stopPropagation()}
                            >
                              {COLUMNS.map(c => (
                                <option key={c} value={c}>{COLUMN_LABELS[c]}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                        {col === 'backlog' && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                            <input
                              type="text"
                              placeholder="New task..."
                              value={newTaskInputs[board.id] || ''}
                              onChange={e => setNewTaskInputs(prev => ({ ...prev, [board.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') addTask(board.id); }}
                              style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)', transition: 'border-color 0.2s ease' }}
                            />
                            <button onClick={() => addTask(board.id)} style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '6px', border: 'none', background: '#b06050', color: '#fff', cursor: 'pointer', transition: 'opacity 0.2s ease' }}>
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: '#8a8682', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <SplitSquareHorizontal size={32} color="#b0ada9" />
          Click up to four projects from the tables above to load and compare their Kanban execution boards.
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowNewProjectModal(false)}>
          <div className="glass-panel" style={{ padding: '2rem', width: '400px', maxWidth: '90vw', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(32px)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#2e2c2a', fontSize: '1.1rem', fontWeight: 600 }}>New Project</h3>
              <button onClick={() => setShowNewProjectModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b6764' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px' }}>Project Name</label>
                <input type="text" value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.9rem', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px' }}>Status</label>
                <select value={newProject.status} onChange={e => setNewProject(p => ({ ...p, status: e.target.value }))} className="kanban-select" style={{ marginTop: 0, padding: '8px 28px 8px 10px', fontSize: '0.9rem' }}>
                  <option value="Active">Active</option>
                  <option value="Planning">Planning</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px' }}>Due Date</label>
                <input type="date" value={newProject.due_date} onChange={e => setNewProject(p => ({ ...p, due_date: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.9rem', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px' }}>Complexity</label>
                <select value={newProject.complexity} onChange={e => setNewProject(p => ({ ...p, complexity: e.target.value }))} className="kanban-select" style={{ marginTop: 0, padding: '8px 28px 8px 10px', fontSize: '0.9rem' }}>
                  <option value={1}>1 - Low</option>
                  <option value={2}>2 - Medium</option>
                  <option value={3}>3 - High</option>
                </select>
              </div>
              <button onClick={createProject} className="btn-primary" style={{ marginTop: '8px', padding: '10px', fontSize: '0.9rem', width: '100%' }}>Create Project</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
