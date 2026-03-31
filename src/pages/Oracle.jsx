import React from 'react';
import { Database, UploadCloud, BrainCircuit, ShieldAlert, Cpu } from 'lucide-react';

const Oracle = () => {
  const sops = [
    { title: 'Audio_Internship_Protocol.md', status: 'Synced', visibility: 'Public Brain', rows: 450 },
    { title: 'Security_For_Vibe_Coded_Apps.md', status: 'Pending Approval', visibility: 'Private Brain (Internal Only)', rows: 120 },
    { title: 'CRM_Phase_3_Workflow.md', status: 'Synced', visibility: 'Private Brain (Internal Only)', rows: 890 },
    { title: 'Client_Pricing_Margins_2026.md', status: 'Blocked (Injection Risk)', visibility: 'Private Brain (Internal Only)', rows: 45 },
  ];

  return (
    <div className="main-content" style={{ padding: '1.5rem' }}>
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <BrainCircuit color="#d15a45" /> The Oracle (Second Brain API)
      </h1>
      
      <p style={{ marginBottom: '2rem', color: '#555', maxWidth: '800px' }}>
        The Oracle is your central pgvector knowledge retriever. Here you manage what SOPs and Workflow Captures are actively feeding the Labno Labs AI agents and the overnight dispatcher.
      </p>

      {/* Control Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#333' }}>Vector Sync Status</h3>
          <p style={{ color: '#777', fontSize: '0.9rem' }}>Last automated sync via GitHub Actions: <strong>2 hours ago</strong></p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UploadCloud size={18} />
          Force Manual Sync Now
        </button>
      </div>

      {/* SOP Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>SOP Document</th>
              <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Vector Rows</th>
              <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Visibility Tag</th>
              <th style={{ padding: '1rem', color: '#444', fontWeight: 600 }}>Agent Status</th>
            </tr>
          </thead>
          <tbody>
            {sops.map((doc, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <td style={{ padding: '1rem', color: '#222', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Database size={16} color="#888" /> {doc.title}
                </td>
                <td style={{ padding: '1rem', color: '#666' }}>{doc.rows}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '12px', 
                    fontSize: '0.8rem', 
                    background: doc.visibility === 'Public Brain' ? '#e8f5e9' : '#fff3e0',
                    color: doc.visibility === 'Public Brain' ? '#2e7d32' : '#e65100'
                  }}>
                    {doc.visibility}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {doc.status === 'Blocked (Injection Risk)' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d32f2f', fontSize: '0.9rem', fontWeight: 500 }}>
                      <ShieldAlert size={16} /> Blocked
                    </span>
                  ) : doc.status === 'Pending Approval' ? (
                     <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f57c00', fontSize: '0.9rem', fontWeight: 500 }}>
                     <Cpu size={16} /> Awaiting Lance
                   </span>
                  ) : (
                    <span style={{ color: '#388e3c', fontSize: '0.9rem', fontWeight: 500 }}>{doc.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Oracle;
