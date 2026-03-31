import React from 'react';
import { Code, Rocket, Edit3, Bug, Play, Server, Send, CheckCircle } from 'lucide-react';

const AppStudio = () => {
  const apps = [
    { title: 'College Career OS', status: 'Live', mrr: '$1,200', active: '842', color: '#4caf50' },
    { title: 'Stretching App (Romy)', status: 'In Development', mrr: '$0', active: '0', color: '#ff9800' },
    { title: 'Art Portfolio (Avery)', status: 'Planning', mrr: '$0', active: '0', color: '#2196f3' },
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
          <div 
            key={idx} 
            className="glass-panel" 
            style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'all 0.2s', background: '#fff' }}
            onClick={() => alert(`Simulated Action: Opening phase ${stage.name}`)}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div>{stage.icon}</div>
            <div>
              <div style={{ fontWeight: 600, color: '#333', fontSize: '0.9rem' }}>{stage.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>{stage.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Production Ventues Grid */}
      <h3 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.1rem', fontWeight: 600 }}>Active Portfolio</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {apps.map(app => (
          <div key={app.title} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h4 style={{ fontSize: '1.1rem', color: '#222', fontWeight: 600 }}>{app.title}</h4>
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
          </div>
        ))}
      </div>

    </div>
  );
};

export default AppStudio;
