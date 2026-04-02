import React, { useState } from 'react';
import { Settings as SettingsIcon, Shield, Palette, Users, Key, ChevronDown, ChevronUp, Info } from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('permissions');

  const projects = [
    { name: 'College Career OS', client: 'Northwestern U' },
    { name: 'Exercise DB V2', client: 'MOSO Comprehensive Exercise Database (Internal)' },
    { name: 'Stretching App', client: 'Internal' },
    { name: 'Art Portfolio', client: 'Internal' },
  ];

  const phases = ['Planning', 'Execution', 'Review', 'Maintenance'];
  const roles = ['No Access', 'Owner', 'Contributor', 'Reviewer', 'Observer'];

  const employees = [
    { name: 'Lance Labno (Admin)', email: 'lance@labnolabs.com', role: 'Owner' },
    { name: 'Avery', email: 'avery@labnolabs.com', role: 'UX/UI Designer' },
    { name: 'Romy', email: 'romy@labnolabs.com', role: 'Clinical Apps' },
    { name: 'Sarah', email: 'sarah@labnolabs.com', role: 'Project Manager' },
    { name: 'Bill', email: 'bill@labnolabs.com', role: 'Developer' },
  ];

  const clientProjects = [
    { client: 'Northwestern U', project: 'College Career OS', assigned: ['Lance', 'Sarah'] },
    { client: 'MOSO Comprehensive Exercise Database (Internal)', project: 'Exercise DB V2', assigned: ['Lance', 'Romy'] },
  ];

  // Task 13: Employee expansion & task assignment
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [employeeAssignments, setEmployeeAssignments] = useState(() => {
    const initial = {};
    employees.forEach(emp => {
      initial[emp.name] = {};
      projects.forEach(proj => {
        initial[emp.name][proj.name] = { role: 'Observer', phase: 'Planning' };
      });
    });
    // Set some defaults
    initial['Lance Labno (Admin)']['College Career OS'] = { role: 'Owner', phase: 'Execution' };
    initial['Lance Labno (Admin)']['Exercise DB V2'] = { role: 'Owner', phase: 'Review' };
    initial['Sarah']['College Career OS'] = { role: 'Contributor', phase: 'Execution' };
    initial['Romy']['Exercise DB V2'] = { role: 'Contributor', phase: 'Execution' };
    initial['Romy']['College Career OS'] = { role: 'Observer', phase: 'Planning' };
    initial['Avery']['Art Portfolio'] = { role: 'Owner', phase: 'Planning' };
    initial['Bill']['College Career OS'] = { role: 'Observer', phase: 'Planning' };
    initial['Bill']['Exercise DB V2'] = { role: 'Contributor', phase: 'Execution' };
    return initial;
  });

  // Task 14: Global permissions
  const permissionTypes = ['Can create projects', 'Can delete tasks', 'Can view Labno CRM', 'Can view MOSO CRM (HIPAA)', 'Can manage billing'];
  const [permissions, setPermissions] = useState(() => {
    const initial = {};
    employees.forEach(emp => {
      initial[emp.name] = {
        'Can create projects': emp.role === 'Owner',
        'Can delete tasks': emp.role === 'Owner',
        'Can view Labno CRM': emp.role === 'Owner' || emp.role === 'Project Manager',
        'Can view MOSO CRM (HIPAA)': emp.name === 'Lance Labno (Admin)',
        'Can manage billing': emp.role === 'Owner',
      };
    });
    return initial;
  });

  // Phase permissions
  const phaseNames = ['Planning', 'Execution', 'Review', 'Maintenance'];
  const phaseAccessLevels = ['Full Access', 'Read Only', 'No Access'];
  const [phasePermissions, setPhasePermissions] = useState(() => {
    const initial = {};
    employees.forEach(emp => {
      initial[emp.name] = {};
      phaseNames.forEach(phase => {
        initial[emp.name][phase] = emp.role === 'Owner' ? 'Full Access' : 'Read Only';
      });
    });
    return initial;
  });

  const updatePhasePermission = (empName, phase, value) => {
    setPhasePermissions(prev => ({
      ...prev,
      [empName]: { ...prev[empName], [phase]: value },
    }));
  };

  // Client isolation accordion
  const [expandedClient, setExpandedClient] = useState(null);

  const updateAssignment = (empName, projName, field, value) => {
    setEmployeeAssignments(prev => ({
      ...prev,
      [empName]: {
        ...prev[empName],
        [projName]: {
          ...prev[empName][projName],
          [field]: value,
        },
      },
    }));
  };

  const togglePermission = (empName, perm) => {
    setPermissions(prev => ({
      ...prev,
      [empName]: {
        ...prev[empName],
        [perm]: !prev[empName][perm],
      },
    }));
  };

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
        <div className="glass-panel" style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>

          {activeTab === 'permissions' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#333' }}>Lance's Vault: Team & Client Permissions</h3>
              <p style={{ color: '#666', marginBottom: '2rem' }}>Manage who can see which projects. Clients are strictly sandboxed into their own views. Employees can see client projects they are assigned to.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                <div>
                  <h4 style={{ marginBottom: '1rem', color: '#444' }}><Users size={16} /> Internal Employees</h4>
                  {employees.map((emp, empIdx) => (
                    <div key={emp.name} style={{ marginBottom: '10px' }}>
                      <div
                        onClick={() => setExpandedEmployee(expandedEmployee === empIdx ? null : empIdx)}
                        style={{
                          padding: '1rem',
                          border: '1px solid rgba(0,0,0,0.05)',
                          borderRadius: expandedEmployee === empIdx ? '8px 8px 0 0' : '8px',
                          background: expandedEmployee === empIdx ? 'rgba(255, 120, 100, 0.04)' : '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#222' }}>{emp.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#888' }}>{emp.role}</div>
                        </div>
                        <div style={{ color: '#aaa' }}>
                          {expandedEmployee === empIdx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Task 13: Expanded employee detail panel */}
                      {expandedEmployee === empIdx && (
                        <div style={{
                          padding: '1rem',
                          border: '1px solid rgba(0,0,0,0.05)',
                          borderTop: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: '0 0 8px 8px',
                          background: '#fff',
                        }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Project Assignments
                          </div>
                          {projects.map(proj => {
                            const assignment = employeeAssignments[emp.name]?.[proj.name] || { role: 'Observer', phase: 'Planning' };
                            return (
                              <div
                                key={proj.name}
                                style={{
                                  padding: '8px 0',
                                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <div style={{ flex: '1 1 140px', minWidth: '120px' }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#333' }}>{proj.name}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#999' }}>{proj.client}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <label style={{ fontSize: '0.7rem', color: '#888' }}>Role:</label>
                                  <select
                                    value={assignment.role}
                                    onChange={(e) => updateAssignment(emp.name, proj.name, 'role', e.target.value)}
                                    style={{
                                      fontSize: '0.78rem',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #ddd',
                                      background: '#fff',
                                      color: '#444',
                                    }}
                                  >
                                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <label style={{ fontSize: '0.7rem', color: '#888' }}>Phase:</label>
                                  <select
                                    value={assignment.phase}
                                    onChange={(e) => updateAssignment(emp.name, proj.name, 'phase', e.target.value)}
                                    style={{
                                      fontSize: '0.78rem',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid #ddd',
                                      background: '#fff',
                                      color: '#444',
                                    }}
                                  >
                                    {phases.map(p => <option key={p} value={p}>{p}</option>)}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <h4 style={{ marginBottom: '1rem', color: '#444' }}><Shield size={16} /> Client Isolation Boxes</h4>
                  {clientProjects.map((proj, idx) => (
                    <div key={proj.client} style={{ marginBottom: '10px' }}>
                      <div
                        onClick={() => setExpandedClient(expandedClient === idx ? null : idx)}
                        style={{
                          padding: '1rem',
                          border: '1px solid rgba(0,0,0,0.05)',
                          borderRadius: expandedClient === idx ? '8px 8px 0 0' : '8px',
                          background: expandedClient === idx ? 'rgba(255, 120, 100, 0.04)' : '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#222' }}>{proj.client}</div>
                          <div style={{ fontSize: '0.8rem', color: '#888' }}>Project: {proj.project}</div>
                        </div>
                        <div style={{ color: '#aaa' }}>
                          {expandedClient === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                      {expandedClient === idx && (
                        <div style={{
                          padding: '1rem',
                          border: '1px solid rgba(0,0,0,0.05)',
                          borderTop: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: '0 0 8px 8px',
                          background: '#fff',
                        }}>
                          <div style={{ fontSize: '0.8rem', color: '#1976d2', marginBottom: '8px' }}>Assigned: {proj.assigned.join(', ')}</div>
                          <div style={{ fontSize: '0.78rem', color: '#666' }}>
                            <strong>Isolation Rules:</strong> This client can only view their own project data. No cross-client data leakage.
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '4px' }}>
                            <strong>Data Region:</strong> US-East (default)
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '4px' }}>
                            <strong>Last Audit:</strong> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="btn-primary" style={{ width: '100%', marginTop: '10px', padding: '0.5rem' }}>+ Create Secure Client Portal</button>
                </div>
              </div>

              {/* Task 14: Global Permissions & Security Matrix */}
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '1rem', color: '#444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} /> Global Permissions Matrix
                </h4>
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Toggle access levels for each team member across the platform.
                </p>
                <div className="glass-panel" style={{ overflow: 'hidden', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#444', fontSize: '0.85rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                          Employee
                        </th>
                        {permissionTypes.map(perm => (
                          <th key={perm} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#444', fontSize: '0.78rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            {perm}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp, idx) => (
                        <tr key={emp.name} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 500, color: '#222', fontSize: '0.9rem' }}>{emp.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#999' }}>{emp.role}</div>
                          </td>
                          {permissionTypes.map(perm => {
                            const enabled = permissions[emp.name]?.[perm] ?? false;
                            return (
                              <td key={perm} style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <button
                                  onClick={() => togglePermission(emp.name, perm)}
                                  style={{
                                    width: '44px',
                                    height: '24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: enabled ? '#4caf50' : 'rgba(0,0,0,0.12)',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    padding: 0,
                                  }}
                                >
                                  <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: '#fff',
                                    position: 'absolute',
                                    top: '3px',
                                    left: enabled ? '23px' : '3px',
                                    transition: 'left 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                  }} />
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Phase Permissions Matrix */}
              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ marginBottom: '1rem', color: '#444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} /> Phase Permissions
                </h4>
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Control access levels per project phase for each team member.
                </p>
                <div className="glass-panel" style={{ overflow: 'hidden', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#444', fontSize: '0.85rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                          Employee
                        </th>
                        {phaseNames.map(phase => (
                          <th key={phase} style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#444', fontSize: '0.78rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                            {phase}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map(emp => (
                        <tr key={emp.name} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 500, color: '#222', fontSize: '0.9rem' }}>{emp.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#999' }}>{emp.role}</div>
                          </td>
                          {phaseNames.map(phase => (
                            <td key={phase} style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <select
                                value={phasePermissions[emp.name]?.[phase] || 'Read Only'}
                                onChange={(e) => updatePhasePermission(emp.name, phase, e.target.value)}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #ddd',
                                  background: '#fff',
                                  color: '#444',
                                }}
                              >
                                {phaseAccessLevels.map(level => (
                                  <option key={level} value={level}>{level}</option>
                                ))}
                              </select>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#333' }}>Workspace Aesthetics</h3>
              <p style={{ color: '#666', marginBottom: '2rem' }}>Modify the Apple Glass background gradients and UI themes across the entire ecosystem.</p>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div
                  onClick={() => {
                    document.documentElement.style.setProperty('--primary-glow', 'rgba(255, 120, 100, 0.4)');
                    document.documentElement.style.setProperty('--secondary-glow', 'rgba(220, 190, 160, 0.6)');
                  }}
                  style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'linear-gradient(135deg, #ff7e67, #ff9a85)', border: '2px solid #333', cursor: 'pointer' }}></div>

                <div
                  onClick={() => {
                    document.documentElement.style.setProperty('--primary-glow', 'rgba(25, 118, 210, 0.4)');
                    document.documentElement.style.setProperty('--secondary-glow', 'rgba(100, 181, 246, 0.6)');
                  }}
                  style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'linear-gradient(135deg, #1976d2, #64b5f6)', border: '2px solid transparent', cursor: 'pointer' }}></div>

                <div
                  onClick={() => {
                    document.documentElement.style.setProperty('--primary-glow', 'rgba(56, 142, 60, 0.4)');
                    document.documentElement.style.setProperty('--secondary-glow', 'rgba(129, 199, 132, 0.6)');
                  }}
                  style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'linear-gradient(135deg, #388e3c, #81c784)', border: '2px solid transparent', cursor: 'pointer' }}></div>

                <div
                  onClick={() => {
                    document.documentElement.style.setProperty('--primary-glow', 'rgba(20, 20, 20, 0.4)');
                    document.documentElement.style.setProperty('--secondary-glow', 'rgba(80, 80, 80, 0.6)');
                  }}
                  style={{ width: '100px', height: '100px', borderRadius: '12px', background: '#222', border: '2px solid transparent', cursor: 'pointer' }}></div>
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

              {/* Backup & Data Export */}
              <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#333' }}>Data Backup & Export</h4>
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Download a full JSON backup of all CRM leads, projects, tasks, SOPs, and agent logs.
                </p>
                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/backup/export');
                      const data = await res.json();
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url;
                      a.download = `labno-backup-${new Date().toISOString().split('T')[0]}.json`;
                      a.click(); URL.revokeObjectURL(url);
                    } catch (err) { alert('Backup failed: ' + err.message); }
                  }}>
                  Download Full Backup (JSON)
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
