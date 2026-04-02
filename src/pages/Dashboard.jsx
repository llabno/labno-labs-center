import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Plus, LayoutList, Calendar, CheckSquare, Flame, X, SplitSquareHorizontal, ListFilter, ArrowRight, ExternalLink, ChevronDown, ChevronUp, Rocket } from 'lucide-react';
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
  const [showBacklog, setShowBacklog] = useState(false);
  const [collapsedBoards, setCollapsedBoards] = useState({});
  const [executingTasks, setExecutingTasks] = useState({});

  const executeTask = async (task, projectName) => {
    setExecutingTasks(prev => ({ ...prev, [task.id]: 'queued' }));
    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, taskTitle: task.title, projectName, context: `Assigned to: ${task.assigned_to}` })
      });
      const data = await res.json();
      if (data.success) {
        setExecutingTasks(prev => ({ ...prev, [task.id]: 'sent' }));
        setTimeout(() => setExecutingTasks(prev => { const n = { ...prev }; delete n[task.id]; return n; }), 2000);
        await fetchData();
      }
    } catch (err) {
      console.error('Agent execution failed:', err);
      setExecutingTasks(prev => { const n = { ...prev }; delete n[task.id]; return n; });
    }
  };

  const [liveStats, setLiveStats] = useState({ leads: 0, activePipeline: 0, sops: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [clinical, consulting, sops] = await Promise.all([
        supabase.from('moso_clinical_leads').select('id', { count: 'exact', head: true }),
        supabase.from('labno_consulting_leads').select('id', { count: 'exact', head: true }),
        supabase.from('oracle_sops').select('id', { count: 'exact', head: true }),
      ]);
      const clinicalActive = await supabase.from('moso_clinical_leads').select('id', { count: 'exact', head: true }).eq('status', 'Active');
      setLiveStats({
        leads: (clinical.count || 0) + (consulting.count || 0),
        activePipeline: clinicalActive.count || 0,
        sops: sops.count || 0,
      });
    };
    fetchStats();
  }, []);

  const stats = [
    { title: 'Total CRM Contacts', value: liveStats.leads.toLocaleString(), link: '/crm' },
    { title: 'Active Clinical Pipeline', value: liveStats.activePipeline.toLocaleString(), link: '/crm' },
    { title: 'Oracle SOPs Loaded', value: liveStats.sops.toLocaleString(), link: '/oracle' },
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
    if (assigneeFilter !== 'All') {
      const projectTasks = tasksByProject[p.id];
      if (projectTasks) {
        const allTasks = Object.values(projectTasks).flat();
        const hasAssignee = allTasks.some(t => (t.assigned_to || '').toLowerCase() === assigneeFilter.toLowerCase());
        if (!hasAssignee) return false;
      } else {
        return false;
      }
    }
    return true;
  });

  const toggleProjectBoard = (proj) => {
    // PostHog Tracking for Behavioral Analysis
    if (window.posthog) {
        window.posthog.capture('toggled_kanban_board', { project_name: proj.name, status: proj.status });
    }

    if (activeBoards.find(b => b.id === proj.id)) {
      setActiveBoards(activeBoards.filter(b => b.id !== proj.id));
    } else {
      if (activeBoards.length >= 4) {
        setActiveBoards([...activeBoards.slice(0, 3), proj]);
      } else {
        setActiveBoards([...activeBoards, proj]);
      }
    }
  };

  const toggleCollapseBoard = (boardId) => {
    setCollapsedBoards(prev => ({ ...prev, [boardId]: !prev[boardId] }));
  };

  const popOutBoard = (board) => {
    const data = getKanbanData(board.id);
    const html = `<!DOCTYPE html>
<html><head><title>Workflow: ${board.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f3f1; padding: 24px; color: #2e2c2a; }
  h1 { font-size: 1.3rem; margin-bottom: 20px; color: #2e2c2a; }
  .board { display: flex; gap: 16px; }
  .column { flex: 1; background: rgba(255,255,255,0.7); border-radius: 12px; padding: 16px; border: 1px solid rgba(0,0,0,0.06); }
  .col-header { font-weight: 600; font-size: 0.9rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .task { background: rgba(255,255,255,0.8); border: 1px solid rgba(0,0,0,0.05); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; font-size: 0.85rem; }
  .task .assignee { font-size: 0.72rem; color: #9e9a97; margin-top: 4px; }
</style></head><body>
<h1>Workflow: ${board.name}</h1>
<div class="board">
${COLUMNS.map(col => `
  <div class="column">
    <div class="col-header"><span class="dot" style="background:${COLUMN_DOTS[col]}"></span>${COLUMN_LABELS[col]}</div>
    ${(data[col] || []).map(t => `<div class="task">${t.title}${t.assigned_to ? `<div class="assignee">${t.assigned_to}</div>` : ''}</div>`).join('')}
  </div>
`).join('')}
</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'width=900,height=600,menubar=no,toolbar=no');
  };

  const getKanbanData = (projectId) => {
    const tasks = tasksByProject[projectId] || {};
    const filterByAssignee = (arr) => {
      if (assigneeFilter === 'All') return arr;
      return arr.filter(t => (t.assigned_to || '').toLowerCase() === assigneeFilter.toLowerCase());
    };
    const result = {};
    COLUMNS.forEach(col => { result[col] = filterByAssignee(tasks[col] || []); });
    return result;
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

      {/* Venture + Assignee Filters + Backlog Toggle */}
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
        <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.08)' }} />
        <button
          className={`filter-pill${showBacklog ? ' active' : ''}`}
          onClick={() => setShowBacklog(prev => !prev)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <ListFilter size={13} /> Show Backlog Overview
        </button>
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
                    onClick={() => {
                      if (window.posthog) window.posthog.capture('clicked_new_project_btn');
                      setShowNewProjectModal(true);
                    }}>
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
            const isCollapsed = collapsedBoards[board.id];
            return (
              <div key={board.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCollapsed ? 0 : '1rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ color: '#2e2c2a', fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Workflow: {board.name}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => toggleCollapseBoard(board.id)}
                      title={isCollapsed ? 'Expand board' : 'Collapse board'}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b6764', transition: 'color 0.2s ease', padding: '2px' }}
                    >
                      {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    <button
                      onClick={() => popOutBoard(board)}
                      title="Pop out to new window"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b6764', transition: 'color 0.2s ease', padding: '2px' }}
                    >
                      <ExternalLink size={15} />
                    </button>
                    <button onClick={() => toggleProjectBoard(board)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#6b6764', transition: 'color 0.2s ease' }}>
                      <X size={16} /> Close
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div style={{ display: 'flex', gap: '0.75rem', flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
                    {COLUMNS.map(col => {
                      const colStyles = {
                        triage: { borderLeft: '3px solid #5a8abf' },
                        review: { borderLeft: '3px solid #c49a40' },
                        completed: { borderLeft: '3px solid #6aab6e' },
                      };
                      return (
                        <div key={col} className="kanban-column" style={{ minWidth: '160px', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                          <div className="kanban-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', position: 'sticky', top: 0, background: 'inherit', zIndex: 1 }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: COLUMN_DOTS[col] }}></span>
                            {COLUMN_LABELS[col]}
                          </div>
                          {data[col].map(t => (
                            <div key={t.id} className={`task-card glass-panel${executingTasks[t.id] ? ' task-executing' : ''}`} style={{ background: 'rgba(255,255,255,0.55)', ...(colStyles[col] || {}), padding: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h4 style={{ fontSize: '0.9rem', flex: 1 }}>{t.title}</h4>
                                <button
                                  onClick={e => { e.stopPropagation(); executeTask(t, board.name); }}
                                  title="Execute with Agent"
                                  style={{ background: executingTasks[t.id] ? '#6aab6e' : 'rgba(176,96,80,0.15)', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s ease', marginLeft: '6px', flexShrink: 0 }}
                                >
                                  <Rocket size={12} color={executingTasks[t.id] ? '#fff' : '#b06050'} />
                                </button>
                              </div>
                              {executingTasks[t.id] === 'sent' && <p style={{ fontSize: '0.7rem', color: '#6aab6e', marginBottom: '2px' }}>Queued!</p>}
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
                )}
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

      {/* Backlog Overview */}
      {showBacklog && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: '#2e2c2a', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListFilter size={18} color="#b06050" /> Backlog Overview — All Projects
          </h3>
          {projects.filter(p => {
            const tasks = tasksByProject[p.id] || {};
            return (tasks['backlog'] || []).length > 0;
          }).length === 0 ? (
            <p style={{ color: '#8a8682', fontSize: '0.9rem' }}>No backlog tasks across any project.</p>
          ) : (
            projects.filter(p => {
              const tasks = tasksByProject[p.id] || {};
              return (tasks['backlog'] || []).length > 0;
            }).map(proj => {
              const backlogTasks = (tasksByProject[proj.id] || {})['backlog'] || [];
              return (
                <div key={proj.id} style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#3e3c3a', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    {proj.name}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {backlogTasks.map(task => (
                      <div key={task.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.45)',
                        border: '1px solid rgba(255,255,255,0.5)',
                        backdropFilter: 'blur(8px)',
                      }}>
                        <span style={{ flex: 1, fontSize: '0.85rem', color: '#2e2c2a', fontWeight: 500 }}>{task.title}</span>
                        {task.assigned_to && (
                          <span style={{ fontSize: '0.72rem', color: '#8a8682', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '8px' }}>
                            {task.assigned_to}
                          </span>
                        )}
                        <button
                          onClick={() => moveTask(task.id, 'triage')}
                          title="Move to Triage"
                          style={{
                            background: 'none',
                            border: '1px solid rgba(90,138,191,0.25)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#5a8abf',
                            padding: '3px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            transition: 'all 0.2s ease',
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(90,138,191,0.08)'; e.currentTarget.style.borderColor = 'rgba(90,138,191,0.4)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(90,138,191,0.25)'; }}
                        >
                          <ArrowRight size={12} /> Triage
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
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
