import React, { useState, useEffect, useMemo } from 'react';
import { FolderKanban, CheckSquare, Plus, Calendar, Clock, AlertCircle, ChevronDown, ChevronRight, X, Trash2, Edit3, Users, Target, Filter, Search, Briefcase, LayoutGrid } from 'lucide-react';
import { supabase } from '../lib/supabase';

const STATUS_COLORS = {
  'Active': { bg: 'rgba(106, 171, 110, 0.12)', color: '#4a8a4e', dot: '#6aab6e' },
  'Planning': { bg: 'rgba(90, 138, 191, 0.12)', color: '#4a7aaf', dot: '#5a8abf' },
  'Blocked': { bg: 'rgba(196, 154, 64, 0.12)', color: '#a0803a', dot: '#c49a40' },
  'Completed': { bg: 'rgba(158, 154, 151, 0.12)', color: '#6b6764', dot: '#9e9a97' },
};

const COLUMN_LABELS = { backlog: 'Backlog', triage: 'Needs Triage', review: 'In Review', completed: 'Completed' };
const COLUMN_DOTS = { backlog: '#9e9a97', triage: '#5a8abf', review: '#c49a40', completed: '#6aab6e' };
const COLUMNS = ['backlog', 'triage', 'review', 'completed'];

const VENTURE_FILTERS = [
  { key: 'all', label: 'All Ventures' },
  { key: 'clinical', label: 'Clinical (MOSO)' },
  { key: 'consulting', label: 'Consulting (Labno Labs)' },
  { key: 'apps', label: 'Apps' },
];

const inferCategory = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('moso') || n.includes('clinical') || n.includes('sanitization') || n.includes('reactivation')) return 'clinical';
  if (n.includes('gtm') || n.includes('lemon') || n.includes('lead') || n.includes('consulting') || n.includes('agent infrastructure') || n.includes('agent security') || n.includes('cybernetic') || n.includes('plumbing') || n.includes('labno')) return 'consulting';
  if (n.includes('blog') || n.includes('telemetry') || n.includes('g-cal') || n.includes('ui/ux') || n.includes('center') || n.includes('app studio')) return 'apps';
  return 'all';
};

const TABS = [
  { key: 'all', label: 'All Projects', icon: LayoutGrid },
  { key: 'clients', label: 'Client Projects', icon: Briefcase },
  { key: 'search', label: 'Search', icon: Search },
];

const ProjectsTasks = () => {
  const [projects, setProjects] = useState([]);
  const [tasksByProject, setTasksByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ventureFilter, setVentureFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(null);
  const [newProject, setNewProject] = useState({ name: '', status: 'Active', due_date: '', complexity: 1, project_type: 'internal' });
  const [newTask, setNewTask] = useState({ title: '', description: '', assigned_to: 'lance', column_id: 'backlog' });
  const [editingTask, setEditingTask] = useState(null);
  const [hasProjectTypeColumn, setHasProjectTypeColumn] = useState(true);

  const fetchData = async () => {
    let { data: projData, error: projErr } = await supabase
      .from('internal_projects').select('*').order('due_date', { ascending: true });
    if (projErr && projErr.message && projErr.message.includes('project_type')) {
      setHasProjectTypeColumn(false);
      ({ data: projData, error: projErr } = await supabase
        .from('internal_projects').select('id,name,status,total_tasks,completed_tasks,due_date,complexity,created_at').order('due_date', { ascending: true }));
    }
    if (projErr) { console.error('Error fetching projects:', projErr); setLoading(false); return; }
    setProjects(projData || []);

    const { data: taskData, error: taskErr } = await supabase.from('global_tasks').select('*');
    if (!taskErr && taskData) {
      const grouped = {};
      taskData.forEach(t => {
        if (!grouped[t.project_id]) grouped[t.project_id] = [];
        grouped[t.project_id].push(t);
      });
      setTasksByProject(grouped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const createProject = async () => {
    if (!newProject.name.trim()) return;
    const insertData = {
      name: newProject.name.trim(),
      status: newProject.status,
      due_date: newProject.due_date || null,
      complexity: Number(newProject.complexity),
      total_tasks: 0,
      completed_tasks: 0,
    };
    if (hasProjectTypeColumn) insertData.project_type = newProject.project_type;
    const { error } = await supabase.from('internal_projects').insert(insertData);
    if (error) { console.error('Error creating project:', error); return; }
    setShowNewProjectModal(false);
    setNewProject({ name: '', status: 'Active', due_date: '', complexity: 1, project_type: 'internal' });
    if (window.posthog) window.posthog.capture('project_created', { name: newProject.name });
    await fetchData();
  };

  const addTask = async (projectId) => {
    if (!newTask.title.trim()) return;
    const { error } = await supabase.from('global_tasks').insert({
      title: newTask.title.trim(),
      description: newTask.description.trim() || null,
      project_id: projectId,
      column_id: newTask.column_id,
      assigned_to: newTask.assigned_to,
    });
    if (error) { console.error('Error adding task:', error); return; }
    setShowNewTaskModal(null);
    setNewTask({ title: '', description: '', assigned_to: 'lance', column_id: 'backlog' });
    if (window.posthog) window.posthog.capture('task_created', { project_id: projectId });
    await fetchData();
  };

  const moveTask = async (taskId, newColumnId) => {
    const { error } = await supabase.from('global_tasks').update({ column_id: newColumnId }).eq('id', taskId);
    if (error) { console.error('Error moving task:', error); return; }
    await fetchData();
  };

  const deleteTask = async (taskId) => {
    const { error } = await supabase.from('global_tasks').delete().eq('id', taskId);
    if (error) { console.error('Error deleting task:', error); return; }
    await fetchData();
  };

  const updateProjectStatus = async (projectId, newStatus) => {
    const { error } = await supabase.from('internal_projects').update({ status: newStatus }).eq('id', projectId);
    if (error) { console.error('Error updating project:', error); return; }
    await fetchData();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getProjectStats = (projectId) => {
    const tasks = tasksByProject[projectId] || [];
    const total = tasks.length;
    const completed = tasks.filter(t => t.column_id === 'completed').length;
    const blocked = tasks.filter(t => t.is_blocked).length;
    const inProgress = tasks.filter(t => t.column_id === 'triage' || t.column_id === 'review').length;
    return { total, completed, blocked, inProgress };
  };

  const ASSIGNEE_FILTERS = ['All', 'Lance', 'Avery', 'Romy', 'Sarah', 'Agent'];

  // Search results: matches in project names, task titles, and task descriptions
  const searchResults = useMemo(() => {
    if (activeTab !== 'search' || !searchQuery.trim()) return { projects: [], matchingTaskIds: new Set() };
    const q = searchQuery.toLowerCase();
    const matchingTaskIds = new Set();
    const matchedProjectIds = new Set();

    projects.forEach(p => {
      if (p.name.toLowerCase().includes(q)) matchedProjectIds.add(p.id);
      (tasksByProject[p.id] || []).forEach(t => {
        if (t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)) {
          matchingTaskIds.add(t.id);
          matchedProjectIds.add(p.id);
        }
      });
    });

    return {
      projects: projects.filter(p => matchedProjectIds.has(p.id)),
      matchingTaskIds,
    };
  }, [activeTab, searchQuery, projects, tasksByProject]);

  const filteredProjects = useMemo(() => {
    // Search tab uses its own results
    if (activeTab === 'search') return searchResults.projects;

    return projects.filter(p => {
      // Client tab filter
      if (activeTab === 'clients' && p.project_type !== 'client') return false;
      // Venture filter (only on "all" tab)
      if (activeTab === 'all' && ventureFilter !== 'all' && inferCategory(p.name) !== ventureFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (assigneeFilter !== 'All') {
        const projTasks = tasksByProject[p.id] || [];
        const hasAssignee = projTasks.some(t => (t.assigned_to || '').toLowerCase() === assigneeFilter.toLowerCase());
        if (!hasAssignee) return false;
      }
      return true;
    });
  }, [activeTab, projects, tasksByProject, searchResults, ventureFilter, statusFilter, assigneeFilter]);

  if (loading) return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8682' }}>Loading projects...</div>
  );

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
            <FolderKanban size={28} color="#b06050" /> Projects & Tasks
          </h1>
          <p style={{ color: '#6b6764', fontSize: '0.9rem' }}>
            {projects.length} projects &middot; {Object.values(tasksByProject).flat().length} total tasks &middot; {Object.values(tasksByProject).flat().filter(t => t.column_id === 'completed').length} completed
          </p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', padding: '0.6rem 1.2rem' }}
          onClick={() => setShowNewProjectModal(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 0 }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px',
              fontSize: '0.88rem', fontWeight: isActive ? 600 : 500,
              color: isActive ? '#b06050' : '#6b6764', background: 'none', border: 'none',
              borderBottom: isActive ? '2px solid #b06050' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '-1px',
            }}>
              <Icon size={16} /> {tab.label}
              {tab.key === 'clients' && (
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, background: isActive ? 'rgba(176,96,80,0.12)' : 'rgba(0,0,0,0.05)',
                  color: isActive ? '#b06050' : '#8a8682', padding: '1px 7px', borderRadius: '10px',
                }}>{projects.filter(p => p.project_type === 'client').length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search Bar (search tab only) */}
      {activeTab === 'search' && (
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8a8682', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search projects, tasks, descriptions..."
            autoFocus
            style={{
              width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.95rem', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)',
              outline: 'none', transition: 'border-color 0.2s ease',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(176,96,80,0.3)'}
            onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
          />
          {searchQuery && (
            <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', color: '#8a8682' }}>
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
      )}

      {/* Filters (all & clients tabs) */}
      {activeTab !== 'search' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          {activeTab === 'all' && (
            <>
              <div className="filter-bar">
                <span className="filter-label">Venture</span>
                {VENTURE_FILTERS.map(f => (
                  <button key={f.key} className={`filter-pill${ventureFilter === f.key ? ' active' : ''}`}
                    onClick={() => setVentureFilter(f.key)}>{f.label}</button>
                ))}
              </div>
              <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.08)' }} />
            </>
          )}
          <div className="filter-bar">
            <span className="filter-label">Status</span>
            {['all', 'Active', 'Planning', 'Blocked', 'Completed'].map(s => (
              <button key={s} className={`filter-pill${statusFilter === s ? ' active' : ''}`}
                onClick={() => setStatusFilter(s)}>
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
          <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.08)' }} />
          <div className="filter-bar">
            <span className="filter-label">Assignee</span>
            {ASSIGNEE_FILTERS.map(name => (
              <button key={name} className={`filter-pill${assigneeFilter === name ? ' active' : ''}`}
                onClick={() => setAssigneeFilter(name)}>
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {activeTab !== 'search' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {(() => {
            const scope = activeTab === 'clients' ? projects.filter(p => p.project_type === 'client') : projects;
            const scopeTasks = scope.flatMap(p => tasksByProject[p.id] || []);
            return [
              { label: 'Active', count: scope.filter(p => p.status === 'Active').length, color: '#6aab6e' },
              { label: 'Planning', count: scope.filter(p => p.status === 'Planning').length, color: '#5a8abf' },
              { label: 'Blocked', count: scope.filter(p => p.status === 'Blocked').length, color: '#c49a40' },
              { label: 'Tasks In Progress', count: scopeTasks.filter(t => t.column_id === 'triage' || t.column_id === 'review').length, color: '#b06050' },
            ];
          })().map(card => (
            <div key={card.label} className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: card.color }}>{card.count}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b6764', fontWeight: 500, marginTop: '4px' }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Projects List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredProjects.length === 0 && (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: '#8a8682' }}>
            No projects match the current filters.
          </div>
        )}

        {filteredProjects.map(proj => {
          const stats = getProjectStats(proj.id);
          const isExpanded = expandedProject === proj.id || (activeTab === 'search' && searchQuery.trim());
          const tasks = tasksByProject[proj.id] || [];
          const statusStyle = STATUS_COLORS[proj.status] || STATUS_COLORS['Active'];
          const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

          return (
            <div key={proj.id} className="glass-panel" style={{ overflow: 'hidden' }}>
              {/* Project Header */}
              <div
                style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.25s ease' }}
                onClick={() => setExpandedProject(isExpanded ? null : proj.id)}
              >
                {isExpanded ? <ChevronDown size={18} color="#6b6764" /> : <ChevronRight size={18} color="#6b6764" />}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '1.05rem', color: '#2e2c2a' }}>{proj.name}</span>
                    {proj.project_type === 'client' && (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                        background: 'rgba(90,138,191,0.12)', color: '#4a7aaf', textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>Client</span>
                    )}
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600, padding: '2px 10px', borderRadius: '12px',
                      background: statusStyle.bg, color: statusStyle.color, display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusStyle.dot, display: 'inline-block' }} />
                      {proj.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', color: '#8a8682' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {formatDate(proj.due_date)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckSquare size={12} /> {stats.completed}/{stats.total} tasks</span>
                    {stats.inProgress > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {stats.inProgress} in progress</span>}
                    {stats.blocked > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#c49a40' }}><AlertCircle size={12} /> {stats.blocked} blocked</span>}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: '120px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: '#b06050', transition: 'width 0.4s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#6b6764', fontWeight: 600, minWidth: '32px', textAlign: 'right' }}>{progress}%</span>
                </div>

                {/* Status dropdown */}
                <select
                  className="kanban-select"
                  value={proj.status}
                  onChange={e => { e.stopPropagation(); updateProjectStatus(proj.id, e.target.value); }}
                  onClick={e => e.stopPropagation()}
                  style={{ marginTop: 0, width: '120px', fontSize: '0.78rem' }}
                >
                  <option value="Active">Active</option>
                  <option value="Planning">Planning</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Expanded Task View */}
              {isExpanded && (
                <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0 0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3e3c3a' }}>Tasks ({tasks.length})</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowNewTaskModal(proj.id); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 500,
                        padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(176,96,80,0.2)',
                        background: 'rgba(176,96,80,0.06)', color: '#b06050', cursor: 'pointer', transition: 'all 0.25s ease'
                      }}
                    >
                      <Plus size={14} /> Add Task
                    </button>
                  </div>

                  {/* Grouped by column */}
                  {COLUMNS.map(col => {
                    const colTasks = tasks.filter(t => (t.column_id || 'backlog') === col);
                    if (colTasks.length === 0) return null;
                    return (
                      <div key={col} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLUMN_DOTS[col], display: 'inline-block' }} />
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#5a5856', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {COLUMN_LABELS[col]} ({colTasks.length})
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {colTasks.map(task => {
                            const isSearchHit = activeTab === 'search' && searchResults.matchingTaskIds.has(task.id);
                            return (
                            <div key={task.id} style={{
                              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                              borderRadius: '10px',
                              background: isSearchHit ? 'rgba(176,96,80,0.06)' : 'rgba(255,255,255,0.45)',
                              border: isSearchHit ? '1px solid rgba(176,96,80,0.15)' : '1px solid rgba(255,255,255,0.5)',
                              backdropFilter: 'blur(8px)', transition: 'all 0.25s ease',
                              borderLeft: `3px solid ${COLUMN_DOTS[col]}`,
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 500, color: '#2e2c2a', marginBottom: task.description ? '2px' : 0 }}>{task.title}</div>
                                {task.description && <div style={{ fontSize: '0.75rem', color: '#8a8682' }}>{task.description}</div>}
                              </div>
                              {task.assigned_to && (
                                <span style={{ fontSize: '0.7rem', color: '#8a8682', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                                  {task.assigned_to}
                                </span>
                              )}
                              <select
                                className="kanban-select"
                                value={col}
                                onChange={e => moveTask(task.id, e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{ marginTop: 0, width: '110px', fontSize: '0.72rem' }}
                              >
                                {COLUMNS.map(c => <option key={c} value={c}>{COLUMN_LABELS[c]}</option>)}
                              </select>
                              <button
                                onClick={() => deleteTask(task.id)}
                                title="Delete task"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0ada9', padding: '2px', transition: 'color 0.2s ease' }}
                                onMouseOver={e => e.currentTarget.style.color = '#d32f2f'}
                                onMouseOut={e => e.currentTarget.style.color = '#b0ada9'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {tasks.length === 0 && (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#b0ada9', fontSize: '0.85rem' }}>
                      No tasks yet. Click "Add Task" to get started.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowNewProjectModal(false)}>
          <div className="glass-panel" style={{ padding: '2rem', width: '420px', maxWidth: '90vw', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(32px)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#2e2c2a', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderKanban size={20} color="#b06050" /> New Project
              </h3>
              <button onClick={() => setShowNewProjectModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b6764' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px', fontWeight: 500 }}>Project Name</label>
                <input type="text" value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Lead Generation Pipeline"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.9rem', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px', fontWeight: 500 }}>Type</label>
                  <select value={newProject.project_type} onChange={e => setNewProject(p => ({ ...p, project_type: e.target.value }))} className="kanban-select" style={{ marginTop: 0, padding: '8px 28px 8px 10px', fontSize: '0.9rem' }}>
                    <option value="internal">Internal</option>
                    <option value="client">Client Project</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px', fontWeight: 500 }}>Status</label>
                  <select value={newProject.status} onChange={e => setNewProject(p => ({ ...p, status: e.target.value }))} className="kanban-select" style={{ marginTop: 0, padding: '8px 28px 8px 10px', fontSize: '0.9rem' }}>
                    <option value="Active">Active</option>
                    <option value="Planning">Planning</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px', fontWeight: 500 }}>Due Date</label>
                <input type="date" value={newProject.due_date} onChange={e => setNewProject(p => ({ ...p, due_date: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.9rem', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px', fontWeight: 500 }}>Complexity</label>
                <select value={newProject.complexity} onChange={e => setNewProject(p => ({ ...p, complexity: e.target.value }))} className="kanban-select" style={{ marginTop: 0, padding: '8px 28px 8px 10px', fontSize: '0.9rem' }}>
                  <option value={1}>$ Low</option>
                  <option value={2}>$$ Medium</option>
                  <option value={3}>$$$ High</option>
                </select>
              </div>
              <button onClick={createProject} className="btn-primary" style={{ marginTop: '8px', padding: '10px', fontSize: '0.9rem', width: '100%' }}>Create Project</button>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowNewTaskModal(null)}>
          <div className="glass-panel" style={{ padding: '2rem', width: '420px', maxWidth: '90vw', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(32px)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#2e2c2a', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={20} color="#b06050" /> New Task
              </h3>
              <button onClick={() => setShowNewTaskModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b6764' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px', fontWeight: 500 }}>Task Title</label>
                <input type="text" value={newTask.title} onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                  placeholder="e.g., Build sanitizer script"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.9rem', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px', fontWeight: 500 }}>Description (optional)</label>
                <textarea value={newTask.description} onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))}
                  placeholder="Details about this task..."
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', fontSize: '0.85rem', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px', fontWeight: 500 }}>Assigned To</label>
                  <select value={newTask.assigned_to} onChange={e => setNewTask(t => ({ ...t, assigned_to: e.target.value }))} className="kanban-select" style={{ marginTop: 0, padding: '8px 28px 8px 10px', fontSize: '0.85rem' }}>
                    <option value="lance">Lance</option>
                    <option value="avery">Avery</option>
                    <option value="romy">Romy</option>
                    <option value="sarah">Sarah</option>
                    <option value="agent">Agent</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#5a5856', marginBottom: '4px', fontWeight: 500 }}>Column</label>
                  <select value={newTask.column_id} onChange={e => setNewTask(t => ({ ...t, column_id: e.target.value }))} className="kanban-select" style={{ marginTop: 0, padding: '8px 28px 8px 10px', fontSize: '0.85rem' }}>
                    {COLUMNS.map(c => <option key={c} value={c}>{COLUMN_LABELS[c]}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => addTask(showNewTaskModal)} className="btn-primary" style={{ marginTop: '8px', padding: '10px', fontSize: '0.9rem', width: '100%' }}>Add Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsTasks;
