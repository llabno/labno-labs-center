import React, { useState } from 'react';
import { Clock, CheckCircle, Plus, LayoutList, Calendar, CheckSquare } from 'lucide-react';

const Dashboard = () => {
  const [activeView, setActiveView] = useState('timeline'); // timeline | kanban

  const stats = [
    { title: 'Unread Ventures & Ideas', value: '14' },
    { title: 'Daily Active Users (DAU)', value: '1,280' },
    { title: 'Total Daily Revenue', value: '$450.00' },
  ];

  const internalProjects = [
    { name: 'Workspace Redesign Phase 2', status: 'Active', tasks: 12, completed: 4, dueDate: 'April 15' },
    { name: 'Employee Handbook Auto-Generation', status: 'Planning', tasks: 5, completed: 0, dueDate: 'April 22' },
    { name: 'Financial Pipeline Audit', status: 'Blocked', tasks: 8, completed: 7, dueDate: 'March 31' },
  ];

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Executive Summary */}
      <div>
        <h1 className="page-title">Executive Mission Control</h1>
        <div className="stats-grid">
          {stats.map((s) => (
            <div key={s.title} className="stat-card glass-panel">
              <span className="stat-title">{s.title}</span>
              <span className="stat-value">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Internal Operations & Workspace Projects (Non-App Ventures) */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ color: '#333', fontSize: '1.2rem', fontWeight: 600 }}>Internal Operations & Projects</h3>
            <p style={{ color: '#666', fontSize: '0.85rem' }}>Workspace design, systems, and company consulting tasks.</p>
          </div>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
            <Plus size={16} /> New Project
          </button>
        </div>

        {/* Project Timeline Table */}
        <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <th style={{ padding: '1rem', color: '#444', fontWeight: 600, width: '40%' }}>Project Name</th>
                <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Timeline / Due</th>
                <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Progress</th>
                <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {internalProjects.map((proj, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', background: '#fff' }}>
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
                      <div style={{ flex: 1, height: '6px', background: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${(proj.completed / proj.tasks) * 100}%`, height: '100%', background: '#d15a45' }}></div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#666', minWidth: '40px' }}>{proj.completed}/{proj.tasks}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', 
                      background: proj.status === 'Active' ? '#e8f5e9' : proj.status === 'Planning' ? '#e3f2fd' : '#ffebee',
                      color: proj.status === 'Active' ? '#2e7d32' : proj.status === 'Planning' ? '#1565c0' : '#c62828'
                    }}>
                      {proj.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Global Workflow (Kanban & Tactical Task Generation) */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ color: '#333', fontSize: '1.2rem', fontWeight: 600 }}>Global Workflow & Edge Cases</h3>
            <p style={{ color: '#666', fontSize: '0.85rem' }}>AI Agent syncs, software bugs, and tactical daily executions.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', padding: '0.5rem 1rem', background: '#333', color: '#fff' }}>
              <CheckSquare size={16} /> Generate Phase Tasks
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflow: 'hidden' }}>
          {/* Column 1 */}
          <div className="kanban-column">
            <div className="kanban-header">Backlog / Needs Triage</div>
            <div className="task-card glass-panel" style={{ background: '#fff' }}>
              <h4>Setup Vercel Custom Subdomains</h4>
              <p>Configure *.labnolabs.com explicitly to reduce client DNS failure rates.</p>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', background: '#ffebee', color: '#c62828', padding: '2px 8px', borderRadius: '10px' }}>Complexity: 8</span>
              </div>
            </div>
          </div>
          
          {/* Column 2 */}
          <div className="kanban-column">
            <div className="kanban-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#ed8a19" /> Awaiting Lance's Review
            </div>
            <div className="task-card glass-panel" style={{ borderLeft: '4px solid #ffaa00', background: '#fff' }}>
              <h4>Intern Onboarding Sync</h4>
              <p>The Oracle has finished parsing `Audio_Internship.md`. Click to approve sync to the Second Brain API.</p>
              <button className="btn-primary" style={{ marginTop: '1rem', width: '100%', padding: '0.5rem' }}>Approve Sync</button>
            </div>
          </div>

          {/* Column 3 */}
          <div className="kanban-column">
            <div className="kanban-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} color="#2e7d32" /> Completed Tasks
            </div>
            <div className="task-card glass-panel" style={{ opacity: 0.6, background: '#fff' }}>
              <h4>Install Labno Labs Starter Kit</h4>
              <p>Initialized Apple Glass aesthetic UI globally, fixed Vercel auto-deployments, and built infrastructure.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
