import React, { useState } from 'react';
import { Clock, CheckCircle, Plus, LayoutList, Calendar, CheckSquare, Flame, X } from 'lucide-react';

const Dashboard = () => {
  const [selectedProject, setSelectedProject] = useState(null);

  const stats = [
    { title: 'Unread Ventures & Ideas', value: '14', link: '#venturedesk' },
    { title: 'Daily Active Users (DAU)', value: '1,280', link: 'https://posthog.com/project/dau' },
    { title: 'Total Daily Revenue', value: '$450.00', link: 'https://app.lemonsqueezy.com/orders' },
  ];

  const internalProjects = [
    { id: 1, name: 'Workspace Redesign Phase 2', status: 'Active', tasks: 12, completed: 4, dueDate: 'April 15', complexity: 'High', cost: '$$$' },
    { id: 2, name: 'Employee Handbook Auto-Generation', status: 'Planning', tasks: 5, completed: 0, dueDate: 'April 22', complexity: 'Low', cost: '$' },
    { id: 3, name: 'Labno Labs Website V1', status: 'Blocked', tasks: 8, completed: 7, dueDate: 'March 31', complexity: 'High', cost: '$$' },
  ];

  const hotList = internalProjects.filter(p => p.complexity === 'High' || p.status === 'Active');

  // Simulated Kanban Data for the Selected Project
  const kanbanData = {
    backlog: ['Setup Cloudflare DNS', 'Map IDE Folders'],
    triage: ['Approve Theme Colors'],
    review: ['Review Copywriting (Sarah)'],
    completed: ['Buy Domain']
  };

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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* 2. Internal Operations & Workspace Projects */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ color: '#333', fontSize: '1.2rem', fontWeight: 600 }}>Top Internal Operations & Projects</h3>
              <p style={{ color: '#666', fontSize: '0.85rem' }}>Click a project row to open its specific Kanban Board.</p>
            </div>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                    onClick={() => alert("Simulated: Open 'New Project' Creation Modal")}>
              <Plus size={16} /> New Project
            </button>
          </div>

          <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Project Name</th>
                  <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Timeline</th>
                  <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {internalProjects.map((proj) => (
                  <tr 
                    key={proj.id} 
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', background: selectedProject?.id === proj.id ? 'rgba(255, 120, 100, 0.1)' : '#fff', cursor: 'pointer' }}
                    onClick={() => setSelectedProject(proj)}
                  >
                    <td style={{ padding: '1rem', color: '#222', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <LayoutList size={16} color="#888" /> {proj.name}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#666', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14}/> {proj.dueDate}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, height: '6px', background: '#eee', borderRadius: '4px', overflow: 'hidden', width: '60px' }}>
                          <div style={{ width: `${(proj.completed / proj.tasks) * 100}%`, height: '100%', background: '#d15a45' }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. The Hot List */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(180deg, rgba(255,120,100,0.05) 0%, rgba(255,255,255,0.4) 100%)' }}>
          <h3 style={{ color: '#d32f2f', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
            <Flame size={20} /> The Hot List
          </h3>
          <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>Projects demanding immediate action based on deadline or high ROI promise.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {hotList.map(item => (
              <div key={item.id} onClick={() => setSelectedProject(item)} style={{ padding: '1rem', background: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', cursor: 'pointer', borderLeft: '3px solid #d32f2f' }}>
                <div style={{ fontWeight: 600, color: '#222' }}>{item.name}</div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.75rem' }}>
                  <span style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>Cost: {item.cost}</span>
                  <span style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>Due: {item.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Global Workflow (Kanban) */}
      {selectedProject ? (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ color: '#333', fontSize: '1.2rem', fontWeight: 600 }}>Workflow: {selectedProject.name}</h3>
              <p style={{ color: '#666', fontSize: '0.85rem' }}>Specific execution tasks for this project.</p>
            </div>
            <button onClick={() => setSelectedProject(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#666' }}>
              <X size={16} /> Close Board
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflow: 'hidden' }}>
            <div className="kanban-column">
              <div className="kanban-header">Backlog</div>
              {kanbanData.backlog.map((t, i) => <div key={i} className="task-card glass-panel" style={{ background: '#fff' }}><h4>{t}</h4></div>)}
            </div>
            
            <div className="kanban-column">
              <div className="kanban-header">Needs Triage</div>
              {kanbanData.triage.map((t, i) => <div key={i} className="task-card glass-panel" style={{ background: '#fff', borderLeft: '4px solid #1976d2' }}><h4>{t}</h4></div>)}
            </div>

            <div className="kanban-column">
              <div className="kanban-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#ed8a19" /> Awaiting Review
              </div>
              {kanbanData.review.map((t, i) => <div key={i} className="task-card glass-panel" style={{ background: '#fff', borderLeft: '4px solid #ffaa00' }}><h4>{t}</h4></div>)}
            </div>

            <div className="kanban-column">
              <div className="kanban-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} color="#2e7d32" /> Completed
              </div>
              {kanbanData.completed.map((t, i) => <div key={i} className="task-card glass-panel" style={{ opacity: 0.6, background: '#fff' }}><h4>{t}</h4></div>)}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: '#777' }}>
          Click a project from the tables above to load its Kanban execution board.
        </div>
      )}

    </div>
  );
};

export default Dashboard;
