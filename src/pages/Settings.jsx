import React, { useState } from 'react';
import { Settings as SettingsIcon, Shield, Palette, Users, Key } from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('permissions');

  const employees = [
    { name: 'Lance Labno (Admin)', email: 'lance@labnolabs.com', role: 'Owner' },
    { name: 'Avery', email: 'avery@labnolabs.com', role: 'UX/UI Designer' },
    { name: 'Romy', email: 'romy@labnolabs.com', role: 'Clinical Apps' },
    { name: 'Sarah', email: 'sarah@labnolabs.com', role: 'Project Manager' },
  ];

  const clientProjects = [
    { client: 'Northwestern U', project: 'College Career OS', assigned: ['Lance', 'Sarah'] },
    { client: 'Rehab Hero LLC', project: 'Exercise DB V2', assigned: ['Lance', 'Romy'] },
  ];

  return (
    <div className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SettingsIcon color="#d15a45" /> Executive Login & Settings
      </h1>

      <div style={{ display: 'flex', gap: '2rem', flex: 1 }}>
        {/* Settings Sidebar */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            className={`nav-item ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
            style={{ width: '100%', textAlign: 'left', background: activeTab === 'permissions' ? 'rgba(255, 120, 100, 0.1)' : 'transparent', border: 'none' }}>
            <Shield size={18} /> Global Permissions (Admin)
          </button>
          <button 
            className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
            style={{ width: '100%', textAlign: 'left', background: activeTab === 'security' ? 'rgba(255, 120, 100, 0.1)' : 'transparent', border: 'none' }}>
            <Key size={18} /> Security & Passwords
          </button>
          <button 
            className={`nav-item ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
            style={{ width: '100%', textAlign: 'left', background: activeTab === 'appearance' ? 'rgba(255, 120, 100, 0.1)' : 'transparent', border: 'none' }}>
            <Palette size={18} /> Dashboard Appearance
          </button>
        </div>

        {/* Content Area */}
        <div className="glass-panel" style={{ flex: 1, padding: '2rem' }}>
          
          {activeTab === 'permissions' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#333' }}>Lance's Vault: Team & Client Permissions</h3>
              <p style={{ color: '#666', marginBottom: '2rem' }}>Manage who can see which projects. Clients are strictly sandboxed into their own views. Employees can see client projects they are assigned to.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h4 style={{ marginBottom: '1rem', color: '#444' }}><Users size={16} /> Internal Employees</h4>
                  {employees.map(emp => (
                    <div key={emp.name} style={{ padding: '1rem', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', marginBottom: '10px', background: '#fff' }}>
                      <div style={{ fontWeight: 600, color: '#222' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>{emp.role}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 style={{ marginBottom: '1rem', color: '#444' }}><Shield size={16} /> Client Isolation Boxes</h4>
                  {clientProjects.map(proj => (
                    <div key={proj.client} style={{ padding: '1rem', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', marginBottom: '10px', background: '#fff' }}>
                      <div style={{ fontWeight: 600, color: '#222' }}>{proj.client}</div>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>Project: {proj.project}</div>
                      <div style={{ fontSize: '0.8rem', color: '#1976d2', marginTop: '6px' }}>Assigned: {proj.assigned.join(', ')}</div>
                    </div>
                  ))}
                  <button className="btn-primary" style={{ width: '100%', marginTop: '10px', padding: '0.5rem' }}>+ Create Secure Client Portal</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#333' }}>Workspace Aesthetics</h3>
              <p style={{ color: '#666', marginBottom: '2rem' }}>Modify the Apple Glass background gradients and UI themes across the entire ecosystem.</p>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'linear-gradient(135deg, #ff7e67, #ff9a85)', border: '2px solid #333', cursor: 'pointer' }}></div>
                <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'linear-gradient(135deg, #1976d2, #64b5f6)', opacity: 0.5, cursor: 'pointer' }}></div>
                <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'linear-gradient(135deg, #388e3c, #81c784)', opacity: 0.5, cursor: 'pointer' }}></div>
                <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: '#222', opacity: 0.5, cursor: 'pointer' }}></div>
              </div>
              <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#888' }}>* Note: Theme syncs across your IDE and mobile devices via Supabase preferences.</p>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#333' }}>Account Security</h3>
              <div style={{ maxWidth: '400px' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Current Password</label>
                  <input type="password" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>New Password</label>
                  <input type="password" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
                <button className="btn-primary" style={{ width: '100%' }}>Update Password</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
