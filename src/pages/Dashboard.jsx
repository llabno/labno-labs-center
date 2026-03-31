import React from 'react';
import { Home, Lightbulb, Activity, CheckCircle, Clock } from 'lucide-react';

const Dashboard = () => {
  const stats = [
    { title: 'Unread Ventures & Ideas', value: '14' },
    { title: 'Daily Active Users (DAU)', value: '1,280' },
    { title: 'Total Daily Revenue', value: '$450.00' },
  ];

  return (
    <div className="main-content">
      {/* Top Value Stats Grid */}
      <h1 className="page-title">Executive Overview</h1>
      
      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.title} className="stat-card glass-panel">
            <span className="stat-title">{s.title}</span>
            <span className="stat-value">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Kanban Board Layout */}
      <div className="kanban-board glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.2rem', fontWeight: 600 }}>Global Workflow & Edge Cases</h3>
        
        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflow: 'hidden' }}>
          {/* Column 1 */}
          <div className="kanban-column">
            <div className="kanban-header">Backlog / Needs Triage</div>
            
            <div className="task-card glass-panel">
              <h4>Setup Vercel Custom Subdomains</h4>
              <p>Configure *.labnolabs.com explicitly to reduce client DNS failure rates.</p>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', background: '#ffebee', color: '#c62828', padding: '2px 8px', borderRadius: '10px' }}>High Complexity (8)</span>
              </div>
            </div>
            
            <div className="task-card glass-panel">
              <h4>Rebrand "College Career OS"</h4>
              <p>Need to run a split test on new naming conventions for 18-22 demographics.</p>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: '10px' }}>Low Complexity (2)</span>
              </div>
            </div>
          </div>
          
          {/* Column 2 */}
          <div className="kanban-column">
            <div className="kanban-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#ed8a19" /> Awaiting Lance's Review
            </div>
            
            <div className="task-card glass-panel" style={{ borderLeft: '4px solid #ffaa00' }}>
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
            
            <div className="task-card glass-panel" style={{ opacity: 0.6 }}>
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
