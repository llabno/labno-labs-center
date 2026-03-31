import React from 'react';
import { Code, GitPullRequest, TerminalSquare, AlertTriangle, MonitorPlay } from 'lucide-react';

const AppStudio = () => {
  const apps = [
    { title: 'College Career OS', status: 'Live', mrr: '$1,200', active: '842', color: '#4caf50' },
    { title: 'Stretching App (Romy)', status: 'In Development', mrr: '$0', active: '0', color: '#ff9800' },
    { title: 'Art Portfolio (Avery)', status: 'Planning', mrr: '$0', active: '0', color: '#2196f3' },
  ];

  return (
    <div className="main-content" style={{ padding: '1.5rem' }}>
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Code color="#d15a45" /> Labno Labs App Studio
      </h1>

      <p style={{ marginBottom: '2rem', color: '#555', maxWidth: '800px' }}>
        This is your internal factory. Launch new applications with the `labno-labs-starter-kit`, monitor Vercel deployments, and review Code-Agent pull requests overnight.
      </p>

      {/* Quick Launch Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '4px solid #1976d2', cursor: 'pointer' }}>
          <TerminalSquare size={24} color="#1976d2" />
          <div>
            <div style={{ fontWeight: 600, color: '#333' }}>Spin Up Starter Kit</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Next.js + Core UI + API Bridge</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '4px solid #9c27b0', cursor: 'pointer' }}>
          <GitPullRequest size={24} color="#9c27b0" />
          <div>
            <div style={{ fontWeight: 600, color: '#333' }}>Review Agent Code (3)</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Approve AI overnight branches</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '4px solid #d32f2f', cursor: 'pointer' }}>
          <AlertTriangle size={24} color="#d32f2f" />
          <div>
            <div style={{ fontWeight: 600, color: '#333' }}>Global Error Log Map</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Frontend crashes across all apps</div>
          </div>
        </div>
      </div>

      {/* Production Ventues Grid */}
      <h3 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.1rem', fontWeight: 600 }}>Active Portfolio</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {apps.map(app => (
          <div key={app.title} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h4 style={{ fontSize: '1.1rem', color: '#222', fontWeight: 600 }}>{app.title}</h4>
              <MonitorPlay size={18} color="#888" style={{ cursor: 'pointer' }}/>
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
