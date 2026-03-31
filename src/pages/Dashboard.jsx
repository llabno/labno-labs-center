import React, { useState } from 'react';
import { Clock, CheckCircle, Plus, LayoutList, Calendar, CheckSquare, Flame, X, SplitSquareHorizontal } from 'lucide-react';

const Dashboard = () => {
  const [activeBoards, setActiveBoards] = useState([]); // Array of selected projects (up to 2)

  const stats = [
    { title: 'Unread Ventures & Ideas', value: '14', link: '#venturedesk' },
    { title: 'Daily Active Users (DAU)', value: '1,280', link: 'https://posthog.com/project/dau' },
    { title: 'Total Daily Revenue', value: '$450.00', link: 'https://app.lemonsqueezy.com/orders' },
  ];

  const internalProjects = [
    { id: 1, name: 'MOSO Data Sanitization & CRM Inject', status: 'Active', tasks: 12, completed: 4, dueDate: 'April 20', complexity: 'High', cost: '$$$' },
    { id: 2, name: 'GTM Digital Assets (Lemon Squeezy)', status: 'Planning', tasks: 8, completed: 0, dueDate: 'May 01', complexity: 'Med', cost: '$' },
    { id: 3, name: 'Clinical Blog + Sniper Agent (Vercel)', status: 'Blocked', tasks: 15, completed: 7, dueDate: 'April 28', complexity: 'High', cost: '$$' },
    { id: 4, name: 'Global Telemetry (PostHog Zipcodes)', status: 'Active', tasks: 5, completed: 1, dueDate: 'April 15', complexity: 'Low', cost: '$' },
    { id: 5, name: 'G-Cal Database Sync Node', status: 'Planning', tasks: 10, completed: 0, dueDate: 'May 10', complexity: 'Med', cost: '$$' },
  ];

  const hotList = internalProjects.filter(p => p.complexity === 'High' || p.status === 'Active');

  const toggleProjectBoard = (proj) => {
    if (activeBoards.find(b => b.id === proj.id)) {
      setActiveBoards(activeBoards.filter(b => b.id !== proj.id)); // close it
    } else {
      if (activeBoards.length >= 2) {
        // Replace the second board if 2 are already open
        setActiveBoards([activeBoards[0], proj]);
      } else {
        setActiveBoards([...activeBoards, proj]);
      }
    }
  };

  // Dynamic Kanban Data generator based on specific projects
  const getKanbanData = (projectName) => {
    if (projectName.includes('MOSO Data Sanitization')) {
      return {
        backlog: ['Identify MOSO Sheets via IDE API', 'Map HIPAA scrub fields'],
        triage: ['Draft CSV template for B2B Partners'],
        review: ['Review Python Script (Awaiting Lance)'],
        completed: ['Auth established']
      };
    } else if (projectName.includes('GTM Digital Assets')) {
      return {
        backlog: ['Draft "Stretch Guide" with Romy', 'Connect Lemon Squeezy API'],
        triage: ['Define "Oversubscribed" Email Sequence'],
        review: ['Review Pricing Margins'],
        completed: []
      };
    } else if (projectName.includes('Clinical Blog')) {
      return {
        backlog: ['Prompt Engineering for Sniper Agent', 'Disable public comments'],
        triage: ['RSS Feed logic in Vercel'],
        review: ['Review Output Format with Lance'],
        completed: ['Initialize Next.js blog']
      };
    } else if (projectName.includes('Telemetry')) {
      return {
        backlog: ['Build City/Zip Demographic Dash'],
        triage: ['Test PostHog Cookie Logic'],
        review: [],
        completed: ['Register PostHog']
      };
    } else if (projectName.includes('G-Cal')) {
      return {
        backlog: ['Map existing Lance G-Cal CRM', 'Draft Edge Function for two-way sync'],
        triage: ['OAuth with Google API'],
        review: [],
        completed: []
      };
    }

    return {
      backlog: [`Phase 1: ${projectName}`, `Review docs for ${projectName}`],
      triage: ['Define Technical Scope'],
      review: ['Awaiting Approval'],
      completed: ['Initialize Repo']
    };
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
              <p style={{ color: '#666', fontSize: '0.85rem' }}>Click up to 2 projects to open Side-by-Side Workflow Boards.</p>
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
                {internalProjects.map((proj) => {
                  const isActive = activeBoards.find(b => b.id === proj.id);
                  return (
                    <tr 
                      key={proj.id} 
                      style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', background: isActive ? 'rgba(255, 120, 100, 0.1)' : '#fff', cursor: 'pointer', transition: 'background 0.2s' }}
                      onClick={() => toggleProjectBoard(proj)}
                    >
                      <td style={{ padding: '1rem', color: '#222', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <LayoutList size={16} color={isActive ? '#d15a45' : '#888'} /> {proj.name}
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. The Hot List */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(180deg, rgba(255,120,100,0.05) 0%, rgba(255,255,255,0.4) 100%)' }}>
          <h3 style={{ color: '#d32f2f', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
            <Flame size={20} /> The Hot List
          </h3>
          <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>Projects demanding immediate action. Click to append to Workflow board.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {hotList.map(item => {
              const isActive = activeBoards.find(b => b.id === item.id);
              return (
                <div key={item.id} onClick={() => toggleProjectBoard(item)} style={{ padding: '1rem', background: isActive ? '#fff3e0' : '#fff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', cursor: 'pointer', borderLeft: '3px solid #d32f2f' }}>
                  <div style={{ fontWeight: 600, color: '#222' }}>{item.name}</div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.75rem' }}>
                    <span style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>Cost: {item.cost}</span>
                    <span style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>Due: {item.dueDate}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 4. Global Workflow (Side-by-Side Kanban) */}
      {activeBoards.length > 0 ? (
        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflow: 'hidden' }}>
          {activeBoards.map(board => {
            const data = getKanbanData(board.name);
            return (
              <div key={board.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ color: '#333', fontSize: '1.1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Workflow: {board.name}</h3>
                  </div>
                  <button onClick={() => toggleProjectBoard(board)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#666' }}>
                    <X size={16} /> Close
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', flex: 1, overflowX: 'auto' }}>
                  <div className="kanban-column" style={{ minWidth: '200px' }}>
                    <div className="kanban-header">Backlog</div>
                    {data.backlog.map((t, i) => <div key={i} className="task-card glass-panel" style={{ background: '#fff' }}><h4>{t}</h4></div>)}
                  </div>
                  
                  <div className="kanban-column" style={{ minWidth: '200px' }}>
                    <div className="kanban-header">Needs Triage</div>
                    {data.triage.map((t, i) => <div key={i} className="task-card glass-panel" style={{ background: '#fff', borderLeft: '4px solid #1976d2' }}><h4>{t}</h4></div>)}
                  </div>

                  <div className="kanban-column" style={{ minWidth: '200px' }}>
                    <div className="kanban-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="#ed8a19" /> Review
                    </div>
                    {data.review.map((t, i) => <div key={i} className="task-card glass-panel" style={{ background: '#fff', borderLeft: '4px solid #ffaa00' }}><h4>{t}</h4></div>)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: '#777', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <SplitSquareHorizontal size={32} color="#aaa" />
          Click up to two projects from the tables above to load and compare their Kanban execution boards side-by-side.
        </div>
      )}

    </div>
  );
};

export default Dashboard;
